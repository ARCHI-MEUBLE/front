import { useMemo, type ComponentType } from 'react';
import { Boxes, FolderKanban, Layers3, LogOut, ShieldHalf, ShoppingCart, X, MessageSquare, Calendar, CalendarDays, Palette, DollarSign, BarChart3 } from 'lucide-react';

export type DashboardSection = 'models' | 'catalogue' | 'configs' | 'orders' | 'payments' | 'appointments' | 'calendar' | 'avis' | 'samples' | 'samples-analytics' | 'password';

interface SidebarProps {
  selectedSection: DashboardSection;
  onSelect: (section: DashboardSection) => void;
  onLogout: () => void;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

const navItems: { id: DashboardSection; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'models', label: 'Gestion des modèles', icon: Boxes },
  { id: 'catalogue', label: 'Catalogue & pièces', icon: FolderKanban },
  { id: 'configs', label: 'Configurations clients', icon: Layers3 },
  { id: 'orders', label: 'Gestion des commandes', icon: ShoppingCart },
  { id: 'payments', label: 'Analytics Paiements', icon: DollarSign },
  { id: 'appointments', label: 'Rendez-vous Calendly', icon: Calendar },
  { id: 'calendar', label: 'Calendrier Visuel', icon: CalendarDays },
  { id: 'avis', label: 'Avis clients', icon: MessageSquare },
  { id: 'samples', label: 'Échantillons de façades', icon: Palette },
  { id: 'samples-analytics', label: 'Analytics Échantillons', icon: BarChart3 },
  { id: 'password', label: 'Changer le mot de passe', icon: ShieldHalf },
];

export function Sidebar({
  selectedSection,
  onSelect,
  onLogout,
  className = '',
  showCloseButton = false,
  onClose,
}: SidebarProps) {
  const sectionButtons = useMemo(
    () =>
      navItems.map(({ id, label, icon: Icon }) => {
        const isActive = selectedSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      }),
    [onSelect, selectedSection]
  );

  return (
    <aside className={`flex h-full flex-col border-r bg-white px-4 py-8 ${className}`}>
      {showCloseButton && (
        <button
          type="button"
          onClick={onClose}
          className="mb-4 ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white text-lg font-semibold">
          AM
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">ArchiMeuble</p>
          <p className="text-xs text-gray-500">Administration</p>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-2">{sectionButtons}</nav>

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900"
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </button>

    </aside>
  );
}

export default Sidebar;