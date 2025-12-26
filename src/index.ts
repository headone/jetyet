import { serve } from "bun";
import index from "./index.html";
import { routeHandler } from "./services";
import { buildAuthenticator } from "./subscription";

const server = serve({
  fetch: routeHandler,

  routes: {
    "/": index,
    "/sub/:subKey": (req) => {
      const subKey = req.params.subKey;
      return new Response(`SubKey: ${subKey}`);
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
