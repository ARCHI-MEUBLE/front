const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const euroWhole = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// Tous les prix affichés au client : 899 -> « 899 € », 122.375 -> « 122,38 € », 2480.5 -> « 2 480,50 € ».
// Les centimes n'apparaissent que s'il y en a, comme le prix rond du configurateur. Accepte aussi
// les montants que l'API renvoie en texte (« 72.50 »).
export function formatPrice(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return euroWhole.format(0);
  return Math.round(amount * 100) % 100 === 0 ? euroWhole.format(amount) : euro.format(amount);
}

// 0.48 -> « 0,48 »
export function formatDecimal(value: number, digits = 2): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
