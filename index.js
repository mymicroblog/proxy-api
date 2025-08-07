export default {
  async fetch(request) {
    try {
      const incomingUrl = new URL(request.url);

      // 只处理特定路径
      if (incomingUrl.pathname !== "/api/app/hostAlternative") {
        return new Response("Not Found", { status: 404 });
      }

      // 目标地址
      const targetUrl = new URL("https://api.soulchill.live/api/app/hostAlternative");

      console.log("Incoming request:", {
        method: request.method,
        url: request.url,
        target: targetUrl.toString(),
      });

      // 克隆原始请求头，不修改 user-agent
      const requestHeaders = new Headers(request.headers);

      // 确保不设置或覆盖 Host，也可选择删除 Host 头（目标服务器可能会自动处理）
       requestHeaders.set("Host", "api.soulchill.live"); // ❌ 现在不设置
      //requestHeaders.delete("Host"); // ✅ 推荐删除，防止冲突

      // 读取请求体（仅非 GET/HEAD）
      let body = null;
      if (request.method !== "GET" && request.method !== "HEAD") {
        try {
          body = await request.clone().text();
          console.log("Request body:", body);
        } catch (err) {
          console.log("Failed to read request body:", err);
        }
      }

      // 构造并发送请求
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: requestHeaders,
        body,
        redirect: "manual",
      });

      const response = await fetch(proxyRequest);

      console.log("Response from target:", response.status);

      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });

    } catch (err) {
      console.log("Proxy error:", err.stack || err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
}
