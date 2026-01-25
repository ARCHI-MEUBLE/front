/**
 * Generic API Proxy - Catch-all proxy
 * Routes all /api/proxy/* requests to backend
 * Example: /api/proxy/backend/api/cart/index.php -> backend/api/cart/index.php
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Files, Fields } from 'formidable';
import fs from 'fs';
import path from 'path';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export const config = {
  api: {
    bodyParser: false, // Disable body parser to handle multipart
  },
};

// Helper to parse form data
const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

// Helper to get raw body for JSON requests
const getRawBody = (req: NextApiRequest): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
};

// Create multipart form data manually for fetch
const createMultipartBody = async (fields: Fields, files: Files): Promise<{ body: Buffer; boundary: string }> => {
  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
  const parts: Buffer[] = [];

  // Add fields
  for (const [key, value] of Object.entries(fields)) {
    const fieldValue = Array.isArray(value) ? value[0] : value;
    if (fieldValue !== undefined) {
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
        `${fieldValue}\r\n`
      ));
    }
  }

  // Add files
  for (const [key, fileArray] of Object.entries(files)) {
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    if (file) {
      const filename = file.originalFilename || 'file';
      const mimeType = file.mimetype || 'application/octet-stream';
      const fileContent = fs.readFileSync(file.filepath);

      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${key}"; filename="${filename}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
      ));
      parts.push(fileContent);
      parts.push(Buffer.from('\r\n'));

      // Clean up temp file
      try {
        fs.unlinkSync(file.filepath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // Add closing boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    boundary
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Reconstruct the path
    const { path: reqPath } = req.query;
    const pathArray = Array.isArray(reqPath) ? reqPath : [reqPath];
    const backendPath = pathArray.join('/');

    // Build query string
    const queryParams = { ...req.query };
    delete queryParams.path;
    const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();

    const url = `${API_URL}/${backendPath}${queryString ? '?' + queryString : ''}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Cookie': req.headers.cookie || '',
    };

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers,
    };

    // Handle different content types
    const contentType = req.headers['content-type'] || '';

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType.includes('multipart/form-data')) {
        // Handle file uploads
        const { fields, files } = await parseForm(req);
        const { body, boundary } = await createMultipartBody(fields, files);

        headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
        headers['Content-Length'] = body.length.toString();
        fetchOptions.body = body;
      } else {
        // Handle JSON and other content types
        const rawBody = await getRawBody(req);
        if (rawBody) {
          headers['Content-Type'] = contentType || 'application/json';
          fetchOptions.body = rawBody;
        }
      }
    }

    fetchOptions.headers = headers;
    const response = await fetch(url, fetchOptions);

    // Handle non-JSON responses
    const responseContentType = response.headers.get('content-type');

    // Forward cookies
    const backendCookies = response.headers.getSetCookie?.() || [];
    if (backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    if (responseContentType?.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else if (responseContentType?.includes('text/html')) {
      // Si le backend renvoie du HTML (erreur), le convertir en JSON
      const text = await response.text();
      console.error('Backend returned HTML:', text.substring(0, 500));
      res.status(response.status).json({
        error: 'Erreur serveur',
        details: 'Le serveur a renvoyé une réponse inattendue'
      });
    } else {
      // For non-JSON responses (like file downloads), stream the response
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', responseContentType || 'application/octet-stream');
      res.status(response.status).send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    res.status(500).json({
      error: 'Erreur de connexion au serveur',
      details: errorMessage
    });
  }
}
