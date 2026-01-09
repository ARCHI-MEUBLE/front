import { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  try {
    console.log('[GENERATE PROXY] Calling backend generate.php with body:', req.body);

    const backendResponse = await fetch(`${BACKEND_URL}/backend/api/generate.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const responseText = await backendResponse.text();
    console.log('[GENERATE PROXY] Backend response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[GENERATE PROXY] Backend response not JSON:', responseText);
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
    console.error('[GENERATE PROXY] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    });
  }
}
