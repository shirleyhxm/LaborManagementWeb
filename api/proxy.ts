import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND_URL = 'http://3.131.96.75:8080';

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

  // Extract the path after /api/proxy
  const path = req.url?.replace('/api/proxy', '') || '';
  const targetUrl = `${BACKEND_URL}${path}`;

  // Log for debugging
  console.log('Proxy request:', {
    originalUrl: req.url,
    path,
    targetUrl,
    method: req.method,
  });

  try {
    // Prepare request body
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Forward the request to the backend
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

    // Get response data
    const data = await response.text();

    // Forward response headers (except CORS, we set our own)
    response.headers.forEach((value, key) => {
      if (!key.toLowerCase().startsWith('access-control-')) {
        res.setHeader(key, value);
      }
    });

    // Send response
    res.status(response.status).send(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).json({ message: 'Proxy error', error: error.message });
  }
}