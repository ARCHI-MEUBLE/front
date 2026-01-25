import { IconTrendingUp, IconPackage, IconClock, IconCircleCheck, IconHammer, IconTruck } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface OrdersStatsCardsProps {
  total: number
  pending: number
  confirmed: number
  in_production: number
  shipped: number
  delivered: number
}

export function OrdersStatsCards({
  total,
  pending,
  confirmed,
  in_production,
  shipped,
  delivered
}: OrdersStatsCardsProps) {
  const pendingPercentage = total > 0 ? ((pending / total) * 100).toFixed(1) : "0"
  const deliveredPercentage = total > 0 ? ((delivered / total) * 100).toFixed(1) : "0"

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-3 lg:grid-cols-6 lg:px-6">
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription>Total</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {total}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconPackage className="size-3" />
              Toutes
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Commandes totales <IconPackage className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Depuis le début
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription>En attente</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pending}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconClock className="size-3" />
              {pendingPercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            À confirmer <IconClock className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Nécessitent validation
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription>Confirmées</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {confirmed}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCircleCheck className="size-3" />
              Validées
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Prêtes à produire <IconCircleCheck className="size-4" />
          </div>
          <div className="text-muted-foreground">
            En attente production
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription>En production</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {in_production}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconHammer className="size-3" />
              Actives
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            En cours <IconHammer className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Production en cours
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription>Expédiées</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {shipped}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTruck className="size-3" />
              En transit
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            En livraison <IconTruck className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Vers les clients
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription>Livrées</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {delivered}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-3" />
              {deliveredPercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Complétées <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Reçues par clients
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
