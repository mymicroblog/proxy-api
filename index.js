export default {
  async fetch(request) {
    // 替换成你要代理的目标地址（例如你实际要请求的 API）
    const targetUrl = new URL(request.url);
    targetUrl.hostname = "api.soulchill.live"; // 👈 你的目标域名
    targetUrl.protocol = "https:";

    // 克隆原始请求的 headers
    const requestHeaders = new Headers(request.headers);

    // 可选：删除 Host 头以避免目标服务器返回错误（如需要）
    requestHeaders.delete("host");

    // 构造转发请求
    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      redirect: "manual", // 保留原始重定向行为
    });

    // 发起请求
    const response = await fetch(proxyRequest);

    // 原样返回响应
    const responseHeaders = new Headers(response.headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
