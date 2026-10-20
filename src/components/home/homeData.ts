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
