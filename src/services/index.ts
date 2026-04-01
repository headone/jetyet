import { validateToken, authenticate, unauthenticate } from "./auth";
import {
  getAllUsers,
  createUser,
  deleteUser,
  getUserSecrets,
  updateUserMonthlyLimit,
  updateUserSubKey,
} from "./user";
import {
  listUsersMonthlyTraffic,
  resetUserMonthlyTraffic,
} from "./traffic";
import {
  reconcileTrafficLimitAssignments,
  syncTrafficAndEnforceLimits,
} from "./traffic-enforcer";
import {
  getAllNodes,
  getNode,
  deleteNode,
  createNode,
  modefiyNode,
  assignNode,
} from "./node";
import type { AppSchema } from "@/api";
import { buildAuthenticator } from "@/subscription";
import { XtlsApi } from "@remnawave/xtls-sdk";

type PathKey = keyof AppSchema;
type MethodKey<P extends PathKey> = keyof AppSchema[P];

type GetParams<
  P extends PathKey,
  M extends MethodKey<P>,
> = AppSchema[P][M] extends { params: infer Prms }
  ? Prms
  : Record<string, string | undefined>;

type GetBody<
  P extends PathKey,
  M extends MethodKey<P>,
> = AppSchema[P][M] extends { body: infer B } ? B : unknown;

type GetResponse<
  P extends PathKey,
  M extends MethodKey<P>,
> = AppSchema[P][M] extends { response: infer B } ? B : void;

export interface AppRequest<
  P extends PathKey,
  M extends MethodKey<P>,
> extends Request {
  params: GetParams<P, M>;
  query: URLSearchParams;
  json(): Promise<GetBody<P, M>>;
}

type Handler<P extends PathKey, M extends MethodKey<P>> = (
  req: AppRequest<P, M>,
  server: Bun.Server<undefined>,
) => Response | GetResponse<P, M> | Promise<Response | GetResponse<P, M>>;

type StoredRouteHandler = (
  req: AppRequest<any, any>,
  server: Bun.Server<undefined>,
) => Promise<Response> | Response;

interface RouteOptions {
  public?: boolean;
}

interface Route {
  method: string;
  pattern: URLPattern;
  handler: StoredRouteHandler;
  options: RouteOptions;
}

const routes: Route[] = [];
const DEFAULT_VLESS_TAG_CANDIDATES = [
  "vless-reality",
  "vless",
  "reality",
  "inbound",
  "proxy",
  "443",
];

function on<P extends PathKey, M extends MethodKey<P>>(
  path: P,
  method: M,
  handler: Handler<P, M>,
  options: RouteOptions = { public: false },
) {
  routes.push({
    method: method as string,
    pattern: new URLPattern({ pathname: path as string }),
    handler: async (req: AppRequest<P, M>, server: Bun.Server<undefined>) => {
      const result = await handler(req, server);

      if (result instanceof Response) return result;
      if (result === undefined || result === null) {
        return new Response(null, { status: 204 });
      }
      return Response.json(result);
    },
    options,
  });
}

