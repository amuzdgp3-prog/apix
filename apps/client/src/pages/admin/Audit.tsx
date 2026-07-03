import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { User, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/api/client"

interface AuditRow {
  id: number
  table_name: string
  record_id: number
  action: string
  user_id: number
  changed_at: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  staff_name: string | null
}

interface AuditResponse {
  data: AuditRow[]
  total: number
  page: number
  limit: number
}

const actionConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  insert: { label: "Создание", variant: "default" },
  update: { label: "Изменение", variant: "secondary" },
  delete: { label: "Удаление", variant: "destructive" },
}

export default function Audit() {
  const [entity, setEntity] = useState("")
  const [userId, setUserId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const limit = 20

  const params: Record<string, string> = { page: String(page), limit: String(limit) }
  if (entity) params.entity = entity
  if (userId) params.userId = userId
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo

  const { data, isLoading, isError } = useQuery<AuditResponse>({
    queryKey: ["audit", params],
    queryFn: () => api.get<AuditResponse>("/audit", { params }),
  })

  const clearFilters = () => {
    setEntity("")
    setUserId("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const hasFilters = entity || userId || dateFrom || dateTo
  const totalPages = data ? Math.ceil(data.total / limit) : 0

  const formatData = (val: unknown): string => {
    if (val === null || val === undefined) return "—"
    if (typeof val === "object") return JSON.stringify(val)
    return String(val)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Аудит</h1>
        <p className="text-muted-foreground">Лог всех изменений в системе</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Таблица</label>
              <Input
                placeholder="services"
                className="w-36"
                value={entity}
                onChange={(e) => { setEntity(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Пользователь (ID)</label>
              <Input
                placeholder="3"
                className="w-32"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setPage(1) }}
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
        <CardHeader><CardTitle className="text-lg">Журнал действий</CardTitle></CardHeader>
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
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Таблица</TableHead>
                    <TableHead>ID записи</TableHead>
                    <TableHead>Старые данные</TableHead>
                    <TableHead>Новые данные</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((a) => {
                    const act = actionConfig[a.action] ?? actionConfig.update
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(a.changed_at).toLocaleString("ru-RU")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-sm">{a.staff_name ?? `ID:${a.user_id}`}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={act.variant}>{act.label}</Badge></TableCell>
                        <TableCell className="text-sm">
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">{a.table_name}</code>
                        </TableCell>
                        <TableCell className="text-sm">{a.record_id}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {formatData(a.old_data)}
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[150px] truncate">
                          {formatData(a.new_data)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {data.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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