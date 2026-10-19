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

    // Validation du téléphone
    const cleanPhone = formData.phone.replace(/\s/g, '');
    const phoneRegex = /^(\+33|0)[1-9](\d{2}){4}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('Format de téléphone invalide (ex: 0612345678 ou +33612345678)');
      return;
    }

    // Validation du code postal (France)
    if (formData.country === 'France' && !/^\d{5}$/.test(formData.postal_code)) {
      setError('Le code postal doit contenir exactement 5 chiffres');
      return;
    }

    setIsLoading(true);

    try {
      // Envoyer tous les champs (maintenant obligatoires)
      const dataToSend = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country,
      };

      const result = await register(dataToSend);

      // Si vérification email requise, rediriger vers la page de vérification
      if (result.requiresVerification) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(result.email || formData.email)}`);
      } else {
        // Ancien flux : rediriger vers l'accueil
        router.push('/');
      }
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
            <img
              src="/images/logo site .png"
              alt="ArchiMeuble"
              className="h-10 w-auto"
            />
          </Link>
          <Link 
            href="/auth/login" 
            className="inline-flex min-h-11 items-center text-sm font-medium text-am-navy underline-offset-4 hover:underline"
          >
            Se connecter
          </Link>
        </div>

        <AuthShowcase />

        <div className="flex flex-1 items-center justify-center bg-am-paper p-4 lg:p-8 h-full w-full overflow-y-auto">
          <Card className="w-full max-w-2xl border-none shadow-none bg-transparent lg:shadow-none dark:bg-transparent py-10 lg:py-0">
            <CardHeader className="space-y-1 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-black">Créer un compte</h1>
              <CardDescription className="text-black/70">
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
                      className="h-11 border-black/30 bg-white"
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
                      className="h-11 border-black/30 bg-white"
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
                    className="h-11 border-black/30 bg-white"
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
                      className="h-11 border-black/30 bg-white"
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
                      className="h-11 border-black/30 bg-white"
                    />
                  </div>
                </div>

                <div className="border-t border-black/15 pt-6">
                  <h3 className="eyebrow-lg text-black/70 mb-4">
                    Coordonnées
                  </h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Téléphone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="h-11 border-black/30 bg-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address" className="text-sm font-medium">Adresse *</Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="123 Rue Example"
                        required
                        value={formData.address}
                        onChange={handleChange}
                        className="h-11 border-black/30 bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="postal_code" className="text-sm font-medium">Code postal *</Label>
                        <Input
                          id="postal_code"
                          name="postal_code"
                          placeholder="75001"
                          required
                          value={formData.postal_code}
                          onChange={handleChange}
                          className="h-11 border-black/30 bg-white"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="city" className="text-sm font-medium">Ville *</Label>
                        <Input
                          id="city"
                          name="city"
                          placeholder="Paris"
                          required
                          value={formData.city}
                          onChange={handleChange}
                          className="h-11 border-black/30 bg-white"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="country" className="text-sm font-medium">Pays *</Label>
                        <Input
                          id="country"
                          name="country"
                          placeholder="France"
                          required
                          value={formData.country}
                          onChange={handleChange}
                          className="h-11 border-black/30 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="mt-2 h-11 w-full rounded-md bg-am-navy text-white shadow-sm transition-all hover:bg-am-navy/90"
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

            <CardFooter className="flex flex-col gap-2 text-center mt-2">
              <p className="text-sm text-black/70">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="inline-flex min-h-11 items-center font-semibold text-black underline-offset-4 hover:underline">
                  Se connecter
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
