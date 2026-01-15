// src/components/auth/AuthModal.tsx

import { useState } from 'react'
import { useCustomer } from '@/context/CustomerContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IconLoader2, IconX } from "@tabler/icons-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (userEmail: string) => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, register } = useCustomer()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await register({
          email,
          password,
          first_name: firstName,
          last_name: lastName
        })
        onSuccess(email)
        onClose()
      } else {
        await login(email, password)
        onSuccess(email)
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-[#E8E6E3] shadow-xl bg-white">
        <CardHeader className="space-y-1 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <IconX className="h-5 w-5" />
          </button>
          <CardTitle className="text-2xl font-bold tracking-tight text-[#1A1917]">
            {mode === 'login' ? 'Connexion' : 'Inscription'}
          </CardTitle>
          <CardDescription className="text-zinc-500">
            {mode === 'login'
              ? 'Accédez à vos configurations sauvegardées'
              : 'Créez votre compte pour sauvegarder vos configurations'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4">
            {mode === 'register' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-[#1A1917]">
                    Prénom
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jean"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917]"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-[#1A1917]">
                    Nom
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917]"
                    required
                  />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#1A1917]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917]"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#1A1917]">
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-white border-[#E8E6E3] rounded-md focus:ring-[#1A1917]"
                required
                minLength={8}
              />
              {mode === 'register' && (
                <p className="text-xs text-zinc-500">Minimum 8 caractères</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-[#1A1917] text-white hover:bg-zinc-800 rounded-md transition-all shadow-sm mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Connexion en cours...' : 'Inscription en cours...'}
                </>
              ) : (
                mode === 'login' ? 'Se connecter' : 'S\'inscrire'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 text-center pt-2 pb-6">
          <p className="text-sm text-zinc-500">
            {mode === 'login' ? (
              <>
                Pas encore de compte ?{' '}
                <button
                  onClick={() => { setMode('register'); setError(''); }}
                  className="font-semibold text-[#1A1917] hover:underline"
                >
                  Créer un compte
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className="font-semibold text-[#1A1917] hover:underline"
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
