import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, MapPin, Clock, AlertTriangle, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/api/client"

interface ForgottenMachinesResponse {
  data: {
    number: number
    locationName: string
    lastServiceDate: string | null
    daysSinceLastService: number | null
    maxServiceDays: number | null
  }[]
}

export default function ForgottenMachines() {
  const [search, setSearch] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["cache", "forgotten"],
    queryFn: () => api.get<ForgottenMachinesResponse>("/cache/forgotten"),
  })

  const machines = data?.data ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return machines.filter(
      (m) =>
        String(m.number).includes(q) ||
        m.locationName.toLowerCase().includes(q)
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Забытые машины</h1>
          <p className="text-muted-foreground">
            Автоматы, превысившие максимальный интервал обслуживания
          </p>
        </div>
        <Badge variant="destructive" className="text-sm px-3 py-1">
          {machines.length} машин
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по номеру или адресу..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((machine) => (
          <Card key={machine.number} className="border-destructive/30">
            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">#{machine.number}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Макс. интервал: {machine.maxServiceDays ?? "?"} дн.
                </p>
              </div>
              <Badge variant="destructive">
                {machine.daysSinceLastService != null ? `${machine.daysSinceLastService} дн.` : "—"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{machine.locationName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Последнее ТО:{" "}
                  {machine.lastServiceDate
                    ? new Date(machine.lastServiceDate).toLocaleDateString("ru-RU")
                    : "никогда"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Превышение на{" "}
                  {machine.daysSinceLastService != null && machine.maxServiceDays != null
                    ? machine.daysSinceLastService - machine.maxServiceDays
                    : "?"}{" "}
                  дн.
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  История
                </Button>
                <Button variant="default" size="sm" className="flex-1">
                  Назначить ТО
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Забытых машин не найдено
          </div>
        )}
      </div>
    </div>
  )
}