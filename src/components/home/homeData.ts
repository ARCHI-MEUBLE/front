export interface SwatchData {
  name: string;
  file: string;
  hex: string;
}

export const SWATCHES: SwatchData[] = [
  { name: "Bleu minéral", file: "armoire_bleu.png", hex: "#5E7D96" },
  { name: "Ambre solaire", file: "armoire_jaune.png", hex: "#D9A441" },
  { name: "Blanc opalin", file: "armoire_blanc_clair.png", hex: "#F1EEE6" },
  { name: "Bleu nuit velours", file: "armoire_bleu_nuit.png", hex: "#22304A" },
  { name: "Blush pêche", file: "armoire_peche.png", hex: "#E8B9A2" },
  { name: "Chêne naturel", file: "armoire.jpg", hex: "#C49A6C" },
  { name: "Gris galet", file: "armoire_grise.png", hex: "#9A9790" },
  { name: "Kaki organique", file: "armoire_kaki.png", hex: "#7C7A4E" },
  { name: "Noir profond", file: "armoire_noire.png", hex: "#1C1C1C" },
  { name: "Noisette caramélisée", file: "armoire_brun2.png", hex: "#9C6B45" },
  { name: "Noyer fumé", file: "armoire_brun_foncé.png", hex: "#5A3E2E" },
  { name: "Pourpre impérial", file: "armoire_pourpre.png", hex: "#6E2B4F" },
  { name: "Prune velours", file: "armoire_violet_foncé.png", hex: "#4A2A45" },
  { name: "Rouge grenat", file: "armoire_rouge.png", hex: "#8E2B2B" },
  { name: "Saule poudré", file: "armoire_vert2.png", hex: "#A9B69A" },
  { name: "Terracotta solaire", file: "armoire_orange.png", hex: "#C1673F" },
  { name: "Turquoise lagon", file: "armoire_turquoise.png", hex: "#3F8F8C" },
  { name: "Vert forêt profonde", file: "armoire_vert_foncé.png", hex: "#2E4535" },
  { name: "Vert sauge", file: "armoire_verte.png", hex: "#8FA38A" },
  { name: "Violet brumeux", file: "armoire_violet.png", hex: "#8C7A9E" },
];

export function swatchImage(file: string): string {
  return "/images/photos_meuble_couleur/" + file;
}

export const PROCESS: { title: string; tag: string; text: string; image: string }[] = [
  { title: "Demande", tag: "J+0", text: "À réception de la demande, un chargé de projet est attribué.", image: "https://images.unsplash.com/photo-1687422810663-c316494f725a?auto=format&fit=crop&w=900&q=70" },
  { title: "Maquette 3D", tag: "Devis", text: "Une maquette 3D et un devis détaillé sont transmis pour servir de base à l'affinage du projet.", image: "https://images.unsplash.com/photo-1659930087003-2d64e33181f7?auto=format&fit=crop&w=900&q=70" },
  { title: "Prise de mesures", tag: "Sur place", text: "Après validation du devis, une prise de mesures précises est effectuée sur place.", image: "https://images.unsplash.com/photo-1638718260002-18bdc8082608?auto=format&fit=crop&w=900&q=70" },
  { title: "Production", tag: "30 jours", text: "Les découpes et les perçages sont faits en usine. 30 jours plus tard, le meuble est prêt.", image: "https://images.unsplash.com/photo-1547609434-b732edfee020?auto=format&fit=crop&w=900&q=70" },
  { title: "Pose", tag: "Finitions", text: "La pose et les finitions sont réalisées sur place pour une intégration parfaite.", image: "https://images.unsplash.com/photo-1631396326838-de37e5f8bcbc?auto=format&fit=crop&w=900&q=70" },
];

