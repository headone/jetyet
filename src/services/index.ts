import { validateToken, authenticate, unauthenticate } from "./auth";
import { getAllUsers, createUser, deleteUser } from "./user";
import { getAllNodes, deleteNode, createNode, assignNode } from "./node";
import type { AppSchema } from "@/api";

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
on("/api/users/:id", "GET", () => new Response(null, { status: 404 }));
on("/api/users/:id", "PUT", () => new Response(null, { status: 404 }));
on("/api/users/:id", "DELETE", (req) => {
  const id = req.params.id;
  deleteUser(id);
});
// node api
on("/api/nodes", "GET", getAllNodes);
on("/api/nodes", "POST", async (req) => {
  const { name, host, port, type, advanced } = await req.json();
  createNode(name, host, port, type, advanced);
  return new Response(null, { status: 201 });
});
on("/api/nodes/:id", "GET", () => new Response(null, { status: 404 }));
on("/api/nodes/:id", "PUT", () => new Response(null, { status: 404 }));
on("/api/nodes/:id", "DELETE", (req) => {
  const id = req.params.id;
  deleteNode(id);
});
on("/api/nodes/assign", "POST", async (req) => {
  const {
    userId,
    nodeId,
    assign,
  }: { userId: string; nodeId: string; assign: boolean } = await req.json();
  assignNode(userId, nodeId, assign);
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

      return route.handler(appReq, server);
    }
  }

  return new Response("Not Found", { status: 404 });
}
