import { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb',
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  try {
    console.log('[UPLOAD PROXY] Forwarding upload to backend...');

    // Forward la requête telle quelle au backend sans parser
    // Cela permet à PHP de parser le multipart/form-data correctement
    const backendResponse = await fetch(`${BACKEND_URL}/backend/api/admin/upload-image.php`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || '',
        'Cookie': req.headers.cookie || '',
      },
      // @ts-ignore - Next.js provides the raw body as a readable stream
      body: req,
      duplex: 'half',
    });

    const responseText = await backendResponse.text();
    console.log('[UPLOAD PROXY] Backend response:', responseText.substring(0, 200));

    // Parser la réponse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[UPLOAD PROXY] Backend response not JSON:', responseText.substring(0, 500));
      return res.status(500).json({
        success: false,
        error: 'Réponse backend invalide',
        details: responseText.substring(0, 200)
      });
    }

    if (!backendResponse.ok) {
      return res.status(backendResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[UPLOAD PROXY] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    });
  }
}
