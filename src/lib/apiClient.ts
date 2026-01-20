/**
 * ArchiMeuble - Client API centralisé
 * Gère toutes les communications avec le backend PHP
 * Date : 2025-10-21
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Interface pour les réponses d'erreur
 */
interface ApiError {
  error: string;
}

/**
 * Interface pour les modèles de meubles
 */
export interface FurnitureModel {
  id: number;
  name: string;
  description: string | null;
  prompt: string;
  price: number | null;
  image_url: string | null;
  hover_image_url: string | null;
  created_at: string;
}

/**
 * Interface pour les utilisateurs
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Interface pour les admins
 */
export interface Admin {
  email: string;
}

/**
 * Interface pour les configurations
 */
export interface Configuration {
  id: number;
  user_id: string | null;
  user_session: string | null;
  template_id: number | null;
  config_string: string | null;
  prompt: string;
  price: number;
  glb_url: string | null;
  created_at: string;
}

/**
 * Classe d'erreur personnalisée pour les erreurs API
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Fonction utilitaire pour faire des requêtes HTTP
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    credentials: 'include', // Important pour les cookies de session
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiClientError(
        data.error || `Erreur HTTP ${response.status}`,
        response.status,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Erreur réseau inconnue'
    );
  }
}

/**
 * Fonction utilitaire pour faire des requêtes vers les API routes Next.js
 * N'ajoute PAS de préfixe API_BASE_URL car les routes Next.js sont locales
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(endpoint, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiClientError(
        data.error || `Erreur HTTP ${response.status}`,
        response.status,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Erreur réseau inconnue'
    );
  }
}

/**
 * API Client - Authentification utilisateur
 */
export const authApi = {
  /**
   * Connexion utilisateur
   */
  async login(email: string, password: string): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Inscription utilisateur
   */
  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  /**
   * Vérifier la session utilisateur
   */
  async getSession(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/session');
  },

  /**
   * Déconnexion utilisateur
   */
  async logout(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/auth/logout', {
      method: 'DELETE',
    });
  },

  /**
   * Changer le mot de passe
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  /**
   * Demande de réinitialisation de mot de passe
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Réinitialisation du mot de passe
   */
  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
};

/**
 * API Client - Authentification admin
 */
export const adminAuthApi = {
  /**
   * Connexion admin
   */
  async login(email: string, password: string): Promise<{ success: boolean; admin: Admin }> {
    return request<{ success: boolean; admin: Admin }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Déconnexion admin
   */
  async logout(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/admin/logout', {
      method: 'POST',
    });
  },

  /**
   * Vérifier la session admin
   */
  async getSession(): Promise<{ admin: Admin }> {
    return request<{ admin: Admin }>('/api/admin/session');
  },
};

/**
 * API Client - Catégories
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export const categoriesApi = {
  /**
   * Récupérer toutes les catégories
   */
  async getAll(onlyActive: boolean = false): Promise<Category[]> {
    const url = onlyActive ? '/api/categories?active=true' : '/api/categories';
    const response = await request<{ categories: Category[] }>(url);
    return response.categories;
  },

  /**
   * Récupérer une catégorie par son ID
   */
  async getById(id: number): Promise<Category> {
    return request<Category>(`/api/categories?id=${id}`);
  },

  /**
   * Créer une nouvelle catégorie (admin uniquement)
   */
  async create(category: {
    name: string;
    slug?: string;
    description?: string;
    image_url?: string;
    display_order?: number;
    is_active?: boolean;
  }): Promise<{ success: boolean; category: Category }> {
    return request<{ success: boolean; category: Category }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  /**
   * Mettre à jour une catégorie (admin uniquement)
   */
  async update(
    id: number,
    data: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; category: Category }> {
    return request<{ success: boolean; category: Category }>('/api/categories', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    });
  },

  /**
   * Supprimer une catégorie (admin uniquement)
   */
  async delete(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/categories', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  /**
   * Réorganiser l'ordre des catégories (admin uniquement)
   */
  async reorder(categoryIds: number[]): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/categories', {
      method: 'PUT',
      body: JSON.stringify({ action: 'reorder', categoryIds }),
    });
  },
};

/**
 * API Client - Échantillons
 */
export interface SampleColor {
  id: number;
  type_id: number;
  name: string;
  hex: string | null;
  image_url: string | null;
  active: number;
  position: number;
  price_per_m2: number;
  unit_price: number;
}

export interface SampleType {
  id: number;
  name: string;
  material: string;
  description: string | null;
  active: number;
  position: number;
  price_per_m2?: number; // Optionnel maintenant
  unit_price?: number;  // Optionnel maintenant
  colors: SampleColor[];
}

