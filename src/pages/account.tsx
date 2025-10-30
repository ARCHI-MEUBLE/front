import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useCustomer } from '@/context/CustomerContext';
import { UserNavigation } from '@/components/UserNavigation';
import {
  ShoppingBag,
  User,
  HelpCircle,
  LogOut,
  Trash2,
  ChevronRight,
  Package,
  MapPin,
  Lock,
  Mail,
  Phone,
  Edit2,
  X,
  Check
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Section = 'orders' | 'profile' | 'help';

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
}

interface EditingField {
  field: 'personal' | 'password' | null;
}

export default function Account() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading: authLoading, logout } = useCustomer();

  const [activeSection, setActiveSection] = useState<Section>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // États pour l'édition
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

    // Initialiser les données du formulaire avec les données du client
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
      const response = await fetch('http://localhost:8000/backend/api/orders/list.php', {
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
      const response = await fetch('http://localhost:8000/backend/api/customers/delete.php', {
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
    // Réinitialiser les données
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
      const response = await fetch('http://localhost:8000/backend/api/customers/update.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveSuccess('Informations mises à jour avec succès');
        setEditingField(null);
        // Recharger la page pour mettre à jour le contexte
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

    // Validation
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
      const response = await fetch('http://localhost:8000/backend/api/customers/change-password.php', {
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

  const ordersInProgress = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const ordersCompleted = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  if (authLoading) {
    return (
      <>
        <Head>
          <title>Mon compte - ArchiMeuble</title>
        </Head>
        <UserNavigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Mon compte - ArchiMeuble</title>
      </Head>
      <UserNavigation />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="bg-white border border-gray-200">
                {/* Header utilisateur */}
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm text-gray-500">Bonjour</p>
                  <p className="text-base font-semibold text-gray-900">
                    {customer?.first_name} {customer?.last_name}
                  </p>
                </div>

                {/* Menu */}
                <nav className="p-2">
                  {/* Mes achats */}
                  <div className="mb-4">
                    <button
                      onClick={() => setActiveSection('orders')}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors ${
                        activeSection === 'orders'
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        <span>Mes achats</span>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Mon profil */}
                  <div className="mb-4">
                    <button
                      onClick={() => setActiveSection('profile')}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors ${
                        activeSection === 'profile'
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Mon profil</span>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Aide et contact */}
                  <div className="mb-4">
                    <button
                      onClick={() => setActiveSection('help')}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors ${
                        activeSection === 'help'
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        <span>Aide et contact</span>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="border-t border-gray-200 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Déconnexion</span>
                    </button>

                    <button
                      onClick={handleDeleteAccount}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Supprimer mon compte</span>
                    </button>
                  </div>
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1">
              {/* Section: Mes achats */}
              {activeSection === 'orders' && (
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mes achats</h1>

                  {/* Achats en cours */}
                  <section className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Mes achats en cours</h2>
                    {isLoadingOrders ? (
                      <div className="bg-white border border-gray-200 p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      </div>
                    ) : ordersInProgress.length === 0 ? (
                      <div className="bg-white border border-gray-200 p-8 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">Vous n'avez pas d'achats en cours.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ordersInProgress.map((order) => (
                          <Link
                            key={order.id}
                            href="/my-orders"
                            className="block bg-white border border-gray-200 p-4 hover:border-gray-400 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Commande #{order.order_number}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {new Date(order.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{order.total}€</p>
                                <p className="text-xs text-gray-500 mt-1">{order.status}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Achats terminés */}
                  <section>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Mes achats terminés</h2>
                    {ordersCompleted.length === 0 ? (
                      <div className="bg-white border border-gray-200 p-8 text-center">
                        <p className="text-gray-600">Vous n'avez pas d'achats terminés.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ordersCompleted.map((order) => (
                          <Link
                            key={order.id}
                            href="/my-orders"
                            className="block bg-white border border-gray-200 p-4 hover:border-gray-400 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Commande #{order.order_number}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {new Date(order.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{order.total}€</p>
                                <p className="text-xs text-gray-500 mt-1">{order.status}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* Section: Mon profil */}
              {activeSection === 'profile' && (
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mon profil</h1>

                  {/* Messages de succès/erreur */}
                  {saveSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm">
                      {saveSuccess}
                    </div>
                  )}
                  {saveError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                      {saveError}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Informations personnelles */}
                    <div className="bg-white border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Mes informations personnelles</h2>
                        {editingField !== 'personal' && (
                          <button
                            onClick={handleEditPersonal}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
                          >
                            <Edit2 className="h-4 w-4" />
                            Modifier
                          </button>
                        )}
                      </div>

                      {editingField === 'personal' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prénom
                              </label>
                              <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nom
                              </label>
                              <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Téléphone
                            </label>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900"
                              placeholder="Optionnel"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleSavePersonal}
                              disabled={saveLoading}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                              {saveLoading ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saveLoading}
                              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Nom :</span>
                            <span className="font-medium text-gray-900">
                              {customer?.first_name} {customer?.last_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Email :</span>
                            <span className="font-medium text-gray-900">{customer?.email}</span>
                          </div>
                          {customer?.phone && (
                            <div className="flex items-center gap-3 text-sm">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Téléphone :</span>
                              <span className="font-medium text-gray-900">{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mot de passe */}
                    <div className="bg-white border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Mot de passe</h2>
                        {editingField !== 'password' && (
                          <button
                            onClick={handleEditPassword}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
                          >
                            <Edit2 className="h-4 w-4" />
                            Modifier
                          </button>
                        )}
                      </div>

                      {editingField === 'password' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mot de passe actuel
                            </label>
                            <input
                              type="password"
                              value={passwordData.current_password}
                              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nouveau mot de passe
                            </label>
                            <input
                              type="password"
                              value={passwordData.new_password}
                              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900"
                              placeholder="Minimum 6 caractères"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Confirmer le nouveau mot de passe
                            </label>
                            <input
                              type="password"
                              value={passwordData.confirm_password}
                              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-900"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleSavePassword}
                              disabled={saveLoading}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                              {saveLoading ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saveLoading}
                              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-sm">
                          <Lock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Mot de passe :</span>
                          <span className="font-medium text-gray-900">••••••••</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Aide et contact */}
              {activeSection === 'help' && (
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-6">Aide et contact</h1>

                  <div className="space-y-4">
                    <div className="bg-white border border-gray-200 p-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Questions fréquentes</h2>
                      <div className="space-y-3">
                        <div className="border-b border-gray-200 pb-3">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">Comment passer une commande ?</h3>
                          <p className="text-sm text-gray-600">
                            Configurez votre meuble depuis la page d'accueil, ajoutez-le au panier, puis validez votre commande.
                          </p>
                        </div>
                        <div className="border-b border-gray-200 pb-3">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">Quels sont les délais de livraison ?</h3>
                          <p className="text-sm text-gray-600">
                            Les délais de livraison varient en fonction de votre commande. Vous recevrez une estimation après validation.
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-2">Comment modifier ma commande ?</h3>
                          <p className="text-sm text-gray-600">
                            Contactez notre service client pour toute modification de commande en cours.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 p-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Nous contacter</h2>
                      <div className="space-y-3 text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium text-gray-900">Email :</span> contact@archimeuble.com
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium text-gray-900">Téléphone :</span> 01 23 45 67 89
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium text-gray-900">Horaires :</span> Lundi - Vendredi, 9h - 18h
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
