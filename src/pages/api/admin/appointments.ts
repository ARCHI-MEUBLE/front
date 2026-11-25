/**
 * API Proxy - Calendly appointments
 * Proxie vers le backend PHP pour gérer les rendez-vous Calendly
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { backendHeaders, forwardSetCookies } from '@/lib/backendProxy';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${API_URL}/backend/api/calendly/appointments.php${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...backendHeaders(req),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from appointments:', text.substring(0, 200));
      return res.status(500).json({ error: 'Invalid response from backend' });
    }

    const data = await response.json();

    forwardSetCookies(res, response);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Appointments proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
}
