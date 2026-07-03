import { useParams } from "react-router-dom"
import { Loader2, Package, Route, Users, History, QrCode, Camera } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"

interface MachineToy { id: number; name: string; price: number }
interface ServicePhotos { counter?: string | null; before?: string | null; after?: string | null }
interface MachineService {
  id: number; serviceDate: string; gameCounter: number
  newGames: number | null; revenue: number | null; roi: number | null
  isOperational: boolean; staffName: string; photos: ServicePhotos
}
interface RoiPoint { date: string; roi: number }
interface MachineCardData {
  number: number; typeName: string; locationName: string; status: string
  pricePerGame: number; hasPrizeCounter: boolean
  minServiceDays: number | null; maxServiceDays: number | null
  toys: MachineToy[]; technicians: string[]; routes: string[]
  services: MachineService[]
  stats: { totalServices: number; revenue30d: number; avgRoi: number | null }
  roiTrend: RoiPoint[]
}

export default function MachineCard() {
  const { number } = useParams<{ number: string }>()
  const num = Number(number)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["machine", num],
    queryFn: () => api.get<MachineCardData>(`/machines/${num}`),
    enabled: !!num,
  })

  const toggleStatus = () => {
    if (!data) return
    const newStatus = data.status === "active" ? "inactive" : "active"
    api.put(`/machines/${num}/status`, { status: newStatus })
      .then(() => queryClient.invalidateQueries({ queryKey: ["machine", num] }))
      .catch(() => {})
  }

  if (!num) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Некорректный номер аппарата</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Карточка аппарата №{num}</h1>
        <p className="text-muted-foreground">Детальная информация по номеру</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && <p className="text-destructive">Аппарат не найден или ошибка загрузки</p>}

      {data && (
        <>
          {/* Информация об аппарате */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl">#{data.number} — {data.typeName}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{data.locationName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={data.status === "active" ? "success" : "secondary"}>
                  {data.status === "active" ? "Активен" : "Неактивен"}
                </Badge>
                <Button variant="outline" size="sm" onClick={toggleStatus}>
                  {data.status === "active" ? "Деактивировать" : "Активировать"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs text-muted-foreground">Цена игры</p><p className="text-lg font-semibold">{data.pricePerGame} ₽</p></div>
                <div><p className="text-xs text-muted-foreground">Счётчик призов</p><p className="text-lg font-semibold">{data.hasPrizeCounter ? "Есть" : "Нет"}</p></div>
                <div><p className="text-xs text-muted-foreground">Мин. дней между обслуж.</p><p className="text-lg font-semibold">{data.minServiceDays ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Макс. дней между обслуж.</p><p className="text-lg font-semibold">{data.maxServiceDays ?? "—"}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* ROI график */}
          {data.roiTrend && data.roiTrend.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Динамика ROI</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {data.roiTrend.map((p, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-primary/80 rounded-t" style={{ height: `${Math.max(4, Math.min(100, (p.roi / (Math.max(...data.roiTrend.map(x => x.roi), 1))) * 100))}%` }} title={`${p.date}: ROI ${p.roi}`} />
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center">{p.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Вкладки */}
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="toys">
                <TabsList className="w-full">
                  <TabsTrigger value="toys" className="flex-1"><Package className="h-4 w-4 mr-1" />Игрушки</TabsTrigger>
                  <TabsTrigger value="routes" className="flex-1"><Route className="h-4 w-4 mr-1" />Маршруты</TabsTrigger>
                  <TabsTrigger value="techs" className="flex-1"><Users className="h-4 w-4 mr-1" />Техники</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1"><History className="h-4 w-4 mr-1" />История</TabsTrigger>
                  <TabsTrigger value="qr" className="flex-1"><QrCode className="h-4 w-4 mr-1" />QR</TabsTrigger>
                </TabsList>

                <TabsContent value="toys" className="pt-4">
                  <Table>
                    <TableHeader><TableRow><TableHead>Название</TableHead><TableHead className="text-right">Цена</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.toys.map((t) => (<TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell className="text-right">{t.price}₽</TableCell></TableRow>))}
                      {data.toys.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Нет игрушек</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="routes" className="pt-4">
                  {data.routes.length > 0 ? data.routes.map((r, i) => <p key={i} className="text-sm py-1">{r}</p>) : <p className="text-sm text-muted-foreground">Нет маршрутов</p>}
                </TabsContent>

                <TabsContent value="techs" className="pt-4">
                  {data.technicians.length > 0 ? data.technicians.map((t, i) => <p key={i} className="text-sm py-1">{t}</p>) : <p className="text-sm text-muted-foreground">Нет закреплённых техников</p>}
                </TabsContent>

                <TabsContent value="history" className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Счётчик</TableHead>
                        <TableHead>Новых игр</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead>Техник</TableHead>
                        <TableHead>Фото</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.services.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.serviceDate}</TableCell>
                          <TableCell>{s.gameCounter.toLocaleString()}</TableCell>
                          <TableCell>{s.newGames?.toLocaleString() ?? "—"}</TableCell>
                          <TableCell className="text-right">{s.roi != null ? s.roi.toFixed(2) : "—"}</TableCell>
                          <TableCell>{s.staffName}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {s.photos.counter && <a href={s.photos.counter} target="_blank" rel="noopener noreferrer" aria-label="Счётчик"><Camera className="h-4 w-4 text-blue-600 hover:text-blue-800" /></a>}
                              {s.photos.before && <a href={s.photos.before} target="_blank" rel="noopener noreferrer" aria-label="До"><Camera className="h-4 w-4 text-amber-600 hover:text-amber-800" /></a>}
                              {s.photos.after && <a href={s.photos.after} target="_blank" rel="noopener noreferrer" aria-label="После"><Camera className="h-4 w-4 text-green-600 hover:text-green-800" /></a>}
                              {!s.photos.counter && !s.photos.before && !s.photos.after && <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {data.services.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Нет обслуживаний</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="qr" className="pt-4 flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">Сгенерировать PDF с QR-кодом для наклейки на аппарат</p>
                  <Button onClick={() => window.open(`/api/machines/${data.number}/qr`, "_blank")}><QrCode className="h-4 w-4 mr-1" />Сгенерировать PDF</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}