import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCustomer } from '@/context/CustomerContext';
import Head from 'next/head';

export default function Login() {
  const router = useRouter();
  const { login, isAuthenticated } = useCustomer();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Récupérer l'URL de redirection depuis les query params
  const { redirect } = router.query;

  // Rediriger si déjà connecté
  if (isAuthenticated) {
    const redirectUrl = typeof redirect === 'string' ? redirect : '/';
    router.push(redirectUrl);
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);

    try {
      await login(formData.email, formData.password);

      // Rediriger vers l'URL demandée ou vers l'accueil
      const redirectUrl = typeof redirect === 'string' ? redirect : '/';
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect');
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
        <title>Connexion | ArchiMeuble</title>
      </Head>
      <div className="min-h-screen bg-bg-light flex items-center justify-center p-4">
        <div className="bg-white rounded-sm shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Connexion
            </h1>
            <p className="text-text-secondary">
              Accédez à vos configurations sauvegardées
            </p>
          </div>

          {error && (
            <div className="alert alert-error mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label mb-2">
                Email
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
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="Votre mot de passe"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Pas encore de compte ?{' '}
              <Link href="/auth/register" className="text-primary hover:text-primary-hover font-semibold">
                Créer un compte
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-text-tertiary hover:text-text-secondary">
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
