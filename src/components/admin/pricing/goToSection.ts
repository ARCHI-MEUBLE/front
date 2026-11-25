import type { DashboardSection } from '@/components/admin/AdminSidebar';

// Change de section dans le tableau de bord admin (écouté par pages/admin/dashboard.tsx)
export function goToSection(section: DashboardSection): void {
  window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: section }));
}
