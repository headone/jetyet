import { serve } from "bun";
import index from "./index.html";
import { routeHandler } from "./services";

const server = serve({
  fetch: routeHandler,

  routes: {
    "/": index,
    "/sub/:subKey": (req) => {
      const subKey = req.params.subKey;
      return new Response(`SubKey: ${subKey}`);
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
