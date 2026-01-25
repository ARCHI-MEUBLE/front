import { useState, type ChangeEvent, type FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";

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
          confirmPassword: form.confirmPassword,
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
      <div className="relative flex min-h-screen flex-col items-center justify-center font-sans lg:max-w-none lg:grid lg:grid-cols-2 lg:px-0">
        {/* Header mobile */}
        <div className="flex w-full items-center justify-between p-6 lg:hidden">
          <Link href="/">
            <img
              src="/images/logo site .png"
              alt="ArchiMeuble"
              className="h-10 w-auto"
            />
          </Link>
        </div>

        {/* Image de fond */}
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div
            className="absolute inset-0 bg-zinc-900"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Link href="/">
              <img
                src="/images/logo site .png"
                alt="ArchiMeuble"
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Rejoignez l&apos;équipe ArchiMeuble et participez à la gestion
                de notre catalogue de meubles sur mesure.&rdquo;
              </p>
              <footer className="text-sm">Administration ArchiMeuble</footer>
            </blockquote>
          </div>
        </div>

        {/* Formulaire */}
        <div className="flex flex-1 items-center justify-center bg-zinc-50 p-4 lg:p-8 h-full w-full">
          <Card className="w-full max-w-md border-none shadow-none bg-transparent">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-3xl font-bold tracking-tight text-[#1A1917]">
                Créer un compte
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Créez un nouveau compte administrateur
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
                  <Label htmlFor="email" className="text-sm font-medium text-[#1A1917]">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@archimeuble.com"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-sm font-medium text-[#1A1917]">
                    Mot de passe
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#1A1917]">
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917]"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-[#1A1917] text-white hover:bg-zinc-800 rounded-md transition-all shadow-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    'Créer le compte'
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 text-center mt-4">
              <Link
                href="/admin/login"
                className="text-sm text-[#8B7355] hover:text-[#1A1917] transition-colors font-medium"
              >
                Vous avez déjà un compte ? Se connecter
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#1A1917] transition-colors group"
              >
                <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Retour au site
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
