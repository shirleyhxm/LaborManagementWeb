import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND_URL = 'https://labormanagementbackend.onrender.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Business-Id');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get the full path from query parameter
  // When using rewrites, Vercel doesn't give us the full path in req.url
  // We need to use a different approach - pass the path as a query param
  const { path: pathParam } = req.query;
  let requestedPath = '';

  if (Array.isArray(pathParam)) {
    // If path comes as array segments, join them
    requestedPath = pathParam.join('/');
  } else if (typeof pathParam === 'string') {
    requestedPath = pathParam;
  }

  // Construct backend URL with /api prefix
  const backendPath = requestedPath ? `/api/${requestedPath}` : '/api';
  const targetUrl = `${BACKEND_URL}${backendPath}`;

  // Log for debugging
  console.log('Proxy request:', {
    rawQuery: req.query,
    pathParam,
    requestedPath,
    backendPath,
    targetUrl,
    method: req.method,
    body: req.body,
  });

  try {
    // Prepare request body
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Forward the request to the backend
    console.log('Forwarding to backend:', { targetUrl, method: req.method, hasBody: !!body });

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { Authorization: req.headers.authorization as string }),
        ...(req.headers['x-user-id'] && { 'X-User-Id': req.headers['x-user-id'] as string }),
        ...(req.headers['x-business-id'] && { 'X-Business-Id': req.headers['x-business-id'] as string }),
      },
      ...(body && { body }),
    });

    console.log('Backend response:', { status: response.status, ok: response.ok });

    // Get response data
    const data = await response.text();

    // Forward response headers, excluding ones that no longer apply:
    // - CORS headers are set explicitly above
    // - Content-Encoding is stripped by fetch()'s automatic decompression, so
    //   forwarding it causes the browser to try (and fail) to decode plain text
    // - Content-Length no longer matches after re-serializing via response.text()
    const skipHeaders = ['content-encoding', 'content-length'];
    response.headers.forEach((value, key) => {
      if (!key.toLowerCase().startsWith('access-control-') && !skipHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Send response
    res.status(response.status).send(data);
  } catch (error: any) {
    console.error('Proxy error details:', {
      message: error.message,
      stack: error.stack,
      targetUrl,
      method: req.method,
    });
    res.status(500).json({
      message: 'Proxy error',
      error: error.message,
      targetUrl,
      details: 'Check Vercel function logs for more information'
    });
  }
}