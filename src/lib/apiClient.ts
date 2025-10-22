/**
 * ArchiMeuble - Client API centralisé
 * Gère toutes les communications avec le backend PHP
 * Date : 2025-10-21
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  base_price: number | null;
  image_path: string | null;
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
};

/**
 * API Client - Authentification admin
 */
export const adminAuthApi = {
  /**
   * Connexion admin
   */
  async login(email: string, password: string): Promise<{ success: boolean; admin: Admin }> {
    return request<{ success: boolean; admin: Admin }>('/api/admin-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Déconnexion admin
   */
  async logout(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/admin-auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Vérifier la session admin
   */
  async getSession(): Promise<{ admin: Admin }> {
    return request<{ admin: Admin }>('/api/admin-auth/session');
  },
};

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
    base_price?: number;
    image_path?: string;
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
    glb_url?: string;
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
 * API Client - Génération 3D
 */
export const generateApi = {
  /**
   * Générer un modèle 3D à partir d'un prompt
   */
  async generate(prompt: string): Promise<{
    success: boolean;
    glb_url: string;
    message: string;
  }> {
    return request<{ success: boolean; glb_url: string; message: string }>(
      '/api/generate',
      {
        method: 'POST',
        body: JSON.stringify({ prompt }),
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
  models: modelsApi,
  configurations: configurationsApi,
  generate: generateApi,
};

export default apiClient;
