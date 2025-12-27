import { validateToken, authenticate, unauthenticate } from "./auth";
import { getAllUsers, createUser, deleteUser } from "./user";
import { getAllNodes, deleteNode, createNode, assignNode } from "./node";

type RouteParams = Record<string, string | undefined>;
export interface AppRequest extends Request {
  params: RouteParams;
}

type Handler = (
  req: AppRequest,
  server: Bun.Server<any>,
) => Response | Promise<Response>;

interface RouteOptions {
  public?: boolean;
}

interface Route {
  method: string;
  pattern: URLPattern;
  handler: Handler;
  options: RouteOptions;
}

const routes: Route[] = [];

const on = (
  method: string,
  path: string,
  handler: Handler,
  options: RouteOptions = { public: false },
) => {
  routes.push({
    method,
    pattern: new URLPattern({ pathname: path }),
    handler,
    options,
  });
};

// register route
// auth api
on("POST", "/api/auth/login", (req) => authenticate(req), { public: true });
on("POST", "/api/auth/logout", () => unauthenticate());
// user api
on("GET", "/api/users", () => getAllUsers());
on("POST", "/api/users", (req) => createUser(req));
on("DELETE", "/api/users/:id", (req) => deleteUser(req));
// node api
on("GET", "/api/nodes", () => getAllNodes());
on("POST", "/api/nodes", (req) => createNode(req));
on("DELETE", "/api/nodes/:id", (req) => deleteNode(req));
on("POST", "/api/nodes/assign", (req) => assignNode(req));

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
      const appReq = req as AppRequest;
      appReq.params = match.pathname.groups || {};

      return route.handler(appReq, server);
    }
  }

  return new Response("Not Found", { status: 404 });
}
