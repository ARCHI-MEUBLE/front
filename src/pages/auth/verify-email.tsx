import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCustomer } from '@/context/CustomerContext';
import Head from 'next/head';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft, IconLoader2, IconMail, IconRefresh } from "@tabler/icons-react";

export default function VerifyEmail() {
  const router = useRouter();
  const { email } = router.query;
  const { verifyEmail, resendVerificationCode, isAuthenticated } = useCustomer();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Countdown pour le renvoi
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus sur le premier input au chargement
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    // Ne garder que les chiffres
    const digit = value.replace(/\D/g, '').slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // Passer au champ suivant si un chiffre est entré
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Soumettre automatiquement si tous les chiffres sont entrés
    if (digit && index === 5) {
      const fullCode = [...newCode.slice(0, 5), digit].join('');
      if (fullCode.length === 6) {
        handleSubmit(undefined, fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Revenir au champ précédent avec Backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();

      // Soumettre automatiquement
      handleSubmit(undefined, pastedData);
    }
  };

  const handleSubmit = async (e?: FormEvent, submittedCode?: string) => {
    if (e) e.preventDefault();

    const codeToVerify = submittedCode || code.join('');

    if (codeToVerify.length !== 6) {
      setError('Veuillez entrer le code à 6 chiffres');
      return;
    }

    if (!email || typeof email !== 'string') {
      setError('Email manquant. Veuillez recommencer l\'inscription.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyEmail(email, codeToVerify);
      setSuccess('Email vérifié avec succès !');
      // Redirection automatique après vérification
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Code invalide');
      // Vider le code en cas d'erreur
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email || typeof email !== 'string') return;

    setIsResending(true);
    setError('');

    try {
      await resendVerificationCode(email);
      setSuccess('Un nouveau code a été envoyé à votre adresse email.');
      setCountdown(60); // Attendre 60 secondes avant de renvoyer
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsResending(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Vérifier votre email | ArchiMeuble</title>
      </Head>
      <div className="relative flex min-h-screen flex-col items-center justify-center font-sans lg:max-w-none lg:grid lg:grid-cols-2 lg:px-0">
        {/* Header mobile */}
        <div className="flex w-full items-center justify-between p-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-black p-1">
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <span className="font-serif text-xl font-medium text-[#1A1917]">ArchiMeuble</span>
          </Link>
        </div>

        {/* Panneau gauche - Image */}
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
                &ldquo;Plus qu&apos;une étape pour accéder à votre espace personnalisé
                et créer le meuble de vos rêves.&rdquo;
              </p>
            </blockquote>
          </div>
        </div>

        {/* Panneau droit - Formulaire */}
        <div className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-black lg:p-8 h-full w-full">
          <Card className="w-full max-w-md border-none shadow-none bg-transparent lg:shadow-none dark:bg-transparent">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1A1917]">
                <IconMail className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight text-[#1A1917] dark:text-white">
                Vérifiez votre email
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Nous avons envoyé un code à 6 chiffres à
                <br />
                <span className="font-medium text-[#1A1917] dark:text-white">
                  {email || 'votre adresse email'}
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="mt-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-6 text-center">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-100 p-3 text-sm text-green-700 mb-6 text-center">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Champs de code */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={isLoading}
                      className="h-14 w-11 sm:h-16 sm:w-14 rounded-lg border-2 border-zinc-200 bg-white text-center text-2xl font-bold text-[#1A1917] transition-all focus:border-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-[#1A1917] text-white hover:bg-zinc-800 rounded-md transition-all dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm"
                  disabled={isLoading || code.join('').length !== 6}
                >
                  {isLoading ? (
                    <>
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    'Vérifier mon email'
                  )}
                </Button>
              </form>

              {/* Renvoyer le code */}
              <div className="mt-6 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Vous n&apos;avez pas reçu le code ?
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || isResending}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1A1917] hover:underline disabled:opacity-50 disabled:no-underline dark:text-white"
                >
                  {isResending ? (
                    <>
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : countdown > 0 ? (
                    `Renvoyer dans ${countdown}s`
                  ) : (
                    <>
                      <IconRefresh className="h-4 w-4" />
                      Renvoyer le code
                    </>
                  )}
                </button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-6 text-center mt-2">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Mauvaise adresse email ?{' '}
                <Link href="/auth/register" className="font-semibold text-[#1A1917] hover:underline dark:text-white">
                  Modifier
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
