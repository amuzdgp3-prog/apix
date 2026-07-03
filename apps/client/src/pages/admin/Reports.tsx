import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, Wrench, TrendingUp, Download } from "lucide-react"
import { api } from "@/api/client"

interface RevenueRow {
  period: string
  servicesCount: number
  totalRevenue: number
  totalCostOfToys: number
  totalProfit: number
  averageRoi: number | null
}

interface RevenueResponse {
  data: RevenueRow[]
  summary: {
    totalRevenue: number
    totalCostOfToys: number
    totalProfit: number
    overallRoi: number | null
  }
}

interface LocationItem {
  id: number
  name: string
}

const groupByLabels: Record<string, string> = {
  month: "Месяц",
  day: "День",
  location: "Точка",
  machine: "Машина",
  type: "Тип",
}

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
const months = [
  { value: "01", label: "Январь" },
  { value: "02", label: "Февраль" },
  { value: "03", label: "Март" },
  { value: "04", label: "Апрель" },
  { value: "05", label: "Май" },
  { value: "06", label: "Июнь" },
  { value: "07", label: "Июль" },
  { value: "08", label: "Август" },
  { value: "09", label: "Сентябрь" },
  { value: "10", label: "Октябрь" },
  { value: "11", label: "Ноябрь" },
  { value: "12", label: "Декабрь" },
]

export default function Reports() {
  const [groupBy, setGroupBy] = useState("month")
  const [year, setYear] = useState<string>(String(currentYear))
  const [month, setMonth] = useState<string>("")
  const [cityId, setCityId] = useState<string>("")

  // Фильтр по дате: если указан месяц → dateFrom/dateTo на этот месяц
  const dateParams = useMemo(() => {
    if (month) {
      const from = `${year}-${month}-01`
      // Последний день месяца
      const lastDay = new Date(Number(year), Number(month), 0).getDate()
      const to = `${year}-${month}-${String(lastDay).padStart(2, "0")}`
      return { dateFrom: from, dateTo: to }
    }
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` }
  }, [year, month])

  const params: Record<string, string> = { groupBy }
  if (dateParams.dateFrom) params.dateFrom = dateParams.dateFrom
  if (dateParams.dateTo) params.dateTo = dateParams.dateTo
  if (cityId) params.locationId = cityId

  const { data: revData, isLoading } = useQuery<RevenueResponse>({
    queryKey: ["reports", "revenue", groupBy, year, month, cityId],
    queryFn: () => api.get<RevenueResponse>("/reports/revenue", { params }),
  })

  // Список городов для фильтра
    const { data: locData } = useQuery({
      queryKey: ["locations"],
      queryFn: () => api.get<{ data: LocationItem[] }>("/locations"),
      staleTime: 5 * 60 * 1000,
    })
    const cities = ((locData as { data: LocationItem[] } | undefined)?.data ?? []).filter((l: LocationItem) => l.name)

  const rows = revData?.data ?? []
  const summary = revData?.summary ?? { totalRevenue: 0, totalCostOfToys: 0, totalProfit: 0, overallRoi: null }

  const sortedByRevenue = useMemo(() => {
    return [...rows].sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [rows])

  const topMachines = sortedByRevenue.slice(0, 5)
  const bottomMachines = sortedByRevenue.slice(-5).reverse()

  const handleExport = (format: "csv" | "json") => {
    const url = `/api/reports/export?format=${format}`
    window.open(url, "_blank")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Отчёты</h1>
          <p className="text-muted-foreground">Агрегированная статистика по периодам</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
            <Download className="h-4 w-4 mr-1" /> JSON
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Год</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Месяц</label>
            <Select value={month} onValueChange={(v: string) => setMonth(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Все месяцы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все месяцы</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Город</label>
            <Select value={cityId} onValueChange={(v: string) => setCityId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все города" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все города</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary.totalRevenue / 1000).toFixed(1)}K ₽</div>
            <p className="text-xs text-muted-foreground">Прибыль: {(summary.totalProfit / 1000).toFixed(1)}K ₽</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Обслуживаний</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.reduce((s, r) => s + r.servicesCount, 0)}</div>
            <p className="text-xs text-muted-foreground">{rows.length} {groupByLabels[groupBy]?.toLowerCase() || "периодов"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.overallRoi != null ? `${Math.round(summary.overallRoi)}%` : "—"}</div>
            <p className="text-xs text-muted-foreground">По всем периодам</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={groupBy} onValueChange={setGroupBy}>
        <TabsList>
          {Object.entries(groupByLabels).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{v}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader><CardTitle className="text-lg">Статистика по {groupByLabels[groupBy]?.toLowerCase() || "периодам"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Период</TableHead>
                  <TableHead className="text-right">ТО</TableHead>
                  <TableHead className="text-right">Выручка</TableHead>
                  <TableHead className="text-right">Затраты (игрушки)</TableHead>
                  <TableHead className="text-right">Прибыль</TableHead>
                  <TableHead className="text-right">Ср. ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.period}>
                    <TableCell className="font-medium">{r.period}</TableCell>
                    <TableCell className="text-right">{r.servicesCount}</TableCell>
                    <TableCell className="text-right">{r.totalRevenue.toLocaleString()}₽</TableCell>
                    <TableCell className="text-right">{r.totalCostOfToys.toLocaleString()}₽</TableCell>
                    <TableCell className="text-right font-medium">{r.totalProfit.toLocaleString()}₽</TableCell>
                    <TableCell className="text-right">{r.averageRoi != null ? `${Math.round(r.averageRoi)}%` : "—"}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Нет данных за выбранный период</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {groupBy === "machine" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Топ машин</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topMachines.map((m, i) => (
                <div key={m.period} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="rounded-full w-7 h-7 flex items-center justify-center p-0">{i + 1}</Badge>
                    <div>
                      <p className="font-medium">{m.period}</p>
                      <p className="text-xs text-muted-foreground">Прибыль: {m.totalProfit.toLocaleString()}₽</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{m.totalRevenue.toLocaleString()}₽</p>
                    <p className="text-xs text-muted-foreground">ROI {m.averageRoi != null ? `${Math.round(m.averageRoi)}%` : "—"}</p>
                  </div>
                </div>
              ))}
              {topMachines.length === 0 && <p className="text-center py-4 text-muted-foreground">Нет данных</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Анти-топ</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {bottomMachines.map((m, i) => (
                <div key={m.period} className="flex items-center justify-between p-3 border border-destructive/20 rounded-md">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="rounded-full w-7 h-7 flex items-center justify-center p-0">{i + 1}</Badge>
                    <div>
                      <p className="font-medium">{m.period}</p>
                      <p className="text-xs text-muted-foreground">Прибыль: {m.totalProfit.toLocaleString()}₽</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{m.totalRevenue.toLocaleString()}₽</p>
                    <p className="text-xs text-destructive">ROI {m.averageRoi != null ? `${Math.round(m.averageRoi)}%` : "—"}</p>
                  </div>
                </div>
              ))}
              {bottomMachines.length === 0 && <p className="text-center py-4 text-muted-foreground">Нет данных</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}