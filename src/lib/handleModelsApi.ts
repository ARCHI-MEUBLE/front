// Appels au backend pour les modèles de poignées, par le proxy du site (/backend/api/... → /api/proxy/...) : même
// origine pour le navigateur, cookies de session admin transmis, statut et message d'erreur du backend conservés.
import type { AdminHandleModel, HandleModel, HandleShape } from '@/lib/configurator/handles';

export interface HandleModelInput {
  name: string;
  shape: HandleShape;
  finish_hex: string;
  // null pour un bouton (pas de longueur)
  length_mm: number | null;
  // Cotes du plan du fabricant (mm), null : proportions habituelles de la forme
  center_distance_mm?: number | null;
  width_mm?: number | null;
  projection_mm?: number | null;
  price_per_unit: number;
  image_url?: string | null;
  active?: boolean;
  position?: number;
}

export class HandleModelsApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'HandleModelsApiError';
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Réponse vide ou non JSON : le statut suffit
  }
  const body = (data ?? {}) as { error?: string };
  if (!response.ok) {
    throw new HandleModelsApiError(body.error || 'Le serveur ne répond pas, réessayez.', response.status);
  }
  return data as T;
}

const post = <T>(body: Record<string, unknown>) =>
  call<T>('/backend/api/admin/handle-models.php', { method: 'POST', body: JSON.stringify(body) });

export const handleModelsApi = {
  // Modèles actifs, pour le configurateur
  async listPublic(): Promise<HandleModel[]> {
    const res = await call<{ data?: HandleModel[] }>('/backend/api/handle-models.php');
    return res.data ?? [];
  },
  // Tous les modèles, pour l'admin
  async adminList(): Promise<AdminHandleModel[]> {
    const res = await call<{ data?: AdminHandleModel[] }>('/backend/api/admin/handle-models.php');
    return res.data ?? [];
  },
  async create(input: HandleModelInput): Promise<number> {
    const res = await post<{ id: number }>({ action: 'create', ...input });
    return res.id;
  },
  async update(id: number, changes: Partial<HandleModelInput>): Promise<void> {
    await post({ action: 'update', id, ...changes });
  },
  async remove(id: number): Promise<void> {
    await post({ action: 'delete', id });
  },
};
