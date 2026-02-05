"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCustomer } from '@/context/CustomerContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import type { Zone } from '@/components/configurator/ZoneEditor';
import {
  IconShoppingBag,
  IconUser,
  IconHelpCircle,
  IconLogout,
  IconTrash,
  IconPackage,
  IconLock,
  IconMail,
  IconPhone,
  IconEdit,
  IconX,
  IconCheck,
  IconCalendar,
  IconClock,
  IconCircleCheck,
  IconMessage,
  IconPhoneCall,
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconBox,
  IconPlus,
  IconShoppingCart,
  IconCreditCard
} from '@tabler/icons-react';

// Import dynamique pour le viewer 3D
const ThreeViewer = dynamic(() => import('@/components/configurator/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#F5F5F4]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
    </div>
  ),
});

type Section = 'orders' | 'profile' | 'help' | 'configurations';

interface OrderItem {
  id: number;
  configuration_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  prompt?: string;
  config_data?: any;
  glb_url?: string;
  name?: string;
  configuration_name?: string;
  configuration_data?: any;
}

interface OrderSample {
  id: number;
  sample_id: number;
  sample_color_id?: number;
  sample_name?: string;
  sample_type_name?: string;
  material?: string;
  hex?: string;
  quantity: number;
  price?: number;
  unit_price?: number;
  color_name?: string;
  material_name?: string;
  image_url?: string;
}

interface OrderCatalogueItem {
  id: number;
  catalogue_item_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  name?: string;
  item_name?: string;
  variation_name?: string;
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
    drillings?: any[];
  };
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderDetails {
  id: number;
  order_number: string;
  status: string;
  total: number;
  payment_status: string;
  created_at: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  items: OrderItem[];
  samples?: OrderSample[];
  catalogue_items?: OrderCatalogueItem[];
  facade_items?: OrderFacadeItem[];
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  payment_status: string;
  created_at: string;
}

interface SavedConfiguration {
  id: number;
  template_id: number | null;
  name: string;
  prompt: string;
  config_data: any;
  glb_url: string | null;
  thumbnail_url: string | null;
  price: number;
  created_at: string;
  status: string;
  order_id?: number | null;
}

