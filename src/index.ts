import { serve } from "bun";
import index from "./index.html";
import { routeHandler } from "./services";
import { buildAuthenticator, buildConfigger } from "./subscription";
import { getUserInfoBySubKey } from "./services/user";

const server = serve({
  hostname: "0.0.0.0",

  fetch: routeHandler,

  routes: {
    "/": index,
    "/sub/:subKey": async (req) => {
      const subKey = req.params.subKey;
      const configType = new URL(req.url).searchParams.get("type");
      const format = new URL(req.url).searchParams.get("format");

      if (!configType || !format) {
        return new Response(null, { status: 400 });
      }

      const userInfo = await getUserInfoBySubKey(subKey);
      if (!userInfo) {
        return new Response(null, { status: 404 });
      }

      const configger = buildConfigger(
        configType,
        userInfo.nodes,
        userInfo.secrets,
      );

      let configStr;
      if (format === "yaml") {
        configStr = await configger.toYAML();
      } else {
        return new Response(null, { status: 400 });
      }

      return new Response(configStr, {
        headers: {
          'Content-Disposition': `attachment; filename*=UTF-8''jetYet-${encodeURIComponent(userInfo.name)}`
        }
      });
    },
    "/api/nodes/auth/:type": async (req) => {
      const type = req.params.type;
      const data = await req.json();

      const authenticator = buildAuthenticator(type);
      const result = await authenticator.auth(data);

      return Response.json(result);
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
