import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { DollarSign, Wrench, TrendingUp, AlertTriangle, MapPin, Loader2, Plus, Camera } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import CreateMachineDialog from "@/components/CreateMachineDialog"

interface DashboardMachine {
  number: number
  locationName: string
  typeName: string
  status: string
  gameCounter: number | null
  revenue30d: number
  lastRoi: number | null
  roiTrend: (number | null)[]
  trendLabel: string
  lastServiceDate: string | null
  lastServiceBy: string | null
  photoCounterUrl: string | null
}

interface DashboardResponse {
  machines: DashboardMachine[]
  summary: {
    totalMachines: number
    totalServices30d: number
    totalRevenue30d: number
    overdueCount: number
  }
}

function roiColor(roi: number | null): string {
  if (roi == null) return "text-gray-400"
  if (roi >= 3) return "text-green-600"
  if (roi >= 2) return "text-yellow-600"
  return "text-red-600"
}

function roiBg(roi: number | null): string {
  if (roi == null) return "bg-gray-100 text-gray-600"
  if (roi >= 3) return "bg-green-100 text-green-700"
  if (roi >= 2) return "bg-yellow-100 text-yellow-700"
  return "bg-red-100 text-red-700"
}

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [photoDialog, setPhotoDialog] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: () => api.get<DashboardResponse>("/reports/dashboard"),
  })

  const machines = data?.machines ?? []
  const summary = data?.summary

  const statsCards = useMemo(() => {
    if (!summary) return []
    return [
      { title: "Всего машин", value: String(summary.totalMachines), icon: Wrench, trend: "активных" },
      { title: "Обслуживаний за 30 дн.", value: String(summary.totalServices30d), icon: TrendingUp, trend: "за последний месяц" },
      { title: "Общая выручка", value: `${summary.totalRevenue30d.toLocaleString()} ₽`, icon: DollarSign, trend: "за 30 дней" },
      { title: "Просроченных", value: String(summary.overdueCount), icon: AlertTriangle, trend: "требуют внимания", variant: "destructive" as const },
    ]
  }, [summary])

  const topMachines = useMemo(() => machines.slice(0, 10), [machines])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Ошибка загрузки дашборда</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
          <p className="text-muted-foreground">Общая статистика по сети автоматов</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить аппарат
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, i) => (
          <Card key={i} className={card.variant === "destructive" ? "border-destructive/30" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className={`text-xs ${card.variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>{card.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Все аппараты — выручка за 30 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Адрес</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Счётчик</TableHead>
                <TableHead className="text-right">Выручка 30д</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>Тренд</TableHead>
                <TableHead className="text-center">Фото счётчика</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((m) => (
                <TableRow
                  key={m.number}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/machines/${m.number}`)}
                >
                  <TableCell className="font-medium">#{m.number}</TableCell>
                  <TableCell className="text-muted-foreground">{m.locationName}</TableCell>
                  <TableCell>{m.typeName}</TableCell>
                  <TableCell>{m.gameCounter?.toLocaleString() ?? "\u2014"}</TableCell>
                  <TableCell className="text-right font-medium">{m.revenue30d > 0 ? `${m.revenue30d.toLocaleString()}\u20BD` : "\u2014"}</TableCell>
<TableCell><Badge className={roiBg(m.lastRoi)} variant="outline">{m.lastRoi != null ? m.lastRoi.toFixed(2) : "\u2014"}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.trendLabel}</TableCell>
                  <TableCell align="center">
                    {m.photoCounterUrl ? (
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setPhotoDialog(m.photoCounterUrl) }}
                        title="Просмотреть фото счётчика"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    ) : (
                      "\u2014"
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {machines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Нет данных</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Топ машин по выручке</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topMachines.map((m, i) => (
            <div key={m.number} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <Badge variant={i === 0 ? "default" : "secondary"} className="rounded-full w-7 h-7 flex items-center justify-center p-0">{i + 1}</Badge>
                <div>
                  <p className="font-medium">#{m.number} — {m.typeName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{m.locationName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{m.revenue30d.toLocaleString()}\u20BD</p>
                <p className={`text-xs ${roiColor(m.lastRoi)}`}>ROI: {m.lastRoi != null ? m.lastRoi.toFixed(2) : "\u2014"}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!photoDialog} onOpenChange={() => setPhotoDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Фото счётчика игр</DialogTitle>
          </DialogHeader>
          {photoDialog && (
            <img
              src={photoDialog}
              alt="Фото счётчика игр"
              className="w-full max-h-[70vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      <CreateMachineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false)
          queryClient.invalidateQueries({ queryKey: ["reports", "dashboard"] })
        }}
      />
    </div>
  )
}