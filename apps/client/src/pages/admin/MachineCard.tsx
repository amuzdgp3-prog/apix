import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Loader2, Package, Route, Users, History, QrCode, Camera, Replace, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import { fetchToys } from "@/api/directories"
import { printMachineQR } from "@/utils/qrPrint"

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

interface MachineToyOverride { toyId: number; action: "add" | "remove" }

export default function MachineCard() {
  const { number } = useParams<{ number: string }>()
  const num = Number(number)
  const queryClient = useQueryClient()

  // Диалог замены аппарата
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [newNumber, setNewNumber] = useState("")
  const [gameCounter, setGameCounter] = useState("0")
  const [prizeCounter, setPrizeCounter] = useState("0")
  const [replacing, setReplacing] = useState(false)
  const [replaceError, setReplaceError] = useState("")

  // Диалог индивидуальных правок игрушек
  const [toysEditOpen, setToysEditOpen] = useState(false)
  const [overrides, setOverrides] = useState<MachineToyOverride[]>([])
  const [allToysFull, setAllToysFull] = useState<MachineToy[]>([])
  const [toysEditLoading, setToysEditLoading] = useState(false)
  const [editAction, setEditAction] = useState<"add" | "remove">("add")
  const [editToyId, setEditToyId] = useState<string>("")
  const [editSaving, setEditSaving] = useState(false)

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

  const handleReplace = async () => {
    setReplaceError("")
    const nn = Number(newNumber)
    if (!nn || nn <= 0) {
      setReplaceError("Введите корректный номер нового аппарата")
      return
    }
    if (nn === num) {
      setReplaceError("Новый номер должен отличаться от текущего")
      return
    }
    setReplacing(true)
    try {
      await api.post(`/machines/${num}/replace`, {
        newMachineNumber: nn,
        gameCounterInitial: Number(gameCounter) || 0,
        prizeCounterInitial: Number(prizeCounter) || 0,
      })
      setReplaceOpen(false)
      setNewNumber("")
      setGameCounter("0")
      setPrizeCounter("0")
      queryClient.invalidateQueries({ queryKey: ["machine", num] })
      // Показать предупреждение о редиректе на новую карточку
      setTimeout(() => {
        window.location.href = `/admin/machines/${nn}`
      }, 500)
    } catch (err: any) {
      setReplaceError(err?.message ?? err?.error ?? "Ошибка замены аппарата")
    } finally {
      setReplacing(false)
    }
  }

  // Открыть диалог управления индивидуальными правками игрушек
  const openToysEdit = async () => {
    setToysEditOpen(true)
    setToysEditLoading(true)
    setEditToyId("")
    setEditAction("add")
    try {
      const [ov, all] = await Promise.all([
        api.get<MachineToyOverride[]>(`/machines/${num}/toys/overrides`),
        fetchToys(),
      ])
      setOverrides(ov)
      setAllToysFull(all)
    } finally {
      setToysEditLoading(false)
    }
  }

  const handleToysEdit = async () => {
    if (!editToyId) return
    setEditSaving(true)
    try {
      await api.post(`/machines/${num}/toys`, {
        toyId: Number(editToyId),
        action: editAction,
      })
      // Перезагрузить overrides и данные машины
      const [ov] = await Promise.all([
        api.get<MachineToyOverride[]>(`/machines/${num}/toys/overrides`),
        queryClient.invalidateQueries({ queryKey: ["machine", num] }),
      ])
      setOverrides(ov)
      setEditToyId("")
    } finally {
      setEditSaving(false)
    }
  }

  // Доступные для добавления игрушки (ещё нет в computed наборе)
  const availableToAdd = useMemo(() => {
    if (!data) return []
    return allToysFull.filter(t =>
      !data.toys.some(dt => dt.id === t.id) &&
      !overrides.some(o => o.toyId === t.id && o.action === "add")
    )
  }, [allToysFull, data, overrides])

  // Игрушки, которые можно удалить (есть в computed, нет remove-правки)
  const canRemoveToys = useMemo(() => {
    if (!data) return []
    const removeIds = new Set(overrides.filter(o => o.action === "remove").map(o => o.toyId))
    return data.toys.filter(t => !removeIds.has(t.id))
  }, [data, overrides])

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
                <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Replace className="h-4 w-4 mr-1" />
                      Заменить аппарат
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Замена аппарата на точке</DialogTitle>
                      <DialogDescription>
                        Текущий аппарат №{num} будет деактивирован, его настройки
                        и привязки перенесены на новый. Цепочка обслуживаний
                        текущего аппарата будет закрыта.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="newNumber">Номер нового аппарата</Label>
                        <Input
                          id="newNumber"
                          type="number"
                          min="1"
                          value={newNumber}
                          onChange={(e) => setNewNumber(e.target.value)}
                          placeholder="Например: 12345"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gameCounter">Начальный счётчик игр</Label>
                        <Input
                          id="gameCounter"
                          type="number"
                          min="0"
                          value={gameCounter}
                          onChange={(e) => setGameCounter(e.target.value)}
                        />
                      </div>
                      {data.hasPrizeCounter && (
                        <div className="space-y-2">
                          <Label htmlFor="prizeCounter">Начальный счётчик призов</Label>
                          <Input
                            id="prizeCounter"
                            type="number"
                            min="0"
                            value={prizeCounter}
                            onChange={(e) => setPrizeCounter(e.target.value)}
                          />
                        </div>
                      )}
                      {replaceError && (
                        <p className="text-sm text-destructive">{replaceError}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReplaceOpen(false)}>
                        Отмена
                      </Button>
                      <Button onClick={handleReplace} disabled={replacing}>
                        {replacing ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : null}
                        Выполнить замену
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">Базовый набор типа + индивидуальные правки</p>
                    <Button variant="outline" size="sm" onClick={openToysEdit}>
                      <Settings className="h-4 w-4 mr-1" />
                      Настроить правки
                    </Button>
                  </div>
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
                  <p className="text-sm text-muted-foreground">Напечатать QR-код для наклейки на аппарат. После сканирования техник откроется страница обслуживания.</p>
                  <Button onClick={() => printMachineQR(data.number)}><QrCode className="h-4 w-4 mr-1" />Напечатать QR-код</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {/* Диалог индивидуальных правок игрушек */}
      <Dialog open={toysEditOpen} onOpenChange={setToysEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Индивидуальные правки игрушек</DialogTitle>
            <DialogDescription>
              Аппарат №{num}. Добавьте или удалите игрушки относительно базового набора типа.
            </DialogDescription>
          </DialogHeader>

          {toysEditLoading ? (
            <p className="text-muted-foreground text-center py-4">Загрузка...</p>
          ) : (
            <div className="space-y-4">
              {/* Текущие правки */}
              <div>
                <p className="text-sm font-medium mb-2">Текущие правки:</p>
                {overrides.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет индивидуальных правок</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {overrides.map((o) => {
                      const toy = allToysFull.find(t => t.id === o.toyId)
                      return (
                        <Badge
                          key={`${o.toyId}-${o.action}`}
                          variant={o.action === "add" ? "success" : "destructive"}
                          className="gap-1 pr-1"
                        >
                          {o.action === "add" ? "+" : "−"} {toy?.name ?? `ID ${o.toyId}`} ({toy?.price ?? 0} ₽)
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Добавить/удалить правку */}
              <div>
                <p className="text-sm font-medium mb-2">Добавить правку:</p>
                <div className="flex gap-2 mb-2">
                  <Button
                    variant={editAction === "add" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setEditAction("add"); setEditToyId("") }}
                  >
                    Добавить игрушку
                  </Button>
                  <Button
                    variant={editAction === "remove" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => { setEditAction("remove"); setEditToyId("") }}
                  >
                    Убрать игрушку
                  </Button>
                </div>

                {editAction === "add" && (
                  <div className="flex gap-2">
                    <Select value={editToyId} onValueChange={setEditToyId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Выберите игрушку..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToAdd.map(toy => (
                          <SelectItem key={toy.id} value={String(toy.id)}>
                            {toy.name} ({toy.price} ₽)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!editToyId || editSaving}
                      onClick={handleToysEdit}
                    >
                      {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Добавить"}
                    </Button>
                  </div>
                )}

                {editAction === "remove" && (
                  <div className="flex gap-2">
                    <Select value={editToyId} onValueChange={setEditToyId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Выберите игрушку..." />
                      </SelectTrigger>
                      <SelectContent>
                        {canRemoveToys.map(toy => (
                          <SelectItem key={toy.id} value={String(toy.id)}>
                            {toy.name} ({toy.price} ₽)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!editToyId || editSaving}
                      onClick={handleToysEdit}
                    >
                      {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Убрать"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}