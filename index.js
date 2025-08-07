export default {
  async fetch(request) {
    // 构造目标 URL
    const targetUrl = new URL("https://api.soulchill.live/api/app/hostAlternative");

    // 克隆原始请求头
    const requestHeaders = new Headers(request.headers);

    // 强制设置正确 Host、User-Agent 等
    requestHeaders.set("Host", "api.soulchill.live");
    //requestHeaders.set("User-Agent", "Mozilla/5.0");

    // 构造转发请求
    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      redirect: "manual",
    });

    // 发起请求并返回
    const response = await fetch(proxyRequest);

    // 原样返回响应
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  },
};
