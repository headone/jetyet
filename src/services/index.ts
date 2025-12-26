import { validateToken, authenticate, unauthenticate } from "./auth";
import { getAllUsers, createUser, deleteUser } from "./user";
import { getAllNodes, deleteNode, createNode, assignNode } from "./node";

type ReqRoute = {
  path: string;
  method: string;
};

const apiTableDriven = new Map<
  ReqRoute,
  (
    req: Request,
    server: Bun.Server<undefined>,
    isAuthenticated: boolean,
  ) => Response | Promise<Response>
>([
  // auth api
  [{ path: "/api/auth/login", method: "POST" }, (req) => authenticate(req)],
  [
    { path: "/api/auth/logout", method: "POST" },
    (req, _, isAuthenticated) => unauthenticate(isAuthenticated),
  ],
  // user api
  [
    { path: "/api/users", method: "GET" },
    (req, _, isAuthenticated) => getAllUsers(isAuthenticated),
  ],
  [
    { path: "/api/users", method: "POST" },
    (req, _, isAuthenticated) => createUser(req, isAuthenticated),
  ],
  [
    { path: "/api/users", method: "DELETE" },
    (req, _, isAuthenticated) => deleteUser(req, isAuthenticated),
  ],
  // node api
  [
    { path: "/api/nodes", method: "GET" },
    (req, _, isAuthenticated) => getAllNodes(isAuthenticated),
  ],
  [
    { path: "/api/nodes", method: "DELETE" },
    (req, _, isAuthenticated) => deleteNode(req, isAuthenticated),
  ],
  [
    { path: "/api/nodes", method: "POST" },
    (req, _, isAuthenticated) => createNode(req, isAuthenticated),
  ],
  [
    { path: "/api/nodes/assign", method: "POST" },
    (req, _, isAuthenticated) => assignNode(req, isAuthenticated),
  ],
]);

export async function routeHandler(
  req: Request,
  server: Bun.Server<undefined>,
): Promise<Response> {
  // get the authorization header
  const authToken = req.headers.get("Authorization");
  // check if the token is valid
  const isAuthenticated = authToken && validateToken(authToken);

  // handling routing logic
  const url = new URL(req.url);

  for (const [route, handler] of apiTableDriven.entries()) {
    if (route.path === url.pathname && route.method === req.method) {
      return await handler(req, server, !!isAuthenticated);
    }
  }

  return new Response(null, { status: 404 });
}
