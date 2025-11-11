/**
 * Formate une date en heure locale française (Europe/Paris)
 * Convertit automatiquement depuis UTC si nécessaire
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—';

  // Ajouter 'Z' pour indiquer que c'est UTC si pas déjà présent
  const dateToFormat = dateString.includes('Z') || dateString.includes('+')
    ? dateString
    : dateString.replace(' ', 'T') + 'Z';

  return new Date(dateToFormat).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });
}

/**
 * Formate une date sans l'heure
 */
export function formatDateOnly(dateString: string): string {
  if (!dateString) return '—';

  const dateToFormat = dateString.includes('Z') || dateString.includes('+')
    ? dateString
    : dateString.replace(' ', 'T') + 'Z';

  return new Date(dateToFormat).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  });
}

/**
 * Formate une date avec un format plus long
 */
export function formatDateLong(dateString: string): string {
  if (!dateString) return '—';

  const dateToFormat = dateString.includes('Z') || dateString.includes('+')
    ? dateString
    : dateString.replace(' ', 'T') + 'Z';

  return new Date(dateToFormat).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });
}
