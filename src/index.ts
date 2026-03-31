import { serve } from "bun";
import index from "./index.html";
import { routeHandler } from "./services";
import {
  buildAuthenticator,
  buildConfigger,
  type ConfigType,
} from "./subscription";
import { getUserInfoBySubKey } from "./services/user";
import { buildSubscriptionUserinfoHeader } from "./services/traffic";
import { syncTrafficAndEnforceLimits } from "./services/traffic-enforcer";
import { type NodeType } from "@/types";

const server = serve({
  hostname: "0.0.0.0",

  fetch: routeHandler,

  routes: {
    "/": index,
    "/sub/:subKey": async (req) => {
      const subKey = req.params.subKey;
      const configType = new URL(req.url).searchParams.get("type");

      if (!configType) {
        return new Response(null, { status: 400 });
      }

      const userInfo = getUserInfoBySubKey(subKey);
      if (!userInfo) {
        return new Response(null, { status: 404 });
      }

      const configger = buildConfigger(
        configType as ConfigType,
        userInfo,
        userInfo.nodes,
        userInfo.secrets,
      );

      const headers = configger.headers();
      if (
        configType === "clash" ||
        configType === "karing" ||
        configType === "shadowrocket"
      ) {
        const userinfo = buildSubscriptionUserinfoHeader(userInfo.id);
        if (userinfo) {
          headers["subscription-userinfo"] = userinfo;
        }
      }
      const configStr = await configger.stringifySubscription();

      return new Response(configStr, { headers });
    },
    "/api/nodes/auth/:type": async (req) => {
      const type = req.params.type;
      const data = await req.json();

      const authenticator = buildAuthenticator(type as NodeType);
      const result = await authenticator.auth(data);

      return Response.json(result || {});
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

const syncIntervalMs = Number(Bun.env.TRAFFIC_SYNC_INTERVAL_MS || 5 * 60 * 1000);

async function runTrafficSyncTask() {
  try {
    const result = await syncTrafficAndEnforceLimits();
    if (result.syncErrors.length > 0 || result.enforcement.errors.length > 0) {
      console.warn("Traffic sync completed with partial errors", {
        syncErrors: result.syncErrors.length,
        enforcementErrors: result.enforcement.errors.length,
      });
    }
  } catch (error) {
    console.error("Traffic sync task failed:", error);
  }
}

runTrafficSyncTask();
setInterval(runTrafficSyncTask, Math.max(30_000, syncIntervalMs));
