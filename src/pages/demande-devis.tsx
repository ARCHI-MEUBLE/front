import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Video, Upload, X, Check, ArrowRight, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function DemandeDevisPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    description: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isUnder10MB = file.size <= 10 * 1024 * 1024;

        if (!isImage && !isVideo) {
          setError(`${file.name}: Format non supporté. Utilisez des images ou vidéos.`);
          return false;
        }
        if (!isUnder10MB) {
          setError(`${file.name}: Fichier trop volumineux (max 10MB).`);
          return false;
        }
        return true;
      });

      setFiles(prev => [...prev, ...validFiles]);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (files.length === 0) {
      setError('Veuillez ajouter au moins une photo ou vidéo');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.firstName);
      formDataToSend.append('last_name', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('description', formData.description);

      files.forEach((file) => {
        formDataToSend.append(`files[]`, file);
      });

      const response = await fetch('http://localhost:8000/backend/api/quote-request/index.php', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'envoi de la demande');
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Demande de devis — ArchiMeuble</title>
        <meta
          name="description"
          content="Vous avez vu un meuble qui vous plaît ? Envoyez-nous une photo et recevez un devis personnalisé pour le reproduire sur mesure."
        />
      </Head>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#1A1917] py-20 lg:py-28">
          <div className="absolute inset-0 opacity-[0.02]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block text-xs font-medium uppercase tracking-[0.3em] text-[#8B7355]"
              >
                Devis personnalisé
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-6 font-serif text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                Un meuble vous plaît ?
                <br />
                <span className="text-[#8B7355]">Partagez-le avec nous</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60"
              >
                Envoyez-nous une photo ou vidéo du meuble qui vous inspire,
                et nous vous ferons un devis personnalisé pour le reproduire sur mesure.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="relative py-16 lg:py-24">
          {/* Grid Background */}
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(#E8E3DC 1px, transparent 1px), linear-gradient(90deg, #E8E3DC 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            opacity: 0.3
          }} />

          <div className="relative mx-auto max-w-4xl px-6">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl border border-green-200 bg-green-50 p-12 text-center"
                >
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="mb-3 font-serif text-2xl font-semibold text-green-900">
                    Demande envoyée !
                  </h2>
                  <p className="text-green-700">
                    Nous avons bien reçu votre demande de devis. Nous vous recontacterons très prochainement.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-8"
                >
                  {/* Upload Section */}
                  <div className="rounded-2xl border border-[#E8E3DC] bg-white p-8 shadow-sm">
                    <div className="mb-6">
                      <h2 className="font-serif text-2xl font-semibold text-[#1A1917]">
                        Photos et vidéos
                      </h2>
                      <p className="mt-2 text-sm text-[#1A1917]/60">
                        Ajoutez des images ou vidéos du meuble qui vous intéresse (max 10MB par fichier)
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleFileChange}
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor="file-upload"
                          className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E8E3DC] bg-[#FAFAF9] px-6 py-12 transition-all hover:border-[#8B7355] hover:bg-white"
                        >
                          <Upload className="mb-4 h-10 w-10 text-[#8B7355] transition-transform group-hover:scale-110" />
                          <span className="mb-2 font-medium text-[#1A1917]">
                            Cliquez pour ajouter des fichiers
                          </span>
                          <span className="text-sm text-[#1A1917]/60">
                            Images ou vidéos • Max 10MB par fichier
                          </span>
                        </label>
                      </div>

                      {files.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-[#1A1917]">
                            Fichiers ajoutés ({files.length})
                          </p>
                          {files.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-4 rounded-lg border border-[#E8E3DC] bg-white p-4"
                            >
                              {file.type.startsWith('image/') ? (
                                <Camera className="h-5 w-5 shrink-0 text-[#8B7355]" />
                              ) : (
                                <Video className="h-5 w-5 shrink-0 text-[#8B7355]" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[#1A1917]">
                                  {file.name}
                                </p>
                                <p className="text-xs text-[#1A1917]/60">
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                disabled={isSubmitting}
                                className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-red-50"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="rounded-2xl border border-[#E8E3DC] bg-white p-8 shadow-sm">
                    <div className="mb-6">
                      <h2 className="font-serif text-2xl font-semibold text-[#1A1917]">
                        Vos coordonnées
                      </h2>
                      <p className="mt-2 text-sm text-[#1A1917]/60">
                        Pour que nous puissions vous recontacter avec votre devis
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-[#1A1917]">
                            Prénom <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1A1917]/40" />
                            <input
                              id="firstName"
                              type="text"
                              placeholder="Votre prénom"
                              value={formData.firstName}
                              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                              disabled={isSubmitting}
                              required
                              className="w-full rounded-lg border border-[#E8E3DC] bg-white py-3 pl-12 pr-4 text-[#1A1917] placeholder:text-[#1A1917]/40 focus:border-[#8B7355] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/20"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-[#1A1917]">
                            Nom <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1A1917]/40" />
                            <input
                              id="lastName"
                              type="text"
                              placeholder="Votre nom"
                              value={formData.lastName}
                              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                              disabled={isSubmitting}
                              required
                              className="w-full rounded-lg border border-[#E8E3DC] bg-white py-3 pl-12 pr-4 text-[#1A1917] placeholder:text-[#1A1917]/40 focus:border-[#8B7355] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/20"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#1A1917]">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1A1917]/40" />
                          <input
                            id="email"
                            type="email"
                            placeholder="votre.email@exemple.com"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            disabled={isSubmitting}
                            required
                            className="w-full rounded-lg border border-[#E8E3DC] bg-white py-3 pl-12 pr-4 text-[#1A1917] placeholder:text-[#1A1917]/40 focus:border-[#8B7355] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="phone" className="mb-2 block text-sm font-medium text-[#1A1917]">
                          Téléphone <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1A1917]/40" />
                          <input
                            id="phone"
                            type="tel"
                            placeholder="06 12 34 56 78"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            disabled={isSubmitting}
                            required
                            className="w-full rounded-lg border border-[#E8E3DC] bg-white py-3 pl-12 pr-4 text-[#1A1917] placeholder:text-[#1A1917]/40 focus:border-[#8B7355] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="description" className="mb-2 block text-sm font-medium text-[#1A1917]">
                          Description (optionnel)
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-[#1A1917]/40" />
                          <textarea
                            id="description"
                            rows={4}
                            placeholder="Décrivez le meuble, vos besoins spécifiques, dimensions souhaitées..."
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-[#E8E3DC] bg-white py-3 pl-12 pr-4 text-[#1A1917] placeholder:text-[#1A1917]/40 focus:border-[#8B7355] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg border-2 border-[#E8E3DC] bg-white px-8 py-4 font-medium text-[#1A1917] transition-colors hover:bg-[#FAFAF9] disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || files.length === 0}
                      className="group flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1A1917] px-8 py-4 font-medium text-white transition-all hover:bg-[#1A1917]/90 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        'Envoi en cours...'
                      ) : (
                        <>
                          Envoyer ma demande
                          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
