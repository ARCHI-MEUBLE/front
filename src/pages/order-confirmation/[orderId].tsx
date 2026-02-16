import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import dynamic from "next/dynamic";
import { CheckCircle, Package, Home, Layers, ShoppingBag, Box } from "lucide-react";
import { UserNavigation } from "@/components/UserNavigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useCustomer } from "@/context/CustomerContext";

// Import dynamique du viewer 3D pour éviter les erreurs SSR
const ThreeViewer = dynamic(() => import("@/components/configurator/ThreeViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
    </div>
  ),
});

interface OrderItem {
  id: number;
  configuration_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  name?: string;
  config_data?: any;
}

interface OrderSample {
  id: number;
  sample_name: string;
  sample_type_name?: string;
  material: string;
  hex: string | null;
  image_url: string | null;
  quantity: number;
  price: number;
}

interface OrderCatalogueItem {
  id: number;
  catalogue_item_id: number;
  name?: string;
  item_name?: string;
  variation_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
}

interface OrderFacadeItem {
  id: number;
  config_data: string;
  config?: {
    width: number;
    height: number;
    depth: number;
    material?: {
      id: number;
      name: string;
      color_hex: string;
      texture_url?: string;
    };
    hinges?: {
      type: string;
      count: number;
      direction: string;
    };
  };
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: number;
  order_number: string;
  total: number;
  status: string;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items?: OrderItem[];
  samples?: OrderSample[];
  catalogue_items?: OrderCatalogueItem[];
  facade_items?: OrderFacadeItem[];
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

