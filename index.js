addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})


async function handleRequest(request) {
  try {
    // 构建目标 URL，将请求转发到 api.soulchill.live
    const url = new URL(request.url)
    const targetUrl = `https://api.soulchill.live${url.pathname}${url.search}`
    
    // 创建新的请求选项，保持所有原始 headers 和 body
    const requestOptions = {
      method: request.method,
      headers: request.headers,
    }
    
    // 如果请求有 body（如 POST、PUT 等请求），则包含 body
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestOptions.body = request.body
    }
    
    // 发送请求到目标服务器
    const response = await fetch(targetUrl, requestOptions)
    
    // 创建新的响应，保持所有原始响应 headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
    
    return newResponse
    
  } catch (error) {
    // 错误处理
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
