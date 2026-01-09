import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8000';

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
    // Parser le fichier uploadé
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      filter: (part) => part.mimetype?.startsWith('image/') || false,
    });

    const parseForm = () => new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const { files } = await parseForm();
    const rawFile = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!rawFile || !rawFile.filepath) {
      return res.status(400).json({ success: false, error: 'Aucun fichier image fourni' });
    }

    // Créer FormData pour envoyer au backend
    const formData = new FormData();
    const fileStream = fs.createReadStream(rawFile.filepath);
    formData.append('image', fileStream, {
      filename: rawFile.originalFilename || 'image.jpg',
      contentType: rawFile.mimetype || 'image/jpeg',
    });

    // Envoyer au backend Railway
    const backendResponse = await fetch(`${BACKEND_URL}/backend/api/admin/upload-image.php`, {
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        'Cookie': req.headers.cookie || '',
      },
      body: formData,
    });

    const responseText = await backendResponse.text();

    // Nettoyer le fichier temporaire
    try {
      fs.unlinkSync(rawFile.filepath);
    } catch (e) {
      console.warn('Could not delete temp file:', e);
    }

    // Parser la réponse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Backend response not JSON:', responseText.substring(0, 500));
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
    console.error('Erreur upload image:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    });
  }
}
