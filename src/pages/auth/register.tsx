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
    router.push('/');
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

      // Rediriger vers l'accueil après inscription
      router.push('/');
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
            href="/auth/login" 
            className="text-sm font-medium text-[#8B7355] hover:underline"
          >
            Se connecter
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

        <div className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-black lg:p-8 h-full w-full overflow-y-auto">
          <Card className="w-full max-w-2xl border-none shadow-none bg-transparent lg:shadow-none dark:bg-transparent py-10 lg:py-0">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-3xl font-bold tracking-tight text-[#1A1917] dark:text-white">
                Créer un compte
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Rejoignez ArchiMeuble pour sauvegarder vos configurations
              </CardDescription>
            </CardHeader>

            <CardContent className="mt-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="first_name" className="text-sm font-medium">Prénom *</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      placeholder="Prénom"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      className="bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="last_name" className="text-sm font-medium">Nom *</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      placeholder="Nom"
                      required
                      value={formData.last_name}
                      onChange={handleChange}
                      className="bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-white dark:bg-zinc-800"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password" title="Mot de passe" className="text-sm font-medium">Mot de passe *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword" title="Confirmer le mot de passe" className="text-sm font-medium">Confirmer le mot de passe *</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
                    Coordonnées (optionnel)
                  </h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Téléphone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        value={formData.phone}
                        onChange={handleChange}
                        className="bg-white dark:bg-zinc-800"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address" className="text-sm font-medium">Adresse</Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="123 Rue Example"
                        value={formData.address}
                        onChange={handleChange}
                        className="bg-white dark:bg-zinc-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="postal_code" className="text-sm font-medium">Code postal</Label>
                        <Input
                          id="postal_code"
                          name="postal_code"
                          placeholder="75001"
                          value={formData.postal_code}
                          onChange={handleChange}
                          className="bg-white dark:bg-zinc-800"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="city" className="text-sm font-medium">Ville</Label>
                        <Input
                          id="city"
                          name="city"
                          placeholder="Paris"
                          value={formData.city}
                          onChange={handleChange}
                          className="bg-white dark:bg-zinc-800"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="country" className="text-sm font-medium">Pays</Label>
                        <Input
                          id="country"
                          name="country"
                          placeholder="France"
                          value={formData.country}
                          onChange={handleChange}
                          className="bg-white dark:bg-zinc-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="h-11 w-full bg-[#1A1917] text-white hover:bg-zinc-800 rounded-md transition-all dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-6 text-center mt-2">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="font-semibold text-[#1A1917] hover:underline dark:text-white">
                  Se connecter
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
