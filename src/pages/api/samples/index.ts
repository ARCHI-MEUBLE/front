import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API Route: /api/samples
 * Proxy vers le backend PHP pour récupérer les échantillons
 * Transforme les données pour correspondre à la structure attendue par le frontend
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/backend/api/samples/index.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    // Lire le texte brut puis parser pour éviter les problèmes d'encodage
    const text = await response.text();
    const backendData = JSON.parse(text);

    console.log('🔧 [API] Données du backend:', JSON.stringify(backendData).substring(0, 500));

    // Le backend retourne: { success: true, materials: [{ name: "Matériau", types: [...] }] }
    // On transforme en: { success: true, materials: { "Matériau": [...types...] } }

    const materials: Record<string, any[]> = {};

    if (backendData.materials && Array.isArray(backendData.materials)) {
      for (const material of backendData.materials) {
        materials[material.name] = material.types || [];
      }
    }

    return res.status(200).json({
      success: true,
      materials
    });
  } catch (error) {
    console.error('Error fetching samples:', error);
    return res.status(500).json({
      error: 'Failed to fetch samples',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
