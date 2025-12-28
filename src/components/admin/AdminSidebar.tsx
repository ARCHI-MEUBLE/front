"use client"

import * as React from "react"
import {
  IconPackage,
  IconFileDescription,
  IconShoppingCart,
  IconCreditCard,
  IconCalendar,
  IconStar,
  IconSettings,
  IconBuildingStore,
  IconLogout,
  IconUserCircle,
  IconBell,
  IconDotsVertical,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"

export type DashboardSection =
  | 'models'
  | 'catalogue'
  | 'configs'
  | 'orders'
  | 'payments'
  | 'appointments'
  | 'calendar'
  | 'avis'
  | 'password'

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selectedSection: DashboardSection
  onSelect: (section: DashboardSection) => void
  onLogout: () => void
  adminEmail?: string
  adminName?: string
}

const navMain = [
  {
    id: "models" as DashboardSection,
    title: "Modèles de meubles",
    icon: IconPackage,
  },
  {
    id: "catalogue" as DashboardSection,
    title: "Configurateur",
    icon: IconFileDescription,
  },
  {
    id: "configs" as DashboardSection,
    title: "Configurations clients",
    icon: IconBuildingStore,
  },
  {
    id: "orders" as DashboardSection,
    title: "Gestion des commandes",
    icon: IconShoppingCart,
  },
  {
    id: "payments" as DashboardSection,
    title: "Paiements",
    icon: IconCreditCard,
  },
  {
    id: "appointments" as DashboardSection,
    title: "Demandes de RDV",
    icon: IconCalendar,
  },
  {
    id: "calendar" as DashboardSection,
    title: "Calendrier",
    icon: IconCalendar,
  },
]

const navSecondary = [
  {
    id: "avis" as DashboardSection,
    title: "Avis clients",
    icon: IconStar,
  },
  {
    id: "password" as DashboardSection,
    title: "Paramètres",
    icon: IconSettings,
  },
]

const logoutItem = {
  title: "Déconnexion",
  icon: IconLogout,
}

export function AdminSidebar({ selectedSection, onSelect, onLogout, adminEmail, adminName, ...props }: AdminSidebarProps) {
  const { isMobile } = useSidebar()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <div className="cursor-default">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconBuildingStore className="size-4" />
                </div>
                <span className="text-base font-semibold">ArchiMeuble</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onSelect(item.id)}
                      isActive={selectedSection === item.id}
                      tooltip={item.title}
                    >
                      <Icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onSelect(item.id)}
                      isActive={selectedSection === item.id}
                      tooltip={item.title}
                    >
                      <Icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onLogout}
                  tooltip={logoutItem.title}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <logoutItem.icon className="size-4" />
                  <span>{logoutItem.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {adminName ? getInitials(adminName) : 'AD'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{adminName || 'Admin'}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {adminEmail || 'admin@archimeuble.com'}
                    </span>
                  </div>
                  <IconDotsVertical className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        {adminName ? getInitials(adminName) : 'AD'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{adminName || 'Admin'}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {adminEmail || 'admin@archimeuble.com'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onSelect('password')}>
                    <IconUserCircle className="size-4" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSelect('password')}>
                    <IconSettings className="size-4" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconBell className="size-4" />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <IconLogout className="size-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
