import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { CheckCircle, Package, FolderOpen, Home } from "lucide-react";
import { UserNavigation } from "@/components/UserNavigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useCustomer } from "@/context/CustomerContext";

interface OrderItem {
  configuration_id: number;
  quantity: number;
  price: number;
  name: string;
  prompt: string;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items: OrderItem[];
  customer_name?: string;
  customer_email?: string;
}

export default function OrderConfirmationPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const { customer } = useCustomer();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) {
      router.push("/auth/login");
      return;
    }

    if (!orderId) return;

    const loadOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/backend/api/orders/list.php?id=${orderId}`,
          { credentials: "include" }
        );

        if (!response.ok) {
          throw new Error("Impossible de charger la commande");
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [customer, orderId, router]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Confirmation de commande - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Head>
          <title>Erreur - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-gray-50 px-4 py-12">
          <div className="mx-auto max-w-2xl">
            <div className="border border-red-300 bg-red-50 p-4 text-center">
              <p className="text-red-700">{error || "Commande introuvable"}</p>
              <Link
                href="/my-orders"
                className="mt-4 inline-block text-sm text-red-800 underline"
              >
                Voir mes commandes
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Commande confirmée - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Breadcrumb
            items={[
              { label: "Accueil", href: "/" },
              { label: "Panier", href: "/cart" },
              { label: "Paiement", href: "/checkout" },
              { label: "Confirmation" },
            ]}
          />

          {/* Success Message */}
          <div className="border border-green-300 bg-green-50 p-6 text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Commande confirmée !
            </h1>
            <p className="text-gray-700 mb-4">
              Merci pour votre commande. Nous avons bien reçu votre demande et nous allons commencer la production de vos meubles sur mesure.
            </p>
            <div className="inline-flex items-center gap-2 bg-white border border-gray-300 px-4 py-2">
              <span className="text-sm font-medium text-gray-700">Numéro de commande:</span>
              <span className="text-sm font-bold text-gray-900">{order.order_number}</span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="border border-gray-200 bg-white mb-6">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Récapitulatif de la commande</h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Commande passée le</p>
                  <p className="text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Statut</p>
                  <span className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-900">
                    {order.status === "pending" && "⏳ En attente"}
                    {order.status === "confirmed" && "✅ Confirmée"}
                    {order.status === "in_production" && "🔨 En production"}
                    {order.status === "shipped" && "🚚 Expédiée"}
                    {order.status === "delivered" && "📦 Livrée"}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Articles commandés</p>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{item.name || "Configuration"}</p>
                          <p className="text-xs text-gray-600 mt-1">Quantité: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-sm text-gray-900">{item.price}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Adresse de livraison</p>
                <p className="text-sm text-gray-900 whitespace-pre-line">{order.shipping_address}</p>
              </div>

              {/* Total */}
              <div className="border-t border-gray-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{order.total}€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="border border-gray-200 bg-white p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Prochaines étapes</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-medium">1.</span>
                <span>Vous allez recevoir un email de confirmation à <strong>{order.customer_email || customer?.email}</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">2.</span>
                <span>Notre équipe va commencer la production de vos meubles</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">3.</span>
                <span>Vous serez notifié par email à chaque étape (production, expédition, livraison)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">4.</span>
                <span>Vous pouvez suivre l'avancement de votre commande dans "Mes commandes"</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/my-orders"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 text-sm font-medium hover:bg-gray-800"
            >
              <Package className="h-4 w-4" />
              Voir mes commandes
            </Link>
            <Link
              href="/models"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FolderOpen className="h-4 w-4" />
              Créer une nouvelle configuration
            </Link>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Home className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
