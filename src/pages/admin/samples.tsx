import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient, type SampleType, uploadImage } from '@/lib/apiClient';
import type { GetServerSideProps } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  if (!hasAdminSession(req.headers.cookie)) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }
  return { props: {} };
};

export default function AdminSamplesPage() {
  const router = useRouter();
  const [items, setItems] = useState<SampleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.samples.adminList();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const byMaterial = useMemo(() => {
    const map: Record<string, SampleType[]> = {};
    for (const t of items) {
      const key = t.material || 'Autre';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [items]);

  return (
    <div className="min-h-screen bg-bg-light text-text-primary">
      <Head>
        <title>Admin — Échantillons</title>
      </Head>
      {/* Header admin minimal pour revenir au dashboard */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">Espace administrateur</p>
            <h1 className="text-xl font-semibold text-gray-900">Échantillons</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>Terminer</span>
            </button>
          </div>
        </div>
      </header>
      <div className="section-container">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-ink">Gestion des échantillons</h1>
          <p className="mt-2 text-text-secondary text-sm">Ajoutez/retirez des types et leurs couleurs. Ces éléments apparaissent sur la page publique Échantillons.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            {loading ? (
              <div className="card">Chargement…</div>
            ) : error ? (
              <div className="alert alert-error">{error}</div>
            ) : (
              Object.entries(byMaterial).map(([material, list]) => (
                <MaterialSection key={material} title={material} list={list} onChanged={reload} />
              ))
            )}
          </div>

          <aside className="space-y-6">
            <CreateTypeCard onCreated={reload} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function MaterialSection({ title, list, onChanged }: { title: string; list: SampleType[]; onChanged: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dx: number) => ref.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-ink">{title}</h2>
        <div className="hidden sm:flex items-center gap-2">
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => scrollBy(-480)} aria-label="Défiler à gauche">◀</button>
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => scrollBy(480)} aria-label="Défiler à droite">▶</button>
        </div>
      </div>
      <div ref={ref} className="overflow-x-auto pb-2">
        <div className="flex gap-3 snap-x snap-mandatory">
          {list.map((t) => (
            <div key={t.id} className="snap-start min-w-[300px] sm:min-w-[360px] max-w-[360px] shrink-0">
              <TypeRow type={t} onChanged={onChanged} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CreateTypeCard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [material, setMaterial] = useState('Aggloméré');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.samples.createType({ name, material, description });
      setName(''); setDescription(''); setMaterial('Aggloméré');
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card">
      <h3 className="text-base font-semibold text-ink">Nouveau type</h3>
      <div className="mt-4 space-y-4">
        <div>
          <label className="label">Nom</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Matériau</label>
          <select className="select" value={material} onChange={(e) => setMaterial(e.target.value)}>
            <option>Aggloméré</option>
            <option>MDF + revêtement (mélaminé)</option>
            <option>Plaqué bois</option>
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving}>{saving ? 'Création…' : 'Créer'}</button>
        </div>
      </div>
    </form>
  );
}

function TypeRow({ type, onChanged }: { type: SampleType; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'image'|'hex'>('image');
  const [hex, setHex] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const addColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'image' && !file) {
      alert('Veuillez sélectionner une image pour la couleur.');
      return;
    }
    if (mode === 'hex') {
      const value = hex.trim();
      if (!/^#?[0-9a-fA-F]{6}$/.test(value)) {
        alert('Veuillez saisir une valeur hexadécimale valide (ex: #aabbcc).');
        return;
      }
    }
    setSaving(true);
    try {
      // Utiliser le nom du TYPE comme nom de la couleur (ex: "Bleuet")
      const derivedName = (type.name || 'Couleur').trim();
      if (mode === 'image') {
        const image_url = await uploadImage(file as File);
        await apiClient.samples.createColor({ type_id: type.id, name: derivedName, image_url });
        setFile(null);
      } else {
        const normalized = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
        await apiClient.samples.createColor({ type_id: type.id, name: derivedName, hex: normalized });
        setHex('');
      }
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const removeType = async () => {
    if (!confirm(`Supprimer le type "${type.name}" ?`)) return;
    setRemoving(true);
    try {
      await apiClient.samples.deleteType(type.id);
      onChanged();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-ink font-semibold">{type.name}</div>
          <div className="text-xs text-text-tertiary">{type.material}</div>
          {type.description ? (
            <div className="mt-1 text-sm text-text-secondary">{type.description}</div>
          ) : null}
        </div>
        <button onClick={removeType} className="btn-secondary text-sm" disabled={removing}>{removing ? 'Suppression…' : 'Supprimer'}</button>
      </div>

      {/* Liste des couleurs — défilement horizontal compact */}
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex gap-3">
          {type.colors?.map((c) => (
            <div key={c.id} className="relative flex w-24 flex-col items-center">
              <button
                title="Retirer"
                className="absolute -top-1 -right-1 z-10 rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-error shadow hover:bg-white"
                onClick={async () => { await apiClient.samples.deleteColor(c.id); onChanged(); }}
              >
                ×
              </button>
              <div className="h-16 w-16 overflow-hidden rounded-xl border border-border-light bg-white shadow-sm">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div style={{ backgroundColor: c.hex || '#EEE', width: '100%', height: '100%' }} />
                )}
              </div>
              <div className="mt-2 text-[11px] font-semibold tracking-wide text-ink/90 uppercase text-center max-w-[7rem] truncate" title={c.name}>
                {c.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire ajout couleur (image OU HEX) */}
      <form onSubmit={addColor} className="mt-4 space-y-3">
        {/* Sélecteur de méthode sous forme de segments */}
        <div className="flex items-center gap-2">
          <div className="inline-flex w-44 rounded-full border border-border-light bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('image')}
              className={`flex-1 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-center transition-colors ${mode==='image' ? 'bg-ink text-white' : 'text-stone hover:bg-ink/5'}`}
              aria-pressed={mode==='image'}
              title="Ajouter via image"
            >
              Image
            </button>
            <button
              type="button"
              onClick={() => setMode('hex')}
              className={`flex-1 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-center transition-colors ${mode==='hex' ? 'bg-ink text-white' : 'text-stone hover:bg-ink/5'}`}
              aria-pressed={mode==='hex'}
              title="Ajouter via code hexadécimal"
            >
              HEX
            </button>
          </div>
          <span className="text-xs text-text-tertiary">Choisissez la méthode pour ajouter la couleur</span>
        </div>

        {/* Zone de saisie selon le mode */}
        {mode === 'image' ? (
          <div className="flex items-center gap-4 flex-wrap">
            {/* input file custom */}
            <input
              id={`file-${type.id}`}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor={`file-${type.id}`} className="inline-flex items-center rounded-lg border border-border-light bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm hover:bg-gray-50 cursor-pointer">
              Choisir une image
            </label>
            <span className="text-sm text-ink/60 max-w-[220px] truncate">{file?.name || 'Aucun fichier sélectionné'}</span>
            <div className="h-10 w-10 overflow-hidden rounded border border-border-light bg-white">
              {file ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(file)} alt="Prévisualisation" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="label !mb-0 text-xs text-text-tertiary">Code</label>
              <input
                className="input w-40 sm:w-56"
                placeholder="#aabbcc"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="label !mb-0 text-xs text-text-tertiary">Aperçu</label>
              <input
                type="color"
                aria-label="Choisir la couleur"
                className="h-10 w-10 rounded border border-border-light bg-white p-0"
                value={(hex?.trim().startsWith('#') ? hex.trim() : `#${hex?.trim() || 'ffffff'}`)}
                onChange={(e) => setHex(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-1">
          <button className="btn-primary" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter'}</button>
        </div>
      </form>
    </div>
  );
}
