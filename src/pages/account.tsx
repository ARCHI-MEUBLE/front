import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useCustomer } from '@/context/CustomerContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  User,
  HelpCircle,
  LogOut,
  Trash2,
  Package,
  Lock,
  Mail,
  Phone,
  Edit3,
  X,
  Check,
  Calendar,
  Clock,
  CheckCircle,
  MessageCircle,
  PhoneCall,
  Eye,
  EyeOff,
  ArrowRight,
  MapPin,
  Layers
} from 'lucide-react';

type Section = 'orders' | 'profile' | 'help';

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  payment_status: string;
  created_at: string;
}

export default function Account() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading, logout } = useCustomer();

  const [activeSection, setActiveSection] = useState<Section>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

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

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/account');
      return;
    }

    loadOrders();

    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
      });
    }
  }, [isAuthenticated, authLoading, router, customer]);

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

  const ordersCompleted = orders.filter(order =>
    order.payment_status === 'paid' || order.status === 'delivered'
  );

  const ordersInProgress = orders.filter(order =>
    order.payment_status !== 'paid' && order.status !== 'delivered'
  );

  const getStatusLabel = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'paid' || status === 'delivered') return 'Terminée';
    if (status === 'confirmed') return 'En préparation';
    return 'En attente';
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
    { id: 'orders' as Section, label: 'Mes commandes', icon: ShoppingBag },
    { id: 'profile' as Section, label: 'Mon profil', icon: User },
    { id: 'help' as Section, label: 'Aide & Contact', icon: HelpCircle },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Mon compte — ArchiMeuble</title>
        <meta name="description" content="Gérez votre compte ArchiMeuble : commandes, profil et paramètres." />
      </Head>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#1A1917] py-16 lg:py-24">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8B7355] font-serif text-xl text-white lg:h-20 lg:w-20 lg:text-2xl"
                >
                  {getInitials()}
                </motion.div>
                <div>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-white/60"
                  >
                    Bienvenue
                  </motion.p>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="font-serif text-2xl text-white lg:text-3xl"
                  >
                    {customer?.first_name} {customer?.last_name}
                  </motion.h1>
                </div>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </motion.button>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <section className="border-b border-[#E8E4DE] bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <nav className="flex gap-1 overflow-x-auto py-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    activeSection === item.id
                      ? 'bg-[#1A1917] text-white'
                      : 'text-[#6B6560] hover:bg-[#F5F3F0] hover:text-[#1A1917]'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
              {/* Lien direct vers Mes configurations */}
              <Link
                href="/my-configurations"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-[#6B6560] transition-all hover:bg-[#F5F3F0] hover:text-[#1A1917]"
              >
                <Layers className="h-4 w-4" />
                Mes configurations
              </Link>
            </nav>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-6">

            {/* Section: Mes commandes */}
            {activeSection === 'orders' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10"
              >
                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                    Historique
                  </span>
                  <h2 className="mt-2 font-serif text-3xl text-[#1A1917]">Mes commandes</h2>
                  <p className="mt-2 text-[#6B6560]">Suivez vos commandes et consultez votre historique</p>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: 'En cours', value: ordersInProgress.length, icon: Clock },
                    { label: 'Terminées', value: ordersCompleted.length, icon: CheckCircle },
                    { label: 'Total', value: orders.length, icon: Package },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center gap-4 rounded-2xl border border-[#E8E4DE] bg-white p-5"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3F0]">
                        <stat.icon className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-serif text-2xl text-[#1A1917]">{stat.value}</p>
                        <p className="text-sm text-[#6B6560]">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {isLoadingOrders ? (
                  <div className="flex h-48 items-center justify-center rounded-2xl border border-[#E8E4DE] bg-white">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="rounded-2xl border border-[#E8E4DE] bg-white p-12 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F3F0]">
                      <Package className="h-8 w-8 text-[#6B6560]" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-6 font-serif text-xl text-[#1A1917]">Aucune commande</h3>
                    <p className="mt-2 text-[#6B6560]">Vous n'avez pas encore passé de commande</p>
                    <Link
                      href="/Archimeuble/front/public"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105"
                    >
                      Découvrir nos meubles
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order, i) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          href="/my-orders"
                          className="group block rounded-2xl border border-[#E8E4DE] bg-white p-6 transition-all hover:border-[#1A1917]/20 hover:shadow-lg"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F3F0]">
                                <Package className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                              </div>
                              <div>
                                <p className="font-medium text-[#1A1917] group-hover:text-[#8B7355]">
                                  Commande #{order.order_number}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#6B6560]">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(order.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-serif text-xl text-[#1A1917]">{order.total.toLocaleString('fr-FR')}€</p>
                                <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                                  order.payment_status === 'paid' || order.status === 'delivered'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-[#F5F3F0] text-[#6B6560]'
                                }`}>
                                  {getStatusLabel(order.status, order.payment_status)}
                                </span>
                              </div>
                              <ArrowRight className="h-5 w-5 text-[#6B6560] transition-transform group-hover:translate-x-1 group-hover:text-[#8B7355]" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Section: Mon profil */}
            {activeSection === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10"
              >
                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                    Paramètres
                  </span>
                  <h2 className="mt-2 font-serif text-3xl text-[#1A1917]">Mon profil</h2>
                  <p className="mt-2 text-[#6B6560]">Gérez vos informations personnelles</p>
                </div>

                {/* Messages */}
                {saveSuccess && (
                  <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-800">{saveSuccess}</p>
                  </div>
                )}
                {saveError && (
                  <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                    <X className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium text-red-800">{saveError}</p>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Informations personnelles */}
                  <div className="rounded-2xl border border-[#E8E4DE] bg-white p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#1A1917]">Informations personnelles</h3>
                      {editingField !== 'personal' && (
                        <button
                          onClick={handleEditPersonal}
                          className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:underline"
                        >
                          <Edit3 className="h-4 w-4" />
                          Modifier
                        </button>
                      )}
                    </div>

                    {editingField === 'personal' ? (
                      <div className="mt-6 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-sm text-[#6B6560]">Prénom</label>
                            <input
                              type="text"
                              value={formData.first_name}
                              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                              className="w-full rounded-xl border border-[#E8E4DE] bg-white px-4 py-3 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm text-[#6B6560]">Nom</label>
                            <input
                              type="text"
                              value={formData.last_name}
                              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                              className="w-full rounded-xl border border-[#E8E4DE] bg-white px-4 py-3 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm text-[#6B6560]">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full rounded-xl border border-[#E8E4DE] bg-white px-4 py-3 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm text-[#6B6560]">Téléphone</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Optionnel"
                            className="w-full rounded-xl border border-[#E8E4DE] bg-white px-4 py-3 text-[#1A1917] placeholder:text-[#A8A29E] outline-none transition-colors focus:border-[#1A1917]"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={handleSavePersonal}
                            disabled={saveLoading}
                            className="flex items-center gap-2 rounded-full bg-[#1A1917] px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-50"
                          >
                            {saveLoading ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Enregistrer
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="rounded-full border border-[#E8E4DE] px-5 py-2.5 text-sm font-medium text-[#6B6560] transition-colors hover:bg-[#F5F3F0]"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-[#6B6560]" />
                          <span className="text-[#1A1917]">{customer?.first_name} {customer?.last_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-[#6B6560]" />
                          <span className="text-[#1A1917]">{customer?.email}</span>
                        </div>
                        {customer?.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-[#6B6560]" />
                            <span className="text-[#1A1917]">{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mot de passe */}
                  <div className="rounded-2xl border border-[#E8E4DE] bg-white p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#1A1917]">Sécurité</h3>
                      {editingField !== 'password' && (
                        <button
                          onClick={handleEditPassword}
                          className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:underline"
                        >
                          <Edit3 className="h-4 w-4" />
                          Modifier
                        </button>
                      )}
                    </div>

                    {editingField === 'password' ? (
                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="mb-1.5 block text-sm text-[#6B6560]">Mot de passe actuel</label>
                          <div className="relative">
                            <input
                              type={showPasswords.current ? 'text' : 'password'}
                              value={passwordData.current_password}
                              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                              className="w-full rounded-xl border border-[#E8E4DE] bg-white px-4 py-3 pr-12 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6560]"
                            >
                              {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm text-[#6B6560]">Nouveau mot de passe</label>
                          <div className="relative">
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              value={passwordData.new_password}
                              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                              placeholder="Minimum 6 caractères"
                              className="w-full rounded-xl border border-[#E8E4DE] bg-white px-4 py-3 pr-12 text-[#1A1917] placeholder:text-[#A8A29E] outline-none transition-colors focus:border-[#1A1917]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6560]"
                            >
                              {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm text-[#6B6560]">Confirmer</label>
                          <div className="relative">
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={passwordData.confirm_password}
                              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                              className="w-full rounded-xl border border-[#E8E4DE] bg-white px-4 py-3 pr-12 text-[#1A1917] outline-none transition-colors focus:border-[#1A1917]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6560]"
                            >
                              {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={handleSavePassword}
                            disabled={saveLoading}
                            className="flex items-center gap-2 rounded-full bg-[#1A1917] px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-50"
                          >
                            {saveLoading ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Enregistrer
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="rounded-full border border-[#E8E4DE] px-5 py-2.5 text-sm font-medium text-[#6B6560] transition-colors hover:bg-[#F5F3F0]"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6">
                        <div className="flex items-center gap-3 rounded-xl bg-[#F5F3F0] p-4">
                          <Lock className="h-4 w-4 text-[#6B6560]" />
                          <span className="text-[#1A1917]">••••••••</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Zone danger */}
                <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
                  <h3 className="font-medium text-red-900">Supprimer mon compte</h3>
                  <p className="mt-2 text-sm text-red-700/80">
                    Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                  </p>
                  <button
                    onClick={handleDeleteAccount}
                    className="mt-4 flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer mon compte
                  </button>
                </div>
              </motion.div>
            )}

            {/* Section: Aide et contact */}
            {activeSection === 'help' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10"
              >
                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                    Support
                  </span>
                  <h2 className="mt-2 font-serif text-3xl text-[#1A1917]">Aide & Contact</h2>
                  <p className="mt-2 text-[#6B6560]">Nous sommes là pour vous aider</p>
                </div>

                {/* Contact Cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <a
                    href="mailto:pro.archimeuble@gmail.com"
                    className="group rounded-2xl border border-[#E8E4DE] bg-white p-6 transition-all hover:border-[#1A1917]/20 hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3F0] transition-colors group-hover:bg-[#1A1917]">
                      <Mail className="h-5 w-5 text-[#1A1917] transition-colors group-hover:text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-4 font-medium text-[#1A1917]">Email</h3>
                    <p className="mt-1 text-[#8B7355]">pro.archimeuble@gmail.com</p>
                    <p className="mt-2 text-sm text-[#6B6560]">Réponse sous 24h</p>
                  </a>

                  <a
                    href="tel:0601062867"
                    className="group rounded-2xl border border-[#E8E4DE] bg-white p-6 transition-all hover:border-[#1A1917]/20 hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3F0] transition-colors group-hover:bg-[#1A1917]">
                      <PhoneCall className="h-5 w-5 text-[#1A1917] transition-colors group-hover:text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-4 font-medium text-[#1A1917]">Téléphone</h3>
                    <p className="mt-1 text-[#8B7355]">06 01 06 28 67</p>
                    <p className="mt-2 text-sm text-[#6B6560]">Lun - Ven, 9h - 18h</p>
                  </a>
                </div>

                {/* FAQ */}
                <div className="rounded-2xl border border-[#E8E4DE] bg-white">
                  <div className="border-b border-[#E8E4DE] p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F3F0]">
                        <MessageCircle className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-medium text-[#1A1917]">Questions fréquentes</h3>
                    </div>
                  </div>

                  <div className="divide-y divide-[#E8E4DE]">
                    {[
                      {
                        q: 'Comment passer une commande ?',
                        a: 'Configurez votre meuble depuis la page d\'accueil en choisissant vos options (dimensions, matériaux, finitions), ajoutez-le au panier, puis validez votre commande en suivant les étapes de paiement.'
                      },
                      {
                        q: 'Quels sont les délais de livraison ?',
                        a: 'Nos meubles étant fabriqués sur mesure, les délais varient selon la complexité de votre commande. Vous recevrez une estimation précise après validation. Comptez généralement 4 à 8 semaines.'
                      },
                      {
                        q: 'Comment modifier ou annuler ma commande ?',
                        a: 'Contactez notre service client par email ou téléphone dans les 24h suivant votre commande. Passé ce délai, des frais peuvent s\'appliquer car la fabrication aura déjà commencé.'
                      },
                      {
                        q: 'Quelles garanties proposez-vous ?',
                        a: 'Tous nos meubles sont garantis 2 ans contre les défauts de fabrication. Cette garantie couvre les pièces et la main d\'œuvre.'
                      }
                    ].map((item, i) => (
                      <div key={i} className="p-6 transition-colors hover:bg-[#FAFAF9]">
                        <h4 className="font-medium text-[#1A1917]">{item.q}</h4>
                        <p className="mt-2 leading-relaxed text-[#6B6560]">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="rounded-2xl bg-[#1A1917] p-8 text-center">
                  <h3 className="font-serif text-2xl text-white">Besoin d'aide pour votre projet ?</h3>
                  <p className="mt-2 text-white/70">Notre équipe est à votre disposition pour vous accompagner</p>
                  <Link
                    href="/contact-request"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#1A1917] transition-transform hover:scale-105"
                  >
                    Nous contacter
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
