import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import { Breadcrumb } from '@/components/Breadcrumb';

interface CartItem {
  configuration: {
    id: number;
    name: string;
    price: number;
  };
  quantity: number;
}

interface CartData {
  items: CartItem[];
  total: number;
}

export default function Checkout() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();

  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
    shipping_country: 'France',
    billing_same: true,
    billing_address: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country: 'France',
    payment_method: 'card',
    notes: ''
  });

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout');
      return;
    }

    loadCart();

    // Pré-remplir avec les infos du client
    if (customer) {
      setFormData(prev => ({
        ...prev,
        shipping_address: customer.address || '',
        shipping_city: customer.city || '',
        shipping_postal_code: customer.postal_code || '',
        shipping_country: customer.country || 'France'
      }));
    }
  }, [isAuthenticated, authLoading, customer, router]);

  const loadCart = async () => {
    try {
      const response = await fetch('http://localhost:8000/backend/api/cart/index.php', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du panier');
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        // Panier vide, rediriger
        router.push('/cart');
        return;
      }

      setCart(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.shipping_address || !formData.shipping_city || !formData.shipping_postal_code) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!formData.billing_same && (!formData.billing_address || !formData.billing_city || !formData.billing_postal_code)) {
      setError('Veuillez remplir l\'adresse de facturation');
      return;
    }

    setIsSubmitting(true);

    try {
      // Préparer les adresses
      const shippingAddress = `${formData.shipping_address}, ${formData.shipping_postal_code} ${formData.shipping_city}, ${formData.shipping_country}`;
      const billingAddress = formData.billing_same
        ? shippingAddress
        : `${formData.billing_address}, ${formData.billing_postal_code} ${formData.billing_city}, ${formData.billing_country}`;

      // Créer la commande
      const response = await fetch('http://localhost:8000/backend/api/orders/create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shipping_address: shippingAddress,
          billing_address: billingAddress,
          payment_method: formData.payment_method,
          notes: formData.notes || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la commande');
      }

      const result = await response.json();

      // Succès ! Rediriger vers la page de confirmation
      router.push(`/order-confirmation/${result.order.id}`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <>
        <Head>
          <title>Paiement - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-bg-light flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-text-secondary">Chargement...</p>
          </div>
        </div>
      </>
    );
  }

  if (!cart) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Paiement - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-bg-light">
        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: 'Accueil', href: '/' },
              { label: 'Panier', href: '/cart' },
              { label: 'Paiement' }
            ]}
          />

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary">
              Finaliser la commande
            </h1>
          </div>
        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulaire */}
            <div className="lg:col-span-2 space-y-6">
              {/* Adresse de livraison */}
              <div className="card p-6">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Adresse de livraison
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="label mb-2">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      name="shipping_address"
                      required
                      value={formData.shipping_address}
                      onChange={handleChange}
                      className="input"
                      placeholder="123 Rue Example"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label mb-2">
                        Code postal *
                      </label>
                      <input
                        type="text"
                        name="shipping_postal_code"
                        required
                        value={formData.shipping_postal_code}
                        onChange={handleChange}
                        className="input"
                        placeholder="75001"
                      />
                    </div>

                    <div>
                      <label className="label mb-2">
                        Ville *
                      </label>
                      <input
                        type="text"
                        name="shipping_city"
                        required
                        value={formData.shipping_city}
                        onChange={handleChange}
                        className="input"
                        placeholder="Paris"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label mb-2">
                      Pays *
                    </label>
                    <input
                      type="text"
                      name="shipping_country"
                      required
                      value={formData.shipping_country}
                      onChange={handleChange}
                      className="input"
                      placeholder="France"
                    />
                  </div>
                </div>
              </div>

              {/* Adresse de facturation */}
              <div className="card p-6">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Adresse de facturation
                </h2>

                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="billing_same"
                      checked={formData.billing_same}
                      onChange={handleChange}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="text-text-primary">Identique à l&apos;adresse de livraison</span>
                  </label>
                </div>

                {!formData.billing_same && (
                  <div className="space-y-4">
                    <div>
                      <label className="label mb-2">
                        Adresse *
                      </label>
                      <input
                        type="text"
                        name="billing_address"
                        required
                        value={formData.billing_address}
                        onChange={handleChange}
                        className="input"
                        placeholder="123 Rue Example"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label mb-2">
                          Code postal *
                        </label>
                        <input
                          type="text"
                          name="billing_postal_code"
                          required
                          value={formData.billing_postal_code}
                          onChange={handleChange}
                          className="input"
                          placeholder="75001"
                        />
                      </div>

                      <div>
                        <label className="label mb-2">
                          Ville *
                        </label>
                        <input
                          type="text"
                          name="billing_city"
                          required
                          value={formData.billing_city}
                          onChange={handleChange}
                          className="input"
                          placeholder="Paris"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label mb-2">
                        Pays *
                      </label>
                      <input
                        type="text"
                        name="billing_country"
                        required
                        value={formData.billing_country}
                        onChange={handleChange}
                        className="input"
                        placeholder="France"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mode de paiement */}
              <div className="card p-6">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Mode de paiement
                </h2>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border-2 border-border-light rounded-lg cursor-pointer hover:border-primary transition">
                    <input
                      type="radio"
                      name="payment_method"
                      value="card"
                      checked={formData.payment_method === 'card'}
                      onChange={handleChange}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="font-medium text-text-primary">💳 Carte bancaire</span>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 border-border-light rounded-lg cursor-pointer hover:border-primary transition">
                    <input
                      type="radio"
                      name="payment_method"
                      value="transfer"
                      checked={formData.payment_method === 'transfer'}
                      onChange={handleChange}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="font-medium text-text-primary">🏦 Virement bancaire</span>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 border-border-light rounded-lg cursor-pointer hover:border-primary transition">
                    <input
                      type="radio"
                      name="payment_method"
                      value="check"
                      checked={formData.payment_method === 'check'}
                      onChange={handleChange}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="font-medium text-text-primary">📝 Chèque</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="card p-6">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Notes (optionnel)
                </h2>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="textarea"
                  placeholder="Instructions de livraison, commentaires..."
                />
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-4">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Récapitulatif
                </h2>

                <div className="space-y-3 mb-6">
                  {cart.items.map((item) => (
                    <div key={item.configuration.id} className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        {item.configuration.name} × {item.quantity}
                      </span>
                      <span className="font-semibold text-text-primary">
                        {item.configuration.price * item.quantity}€
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-border-light pt-3">
                    <div className="flex justify-between text-text-secondary mb-2">
                      <span>Sous-total</span>
                      <span className="font-semibold">{cart.total}€</span>
                    </div>
                    <div className="flex justify-between text-text-secondary mb-2">
                      <span>Livraison</span>
                      <span className="font-semibold text-success">Gratuite</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-text-primary">
                      <span>Total</span>
                      <span>{cart.total}€</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? 'Traitement...' : `Confirmer la commande (${cart.total}€)`}
                </button>

                <div className="mt-4 text-center">
                  <Link
                    href="/cart"
                    className="text-sm text-primary hover:text-primary-hover"
                  >
                    ← Retour au panier
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}