        // Envoyer l'email de confirmation
        try {
          await fetch('/backend/api/orders/send-confirmation.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ order_id: orderId })
          });
        } catch (emailErr) {
          console.error('Erreur envoi email:', emailErr);
        }
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
                href="/account?section=orders"
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

  // Déterminer le type de commande
  const hasConfigurations = order.items && order.items.length > 0;
  const hasCatalogueItems = order.catalogue_items && order.catalogue_items.length > 0;
  const hasFacades = order.facade_items && order.facade_items.length > 0;
  const hasSamples = order.samples && order.samples.length > 0;
  const isSamplesOnly = hasSamples && !hasConfigurations && !hasCatalogueItems && !hasFacades;
  const samplesTotal = order.samples?.reduce((sum, s) => sum + (s.price || 0) * s.quantity, 0) || 0;
  const areSamplesFree = samplesTotal === 0;

  // Message principal selon le type de commande
  const getMainMessage = () => {
    if (isSamplesOnly) {
      return 'Vos échantillons vont être préparés et expédiés sous 24-48h.';
    }
    if (hasConfigurations) {
      return 'Merci pour votre commande. Nous allons commencer la fabrication de vos meubles sur mesure.';
    }
    if (hasFacades && hasCatalogueItems) {
      return 'Merci pour votre commande. Vos façades sur mesure vont être fabriquées et vos articles préparés pour l\'expédition.';
    }
    if (hasFacades) {
      return 'Merci pour votre commande. Vos façades sur mesure vont être fabriquées.';
    }
    if (hasCatalogueItems) {
      return 'Merci pour votre commande. Vos articles vont être préparés pour l\'expédition.';
    }
    return 'Merci pour votre commande. Nous préparons vos articles.';
  };

  // Prochaines étapes selon le type
  const getNextSteps = () => {
    if (isSamplesOnly) {
      return [
        'Préparation de vos échantillons sous 24-48h',
        'Vous serez notifié par email à chaque étape'
      ];
    }
    if (hasConfigurations) {
      return [
        'Mise en production de vos meubles',
        'Vous serez notifié par email à chaque étape'
      ];
    }
    if (hasFacades && hasCatalogueItems) {
      return [
        'Fabrication de vos façades et préparation de vos articles',
        'Vous serez notifié par email à chaque étape'
      ];
    }
    if (hasFacades) {
      return [
        'Fabrication de vos façades sur mesure',
        'Vous serez notifié par email à chaque étape'
      ];
    }
    if (hasCatalogueItems) {
      return [
        'Préparation de vos articles pour l\'expédition',
        'Vous serez notifié par email à chaque étape'
      ];
    }
    return [
      'Préparation de vos articles pour l\'expédition',
      'Notification par email lors de l\'envoi'
    ];
  };

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
              {isSamplesOnly && areSamplesFree ? 'Échantillons commandés !' : 'Commande confirmée !'}
            </h1>
            <p className="text-gray-700 mb-4">
              {getMainMessage()}
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
                  <span className="inline-flex items-center gap-2 bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    {order.payment_status === 'paid' ? '✅ Payée' : '✅ Confirmée'}
                  </span>
                </div>
              </div>

              {/* Meubles sur mesure */}
              {hasConfigurations && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2 bg-gray-100 p-2 -mx-4 px-4">
                    Meubles sur mesure ({order.items!.length})
                  </p>
                  <div className="space-y-4">
                    {order.items!.map((item, index) => {
                      const configData = typeof item.config_data === 'string' ? JSON.parse(item.config_data) : item.config_data;
                      const itemName = configData?.name || item.name || `Configuration #${item.configuration_id || index + 1}`;

                      // Extraire les données pour le viewer 3D
                      const dimensions = configData?.dimensions || {};
                      const styling = configData?.styling || {};
                      const advancedZones = configData?.advancedZones;

                      return (
                        <div key={`config-${item.id || index}`} className="border border-gray-200 overflow-hidden">
                          {/* Aperçu 3D */}
                          <div className="h-48 bg-[#FAFAF9] relative">
                            <ThreeViewer
                              width={dimensions.width || 1000}
                              height={dimensions.height || 2000}
                              depth={dimensions.depth || 400}
                              hexColor={styling.color || '#D8C7A1'}
                              imageUrl={styling.colorImage}
                              hasSocle={styling.socle && styling.socle !== 'none'}
                              socle={styling.socle || 'none'}
                              rootZone={advancedZones}
                              selectedZoneIds={[]}
                              componentColors={configData?.componentColors}
                              useMultiColor={configData?.useMultiColor}
                              doorType={configData?.features?.doorType || 'none'}
                              doorSide={configData?.features?.doorSide || 'left'}
                              deletedPanelIds={configData?.deletedPanelIds ? new Set(configData.deletedPanelIds) : undefined}
                            />
                          </div>
                          {/* Infos */}
                          <div className="p-3 flex items-center justify-between border-t border-gray-200">
                            <div>
                              <p className="font-medium text-sm text-gray-900">{itemName}</p>
                              <p className="text-xs text-gray-600">
                                {dimensions.width || '?'} × {dimensions.height || '?'} × {dimensions.depth || '?'} mm · Quantité: {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold text-sm text-gray-900">
                              {(item.total_price || item.unit_price * item.quantity).toLocaleString('fr-FR')} €
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Façades sur mesure */}
              {hasFacades && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2 bg-gray-100 p-2 -mx-4 px-4">
                    Façades sur mesure ({order.facade_items!.length})
                  </p>
                  <div className="space-y-2">
                    {order.facade_items!.map((facade, index) => {
                      const config = facade.config || (typeof facade.config_data === 'string' ? JSON.parse(facade.config_data) : facade.config_data);
                      const materialName = config?.material?.name || 'Matériau';
                      const width = config?.width ? (config.width / 10) : 0;
                      const height = config?.height ? (config.height / 10) : 0;
                      const depth = config?.depth || 19;

                      return (
                        <div key={`facade-${facade.id || index}`} className="border border-gray-200 p-3 flex items-center gap-3">
                          <div
                            className="h-12 w-12 flex items-center justify-center border border-gray-200"
                            style={{
                              backgroundColor: config?.material?.color_hex || '#E5E7EB',
                              backgroundImage: config?.material?.texture_url ? `url(${config.material.texture_url})` : undefined,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            {!config?.material?.texture_url && !config?.material?.color_hex && (
                              <Layers className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">
                              Façade {width} × {height} cm · {depth} mm
                            </p>
                            <p className="text-xs text-gray-600">
                              {materialName} · Quantité: {facade.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-sm text-gray-900">
                            {(facade.total_price || facade.unit_price * facade.quantity).toLocaleString('fr-FR')} €
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Articles boutique */}
              {hasCatalogueItems && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2 bg-gray-100 p-2 -mx-4 px-4">
                    Articles boutique ({order.catalogue_items!.length})
                  </p>
                  <div className="space-y-2">
                    {order.catalogue_items!.map((item, index) => (
                      <div key={`catalogue-${item.id || index}`} className="border border-gray-200 p-3 flex items-center gap-3">
                        <div className="h-12 w-12 bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name || item.item_name || 'Article'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">
                            {item.name || item.item_name || 'Article boutique'}
                          </p>
                          {item.variation_name && (
                            <p className="text-xs text-gray-600">{item.variation_name}</p>
                          )}
                          <p className="text-xs text-gray-600">Quantité: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-sm text-gray-900">
                          {(item.total_price || item.unit_price * item.quantity).toLocaleString('fr-FR')} €
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Échantillons */}
              {hasSamples && (
                <div>
                  <p className={`text-xs font-bold uppercase mb-2 p-2 -mx-4 px-4 ${areSamplesFree ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                    Échantillons ({order.samples!.length})
                  </p>
                  <div className="space-y-2">
                    {order.samples!.map((sample, index) => {
                      const samplePrice = (sample.price || 0) * sample.quantity;
                      return (
                        <div key={`sample-${sample.id || index}`} className="border border-gray-200 p-3 flex items-center gap-3">
                          <div
                            className="h-12 w-12 flex-shrink-0 border border-gray-200"
                            style={{ backgroundColor: sample.hex || '#E5E7EB' }}
                          >
                            {sample.image_url && (
                              <img
                                src={sample.image_url}
                                alt={sample.sample_name}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{sample.sample_name}</p>
                            <p className="text-xs text-gray-600">
                              {sample.sample_type_name || sample.material} · Quantité: {sample.quantity}
                            </p>
                          </div>
                          <p className={`font-semibold text-sm ${samplePrice === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            {samplePrice === 0 ? 'Gratuit' : `${samplePrice.toLocaleString('fr-FR')} €`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Adresse de livraison</p>
                <p className="text-sm text-gray-900 whitespace-pre-line">{order.shipping_address}</p>
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-900 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900">Total payé</span>
                  <span className="text-xl font-bold text-gray-900">
                    {isSamplesOnly ? 'Gratuit' : `${order.total.toLocaleString('fr-FR')} €`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="border border-gray-200 bg-white p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Prochaines étapes</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-xs text-green-700 font-medium">1</span>
                <span>Un email de confirmation a été envoyé à <strong>{order.customer_email || customer?.email}</strong></span>
              </li>
              {getNextSteps().map((step, index) => (
                <li key={index} className="flex gap-2">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-xs text-green-700 font-medium">{index + 2}</span>
                  <span>{step}</span>
                </li>
              ))}
              <li className="flex gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-xs text-green-700 font-medium">{getNextSteps().length + 2}</span>
                <span>Suivez l'avancement dans "Mes commandes"</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/account?section=orders"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 text-sm font-medium hover:bg-gray-800"
            >
              <Package className="h-4 w-4" />
              Voir mes commandes
            </Link>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Home className="h-4 w-4" />
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
