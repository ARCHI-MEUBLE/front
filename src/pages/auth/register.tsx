import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCustomer } from '@/context/CustomerContext';
import Head from 'next/head';

export default function Register() {
  const router = useRouter();
  const { register, isAuthenticated } = useCustomer();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Rediriger si déjà connecté
  if (isAuthenticated) {
    router.push('/my-configurations');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Email invalide');
      return;
    }

    setIsLoading(true);

    try {
      // Envoyer uniquement les champs non vides
      const dataToSend: any = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      };

      if (formData.phone) dataToSend.phone = formData.phone;
      if (formData.address) dataToSend.address = formData.address;
      if (formData.city) dataToSend.city = formData.city;
      if (formData.postal_code) dataToSend.postal_code = formData.postal_code;
      if (formData.country) dataToSend.country = formData.country;

      await register(dataToSend);

      // Rediriger vers la page de configurations après inscription
      router.push('/my-configurations');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <Head>
        <title>Créer un compte | ArchiMeuble</title>
      </Head>
      <div className="min-h-screen bg-bg-light flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Créer un compte
            </h1>
            <p className="text-text-secondary">
              Rejoignez ArchiMeuble pour sauvegarder vos configurations
            </p>
          </div>

          {error && (
            <div className="alert alert-error mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations de connexion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="label mb-2">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="Min. 8 caractères"
                />
              </div>

              <div>
                <label className="label mb-2">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  placeholder="Répétez le mot de passe"
                />
              </div>
            </div>

            {/* Informations personnelles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Prénom"
                />
              </div>

              <div>
                <label className="label mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Nom"
                />
              </div>
            </div>

            {/* Coordonnées (optionnel) */}
            <div className="border-t border-border-light pt-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Coordonnées (optionnel)
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="label mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="label mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="input"
                    placeholder="123 Rue Example"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label mb-2">
                      Code postal
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      className="input"
                      placeholder="75001"
                    />
                  </div>

                  <div>
                    <label className="label mb-2">
                      Ville
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="input"
                      placeholder="Paris"
                    />
                  </div>

                  <div>
                    <label className="label mb-2">
                      Pays
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="input"
                      placeholder="France"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Inscription en cours...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Vous avez déjà un compte ?{' '}
              <Link href="/auth/login" className="text-primary hover:text-primary-hover font-semibold">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
