import { IconUsers, IconPackage, IconClock, IconCircleCheck, IconShoppingCart } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ConfigsStatsCardsProps {
  total: number
  pending: number
  validated: number
  converted: number
}

export function ConfigsStatsCards({ total, pending, validated, converted }: ConfigsStatsCardsProps) {
  const pendingPercentage = total > 0 ? ((pending / total) * 100).toFixed(0) : "0"
  const validatedPercentage = total > 0 ? ((validated / total) * 100).toFixed(0) : "0"
  const convertedPercentage = total > 0 ? ((converted / total) * 100).toFixed(0) : "0"
  const conversionRate = total > 0 ? (((validated + converted) / total) * 100).toFixed(0) : "0"

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Configurations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {total}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconUsers className="size-3" />
              Tous
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Configurateur clients <IconPackage className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Taux de conversion {conversionRate}%
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>À valider</CardDescription>
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
            Validation client <IconClock className="size-4" />
          </div>
          <div className="text-muted-foreground">
            En attente d'approbation
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Validées</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {validated}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCircleCheck className="size-3" />
              {validatedPercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Prêtes à commander <IconCircleCheck className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Approuvées par clients
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Transformées</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {converted}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconShoppingCart className="size-3" />
              {convertedPercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Devenues commandes <IconShoppingCart className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Payées ou en production
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
