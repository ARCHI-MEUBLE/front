import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Files, Fields } from 'formidable';
import fs from 'fs';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export const config = {
  api: {
    bodyParser: false,
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  try {
    console.log('[UPLOAD IMAGE] Parsing form data...');

    // Parse le formulaire multipart
    const { fields, files } = await parseForm(req);

    console.log('[UPLOAD IMAGE] Fields:', Object.keys(fields));
    console.log('[UPLOAD IMAGE] Files:', Object.keys(files));

    // Récupérer le fichier image
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!imageFile) {
      return res.status(400).json({ success: false, error: 'Aucune image fournie' });
    }

    console.log('[UPLOAD IMAGE] File:', imageFile.originalFilename, 'Size:', imageFile.size);

    // Créer le FormData pour le backend
    const formData = new FormData();
    const fileContent = fs.readFileSync(imageFile.filepath);
    const blob = new Blob([fileContent], { type: imageFile.mimetype || 'image/jpeg' });
    formData.append('image', blob, imageFile.originalFilename || 'image.jpg');

    // Envoyer au backend
    const backendResponse = await fetch(`${BACKEND_URL}/backend/api/admin/upload-image.php`, {
      method: 'POST',
      headers: {
        'Cookie': req.headers.cookie || '',
      },
      body: formData,
    });

    // Nettoyer le fichier temporaire
    try {
      fs.unlinkSync(imageFile.filepath);
    } catch (e) {
      // Ignorer les erreurs de nettoyage
    }

    const responseText = await backendResponse.text();
    console.log('[UPLOAD IMAGE] Backend response:', responseText.substring(0, 300));

    // Parser la réponse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[UPLOAD IMAGE] Backend response not JSON:', responseText.substring(0, 500));
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
    console.error('[UPLOAD IMAGE] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    });
  }
}