export default function Account() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading, logout } = useCustomer();
  const sectionRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<Section>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [configurations, setConfigurations] = useState<SavedConfiguration[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);

  const [editingField, setEditingField] = useState<'personal' | 'password' | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // État pour les détails de commande
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);

  // État pour le popup détails façade
  const [selectedFacadeDetail, setSelectedFacadeDetail] = useState<OrderFacadeItem | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/account');
      return;
    }

    loadOrders();
    loadConfigurations();

    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
      });
    }
  }, [isAuthenticated, authLoading, router, customer]);

  // Handle section from URL
  useEffect(() => {
    const { section } = router.query;
    if (section && ['orders', 'profile', 'help', 'configurations'].includes(section as string)) {
      setActiveSection(section as Section);
    }
  }, [router.query]);

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch('/backend/api/orders/list.php', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadOrderDetails = async (orderId: number) => {
    setIsLoadingOrderDetails(true);
    try {
      const response = await fetch(`/backend/api/orders/list.php?id=${orderId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(data.order || null);
      } else {
        throw new Error('Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Erreur chargement détails commande:', err);
      setToast({ message: 'Erreur lors du chargement des détails', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsLoadingOrderDetails(false);
    }
  };

  const loadConfigurations = async () => {
    setIsLoadingConfigs(true);
    try {
      const response = await fetch('/backend/api/configurations/list.php', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      const items = (data.configurations || []).map((raw: any) => {
        let parsed: any = raw;
        try {
          if (raw.config_string && !raw.config_data) {
            const cfg = JSON.parse(raw.config_string);
            parsed.config_data = cfg;
            if (!raw.name && cfg.name) parsed.name = cfg.name;
            if (!raw.thumbnail_url && cfg.thumbnail_url) parsed.thumbnail_url = cfg.thumbnail_url;
          }
          if (typeof parsed.config_data === 'string') {
            parsed.config_data = JSON.parse(parsed.config_data);
          }
        } catch (parseError) {
          console.warn('Erreur de parsing config_data:', parseError);
        }
        if (!parsed.name) parsed.name = `Configuration #${raw.id}`;
        return parsed as SavedConfiguration;
      });
      setConfigurations(items);
    } catch (err: any) {
      console.error('Erreur configurations:', err);
    } finally {
      setIsLoadingConfigs(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      return;
    }

    try {
      const response = await fetch('/backend/api/customers/delete.php', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        alert('Votre compte a été supprimé avec succès');
        await logout();
        router.push('/');
      } else {
        alert('Erreur lors de la suppression du compte');
      }
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la suppression du compte');
    }
  };

  const handleEditPersonal = () => {
    setSaveError('');
    setSaveSuccess('');
    setEditingField('personal');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setSaveError('');
    setSaveSuccess('');
    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
      });
    }
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
  };

  const handleSavePersonal = async () => {
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const response = await fetch('/backend/api/customers/update.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveSuccess('Informations mises à jour avec succès');
        setEditingField(null);
        window.location.reload();
      } else {
        setSaveError(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setSaveError('Erreur lors de la mise à jour');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEditPassword = () => {
    setSaveError('');
    setSaveSuccess('');
    setEditingField('password');
  };

  const handleSavePassword = async () => {
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setSaveError('Les mots de passe ne correspondent pas');
      setSaveLoading(false);
      return;
    }

    if (passwordData.new_password.length < 6) {
      setSaveError('Le mot de passe doit contenir au moins 6 caractères');
      setSaveLoading(false);
      return;
    }

    try {
      const response = await fetch('/backend/api/customers/change-password.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveSuccess('Mot de passe modifié avec succès');
        setEditingField(null);
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      } else {
        setSaveError(data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setSaveError('Erreur lors du changement de mot de passe');
    } finally {
      setSaveLoading(false);
    }
  };

  // Configuration handlers
  const handleDeleteConfig = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) return;

    try {
      const response = await fetch(`/backend/api/configurations/list.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setConfigurations(configurations.filter(c => c.id !== id));
      setToast({ message: 'Configuration supprimée', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleAddToCart = async (configId: number) => {
    try {
      const response = await fetch('/backend/api/cart/index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ configuration_id: configId, quantity: 1 })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'ajout au panier');

      setToast({ message: 'Configuration ajoutée au panier !', type: 'success' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleViewConfiguration = (config: SavedConfiguration) => {
    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(config);
        window.localStorage.setItem(`archimeuble:configuration:${config.id}`, serialized);
        window.localStorage.setItem('archimeuble:configuration:last', serialized);
      } catch (storageError) {
        console.warn('Impossible de sauvegarder:', storageError);
      }
    }

    let templateKey: string | null = null;
    if (config.prompt) {
      const match = config.prompt.match(/^([A-Za-z0-9]+)\(/);
      templateKey = match ? match[1] : null;
    }

    if (!templateKey && config.template_id) {
      templateKey = String(config.template_id);
    }

    if (!templateKey) {
      router.push('/models');
      return;
    }

    const query = new URLSearchParams();
    query.set('mode', 'view'); // Mode vue (lecture seule) pour les clients
    query.set('configId', String(config.id));
    if (config.prompt) query.set('prompt', config.prompt);

    router.push(`/configurator/${templateKey}?${query.toString()}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'en_attente_validation': { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      'validee': { label: 'Validée', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      'payee': { label: 'Payée', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      'en_production': { label: 'En production', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      'livree': { label: 'Livrée', color: 'bg-gray-50 text-gray-700 border-gray-200' },
      'annulee': { label: 'Annulée', color: 'bg-red-50 text-red-700 border-red-200' },
      'en_commande': { label: 'En commande', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const ordersCompleted = orders.filter(order =>
    order.status === 'delivered'
  );

  const ordersInProgress = orders.filter(order =>
    order.status !== 'delivered' && order.status !== 'cancelled'
  );

  const getStatusLabel = (status: string, paymentStatus: string) => {
    // Si payé, afficher "Payée" même si le status est "confirmed"
    if (paymentStatus === 'paid') {
      // Vérifier les étapes suivantes
      if (status === 'in_production') return 'En fabrication';
      if (status === 'shipped') return 'Expédiée';
      if (status === 'delivered') return 'Livrée';
      return 'Payée';
    }

    // Afficher le vrai statut de la commande
    const statusLabels: Record<string, string> = {
      'pending': 'En validation',
      'confirmed': 'À payer',
      'paid': 'Payée',
      'in_production': 'En fabrication',
      'shipped': 'Expédiée',
      'delivered': 'Livrée',
      'cancelled': 'Annulée',
      'refunded': 'Remboursée'
    };
    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string, paymentStatus?: string) => {
    // Si payé, utiliser la couleur verte sauf pour les statuts suivants
    if (paymentStatus === 'paid') {
      if (status === 'in_production') return 'bg-purple-50 text-purple-700';
      if (status === 'shipped') return 'bg-cyan-50 text-cyan-700';
      if (status === 'delivered') return 'bg-gray-100 text-gray-700';
      return 'bg-emerald-50 text-emerald-700';
    }

    const statusColors: Record<string, string> = {
      'pending': 'bg-amber-50 text-amber-700',
      'confirmed': 'bg-blue-50 text-blue-700',
      'paid': 'bg-emerald-50 text-emerald-700',
      'in_production': 'bg-purple-50 text-purple-700',
      'shipped': 'bg-cyan-50 text-cyan-700',
      'delivered': 'bg-gray-100 text-gray-700',
      'cancelled': 'bg-red-50 text-red-700',
      'refunded': 'bg-gray-50 text-gray-600'
    };
    return statusColors[status] || 'bg-gray-50 text-gray-700';
  };

  const getInitials = () => {
    const first = customer?.first_name?.[0] || '';
    const last = customer?.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
        <Head>
          <title>Mon compte — ArchiMeuble</title>
        </Head>
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: 'orders' as Section, label: 'Mes commandes', icon: IconShoppingBag },
    { id: 'configurations' as Section, label: 'Mes configurations', icon: IconBox },
    { id: 'profile' as Section, label: 'Mon profil', icon: IconUser },
    { id: 'help' as Section, label: 'Aide & Contact', icon: IconHelpCircle },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Mon compte — ArchiMeuble</title>
        <meta name="description" content="Gérez votre compte ArchiMeuble : commandes, configurations, profil et paramètres." />
      </Head>
      <Header />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50">
          <div className={`flex items-center gap-3 px-4 py-3 shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          } text-white`}>
            {toast.type === 'success' ? <IconCheck size={18} /> : <IconX size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
            {toast.type === 'success' && (
              <Link href="/cart" className="ml-2 text-xs underline">
                Voir le panier
              </Link>
            )}
            <button onClick={() => setToast(null)} className="ml-2">
              <IconX size={16} />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#1A1917] py-12 lg:py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-[#8B7355]/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-[10%] right-[5%] w-[200px] h-[200px] bg-[#5B4D3A]/15 blur-[80px] rounded-full" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center bg-[#8B7355] font-serif text-lg text-white lg:h-16 lg:w-16 lg:text-xl">
                  {getInitials()}
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Bienvenue</p>
                  <h1 className="text-xl font-bold text-white lg:text-2xl">
                    {customer?.first_name} {customer?.last_name}
                  </h1>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 border border-white/20 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
              >
                <IconLogout size={16} />
                Déconnexion
              </button>
            </div>
          </div>
        </section>

        {/* Main Content with Sidebar */}
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-8">

              {/* Sidebar Navigation - Vertical */}
              <aside className="lg:w-64 shrink-0">
                <nav className="sticky top-24 space-y-1">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-all ${
                        activeSection === item.id
                          ? 'bg-[#1A1917] text-white'
                          : 'text-[#706F6C] hover:bg-[#F5F5F4] hover:text-[#1A1917]'
                      }`}
                    >
                      <item.icon size={18} stroke={1.5} />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </aside>

              {/* Content Area */}
              <div ref={sectionRef} className="flex-1 min-w-0">

                {/* Section: Mes commandes */}
                {activeSection === 'orders' && (
                  <div className="space-y-8">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B7355]">
                        Historique
                      </span>
                      <h2 className="mt-2 text-2xl font-bold text-[#1A1917] lg:text-3xl">Mes commandes</h2>
                      <p className="mt-1 text-[#706F6C]">Suivez vos commandes et consultez votre historique</p>
                    </div>

                    {/* Stats */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      {[
                        { label: 'En cours', value: ordersInProgress.length, icon: IconClock },
                        { label: 'Terminées', value: ordersCompleted.length, icon: IconCircleCheck },
                        { label: 'Total', value: orders.length, icon: IconPackage },
                      ].map((stat) => (
                        <div key={stat.label} className="flex items-center gap-4 border border-[#E8E6E3] bg-white p-4">
                          <div className="flex h-10 w-10 items-center justify-center bg-[#F5F5F4]">
                            <stat.icon size={18} className="text-[#1A1917]" stroke={1.5} />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-[#1A1917]">{stat.value}</p>
                            <p className="text-xs text-[#706F6C]">{stat.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Détails d'une commande */}
                    {isLoadingOrderDetails ? (
                      <div className="flex h-48 items-center justify-center border border-[#E8E6E3] bg-white">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
                      </div>
                    ) : selectedOrder ? (
                      <div className="space-y-6">
                        {/* Bouton retour */}
                        <button
                          onClick={() => setSelectedOrder(null)}
                          className="flex items-center gap-2 text-sm text-[#706F6C] hover:text-[#1A1917] transition-colors"
                        >
                          <IconArrowRight size={16} className="rotate-180" />
                          Retour aux commandes
                        </button>

                        {/* En-tête commande */}
                        <div className="border border-[#E8E6E3] bg-white p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold text-[#1A1917]">
                                Commande #{selectedOrder.order_number}
                              </h3>
                              <p className="mt-1 text-sm text-[#706F6C]">
                                Passée le {formatDate(selectedOrder.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${getStatusColor(selectedOrder.status, selectedOrder.payment_status)}`}>
                                {getStatusLabel(selectedOrder.status, selectedOrder.payment_status)}
                              </span>
                              <span className="text-2xl font-bold text-[#1A1917]">
                                {selectedOrder.total.toLocaleString('fr-FR')}€
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Articles */}
                        <div className="border border-[#E8E6E3] bg-white">
                          <div className="border-b border-[#E8E6E3] p-4">
                            <h4 className="font-bold text-[#1A1917]">Articles commandés</h4>
                          </div>
                          <div className="divide-y divide-[#E8E6E3]">
                            {/* Configurations */}
                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                              selectedOrder.items.map((item, idx) => {
                                // Parser config_data si c'est une string
                                const configData = typeof item.config_data === 'string'
                                  ? (() => { try { return JSON.parse(item.config_data); } catch { return null; } })()
                                  : item.config_data;

                                return (
                                  <div key={`config-${item.id || idx}`} className="p-4">
                                    {/* Aperçu 3D */}
                                    {configData ? (
                                      <div className="h-40 bg-[#FAFAF9] border border-[#E8E6E3] mb-3 overflow-hidden">
                                        <ThreeViewer
                                          width={configData.dimensions?.width || 1500}
                                          height={configData.dimensions?.height || 730}
                                          depth={configData.dimensions?.depth || 500}
                                          hexColor={configData.styling?.color || '#D8C7A1'}
                                          imageUrl={configData.styling?.colorImage}
                                          hasSocle={configData.styling?.socle && configData.styling?.socle !== 'none'}
                                          socle={configData.styling?.socle || 'none'}
                                          rootZone={configData.advancedZones || { id: 'root', type: 'leaf', content: 'empty' } as Zone}
                                          selectedZoneIds={[]}
                                          componentColors={configData.componentColors}
                                          useMultiColor={configData.useMultiColor || false}
                                          doorType={configData.features?.doorType || 'none'}
                                          doorSide={configData.features?.doorSide || 'left'}
                                          deletedPanelIds={configData.deletedPanelIds ? new Set(configData.deletedPanelIds) : undefined}
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex h-40 items-center justify-center bg-[#F5F5F4] border border-[#E8E6E3] mb-3">
                                        <IconBox size={32} className="text-[#A8A7A3]" stroke={1.5} />
                                      </div>
                                    )}
                                    {/* Infos */}
                                    <div className="flex items-center justify-between">
                                      <div className="min-w-0">
                                        <p className="font-medium text-[#1A1917] truncate">
                                          {item.configuration_name || `Configuration #${item.configuration_id || idx + 1}`}
                                        </p>
                                        <p className="text-sm text-[#706F6C]">
                                          {configData?.dimensions ? `${configData.dimensions.width}×${configData.dimensions.height}×${configData.dimensions.depth} mm · ` : ''}
                                          Quantité : {item.quantity}
                                        </p>
                                      </div>
                                      <p className="font-bold text-[#1A1917]">
                                        {item.total_price?.toLocaleString('fr-FR') || item.unit_price?.toLocaleString('fr-FR')}€
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}

                            {/* Échantillons */}
                            {selectedOrder.samples && selectedOrder.samples.length > 0 && (
                              selectedOrder.samples.map((sample, idx) => (
                                <div key={`sample-${sample.id || idx}`} className="flex items-center gap-4 p-4">
                                  <div className="h-16 w-16 bg-[#F5F5F4] overflow-hidden flex items-center justify-center">
                                    {sample.image_url ? (
                                      <img
                                        src={sample.image_url}
                                        alt={sample.sample_name || sample.color_name || 'Échantillon'}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : sample.hex ? (
                                      <div
                                        className="h-full w-full"
                                        style={{ backgroundColor: sample.hex }}
                                      />
                                    ) : (
                                      <IconPackage size={24} className="text-[#8B7355]" stroke={1.5} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[#1A1917] truncate">
                                      {sample.sample_name || sample.color_name || `Échantillon #${sample.sample_color_id || idx + 1}`}
                                    </p>
                                    <p className="text-sm text-[#706F6C]">
                                      {sample.sample_type_name || sample.material || sample.material_name ? `${sample.sample_type_name || sample.material || sample.material_name} · ` : ''}Échantillon · Quantité : {sample.quantity}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-[#1A1917]">
                                      {(sample.price ?? sample.unit_price ?? 0).toLocaleString('fr-FR')}€
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}

                            {/* Articles du catalogue */}
                            {selectedOrder.catalogue_items && selectedOrder.catalogue_items.length > 0 && (
                              selectedOrder.catalogue_items.map((item, idx) => (
                                <div key={`catalogue-${item.id || idx}`} className="flex items-center gap-4 p-4">
                                  <div className="h-16 w-16 bg-[#F5F5F4] overflow-hidden flex items-center justify-center">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.name || item.item_name || 'Article'}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <IconShoppingBag size={24} className="text-[#706F6C]" stroke={1.5} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[#1A1917] truncate">
                                      {item.name || item.item_name || `Article #${item.catalogue_item_id || idx + 1}`}
                                    </p>
                                    <p className="text-sm text-[#706F6C]">
                                      {item.variation_name ? `${item.variation_name} · ` : ''}Quantité : {item.quantity}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-[#1A1917]">
                                      {(item.total_price || item.unit_price * item.quantity)?.toLocaleString('fr-FR')}€
                                    </p>
                                    {item.quantity > 1 && (
                                      <p className="text-xs text-[#706F6C]">
                                        {item.unit_price?.toLocaleString('fr-FR')}€ / unité
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}

                            {/* Façades sur mesure */}
                            {selectedOrder.facade_items && selectedOrder.facade_items.length > 0 && (
                              <>
                                <div className="border-t border-[#E8E6E3] bg-[#FAFAF9] px-4 py-2">
                                  <p className="text-xs font-bold uppercase tracking-wider text-[#706F6C]">
                                    Façades sur mesure ({selectedOrder.facade_items.length})
                                  </p>
                                </div>
                                {selectedOrder.facade_items.map((facade, idx) => {
                                  const config = facade.config || (typeof facade.config_data === 'string' ? JSON.parse(facade.config_data) : facade.config_data);
                                  const materialName = config?.material?.name || 'Matériau';
                                  const hingeType = config?.hinges?.type || 'no-hole-no-hinge';
                                  const hingeCount = config?.hinges?.count || 0;
                                  const hingeDirection = config?.hinges?.direction || '';

                                  return (
                                    <button
                                      key={`facade-${facade.id || idx}`}
                                      type="button"
                                      onClick={() => setSelectedFacadeDetail({ ...facade, config })}
                                      className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[#FAFAF9] cursor-pointer"
                                    >
                                      <div
                                        className="h-16 w-16 bg-[#F5F5F4] overflow-hidden flex items-center justify-center border border-[#E8E6E3]"
                                        style={{
                                          backgroundColor: config?.material?.color_hex || '#E5E7EB',
                                          backgroundImage: config?.material?.texture_url ? `url(${config.material.texture_url})` : undefined,
                                          backgroundSize: 'cover',
                                          backgroundPosition: 'center',
                                        }}
                                      >
                                        {!config?.material?.texture_url && !config?.material?.color_hex && (
                                          <IconBox size={24} className="text-[#706F6C]" stroke={1.5} />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[#1A1917]">
                                          Façade {config?.width ? `${config.width / 10} × ${config.height / 10} cm` : ''} · {config?.depth || 19} mm
                                        </p>
                                        <p className="text-sm text-[#706F6C]">
                                          {materialName}
                                          {hingeType !== 'no-hole-no-hinge' && hingeCount > 0 && (
                                            <> · {hingeCount} charnières · Ouverture {hingeDirection === 'left' ? 'gauche' : 'droite'}</>
                                          )}
                                        </p>
                                        <p className="text-xs text-[#8B7355] mt-1 underline">Voir les détails</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-[#1A1917]">
                                          {(facade.total_price || facade.unit_price * facade.quantity)?.toLocaleString('fr-FR')}€
                                        </p>
                                        {facade.quantity > 1 && (
                                          <p className="text-xs text-[#706F6C]">
                                            {facade.unit_price?.toLocaleString('fr-FR')}€ / unité
                                          </p>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </>
                            )}

                            {/* Message si aucun article */}
                            {(!selectedOrder.items || selectedOrder.items.length === 0) &&
                             (!selectedOrder.samples || selectedOrder.samples.length === 0) &&
                             (!selectedOrder.catalogue_items || selectedOrder.catalogue_items.length === 0) &&
                             (!selectedOrder.facade_items || selectedOrder.facade_items.length === 0) && (
                              <div className="p-6 text-center text-[#706F6C]">
                                Aucun détail disponible pour cette commande
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Adresse de livraison */}
                        {(selectedOrder.shipping_address || selectedOrder.shipping_city) && (
                          <div className="border border-[#E8E6E3] bg-white p-6">
                            <h4 className="font-bold text-[#1A1917] mb-3">Adresse de livraison</h4>
                            <p className="text-[#706F6C]">
                              {selectedOrder.shipping_address}<br />
                              {selectedOrder.shipping_postal_code} {selectedOrder.shipping_city}<br />
                              {selectedOrder.shipping_country}
                            </p>
                          </div>
                        )}

                        {/* Messages selon le statut */}
                        {selectedOrder.status === 'pending' && (
                          <div className="border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-start gap-3">
                              <IconClock size={20} className="text-amber-600 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-amber-800">En attente de validation</h4>
                                <p className="mt-1 text-sm text-amber-700">
                                  Votre commande est en cours de vérification par notre équipe.
                                  Vous recevrez un email dès qu'elle sera validée et prête pour le paiement.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedOrder.status === 'confirmed' && selectedOrder.payment_status !== 'paid' && (
                          <div className="border border-blue-200 bg-blue-50 p-4">
                            <div className="flex items-start gap-3">
                              <IconCreditCard size={20} className="text-blue-600 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-blue-800">En attente de paiement</h4>
                                <p className="mt-1 text-sm text-blue-700">
                                  Votre commande a été validée. Vous pouvez procéder au paiement pour lancer la fabrication.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedOrder.payment_status === 'paid' && selectedOrder.status !== 'in_production' && selectedOrder.status !== 'shipped' && selectedOrder.status !== 'delivered' && (
                          <div className="border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-start gap-3">
                              <IconCircleCheck size={20} className="text-emerald-600 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-emerald-800">Paiement reçu</h4>
                                <p className="mt-1 text-sm text-emerald-700">
                                  Merci pour votre paiement ! Votre commande va être traitée prochainement.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedOrder.status === 'in_production' && (
                          <div className="border border-purple-200 bg-purple-50 p-4">
                            <div className="flex items-start gap-3">
                              <IconBox size={20} className="text-purple-600 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-purple-800">En cours de préparation</h4>
                                <p className="mt-1 text-sm text-purple-700">
                                  Votre commande est actuellement en cours de préparation.
                                  Nous vous tiendrons informé de l'avancement.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedOrder.status === 'shipped' && (
                          <div className="border border-cyan-200 bg-cyan-50 p-4">
                            <div className="flex items-start gap-3">
                              <IconPackage size={20} className="text-cyan-600 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-cyan-800">Expédiée</h4>
                                <p className="mt-1 text-sm text-cyan-700">
                                  Votre commande a été expédiée ! Vous recevrez bientôt les informations de livraison.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedOrder.status === 'delivered' && (
                          <div className="border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-start gap-3">
                              <IconCircleCheck size={20} className="text-gray-600 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-gray-800">Livrée</h4>
                                <p className="mt-1 text-sm text-gray-700">
                                  Votre commande a été livrée. Nous espérons que vous êtes satisfait de votre achat !
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedOrder.status === 'cancelled' && (
                          <div className="border border-red-200 bg-red-50 p-4">
                            <div className="flex items-start gap-3">
                              <IconX size={20} className="text-red-600 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-red-800">Annulée</h4>
                                <p className="mt-1 text-sm text-red-700">
                                  Cette commande a été annulée. Contactez-nous si vous avez des questions.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3">
                          {/* Bouton Payer si validé mais pas payé */}
                          {selectedOrder.status === 'confirmed' && selectedOrder.payment_status !== 'paid' && (
                            <button
                              onClick={() => router.push(`/checkout?order_id=${selectedOrder.id}`)}
                              className="flex items-center gap-2 bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
                            >
                              <IconCreditCard size={16} />
                              Payer la commande
                            </button>
                          )}
                          <a
                            href="mailto:pro.archimeuble@gmail.com"
                            className="flex items-center gap-2 border border-[#E8E6E3] px-5 py-2.5 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#F5F5F4]"
                          >
                            <IconMail size={16} />
                            Contacter le support
                          </a>
                        </div>
                      </div>
                    ) : isLoadingOrders ? (
                      <div className="flex h-48 items-center justify-center border border-[#E8E6E3] bg-white">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="border border-[#E8E6E3] bg-white p-12 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#F5F5F4]">
                          <IconPackage size={32} className="text-[#A8A7A3]" stroke={1.5} />
                        </div>
                        <h3 className="mt-6 text-lg font-bold text-[#1A1917]">Aucune commande</h3>
                        <p className="mt-2 text-[#706F6C]">Vous n'avez pas encore passé de commande</p>
                        <Link
                          href="/"
                          className="mt-6 inline-flex items-center gap-2 bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
                        >
                          Découvrir nos meubles
                          <IconArrowRight size={16} />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order) => (
                          <button
                            key={order.id}
                            onClick={() => loadOrderDetails(order.id)}
                            className="group w-full text-left border border-[#E8E6E3] bg-white p-5 transition-all hover:border-[#1A1917]/20 hover:shadow-md"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center bg-[#F5F5F4]">
                                  <IconPackage size={18} className="text-[#1A1917]" stroke={1.5} />
                                </div>
                                <div>
                                  <p className="font-medium text-[#1A1917] group-hover:text-[#8B7355]">
                                    Commande #{order.order_number}
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#706F6C]">
                                    <IconCalendar size={14} />
                                    {formatDate(order.created_at)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-[#1A1917]">{order.total.toLocaleString('fr-FR')}€</p>
                                  <span className={`inline-block px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status, order.payment_status)}`}>
                                    {getStatusLabel(order.status, order.payment_status)}
                                  </span>
                                </div>
                                <IconArrowRight size={18} className="text-[#A8A7A3] transition-transform group-hover:translate-x-1 group-hover:text-[#8B7355]" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Section: Mes configurations */}
                {activeSection === 'configurations' && (
                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B7355]">
                          Vos projets
                        </span>
                        <h2 className="mt-2 text-2xl font-bold text-[#1A1917] lg:text-3xl">Mes configurations</h2>
                        <p className="mt-1 text-[#706F6C]">Retrouvez et gérez vos meubles configurés</p>
                      </div>
                      <Link
                        href="/models"
                        className="inline-flex items-center gap-2 bg-[#1A1917] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
                      >
                        <IconPlus size={16} />
                        Nouvelle configuration
                      </Link>
                    </div>

                    {isLoadingConfigs ? (
                      <div className="flex h-48 items-center justify-center border border-[#E8E6E3] bg-white">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
                      </div>
                    ) : configurations.length === 0 ? (
                      <div className="border border-[#E8E6E3] bg-white p-12 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#F5F5F4]">
                          <IconBox size={32} className="text-[#A8A7A3]" stroke={1.5} />
                        </div>
                        <h3 className="mt-6 text-lg font-bold text-[#1A1917]">Aucune configuration</h3>
                        <p className="mt-2 text-[#706F6C]">Créez votre première configuration pour la retrouver ici</p>
                        <Link
                          href="/models"
                          className="mt-6 inline-flex items-center gap-2 bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
                        >
                          <IconPlus size={16} />
                          Commencer une configuration
                        </Link>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {configurations.map((config) => (
                          <div key={config.id} className="group border border-[#E8E6E3] bg-white overflow-hidden transition-all hover:border-[#1A1917]/30 hover:shadow-md">
                            {/* Preview 3D */}
                            <div className="h-48 bg-[#F5F5F4] relative overflow-hidden">
                              {config.config_data ? (
                                <ThreeViewer
                                  width={config.config_data.dimensions?.width || 1500}
                                  height={config.config_data.dimensions?.height || 730}
                                  depth={config.config_data.dimensions?.depth || 500}
                                  color={config.config_data.styling?.color || '#D8C7A1'}
                                  hasSocle={config.config_data.styling?.socle !== 'none'}
                                  rootZone={config.config_data.advancedZones || { id: 'root', type: 'leaf', content: 'empty' } as Zone}
                                  selectedZoneId={null}
                                  onSelectZone={() => {}}
                                  isBuffet={false}
                                  doorsOpen={config.config_data.features?.doorsOpen ?? false}
                                  showDecorations={false}
                                  componentColors={config.config_data.componentColors}
                                  useMultiColor={config.config_data.useMultiColor || false}
                                  doorType={config.config_data.features?.doorType || 'none'}
                                  doorSide={config.config_data.features?.doorSide || 'left'}
                                  onToggleDoors={() => {}}
                                  deletedPanelIds={config.config_data.deletedPanelIds ? new Set(config.config_data.deletedPanelIds) : undefined}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <IconBox size={48} className="text-[#D4D4D4]" stroke={1} />
                                </div>
                              )}

                              {/* Status badge */}
                              <div className="absolute top-3 right-3">
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border ${getStatusInfo(config.status).color}`}>
                                  {getStatusInfo(config.status).label}
                                </span>
                              </div>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-[#1A1917] truncate">{config.name}</h3>
                                <p className="text-lg font-bold text-[#8B7355] shrink-0">{config.price}€</p>
                              </div>

                              <div className="mt-3 flex items-center gap-4 text-xs text-[#706F6C]">
                                <span className="flex items-center gap-1">
                                  <IconCalendar size={12} />
                                  {formatDate(config.created_at)}
                                </span>
                                {config.config_data?.dimensions && (
                                  <span>
                                    {config.config_data.dimensions.width}×{config.config_data.dimensions.depth}×{config.config_data.dimensions.height}mm
                                  </span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="mt-4 flex gap-2">
                                {config.status === 'validee' ? (
                                  <button
                                    onClick={() => handleAddToCart(config.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1917] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#2D2B28]"
                                  >
                                    <IconShoppingCart size={14} />
                                    Commander
                                  </button>
                                ) : config.status === 'en_commande' && config.order_id ? (
                                  <button
                                    onClick={() => router.push(`/checkout?order_id=${config.order_id}`)}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                                  >
                                    <IconCreditCard size={14} />
                                    Payer
                                  </button>
                                ) : ['payee', 'en_production', 'livree'].includes(config.status) ? (
                                  <div className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 px-3 py-2 text-xs font-medium text-white">
                                    <IconCheck size={14} />
                                    Commandé
                                  </div>
                                ) : config.status === 'annulee' ? (
                                  <div className="flex-1 flex items-center justify-center gap-1.5 bg-red-100 px-3 py-2 text-xs font-medium text-red-600">
                                    Annulée
                                  </div>
                                ) : (
                                  <div className="flex-1 flex items-center justify-center gap-1.5 bg-[#F5F5F4] px-3 py-2 text-xs font-medium text-[#706F6C]">
                                    <IconClock size={14} />
                                    En attente
                                  </div>
                                )}

                                <button
                                  onClick={() => handleViewConfiguration(config)}
                                  className="flex items-center justify-center gap-1.5 border border-[#E8E6E3] px-3 py-2 text-xs font-medium text-[#1A1917] transition-colors hover:bg-[#F5F5F4]"
                                >
                                  <IconEye size={14} />
                                  Voir
                                </button>

                                <button
                                  onClick={() => handleDeleteConfig(config.id)}
                                  className="flex items-center justify-center border border-red-200 px-3 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Section: Mon profil */}
                {activeSection === 'profile' && (
                  <div className="space-y-8">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B7355]">
                        Paramètres
                      </span>
                      <h2 className="mt-2 text-2xl font-bold text-[#1A1917] lg:text-3xl">Mon profil</h2>
                      <p className="mt-1 text-[#706F6C]">Gérez vos informations personnelles</p>
                    </div>

                    {/* Messages */}
                    {saveSuccess && (
                      <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <IconCircleCheck size={18} className="text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-800">{saveSuccess}</p>
                      </div>
                    )}
                    {saveError && (
                      <div className="flex items-center gap-3 border border-red-200 bg-red-50 px-4 py-3">
                        <IconX size={18} className="text-red-600" />
                        <p className="text-sm font-medium text-red-800">{saveError}</p>
                      </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Informations personnelles */}
                      <div className="border border-[#E8E6E3] bg-white p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[#1A1917]">Informations personnelles</h3>
                          {editingField !== 'personal' && (
                            <button
                              onClick={handleEditPersonal}
                              className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:underline"
                            >
                              <IconEdit size={14} />
                              Modifier
                            </button>
                          )}
                        </div>

                        {editingField === 'personal' ? (
                          <div className="mt-6 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-1.5 block text-xs font-medium text-[#706F6C] uppercase tracking-wider">Prénom</label>
                                <input
                                  type="text"
                                  value={formData.first_name}
                                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                  className="w-full border border-[#E8E6E3] bg-white px-4 py-2.5 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                                />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-xs font-medium text-[#706F6C] uppercase tracking-wider">Nom</label>
                                <input
                                  type="text"
                                  value={formData.last_name}
                                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                  className="w-full border border-[#E8E6E3] bg-white px-4 py-2.5 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-[#706F6C] uppercase tracking-wider">Email</label>
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full border border-[#E8E6E3] bg-white px-4 py-2.5 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-[#706F6C] uppercase tracking-wider">Téléphone</label>
                              <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Optionnel"
                                className="w-full border border-[#E8E6E3] bg-white px-4 py-2.5 text-[#1A1917] placeholder:text-[#A8A7A3] outline-none transition-colors focus:border-[#1A1917]"
                              />
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={handleSavePersonal}
                                disabled={saveLoading}
                                className="flex items-center gap-2 bg-[#1A1917] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28] disabled:opacity-50"
                              >
                                {saveLoading ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <IconCheck size={16} />
                                )}
                                Enregistrer
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="border border-[#E8E6E3] px-5 py-2.5 text-sm font-medium text-[#706F6C] transition-colors hover:bg-[#F5F5F4]"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-3">
                              <IconUser size={16} className="text-[#A8A7A3]" />
                              <span className="text-[#1A1917]">{customer?.first_name} {customer?.last_name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <IconMail size={16} className="text-[#A8A7A3]" />
                              <span className="text-[#1A1917]">{customer?.email}</span>
                            </div>
                            {customer?.phone && (
                              <div className="flex items-center gap-3">
                                <IconPhone size={16} className="text-[#A8A7A3]" />
                                <span className="text-[#1A1917]">{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Mot de passe */}
                      <div className="border border-[#E8E6E3] bg-white p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[#1A1917]">Sécurité</h3>
                          {editingField !== 'password' && (
                            <button
                              onClick={handleEditPassword}
                              className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:underline"
                            >
                              <IconEdit size={14} />
                              Modifier
                            </button>
                          )}
                        </div>

                        {editingField === 'password' ? (
                          <div className="mt-6 space-y-4">
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-[#706F6C] uppercase tracking-wider">Mot de passe actuel</label>
                              <div className="relative">
                                <input
                                  type={showPasswords.current ? 'text' : 'password'}
                                  value={passwordData.current_password}
                                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                  className="w-full border border-[#E8E6E3] bg-white px-4 py-2.5 pr-12 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A7A3]"
                                >
                                  {showPasswords.current ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-[#706F6C] uppercase tracking-wider">Nouveau mot de passe</label>
                              <div className="relative">
                                <input
                                  type={showPasswords.new ? 'text' : 'password'}
                                  value={passwordData.new_password}
                                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                  placeholder="Minimum 6 caractères"
                                  className="w-full border border-[#E8E6E3] bg-white px-4 py-2.5 pr-12 text-[#1A1917] placeholder:text-[#A8A7A3] outline-none transition-colors focus:border-[#1A1917]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A7A3]"
                                >
                                  {showPasswords.new ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-[#706F6C] uppercase tracking-wider">Confirmer</label>
                              <div className="relative">
                                <input
                                  type={showPasswords.confirm ? 'text' : 'password'}
                                  value={passwordData.confirm_password}
                                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                  className="w-full border border-[#E8E6E3] bg-white px-4 py-2.5 pr-12 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A7A3]"
                                >
                                  {showPasswords.confirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={handleSavePassword}
                                disabled={saveLoading}
                                className="flex items-center gap-2 bg-[#1A1917] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28] disabled:opacity-50"
                              >
                                {saveLoading ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <IconCheck size={16} />
                                )}
                                Enregistrer
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="border border-[#E8E6E3] px-5 py-2.5 text-sm font-medium text-[#706F6C] transition-colors hover:bg-[#F5F5F4]"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-6">
                            <div className="flex items-center gap-3 bg-[#F5F5F4] p-3">
                              <IconLock size={16} className="text-[#A8A7A3]" />
                              <span className="text-[#1A1917]">••••••••</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Zone danger */}
                    <div className="border border-red-200 bg-red-50/50 p-6">
                      <h3 className="font-bold text-red-900">Supprimer mon compte</h3>
                      <p className="mt-2 text-sm text-red-700/80">
                        Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        className="mt-4 flex items-center gap-2 border border-red-300 px-5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                      >
                        <IconTrash size={16} />
                        Supprimer mon compte
                      </button>
                    </div>
                  </div>
                )}

                {/* Section: Aide et contact */}
                {activeSection === 'help' && (
                  <div className="space-y-8">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B7355]">
                        Support
                      </span>
                      <h2 className="mt-2 text-2xl font-bold text-[#1A1917] lg:text-3xl">Aide & Contact</h2>
                      <p className="mt-1 text-[#706F6C]">Nous sommes là pour vous aider</p>
                    </div>

                    {/* Contact Cards */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <a
                        href="mailto:pro.archimeuble@gmail.com"
                        className="group border border-[#E8E6E3] bg-white p-6 transition-all hover:border-[#1A1917]/20 hover:shadow-md"
                      >
                        <div className="flex h-12 w-12 items-center justify-center bg-[#F5F5F4] transition-colors group-hover:bg-[#1A1917]">
                          <IconMail size={20} className="text-[#1A1917] transition-colors group-hover:text-white" stroke={1.5} />
                        </div>
                        <h3 className="mt-4 font-bold text-[#1A1917]">Email</h3>
                        <p className="mt-1 text-[#8B7355]">pro.archimeuble@gmail.com</p>
                        <p className="mt-2 text-sm text-[#706F6C]">Réponse sous 24h</p>
                      </a>

                      <a
                        href="tel:0601062867"
                        className="group border border-[#E8E6E3] bg-white p-6 transition-all hover:border-[#1A1917]/20 hover:shadow-md"
                      >
                        <div className="flex h-12 w-12 items-center justify-center bg-[#F5F5F4] transition-colors group-hover:bg-[#1A1917]">
                          <IconPhoneCall size={20} className="text-[#1A1917] transition-colors group-hover:text-white" stroke={1.5} />
                        </div>
                        <h3 className="mt-4 font-bold text-[#1A1917]">Téléphone</h3>
                        <p className="mt-1 text-[#8B7355]">06 01 06 28 67</p>
                        <p className="mt-2 text-sm text-[#706F6C]">Lun - Ven, 9h - 18h</p>
                      </a>
                    </div>

                    {/* FAQ */}
                    <div className="border border-[#E8E6E3] bg-white">
                      <div className="border-b border-[#E8E6E3] p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center bg-[#F5F5F4]">
                            <IconMessage size={18} className="text-[#1A1917]" stroke={1.5} />
                          </div>
                          <h3 className="font-bold text-[#1A1917]">Questions fréquentes</h3>
                        </div>
                      </div>

                      <div className="divide-y divide-[#E8E6E3]">
                        {[
                          {
                            q: 'Comment passer une commande ?',
                            a: 'Configurez votre meuble depuis la page d\'accueil en choisissant vos options (dimensions, matériaux, finitions), ajoutez-le au panier, puis validez votre commande.'
                          },
                          {
                            q: 'Quels sont les délais de livraison ?',
                            a: 'Nos meubles étant fabriqués sur mesure, comptez généralement 4 à 8 semaines. Vous recevrez une estimation précise après validation.'
                          },
                          {
                            q: 'Comment modifier ou annuler ma commande ?',
                            a: 'Contactez notre service client par email ou téléphone dans les 24h suivant votre commande.'
                          },
                          {
                            q: 'Quelles garanties proposez-vous ?',
                            a: 'Tous nos meubles sont garantis contre les défauts de fabrication. Cette garantie couvre les pièces et la main d\'œuvre.'
                          }
                        ].map((item, i) => (
                          <div key={i} className="p-5 transition-colors hover:bg-[#FAFAF9]">
                            <h4 className="font-medium text-[#1A1917]">{item.q}</h4>
                            <p className="mt-2 text-sm leading-relaxed text-[#706F6C]">{item.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="bg-[#1A1917] p-8 text-center">
                      <h3 className="text-xl font-bold text-white">Besoin d'aide pour votre projet ?</h3>
                      <p className="mt-2 text-white/70">Notre équipe est à votre disposition pour vous accompagner</p>
                      <Link
                        href="/contact-request"
                        className="mt-6 inline-flex items-center gap-2 bg-white px-6 py-3 text-sm font-medium text-[#1A1917] transition-colors hover:bg-[#F5F5F4]"
                      >
                        Nous contacter
                        <IconArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Modal détails façade */}
      {selectedFacadeDetail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedFacadeDetail(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-[#E8E6E3] bg-white p-6">
              <h3 className="font-serif text-xl text-[#1A1917]">Détails de la façade</h3>
              <button
                type="button"
                onClick={() => setSelectedFacadeDetail(null)}
                className="flex h-10 w-10 items-center justify-center text-[#706F6C] transition-colors hover:bg-[#F5F5F4] hover:text-[#1A1917]"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {(() => {
                const config = selectedFacadeDetail.config;
                const materialName = config?.material?.name || 'Matériau';
                const hingeType = config?.hinges?.type || 'no-hole-no-hinge';
                const hingeCount = config?.hinges?.count || 0;
                const hingeSide = config?.hinges?.direction || '';
                const drillings = config?.drillings || [];

                return (
                  <div className="space-y-6">
                    {/* Aperçu visuel */}
                    <div
                      className="aspect-square w-full max-w-[200px] mx-auto border border-[#E8E6E3]"
                      style={{
                        backgroundColor: config?.material?.color_hex || '#E5E7EB',
                        backgroundImage: config?.material?.texture_url ? `url(${config.material.texture_url})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />

                    {/* Info Grid */}
                    <div className="grid gap-4">
                      {/* Dimensions */}
                      <div className="flex justify-between items-center py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C]">Dimensions</span>
                        <span className="text-sm font-medium text-[#1A1917]">
                          {config?.width ? `${config.width / 10} × ${config.height / 10} cm` : 'N/A'} · {config?.depth || 19} mm
                        </span>
                      </div>

                      {/* Matériau */}
                      <div className="flex justify-between items-center py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C]">Matériau</span>
                        <div className="flex items-center gap-2">
                          {config?.material?.texture_url ? (
                            <div className="h-5 w-5 border border-[#E8E6E3] overflow-hidden">
                              <img src={config.material.texture_url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ) : config?.material?.color_hex ? (
                            <div className="h-5 w-5 border border-[#E8E6E3]" style={{ backgroundColor: config.material.color_hex }} />
                          ) : null}
                          <span className="text-sm font-medium text-[#1A1917]">{materialName}</span>
                        </div>
                      </div>

                      {/* Type de charnière */}
                      <div className="py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C] block mb-3">Charnières</span>
                        <div className="flex items-center gap-3 p-3 bg-[#FAFAF9] rounded-lg">
                          <div className="flex-shrink-0">
                            {hingeType === 'no-hole-no-hinge' && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="16" y="8" width="32" height="48" fill="#D1D5DB" stroke="#1A1917" strokeWidth="2" rx="2"/>
                                <circle cx="40" cy="32" r="2" fill="#6B7280"/>
                                <line x1="12" y1="12" x2="52" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
                                <line x1="52" y1="12" x2="12" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                            )}
                            {hingeType === 'hole-with-applied-hinge' && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="6" y="8" width="16" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
                                <rect x="20" y="12" width="28" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
                                <rect x="18" y="20" width="8" height="12" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <rect x="14" y="22" width="6" height="8" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <circle cx="22" cy="24" r="1.5" fill="#374151"/>
                                <circle cx="22" cy="29" r="1.5" fill="#374151"/>
                                <circle cx="17" cy="26" r="1.5" fill="#374151"/>
                                <circle cx="40" cy="32" r="2.5" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
                              </svg>
                            )}
                            {hingeType === 'hole-with-twin-hinge' && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="28" y="8" width="8" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
                                <rect x="6" y="12" width="22" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
                                <rect x="36" y="12" width="22" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
                                <rect x="26" y="20" width="6" height="10" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <rect x="22" y="22" width="5" height="6" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <rect x="32" y="20" width="6" height="10" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <rect x="37" y="22" width="5" height="6" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
                                <circle cx="29" cy="24" r="1.2" fill="#374151"/>
                                <circle cx="35" cy="24" r="1.2" fill="#374151"/>
                                <circle cx="20" cy="32" r="2" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8"/>
                                <circle cx="44" cy="32" r="2" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8"/>
                              </svg>
                            )}
                            {hingeType === 'hole-with-integrated-hinge' && (
                              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                                <rect x="6" y="8" width="20" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
                                <rect x="24" y="12" width="4" height="40" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
                                <rect x="26" y="12" width="28" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
                                <circle cx="29" cy="22" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
                                <circle cx="29" cy="32" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
                                <circle cx="29" cy="42" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
                                <rect x="27" y="20" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
                                <rect x="27" y="30" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
                                <rect x="27" y="40" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
                                <circle cx="45" cy="32" r="2.5" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1A1917]">
                              {hingeType === 'no-hole-no-hinge' && 'Sans trou, sans charnière'}
                              {hingeType === 'hole-with-applied-hinge' && 'Trou + charnière fournie porte en applique'}
                              {hingeType === 'hole-with-twin-hinge' && 'Trou + charnière fournie porte jumelée'}
                              {hingeType === 'hole-with-integrated-hinge' && 'Trou + charnière fournie porte encastrée'}
                              {!hingeType && 'Sans trou, sans charnière'}
                            </p>
                            {hingeType !== 'no-hole-no-hinge' && hingeCount > 0 && (
                              <p className="text-xs text-[#706F6C] mt-1">
                                {hingeCount} charnières · Ouverture {hingeSide === 'left' ? 'gauche' : hingeSide === 'right' ? 'droite' : hingeSide}
                              </p>
                            )}
                            <p className="text-xs text-[#8B7355] mt-1">
                              Prix unit. {hingeType === 'no-hole-no-hinge' || !hingeType ? '0.00' : '34.20'} € TTC
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Perçages */}
                      {drillings.length > 0 && (
                        <div className="py-3 border-b border-[#E8E6E3]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-[#706F6C]">Perçages</span>
                            <span className="text-sm font-medium text-[#1A1917]">{drillings.length} trou{drillings.length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="space-y-1 pl-4">
                            {drillings.map((drill: any, idx: number) => (
                              <div key={drill.id || idx} className="flex justify-between text-xs">
                                <span className="text-[#706F6C]">
                                  {drill.typeName || `Trou ${idx + 1}`} ({drill.diameter}mm) - Position: {drill.x}×{drill.y} cm
                                </span>
                                {drill.price > 0 && (
                                  <span className="text-[#1A1917]">+{Number(drill.price).toFixed(2)} €</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quantité */}
                      <div className="flex justify-between items-center py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C]">Quantité</span>
                        <span className="text-sm font-medium text-[#1A1917]">{selectedFacadeDetail.quantity}</span>
                      </div>

                      {/* Prix unitaire */}
                      <div className="flex justify-between items-center py-3 border-b border-[#E8E6E3]">
                        <span className="text-sm text-[#706F6C]">Prix unitaire</span>
                        <span className="text-sm font-medium text-[#1A1917]">{selectedFacadeDetail.unit_price?.toLocaleString('fr-FR')} €</span>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center py-3 bg-[#F5F5F4] px-4 -mx-4">
                        <span className="text-sm font-medium text-[#1A1917]">Total</span>
                        <span className="text-lg font-medium text-[#1A1917]">
                          {(selectedFacadeDetail.total_price || selectedFacadeDetail.unit_price * selectedFacadeDetail.quantity)?.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-[#E8E6E3] bg-white p-6">
              <button
                type="button"
                onClick={() => setSelectedFacadeDetail(null)}
                className="w-full h-12 bg-[#1A1917] text-white text-sm font-medium transition-colors hover:bg-[#2D2B28]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
