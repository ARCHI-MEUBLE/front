import { useState, type ChangeEvent, type FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_FORM: RegisterForm = {
  email: '',
  password: '',
  confirmPassword: '',
};

export default function AdminRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Validation
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      // Rediriger vers le dashboard après la création
      await router.push('/admin/dashboard');
    } catch (err) {
      setError((err as Error).message ?? 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Créer un compte admin — ArchiMeuble</title>
      </Head>
      <div className="bg-gray-50 min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Créer un compte administrateur</h1>
            <p className="text-sm text-gray-500 mt-1">
              Créez un nouveau compte pour gérer ArchiMeuble.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-amber-600 py-2.5 text-white font-medium transition-all duration-200 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {isSubmitting ? 'Création...' : 'Créer le compte'}
            </button>

            <div className="text-center">
              <Link href="/admin/login" className="text-sm text-amber-600 hover:text-amber-500">
                Vous avez déjà un compte ? Se connecter
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
