import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface PaymentLink {
  id: number;
  token: string;
  url: string;
  status: string;
  payment_type?: string;
  amount?: number;
  expires_at: string;
  created_at: string;
  created_by: string;
}

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderNumber: string;
  totalAmount: number;
  paymentStrategy?: 'full' | 'deposit';
  depositAmount?: number;
  remainingAmount?: number;
  depositPaymentStatus?: string;
}

export default function PaymentLinkModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  paymentStrategy = 'full',
  depositAmount = 0,
  remainingAmount = 0,
  depositPaymentStatus = 'pending'
}: PaymentLinkModalProps) {
  const [existingLinks, setExistingLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'deposit' | 'balance'>('full');

  useEffect(() => {
    if (isOpen) {
      loadExistingLinks();
    }
  }, [isOpen, orderId]);

  const loadExistingLinks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/backend/api/admin/payment-links.php?order_id=${orderId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      console.log('--- DIAGNOSTIC PAYMENT LINKS ---');
      console.log('Status:', response.status);
      console.log('Data:', data);

      if (response.ok && data.success) {
        setExistingLinks(data.links || []);
        // Si aucun lien actif, montrer le formulaire de création
        if (!(data.links || []).some((l: any) => l.status === 'active')) {
          setShowCreateForm(true);
        }
      } else {
        console.error('Erreur API Liens:', data.error);
      }
    } catch (err) {
      console.error('Erreur chargement liens:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (paymentStrategy === 'deposit') {
      if (depositPaymentStatus === 'paid') {
        setPaymentType('balance');
      } else {
        setPaymentType('deposit');
      }
    } else {
      setPaymentType('full');
    }
  }, [paymentStrategy, depositPaymentStatus]);

  const amount = typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount) || 0;

  const getTargetAmount = () => {
    console.log('Calculating target amount:', { paymentType, depositAmount, remainingAmount, amount });
    if (paymentType === 'deposit') return depositAmount;
    if (paymentType === 'balance') return remainingAmount;
    return amount;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const targetAmount = getTargetAmount();
    console.log('[DEBUG] Generating payment link with:', {
      orderId,
      expiryDays,
      paymentType,
      targetAmount,
      orderNumber,
      totalAmount
    });

    try {
      const response = await fetch('/backend/api/admin/generate-payment-link.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          expiry_days: expiryDays,
          payment_type: paymentType,
          amount: targetAmount
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération du lien');
      }

      toast.success('Lien de paiement généré avec succès !');
      setShowCreateForm(false);
      await loadExistingLinks(); // Recharger la liste
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (linkId: number) => {
    if (!confirm('Révoquer ce lien de paiement ?\n\nLe client ne pourra plus l\'utiliser.')) {
      return;
    }

    try {
      const response = await fetch('/backend/api/admin/payment-links.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          link_id: linkId
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la révocation');
      }

      toast.success('Lien révoqué avec succès');
      await loadExistingLinks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la révocation');
    }
  };

  const handleCopy = (link: PaymentLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    toast.success('Lien copié !');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Actif', color: 'bg-green-100 text-green-800' };
      case 'used': return { label: 'Utilisé', color: 'bg-blue-100 text-blue-800' };
      case 'expired': return { label: 'Expiré', color: 'bg-gray-100 text-gray-800' };
      case 'revoked': return { label: 'Révoqué', color: 'bg-red-100 text-red-800' };
      default: return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const activeLinks = existingLinks.filter(link => link.status === 'active');
  const inactiveLinks = existingLinks.filter(link => link.status !== 'active');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40"
        />

        {/* Modal - Style ArchiMeuble */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative w-full max-w-3xl bg-[#FAFAF9] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="border-b border-[#1A1917]/10 px-8 py-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8 bg-[#8B7355]" />
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                    Paiement
                  </span>
                </div>
                <h2 className="font-serif text-2xl text-[#1A1917]">
                  Liens de paiement
                </h2>
                <p className="text-sm text-[#706F6C] mt-1">
                  Commande #{orderNumber}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-[#706F6C] hover:text-[#1A1917] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content - Scrollable area */}
          <div className="p-8 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8B7355] border-t-transparent mx-auto"></div>
                <p className="mt-4 text-sm text-[#706F6C]">Chargement...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Liens actifs */}
                {activeLinks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[#1A1917] mb-3 uppercase tracking-wider">
                      Liens actifs
                    </h3>
                    <div className="space-y-3">
                      {activeLinks.map((link) => {
                        const status = getStatusLabel(link.status);
                        return (
                          <div key={link.id} className="border border-[#1A1917]/10 bg-white p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium ${status.color}`}>
                                  {status.label}
                                </span>
                                <p className="text-xs text-[#706F6C] mt-2">
                                  Expire le {new Date(link.expires_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="bg-[#FAFAF9] p-3 mb-3 border border-[#1A1917]/5">
                              <p className="text-xs font-mono text-[#1A1917] break-all">
                                {link.url}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCopy(link)}
                                className="flex-1 h-10 bg-[#1A1917] text-white text-sm font-medium hover:bg-[#2A2927] transition-colors"
                              >
                                {copiedId === link.id ? '✓ Copié' : 'Copier le lien'}
                              </button>
                              <button
                                onClick={() => handleRevoke(link.id)}
                                className="h-10 px-4 border border-[#1A1917] text-[#1A1917] text-sm font-medium hover:bg-[#1A1917] hover:text-white transition-colors"
                              >
                                Révoquer
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Formulaire de création */}
                {showCreateForm ? (
                  <div className="border border-[#8B7355]/20 bg-white p-6">
                    <h3 className="text-sm font-medium text-[#1A1917] mb-4 uppercase tracking-wider">
                      Créer un nouveau lien
                    </h3>

                    {/* Type de paiement */}
                    {paymentStrategy === 'deposit' && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-[#1A1917] mb-3 uppercase tracking-wider">
                          Type de paiement
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {depositPaymentStatus !== 'paid' ? (
                            <button
                              onClick={() => setPaymentType('deposit')}
                              className={`py-3 px-4 text-sm font-medium border transition-colors col-span-2 ${
                                paymentType === 'deposit'
                                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                                  : 'bg-white border-[#1A1917]/20 text-[#1A1917] hover:border-[#1A1917]'
                              }`}
                            >
                              Acompte ({depositAmount}€)
                            </button>
                          ) : (
                            remainingAmount > 0 && (
                              <button
                                onClick={() => setPaymentType('balance')}
                                className={`py-3 px-4 text-sm font-medium border transition-colors col-span-2 ${
                                  paymentType === 'balance'
                                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                                    : 'bg-white border-[#1A1917]/20 text-[#1A1917] hover:border-[#1A1917]'
                                }`}
                              >
                                Solde ({remainingAmount}€)
                              </button>
                            )
                          )}
                        </div>
                        {depositPaymentStatus !== 'paid' && (
                          <p className="mt-2 text-xs text-[#706F6C] italic">
                            L'acompte doit être réglé avant de pouvoir générer le lien pour le solde.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Info commande */}
                    <div className="bg-[#FAFAF9] border border-[#1A1917]/5 p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[#706F6C] mb-1">Commande</p>
                          <p className="font-medium text-[#1A1917]">#{orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-[#706F6C] mb-1">Montant du lien</p>
                          <p className="font-medium text-[#1A1917]">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR'
                            }).format(getTargetAmount())}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Durée de validité */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[#1A1917] mb-3 uppercase tracking-wider">
                        Durée de validité
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[7, 14, 30, 60].map((days) => (
                          <button
                            key={days}
                            onClick={() => setExpiryDays(days)}
                            className={`py-2 px-3 text-sm font-medium transition-colors ${
                              expiryDays === days
                                ? 'bg-[#1A1917] text-white'
                                : 'bg-white border border-[#1A1917]/20 text-[#1A1917] hover:border-[#1A1917]'
                            }`}
                          >
                            {days} jours
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-[#8B7355]/5 border border-[#8B7355]/20 p-4 mb-4">
                      <p className="text-sm text-[#1A1917]">
                        Le client recevra un email avec le lien de paiement. Le lien sera valide pendant <strong>{expiryDays} jours</strong>.
                      </p>
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex-1 h-12 bg-[#1A1917] text-white text-sm font-medium hover:bg-[#2A2927] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? 'Génération...' : 'Générer le lien'}
                      </button>
                      {activeLinks.length > 0 && (
                        <button
                          onClick={() => setShowCreateForm(false)}
                          className="h-12 px-6 border border-[#1A1917] text-[#1A1917] text-sm font-medium hover:bg-[#FAFAF9] transition-colors"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                ) : activeLinks.length > 0 && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full h-12 border border-[#1A1917]/20 text-[#1A1917] text-sm font-medium hover:bg-[#FAFAF9] transition-colors"
                  >
                    + Créer un nouveau lien
                  </button>
                )}

                {/* Historique */}
                {inactiveLinks.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-[#1A1917]/10">
                    <h3 className="text-sm font-medium text-[#706F6C] mb-3 uppercase tracking-wider">
                      Historique
                    </h3>
                    <div className="space-y-2">
                      {inactiveLinks.map((link) => {
                        const status = getStatusLabel(link.status);
                        return (
                          <div key={link.id} className="border border-[#1A1917]/5 bg-[#FAFAF9] p-3">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium ${status.color}`}>
                                  {status.label}
                                </span>
                                <p className="text-xs text-[#706F6C] mt-1">
                                  Créé le {new Date(link.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
