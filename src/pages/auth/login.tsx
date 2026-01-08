import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCustomer } from '@/context/CustomerContext';
import Head from 'next/head';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";

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
      <div className="relative flex min-h-screen flex-col items-center justify-center font-sans lg:max-w-none lg:grid lg:grid-cols-2 lg:px-0">
        {/* Header mobile (visible uniquement sur mobile) */}
        <div className="flex w-full items-center justify-between p-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-black p-1">
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <span className="font-serif text-xl font-medium text-[#1A1917]">ArchiMeuble</span>
          </Link>
          <Link 
            href="/auth/register" 
            className="text-sm font-medium text-[#8B7355] hover:underline"
          >
            S'inscrire
          </Link>
        </div>

        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div 
            className="absolute inset-0 bg-zinc-900" 
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1590069261209-f8e9b8642343?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1376&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-white p-1">
                <span className="text-xl font-bold text-black">A</span>
              </div>
              ArchiMeuble
            </Link>
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;ArchiMeuble m&apos;a permis de concevoir le meuble de mes rêves en quelques clics. 
                La qualité de fabrication lilloise est exceptionnelle.&rdquo;
              </p>
              <footer className="text-sm">Sofia Davis</footer>
            </blockquote>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-black lg:p-8 h-full w-full">
          <Card className="w-full max-w-md border-none shadow-none bg-transparent lg:shadow-none dark:bg-transparent">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-3xl font-bold tracking-tight text-[#1A1917] dark:text-white">
                Connexion
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Accédez à vos configurations sauvegardées
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 mt-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#1A1917] dark:text-zinc-200">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917] dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" title="Mot de passe" className="text-sm font-medium text-[#1A1917] dark:text-zinc-200">Mot de passe</Label>
                    <Link 
                      href="/auth/forgot-password" 
                      className="text-xs text-[#8B7355] hover:underline"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917] dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="h-11 w-full bg-[#1A1917] text-white hover:bg-zinc-800 rounded-md transition-all dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm"
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

            <CardFooter className="flex flex-col gap-6 text-center mt-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Pas encore de compte ?{' '}
                <Link href="/auth/register" className="font-semibold text-[#1A1917] hover:underline dark:text-white">
                  Créer un compte
                </Link>
              </p>
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#1A1917] dark:text-zinc-400 dark:hover:text-white transition-colors group"
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
