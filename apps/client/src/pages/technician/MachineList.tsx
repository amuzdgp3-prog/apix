import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Search, MapPin, AlertTriangle, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/api/client"

const STATUS_OVERDUE = "overdue"
const STATUS_DUE = "due"
const STATUS_OK = "ok"

interface CacheMachinesResponse {
  data: {
    number: number
    locationName: string
    typeName: string
    status: string
    pricePerGame: number
    lastServiceDate: string | null
  }[]
}

function computeStatus(lastServiceDate: string | null) {
  if (!lastServiceDate) return STATUS_OVERDUE
  const days = Math.floor((Date.now() - new Date(lastServiceDate).getTime()) / 86400000)
  if (days > 60) return STATUS_OVERDUE
  if (days > 30) return STATUS_DUE
  return STATUS_OK
}

const statusConfig: Record<string, { label: string; variant: "destructive" | "warning" | "success" }> = {
  [STATUS_OVERDUE]: { label: "Просрочен", variant: "destructive" },
  [STATUS_DUE]: { label: "Скоро", variant: "warning" },
  [STATUS_OK]: { label: "Норма", variant: "success" },
}

export default function MachineList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["cache", "machines"],
    queryFn: () => api.get<CacheMachinesResponse>("/cache/machines"),
  })

  const machines = data?.data ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return machines.filter(
      (m) =>
        String(m.number).includes(q) ||
        m.locationName.toLowerCase().includes(q) ||
        m.typeName.toLowerCase().includes(q)
    )
  }, [search, machines])

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
        <p className="text-destructive">Ошибка загрузки данных</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Машины на точке</h1>
        <p className="text-muted-foreground">Список автоматов, привязанных к вашему маршруту</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по номеру, адресу или типу..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((machine) => {
          const status = computeStatus(machine.lastServiceDate)
          const cfg = statusConfig[status]
          const daysSince = machine.lastServiceDate
            ? Math.floor((Date.now() - new Date(machine.lastServiceDate).getTime()) / 86400000)
            : null
          return (
            <Card key={machine.number} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">#{machine.number}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{machine.typeName}</p>
                </div>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{machine.locationName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Дней с ТО: {daysSince != null ? daysSince : "\u2014"}</span>
                  <span className="text-muted-foreground">{machine.pricePerGame} руб.</span>
                </div>
                {status === STATUS_OVERDUE && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Просрочен на {daysSince != null ? daysSince - 60 : "?"} дн.</span>
                  </div>
                )}
                <Button
                  className="w-full mt-2"
                  onClick={() => navigate(`/machines/${machine.number}/service`)}
                >
                  Провести обслуживание
                </Button>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  )
}