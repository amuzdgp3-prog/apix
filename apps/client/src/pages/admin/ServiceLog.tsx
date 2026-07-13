import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/api/client"

interface ServiceRow {
  id: number
  staffId: number | null
  staffName: string | null
  placementId: number
  machineNumber: number | null
  locationName: string
  serviceDate: string
  serviceTime: string | null
  revenue: number | null
  costOfToys: number | null
  roi: number | null
  periodDays: number | null
  gameCounter: number | null
  isOperational: boolean
  comment: string | null
  createdAt: string
}

interface ServicesResponse {
  data: ServiceRow[]
  total: number
  page: number
  limit: number
}

export default function ServiceLog() {
  const [machineNumber, setMachineNumber] = useState("")
  const [staffName, setStaffName] = useState("")
  const [locationName, setLocationName] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isOperational, setIsOperational] = useState<string>("")
  const [page, setPage] = useState(1)
  const limit = 20

  const params: Record<string, string> = { page: String(page), limit: String(limit) }
  if (machineNumber) params.machineNumber = machineNumber
  if (staffName) params.staffName = staffName
  if (locationName) params.locationName = locationName
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo
  if (isOperational) params.isOperational = isOperational

  const { data, isLoading, isError } = useQuery<ServicesResponse>({
    queryKey: ["services", params],
    queryFn: () => api.get<ServicesResponse>("/services", { params }),
  })

  const clearFilters = () => {
    setMachineNumber("")
    setStaffName("")
    setLocationName("")
    setDateFrom("")
    setDateTo("")
    setIsOperational("")
    setPage(1)
  }

  const hasFilters = machineNumber || staffName || locationName || dateFrom || dateTo || isOperational
  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Журнал обслуживаний</h1>
        <p className="text-muted-foreground">История всех ТО с фильтрацией</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">№ аппарата</label>
              <Input
                placeholder="123"
                className="w-32"
                value={machineNumber}
                onChange={(e) => { setMachineNumber(e.target.value); setPage(1) }}
              />
            </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Адрес</label>
                <Input
                  placeholder="Москва"
                  className="w-40"
                  value={locationName}
                  onChange={(e) => { setLocationName(e.target.value); setPage(1) }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Техник</label>
                <Input
                  placeholder="Иван"
                  className="w-36"
                  value={staffName}
                  onChange={(e) => { setStaffName(e.target.value); setPage(1) }}
                />
              </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Дата с</label>
              <Input
                type="date"
                className="w-40"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Дата по</label>
              <Input
                type="date"
                className="w-40"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Статус</label>
              <Select value={isOperational} onValueChange={(v) => { setIsOperational(v); setPage(1) }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Работает</SelectItem>
                  <SelectItem value="false">Не работает</SelectItem>
                  <SelectItem value="">Все</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5">
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground">
              {data ? `Найдено: ${data.total}` : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Обслуживания</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          )}
          {isError && (
            <div className="text-center py-8 text-red-500">Ошибка загрузки данных</div>
          )}
          {data && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>№ аппарата</TableHead>
                    <TableHead>Адрес</TableHead>
                    <TableHead>Техник</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Выручка</TableHead>
                    <TableHead className="text-right">Игрушки</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Период (дн.)</TableHead>
                    <TableHead>Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{new Date(s.serviceDate).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell className="font-medium">{s.machineNumber ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.locationName}</TableCell>
                      <TableCell>{s.staffName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.isOperational ? "default" : "destructive"}>
                          {s.isOperational ? "Работает" : "Не работает"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.revenue != null ? `${(s.revenue as number).toLocaleString()}₽` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.costOfToys != null ? `${(s.costOfToys as number).toLocaleString()}₽` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.roi != null ? (s.roi as number).toFixed(1) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{s.periodDays ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {s.comment ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Ничего не найдено
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Страница {data.page} из {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Вперёд
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}