// register route
// auth api
on(
  "/api/auth/login",
  "POST",
  async (req) => {
    const { username, password } = await req.json();
    const response = authenticate(username, password);
    if (!response) {
      return new Response(null, { status: 401 });
    }
    return response;
  },
  { public: true },
);
on("/api/auth/logout", "POST", unauthenticate);
// user api
on("/api/users", "GET", getAllUsers);
on("/api/users", "POST", async (req) => {
  const { name } = await req.json();
  createUser(name);
  return new Response(null, { status: 201 });
});
on("/api/users/traffic", "GET", () => listUsersMonthlyTraffic());
on("/api/users/:id", "GET", () => new Response(null, { status: 404 }));
on("/api/users/:id", "PUT", () => new Response(null, { status: 404 }));
on("/api/users/:id", "DELETE", (req) => {
  const id = req.params.id;
  deleteUser(id);
  // TODO: deassign
});
on("/api/users/:id/subKey", "PUT", async (req) => {
  const id = req.params.id;
  const { subKey } = await req.json();

  try {
    const newSubKey = updateUserSubKey(id, subKey);
    return { subKey: newSubKey };
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_SUBKEY") {
      return new Response(
        "This subscription key is already in use by another user",
        { status: 409 },
      );
    }

    return new Response(null, { status: 500 });
  }
});
on("/api/users/:id/traffic-limit", "PUT", async (req) => {
  const id = req.params.id;
  const { monthlyLimitGB } = await req.json();

  if (monthlyLimitGB != null && (!Number.isFinite(monthlyLimitGB) || monthlyLimitGB < 0)) {
    return new Response("monthlyLimitGB must be a non-negative number or null", {
      status: 400,
    });
  }

  const monthlyLimitBytes = monthlyLimitGB == null
    ? null
    : Math.floor(monthlyLimitGB * 1024 * 1024 * 1024);

  const value = updateUserMonthlyLimit(id, monthlyLimitBytes);
  await reconcileTrafficLimitAssignments();
  return { monthlyLimitBytes: value };
});
on("/api/users/:id/traffic/reset", "POST", async (req) => {
  resetUserMonthlyTraffic(req.params.id);
  await reconcileTrafficLimitAssignments();
  return new Response(null, { status: 201 });
});
on("/api/traffic/sync", "POST", async () => {
  return syncTrafficAndEnforceLimits();
});
on("/api/nodes/:id/vless-debug", "GET", async (req) => {
  const id = req.params.id;
  const node = getNode(id);
  if (!node) return new Response("Node not found", { status: 404 });
  if (node.type !== "vless") {
    return new Response("Node is not a VLESS node", { status: 400 });
  }

  const api = new XtlsApi(node.host, "10086");
  const inboundTag = "vless-reality";
  const inboundUsersResponse = await api.handler.getInboundUsers(inboundTag);

  if (!inboundUsersResponse.isOk || !inboundUsersResponse.data) {
    return new Response(
      inboundUsersResponse.message || "Failed to fetch inbound users",
      { status: 502 },
    );
  }

  const inboundUsers = (inboundUsersResponse.data.users as any[])
    .filter((user) => user.protocol === "vless")
    .map((user) => ({
      username: user.username,
      protocol: user.protocol,
      vlessId: user.vless?.id,
    }));

  const perUserStats = [];
  for (const user of inboundUsers) {
    const statsResponse = await api.stats.getUserStats(user.username);
    if (!statsResponse.isOk || !statsResponse.data?.user) {
      perUserStats.push({
        username: user.username,
        ok: false,
        uplink: 0,
        downlink: 0,
        message: statsResponse.message || "No stats returned",
      });
      continue;
    }

    perUserStats.push({
      username: user.username,
      ok: true,
      uplink: statsResponse.data.user.uplink,
      downlink: statsResponse.data.user.downlink,
    });
  }

  return {
    nodeId: node.id,
    host: node.host,
    inboundTag,
    inboundUsers,
    perUserStats,
  };
});
on("/api/nodes/:id/vless-debug-tags", "GET", async (req) => {
  const id = req.params.id;
  const node = getNode(id);
  if (!node) return new Response("Node not found", { status: 404 });
  if (node.type !== "vless") {
    return new Response("Node is not a VLESS node", { status: 400 });
  }

  const api = new XtlsApi(node.host, "10086");
  const envTags = (Bun.env.XRAY_INBOUND_TAG_CANDIDATES || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const tagCandidates = [...new Set([...DEFAULT_VLESS_TAG_CANDIDATES, ...envTags])];

  const scannedTags = [];
  for (const tag of tagCandidates) {
    const inboundUsersResponse = await api.handler.getInboundUsers(tag);
    if (!inboundUsersResponse.isOk || !inboundUsersResponse.data) {
      scannedTags.push({
        tag,
        ok: false,
        userCount: 0,
        users: [],
        message: inboundUsersResponse.message || "Failed to fetch inbound users",
      });
      continue;
    }

    const users = (inboundUsersResponse.data.users as any[])
      .filter((user) => user.protocol === "vless")
      .map((user) => ({
        username: user.username,
        protocol: user.protocol,
        vlessId: user.vless?.id,
      }));

    scannedTags.push({
      tag,
      ok: true,
      userCount: users.length,
      users,
    });
  }

  return {
    nodeId: node.id,
    host: node.host,
    scannedTags,
  };
});
// node api
on("/api/nodes", "GET", getAllNodes);
on("/api/nodes", "POST", async (req) => {
  const { name, host, port, type, advanced } = await req.json();
  createNode(name, host, port, type, advanced);
  return new Response(null, { status: 201 });
});
on("/api/nodes/:id", "GET", (req) => {
  const id = req.params.id;
  const node = getNode(id);
  if (!node) return new Response(null, { status: 404 });
  return node;
});
on("/api/nodes/:id", "PUT", async (req) => {
  const id = req.params.id;
  const node = await req.json();
  // fixme: 偷懒不校验了
  modefiyNode({
    id,
    ...(node as any),
  });
  return new Response(null, { status: 201 });
});
on("/api/nodes/:id", "DELETE", (req) => {
  const id = req.params.id;
  deleteNode(id);
  // TODO: deassign
});
on("/api/nodes/assign", "POST", async (req) => {
  const {
    userId,
    nodeId,
    assign,
  }: { userId: string; nodeId: string; assign: boolean } = await req.json();
  const node = getNode(nodeId);
  if (!node) return new Response("Node not found", { status: 404 });
  const secrets = getUserSecrets(userId);
  if (!secrets) return new Response("User not found", { status: 404 });

  assignNode(userId, nodeId, assign);
  const authenticator = buildAuthenticator(node.type);
  try {
    if (assign) {
      await authenticator.assign(node, secrets);
    } else {
      await authenticator.deassign(node, secrets);
    }
  } catch (e) {
    // rollback
    assignNode(userId, nodeId, !assign);
    return new Response(
      `Failed to ${assign ? "assign" : "deassign"} node: ${e}`,
      { status: 500 },
    );
  }
  return new Response(null, { status: 201 });
});
on("/api/nodes/reassign", "POST", async (req) => {
  const reassignments: { userId: string; nodeId: string }[] = await req.json();
  for (const { userId, nodeId } of reassignments) {
    const node = getNode(nodeId);
    if (!node) continue;
    const secrets = getUserSecrets(userId);
    if (!secrets) continue;

    const authenticator = buildAuthenticator(node.type);
    try {
      await authenticator.assign(node, secrets);
    } catch (e) {
      console.error(`Failed to assign node ${nodeId} to user ${userId}: ${e}`);
    }
  }
  return new Response(null, { status: 201 });
});

export async function routeHandler(
  req: Request,
  server: Bun.Server<undefined>,
): Promise<Response> {
  for (const route of routes) {
    if (route.method !== req.method) continue;

    const url = new URL(req.url);
    const match = route.pattern.exec({ pathname: url.pathname });
    if (match) {
      if (!route.options.public) {
        // check if the token is valid
        const authToken = req.headers.get("Authorization");
        if (!authToken || !validateToken(authToken)) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // inject path params
      const appReq = req as AppRequest<any, any>;
      appReq.params = match.pathname.groups || {};

      try {
        return route.handler(appReq, server);
      } catch (e) {
        return new Response(`Internal Server Error: ${e}`, { status: 500 });
      }
    }
  }

  return new Response("Not Found", { status: 404 });
}
