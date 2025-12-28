import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { IconBell, IconHome } from "@tabler/icons-react"

interface AdminHeaderProps {
  title: string
  description?: string
  onNotificationsClick: () => void
  onHomeClick: () => void
  unreadCount?: number
}

export function AdminHeader({
  title,
  description,
  onNotificationsClick,
  onHomeClick,
  unreadCount = 0,
}: AdminHeaderProps) {

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <div className="flex-1">
          <h1 className="text-base font-semibold">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onHomeClick}>
            <IconHome className="size-4" />
            <span className="hidden sm:inline">Accueil</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNotificationsClick}
            className="relative"
          >
            <IconBell className="size-4" />
            <span className="hidden sm:inline">Notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
