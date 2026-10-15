import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCustomer } from '@/context/CustomerContext';
import Head from 'next/head';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

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
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-am-paper font-sans lg:max-w-none lg:grid lg:grid-cols-2 lg:px-0">
        {/* Header mobile (visible uniquement sur mobile) */}
        <div className="flex w-full items-center justify-between p-6 lg:hidden">
          <Link href="/" aria-label="ArchiMeuble, accueil">
            <img
              src="/images/logo site .png"
              alt="ArchiMeuble"
              className="h-10 w-auto"
            />
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex min-h-11 items-center text-sm font-medium text-am-navy underline-offset-4 hover:underline"
          >
            S&apos;inscrire
          </Link>
        </div>

        <AuthShowcase />

        <div className="flex h-full w-full flex-1 items-center justify-center bg-am-paper p-4 lg:p-8">
          <Card className="w-full max-w-md border-none bg-transparent shadow-none lg:shadow-none">
            <CardHeader className="space-y-1 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-black">
                Connexion
              </h1>
              <CardDescription className="text-black/70">
                Accédez à vos configurations sauvegardées
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 mt-4">
              {error && (
                <div role="alert" className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium text-black">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nom@exemple.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="h-11 rounded-md border-black/30 bg-white"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-black">Mot de passe</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="inline-flex min-h-11 items-center text-sm text-am-navy underline-offset-4 hover:underline"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="h-11 rounded-md border-black/30 bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-md bg-am-navy text-white shadow-sm transition-all hover:bg-am-navy/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="mt-4 flex flex-col gap-2 text-center">
              <p className="text-sm text-black/70">
                Pas encore de compte ?{' '}
                <Link
                  href="/auth/register"
                  className="inline-flex min-h-11 items-center font-semibold text-black underline-offset-4 hover:underline"
                >
                  Créer un compte
                </Link>
              </p>
              <Link
                href="/"
                className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/70 transition-colors hover:text-black"
              >
                <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Retour à l&apos;accueil
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