export const TESTIMONIALS: { quote: string; name: string; city: string; rating: number; avatarParams: string }[] = [
  { quote: "Un travail remarquable du début à la fin. Notre bibliothèque s'intègre parfaitement dans le salon, comme si elle avait toujours été là.", name: "Marie-Claire D.", city: "Lille", rating: 5, avatarParams: "&hair=variant02&beardProbability=0" },
  { quote: "Le configurateur en ligne est vraiment bien fait. J'ai pu visualiser mon dressing avant de commander.", name: "Thomas L.", city: "Roubaix", rating: 4, avatarParams: "&hair=variant05&beardProbability=0" },
  { quote: "Livraison dans les temps et pose impeccable. Les menuisiers sont arrivés à l'heure et ont tout nettoyé en partant.", name: "Sophie M.", city: "Marcq-en-Barœul", rating: 5, avatarParams: "&hair=variant23&beardProbability=0" },
  { quote: "Rapport qualité-prix excellent. On a comparé avec d'autres artisans et ArchiMeuble était le plus compétitif.", name: "Jean-Pierre B.", city: "Tourcoing", rating: 4, avatarParams: "&hair=variant25&beardProbability=100" },
  { quote: "Le meuble sous l'escalier a transformé notre entrée. Chaque centimètre est utilisé, on ne pensait pas pouvoir ranger autant.", name: "Camille R.", city: "Lambersart", rating: 4, avatarParams: "&hair=variant41&beardProbability=0" },
  { quote: "Très bon suivi du chargé de projet, toujours joignable. La maquette 3D nous a aidés à trancher entre deux finitions.", name: "Nicolas V.", city: "Villeneuve-d'Ascq", rating: 5, avatarParams: "&hair=variant13&beardProbability=100" },
  { quote: "Notre placard mansardé épouse parfaitement la pente du toit. Finitions soignées, rien à redire.", name: "Élodie F.", city: "La Madeleine", rating: 5, avatarParams: "&hair=variant46&beardProbability=0" },
  { quote: "Délai de 30 jours respecté comme annoncé. Le bureau sur mesure est solide et très beau.", name: "Karim H.", city: "Croix", rating: 4, avatarParams: "&hair=variant49&beardProbability=0" },
];

export function avatarUrl(name: string, params: string): string {
  return "https://api.dicebear.com/9.x/notionists/svg?backgroundColor=edebe4&seed=" + encodeURIComponent(name) + params;
}

export const CITIES: string[] = ["Lille", "Roubaix", "Tourcoing", "Villeneuve d'Ascq", "La Madeleine", "Marcq-en-Barœul", "Lambersart", "Croix", "Wasquehal", "Mons-en-Barœul", "Loos"];

export const FAQ: { q: string; a: string }[] = [
  { q: "Comment se passe une demande de devis ?", a: "À réception de votre demande, un chargé de projet vous est attribué. Il vous transmet une maquette 3D et un devis détaillé, qui servent de base pour affiner le projet ensemble." },
  { q: "Quels types de meubles fabriquez-vous ?", a: "Dressings, bibliothèques, buffets, bureaux, meubles TV et placards, tous dessinés sur mesure pour votre espace." },
  { q: "Quel est le délai de fabrication ?", a: "Après validation du devis et prise de mesures sur place, les découpes et perçages sont faits en usine. Le meuble est prêt environ 30 jours plus tard." },
  { q: "Vous occupez-vous de la pose ?", a: "Oui. La pose et les finitions sont réalisées sur place par nos soins pour une intégration parfaite." },
  { q: "Où intervenez-vous ?", a: "À Lille et dans la métropole lilloise : Roubaix, Tourcoing, Villeneuve d'Ascq, Marcq-en-Barœul et alentours. Si votre ville n'est pas listée, contactez-nous : il est possible que nous nous déplacions tout de même." },
  { q: "Puis-je voir les teintes avant de commander ?", a: "Oui, vous pouvez commander des échantillons pour voir la teinte et la finition chez vous, à la lumière de votre intérieur." },
  { q: "Pouvez-vous reproduire un meuble vu ailleurs ?", a: "Envoyez-nous une photo ou une vidéo du meuble qui vous inspire, et nous vous ferons un devis personnalisé pour le reproduire sur mesure." },
];

export const PRODUCTS: string[] = ["Dressings", "Bibliothèques", "Buffets", "Bureaux", "Meubles TV", "Placards"];
