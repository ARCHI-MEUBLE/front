/**
 * Generic API Proxy - Catch-all proxy
 * Routes all /api/proxy/* requests to backend
 * Example: /api/proxy/backend/api/cart/index.php -> backend/api/cart/index.php
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Reconstruct the path
    const { path } = req.query;
    const pathArray = Array.isArray(path) ? path : [path];
    const backendPath = pathArray.join('/');

    // Build query string
    const queryParams = { ...req.query };
    delete queryParams.path;
    const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();

    const url = `${API_URL}/${backendPath}${queryString ? '?' + queryString : ''}`;

    // Prepare headers
    const headers: HeadersInit = {
      'Cookie': req.headers.cookie || '',
    };

    // Only set Content-Type if there's a body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers,
    };

    // Add body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const data = await response.json();

      // Forward cookies
      const backendCookies = response.headers.getSetCookie?.() || [];
      if (backendCookies.length > 0) {
        backendCookies.forEach(cookie => {
          res.setHeader('Set-Cookie', cookie);
        });
      }

      res.status(response.status).json(data);
    } else {
      // For non-JSON responses (like file downloads), stream the response
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.status(response.status).send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    res.status(500).json({
      error: 'Proxy failed',
      details: errorMessage,
      url: API_URL
    });
  }
}