export const samplesApi = {
  async listPublic(): Promise<Record<string, SampleType[]>> {
    const res = await apiRequest<{ success: boolean; materials: Record<string, SampleType[]> }>(
      '/api/samples'
    );
    return res.materials || {};
  },

  // Admin endpoints
  async adminList(): Promise<SampleType[]> {
    const res = await apiRequest<{ success: boolean; data: SampleType[] }>(
      '/api/admin/samples'
    );
    return res.data;
  },

  async createType(payload: { 
    name: string; 
    material: string; 
    description?: string; 
    position?: number;
    price_per_m2?: number;
    unit_price?: number;
  }): Promise<{ success: boolean; id: number }> {
    return apiRequest('/api/admin/samples', {
      method: 'POST',
      body: JSON.stringify({ action: 'create_type', ...payload }),
    });
  },

  async updateType(id: number, payload: Partial<Pick<SampleType, 'name'|'material'|'description'|'active'|'position'|'price_per_m2'|'unit_price'>>): Promise<{ success: boolean }> {
    return apiRequest('/api/admin/samples', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_type', id, ...payload }),
    });
  },

  async deleteType(id: number): Promise<{ success: boolean }> {
    return apiRequest('/api/admin/samples', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete_type', id }),
    });
  },

  async createColor(payload: { 
    type_id: number; 
    name: string; 
    hex?: string; 
    image_url?: string; 
    position?: number;
    price_per_m2?: number;
    unit_price?: number;
  }): Promise<{ success: boolean; id: number }> {
    return apiRequest('/api/admin/samples', {
      method: 'POST',
      body: JSON.stringify({ action: 'create_color', ...payload }),
    });
  },

  async updateColor(id: number, payload: Partial<Pick<SampleColor, 'name'|'hex'|'image_url'|'active'|'position'|'price_per_m2'|'unit_price'>>): Promise<{ success: boolean }> {
    return apiRequest('/api/admin/samples', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_color', id, ...payload }),
    });
  },

  async deleteColor(id: number): Promise<{ success: boolean }> {
    return apiRequest('/api/admin/samples', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete_color', id }),
    });
  },
};

/** Upload utilitaire pour images (admin) */
export async function uploadImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const fileType = file.type || 'image/jpeg';

  const res = await apiRequest<{ success: boolean; imagePath: string }>('/api/admin/upload', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, fileType, data: base64 }),
  });
  return res.imagePath;
}

/**
 * API Client - Modèles de meubles
 */
export const modelsApi = {
  /**
   * Récupérer tous les modèles
   */
  async getAll(): Promise<FurnitureModel[]> {
    const response = await request<{ models: FurnitureModel[] }>('/api/models');
    return response.models;
  },

  /**
   * Récupérer un modèle par son ID
   */
  async getById(id: number): Promise<FurnitureModel> {
    return request<FurnitureModel>(`/api/models?id=${id}`);
  },

  /**
   * Créer un nouveau modèle (admin uniquement)
   */
  async create(model: {
    name: string;
    description?: string;
    prompt: string;
    price?: number;
    image_url?: string;
  }): Promise<{ success: boolean; id: number }> {
    return request<{ success: boolean; id: number }>('/api/models', {
      method: 'POST',
      body: JSON.stringify(model),
    });
  },

  /**
   * Mettre à jour un modèle (admin uniquement)
   */
  async update(
    id: number,
    data: Partial<Omit<FurnitureModel, 'id' | 'created_at'>>
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/models', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    });
  },

  /**
   * Supprimer un modèle (admin uniquement)
   */
  async delete(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/models', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },
};

/**
 * API Client - Configurations
 */
export const configurationsApi = {
  /**
   * Récupérer toutes les configurations
   */
  async getAll(): Promise<{ success: boolean; count: number; data: Configuration[] }> {
    return request<{ success: boolean; count: number; data: Configuration[] }>(
      '/api/configurations'
    );
  },

  /**
   * Récupérer une configuration par ID
   */
  async getById(id: number): Promise<{ success: boolean; data: Configuration }> {
    return request<{ success: boolean; data: Configuration }>(
      `/api/configurations?id=${id}`
    );
  },

  /**
   * Récupérer les configurations par session
   */
  async getBySession(
    sessionId: string
  ): Promise<{ success: boolean; count: number; data: Configuration[] }> {
    return request<{ success: boolean; count: number; data: Configuration[] }>(
      `/api/configurations?session=${sessionId}`
    );
  },

  /**
   * Créer une nouvelle configuration
   */
  async create(config: {
    user_session: string;
    prompt: string;
    price: number;
    glb_url?: string | null;
    metadata?: any; // Metadata optionnelles pour configuration enrichie
  }): Promise<{ success: boolean; message: string; id: number }> {
    return request<{ success: boolean; message: string; id: number }>(
      '/api/configurations',
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    );
  },
};

/**
 * Interface pour les couleurs multi-composants
 */
export interface FurnitureColors {
  structure?: string;  // Corps du meuble (planches verticales/horizontales)
  drawers?: string;    // Tiroirs
  doors?: string;      // Portes
  base?: string;       // Socle/base
  shelves?: string;    // Étagères
  back?: string;       // Fond
}

/**
 * API Client - Génération 3D
 */
export const generateApi = {
  /**
   * Générer un modèle 3D à partir d'un prompt
   * @param prompt Le prompt de génération du meuble
   * @param closed Mode fermé (true = sans portes, false = avec portes)
   * @param color Couleur hex optionnelle unique (ex: "#D8C7A1") - legacy
   * @param colors Couleurs multi-composants optionnelles
   * @param deletedPanels Liste des IDs de panneaux à exclure du DXF
   */
  async generate(
    prompt: string,
    closed: boolean = false,
    color?: string,
    colors?: FurnitureColors,
    deletedPanels?: string[]
  ): Promise<{
    success: boolean;
    glb_url: string;
    dxf_url?: string;
    message: string;
  }> {
    const body: any = { prompt, closed };

    // Priorité aux multi-couleurs, sinon couleur unique
    if (colors && Object.keys(colors).length > 0) {
      body.colors = colors;
    } else if (color) {
      body.color = color;
    }

    // Panneaux supprimés pour le DXF
    if (deletedPanels && deletedPanels.length > 0) {
      body.deletedPanels = deletedPanels;
    }

    return request<{ success: boolean; glb_url: string; dxf_url?: string; message: string }>(
      '/api/generate',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },
};

/**
 * Export de l'API client complet
 */
export const apiClient = {
  auth: authApi,
  adminAuth: adminAuthApi,
  categories: categoriesApi,
  models: modelsApi,
  configurations: configurationsApi,
  generate: generateApi,
  samples: samplesApi,
};

export default apiClient;
