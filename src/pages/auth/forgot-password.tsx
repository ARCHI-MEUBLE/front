import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useCustomer } from '@/context/CustomerContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft, IconLoader2, IconCheck } from "@tabler/icons-react";

export default function ForgotPassword() {
  const { forgotPassword } = useCustomer();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Mot de passe oublié | ArchiMeuble</title>
      </Head>
      <div className="relative flex min-h-screen flex-col items-center justify-center font-sans bg-zinc-50 dark:bg-black p-4 lg:p-8">
        <div className="absolute top-8 left-8 hidden lg:block">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-black p-1">
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <span className="font-serif text-xl font-medium text-[#1A1917]">ArchiMeuble</span>
          </Link>
        </div>

        <Card className="w-full max-w-md border-none shadow-xl bg-white dark:bg-zinc-900">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-[#1A1917] dark:text-white">
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">
              {isSent 
                ? "Consultez votre boîte mail" 
                : "Entrez votre email pour recevoir un lien de réinitialisation"}
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            {isSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <IconCheck className="h-6 w-6" />
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Si un compte est associé à l'adresse <strong>{email}</strong>, vous recevrez un email contenant les instructions pour réinitialiser votre mot de passe d'ici quelques instants.
                </p>
                <Button variant="outline" className="w-full mt-4" onClick={() => setIsSent(false)}>
                  Renvoyer l'email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#1A1917] dark:text-zinc-200">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien'
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4 text-center mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-6">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-[#1A1917] dark:text-zinc-400 dark:hover:text-white transition-colors group"
            >
              <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Retour à la connexion
            </Link>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
