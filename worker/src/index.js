export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        status: "ok",
        service: env.APP_NAME || "floaa-api"
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
