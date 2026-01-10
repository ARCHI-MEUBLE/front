import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID requis' });
  }

  const backendUrl = `${API_URL}/backend/api/files/dxf.php?id=${id}`;

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', errorData);
      return res.status(response.status).json({ error: 'Erreur backend' });
    }

    // Get the file data as buffer
    const buffer = await response.arrayBuffer();

    // Set headers for file download
    res.setHeader('Content-Type', 'application/dxf');
    res.setHeader('Content-Disposition', `attachment; filename="configuration_${id}.dxf"`);
    res.setHeader('Content-Length', buffer.byteLength.toString());

    // Send the buffer
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('Error proxying DXF download:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
