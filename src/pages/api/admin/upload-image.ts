import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'catalogue');
      if (!fs.existsSync(uploadDir)) {
        try {
          fs.mkdirSync(uploadDir, { recursive: true });
        } catch (mkdirError: any) {
          console.error('Erreur mkdirSync:', mkdirError);
          // Si on ne peut pas créer le dossier, c'est peut-être un problème de permissions
        }
      }

      const form = formidable({
      uploadDir,
      keepExtensions: true,
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
      return res.status(400).json({ success: false, error: 'Aucun fichier image fourni ou chemin invalide' });
    }

    // Vérifier si le fichier source existe avant le renommage
    if (!fs.existsSync(rawFile.filepath)) {
      console.error('Fichier temporaire introuvable:', rawFile.filepath);
      return res.status(500).json({ success: false, error: 'Erreur lors de la réception du fichier' });
    }

    const extension = path.extname(rawFile.originalFilename || 'image.jpg');
    const filename = `catalogue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
    const filepath = path.join(uploadDir, filename);

    try {
      fs.renameSync(rawFile.filepath, filepath);
    } catch (renameError: any) {
      console.error('Erreur renameSync:', renameError);
      // Tentative de copie si le renommage échoue (problème possible entre partitions / volumes)
      try {
        fs.copyFileSync(rawFile.filepath, filepath);
        fs.unlinkSync(rawFile.filepath);
      } catch (copyError: any) {
        console.error('Erreur copyFileSync:', copyError);
        return res.status(500).json({ success: false, error: 'Échec de l\'enregistrement final de l\'image: ' + copyError.message });
      }
    }

    const relativeUrl = `/uploads/catalogue/${filename}`;

    return res.status(201).json({
      success: true,
      message: 'Image uploadée avec succès',
      url: relativeUrl,
      filename,
    });
  } catch (error: any) {
    console.error('Erreur upload image catalogue:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur interne du serveur' });
  }
}
