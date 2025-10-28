import Head from "next/head";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useMemo, useState } from "react";

type OpeningHours = {
  day: string; // Lundi, Mardi, ...
  open: string; // "09:00"
  close: string; // "18:00"
  closed?: boolean; // fermé
};

type Showroom = {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  phone?: string;
  email?: string;
  services?: string[]; // ex: "Sur-mesure", "Pose", "Conseil déco"
  openingHours?: OpeningHours[];
  imageUrl?: string;
  bookingUrl?: string; // lien prise de RDV si externe
};

const DEFAULT_SHOWROOMS: Showroom[] = [
  {
    id: "paris-11",
    name: "Showroom Paris 11",
    address: "12 Rue Oberkampf",
    postalCode: "75011",
    city: "Paris",
    country: "France",
    lat: 48.8639,
    lng: 2.3700,
    phone: "+33 1 23 45 67 89",
    email: "paris11@archimeuble.fr",
    services: ["Sur-mesure", "Pose", "Conseil déco"],
    openingHours: [
      { day: "Lun.", open: "10:00", close: "19:00" },
      { day: "Mar.", open: "10:00", close: "19:00" },
      { day: "Mer.", open: "10:00", close: "19:00" },
      { day: "Jeu.", open: "10:00", close: "19:00" },
      { day: "Ven.", open: "10:00", close: "19:00" },
      { day: "Sam.", open: "10:00", close: "18:00" },
      { day: "Dim.", open: "", close: "", closed: true },
    ],
    imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=60",
  },
  {
    id: "lyon-centre",
    name: "Showroom Lyon Centre",
    address: "5 Place Bellecour",
    postalCode: "69002",
    city: "Lyon",
    country: "France",
    lat: 45.7578,
    lng: 4.8320,
    phone: "+33 4 12 34 56 78",
    email: "lyon@archimeuble.fr",
    services: ["Sur-mesure", "Conseil déco"],
    openingHours: [
      { day: "Lun.", open: "10:00", close: "19:00" },
      { day: "Mar.", open: "10:00", close: "19:00" },
      { day: "Mer.", open: "10:00", close: "19:00" },
      { day: "Jeu.", open: "10:00", close: "19:00" },
      { day: "Ven.", open: "10:00", close: "19:00" },
      { day: "Sam.", open: "10:00", close: "18:00" },
      { day: "Dim.", open: "", close: "", closed: true },
    ],
    imageUrl: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=60",
  },
];

export default function ShowroomsPage() {
  const [query, setQuery] = useState("");
  const [showrooms, setShowrooms] = useState<Showroom[]>(DEFAULT_SHOWROOMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/showrooms', { cache: 'no-store' });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setShowrooms(data as Showroom[]);
        }
      } catch (e) {
        // fallback silencieux sur DEFAULT_SHOWROOMS
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return showrooms;
    return showrooms.filter((s) =>
      [s.name, s.city, s.address, s.postalCode].some((v) => v.toLowerCase().includes(q))
    );
  }, [query, showrooms]);

  const jsonLd = buildLocalBusinessJsonLd(showrooms);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-[#1E1E1E]">
      <Head>
        <title>Showrooms — ArchiMeuble</title>
        <meta name="description" content="Trouver un showroom ArchiMeuble près de chez vous" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-start px-4 py-10">
        {/* Hero */}
        <section className="w-full max-w-6xl">
          <h1 className="mb-3 text-4xl font-bold">Trouvez votre showroom</h1>
          <p className="mb-6 max-w-2xl text-gray-600">
            Venez découvrir nos matériaux, toucher les finitions et rencontrer nos concepteurs dans l’un de nos showrooms.
          </p>
          <div className="mb-8 flex max-w-xl items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            <svg className="ml-2 h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd"/></svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une ville, une adresse..."
              className="w-full rounded-lg p-3 outline-none"
            />
          </div>
        </section>

        {/* Liste */}
        <section className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
          {loading && (
            <div className="col-span-full rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
              Chargement des showrooms...
            </div>
          )}
          {filtered.map((s) => (
            <ShowroomCard key={s.id} showroom={s} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
              Aucun showroom ne correspond à votre recherche.
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ShowroomCard({ showroom }: { showroom: Showroom }) {
  const mapSrc = showroom.lat && showroom.lng
    ? `https://www.google.com/maps?q=${showroom.lat},${showroom.lng}&z=15&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(`${showroom.address} ${showroom.postalCode} ${showroom.city}`)}&z=14&output=embed`;

  const itineraryHref = showroom.lat && showroom.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${showroom.lat},${showroom.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${showroom.address} ${showroom.postalCode} ${showroom.city}`)}`;

  const telHref = showroom.phone ? `tel:${showroom.phone.replace(/\s+/g, '')}` : undefined;
  const mailHref = showroom.email ? `mailto:${showroom.email}` : undefined;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:shadow-xl">
      {showroom.imageUrl && (
        <div className="h-40 w-full overflow-hidden">
          <img src={showroom.imageUrl} alt={showroom.name} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold">{showroom.name}</h3>
        <p className="mt-1 text-gray-600">
          {showroom.address}, {showroom.postalCode} {showroom.city}
        </p>
        {showroom.services && (
          <div className="mt-3 flex flex-wrap gap-2">
            {showroom.services.map((svc) => (
              <span key={svc} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                {svc}
              </span>
            ))}
          </div>
        )}

        {/* Horaires */}
        {showroom.openingHours && (
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
            {showroom.openingHours.map((h) => (
              <div key={h.day} className="flex items-center justify-between border-b border-dashed border-gray-100 py-1">
                <span className="text-gray-500">{h.day}</span>
                <span className="font-medium">{h.closed ? 'Fermé' : `${h.open} - ${h.close}`}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={itineraryHref} target="_blank" rel="noreferrer" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
            Itinéraire
          </a>
          {telHref && (
            <a href={telHref} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Appeler
            </a>
          )}
          {mailHref && (
            <a href={mailHref} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Écrire
            </a>
          )}
          <a href={showroom.bookingUrl || `/contact?showroom=${encodeURIComponent(showroom.name)}`} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
            Prendre RDV
          </a>
        </div>
      </div>
      {/* Carte */}
      <div className="h-56 w-full">
        <iframe src={mapSrc} className="h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
    </article>
  );
}

function buildLocalBusinessJsonLd(showrooms: Showroom[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Showrooms ArchiMeuble',
    hasPart: showrooms.map((s) => ({
      '@type': 'Store',
      name: s.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: s.address,
        postalCode: s.postalCode,
        addressLocality: s.city,
        addressCountry: s.country,
      },
      telephone: s.phone,
      url: `https://archimeuble.fr/showrooms#${s.id}`,
      geo: s.lat && s.lng ? { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng } : undefined,
      openingHoursSpecification: s.openingHours?.filter(h=>!h.closed).map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: mapDayToSchema(h.day),
        opens: h.open,
        closes: h.close,
      })),
    })),
  };
}

function mapDayToSchema(day: string) {
  const map: Record<string, string> = {
    'Lun.': 'Monday',
    'Mar.': 'Tuesday',
    'Mer.': 'Wednesday',
    'Jeu.': 'Thursday',
    'Ven.': 'Friday',
    'Sam.': 'Saturday',
    'Dim.': 'Sunday',
  };
  return map[day] || 'Monday';
}
