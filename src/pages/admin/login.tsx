import { useState, type ChangeEvent, type FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';

interface LoginForm {
  email: string;
  password: string;
}

const INITIAL_FORM: LoginForm = {
  email: '',
  password: '',
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  if (hasAdminSession(req.headers.cookie)) {
    return {
      redirect: {
        destination: '/admin/dashboard',
        permanent: false,
      },
    };
  }

  return { props: {} };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('Identifiants incorrects');
      }

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
        <title>ArchiMeuble — Administration</title>
      </Head>
      <div className="bg-gray-50 min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Espace administrateur</h1>
            <p className="text-sm text-gray-500 mt-1">
              Connectez-vous pour gérer le catalogue ArchiMeuble.
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
                autoComplete="current-password"
                required
                value={form.password}
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
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}