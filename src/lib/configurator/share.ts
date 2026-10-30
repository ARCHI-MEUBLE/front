// Partage d'une configuration par lien court et QR code, et demande de projet envoyée par e-mail.
// Le backend garde le meuble seul sous un code de 8 caractères (aucune donnée sur la personne) ; le lien ouvre le
// configurateur avec ?partage=<code>. La demande de projet part par e-mail chez ArchiMeuble sans être enregistrée.

export const SHARE_QUERY_PARAM = 'partage';

const SHARE_ENDPOINT = '/backend/api/configurations/share.php';
const REQUEST_ENDPOINT = '/backend/api/configurations/request.php';
const NETWORK_ERROR = 'Connexion impossible. Vérifiez votre réseau puis réessayez.';

// Le format que « Valider » enregistre en base : dimensions, styling, features, advancedZones…
export type ConfigData = Record<string, unknown>;

export interface SharedConfiguration {
  code: string;
  configurator_id: string;
  prompt: string;
  config_data: ConfigData;
}

export interface ProjectRequest {
  name: string;
  phone: string;
  email: string;
  message: string;
  shareCode: string;
  price: number;
}

async function callBackend<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } });
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Erreur ${response.status}. Réessayez dans un instant.`);
  }
  return data as T;
}

export async function createConfigurationShare(configuratorId: string, prompt: string, configData: ConfigData): Promise<string> {
  const data = await callBackend<{ code: string }>(SHARE_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ configurator_id: configuratorId, prompt, config_data: configData }),
  });
  return data.code;
}

export async function fetchConfigurationShare(code: string): Promise<SharedConfiguration> {
  const data = await callBackend<{ share: SharedConfiguration }>(`${SHARE_ENDPOINT}?code=${encodeURIComponent(code)}`);
  return data.share;
}

export async function sendProjectRequest(request: ProjectRequest): Promise<void> {
  await callBackend(REQUEST_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      name: request.name,
      phone: request.phone,
      email: request.email,
      message: request.message,
      share_code: request.shareCode,
      price: request.price,
    }),
  });
}

export function configurationShareUrl(origin: string, configuratorId: string, code: string): string {
  const url = new URL(`/configurator/${encodeURIComponent(configuratorId)}`, origin);
  url.searchParams.set(SHARE_QUERY_PARAM, code);
  return url.toString();
}

// Valeurs à appliquer au configurateur, lues dans le format enregistré (configuration client, modèle du catalogue,
// lien partagé). Le format vient de la base : rien n'y est garanti.
export function configDataToRestore(data: any) {
  return {
    width: data.dimensions?.width,
    height: data.dimensions?.height,
    depth: data.dimensions?.depth,
    socle: data.styling?.socle || 'none',
    rootZone: data.advancedZones,
    finish: data.styling?.finish,
    color: data.styling?.color,
    colorLabel: data.styling?.colorLabel,
    colorImage: data.styling?.colorImage,
    selectedColorId: data.styling?.selectedColorId,
    useMultiColor: data.useMultiColor,
    componentColors: data.componentColors,
    doorType: data.features?.doorType,
    doorSide: data.features?.doorSide,
    mountingStyle: data.features?.mountingStyle,
    deletedPanelIds: data.deletedPanelIds,
  };
}
