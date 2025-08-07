addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // 仅处理 /api/app/hostAlternative 路径，其它请求返回 404
  if (url.pathname !== "/api/app/hostAlternative") {
    return new Response("Not Found", { status: 404 });
  }

  // 构造目标后端 API 的 URL，保留查询参数
  const targetHost = "api.soulchill.live"; // 替换为实际后端主机域名
  const targetUrl = `https://${targetHost}${url.pathname}${url.search}`;

  // 转发请求：保留原请求的方法、头和体
  // 方法一：直接使用原 Request 对象作为 init
  const forwardedRequest = new Request(targetUrl, request);

  // 方法二：手动指定各属性（同样效果）
  // const forwardedRequest = new Request(targetUrl, {
  //   method: request.method,
  //   headers: request.headers,
  //   body: request.body,
  //   redirect: 'follow' // 可根据需要调整
  // });

  // 发起子请求到目标后端
  const response = await fetch(forwardedRequest);

  // 将后端响应的状态码、头部和内容原样返回
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
