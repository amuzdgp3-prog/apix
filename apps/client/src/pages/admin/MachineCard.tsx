import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Loader2, MapPin, Wrench, Users, Route, Package, Coins, BarChart3, Pencil, Camera } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getMachineCard, updateMachine, updateMachineTechnicians, updateMachineRoutes, updateMachineToys, type MachineCardData } from "@/api/machines"
import { fetchMachineTypes, fetchStaff, fetchRoutes, fetchToys } from "@/api/directories"
import { useState, useRef, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// ---- Main component ----

export default function MachineCard() {
  const { number } = useParams<{ number: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const mn = Number(number)

  const { data: m, isLoading, error } = useQuery<MachineCardData>({
    queryKey: ["machine", mn], queryFn: () => getMachineCard(mn), enabled: !!mn,
  })
  const { data: types } = useQuery({ queryKey: ["machineTypes"], queryFn: fetchMachineTypes })
  const { data: staff } = useQuery({ queryKey: ["staff"], queryFn: fetchStaff })
  const { data: routes } = useQuery({ queryKey: ["routes"], queryFn: fetchRoutes })
  const { data: toys } = useQuery({ queryKey: ["toys"], queryFn: fetchToys })

  const [edit, setEdit] = useState<string | null>(null)
  const [techOpen, setTechOpen] = useState(false)
  const [routeOpen, setRouteOpen] = useState(false)
  const [toyOpen, setToyOpen] = useState(false)
  const [techIds, setTechIds] = useState<number[]>([])
  const [routeIds, setRouteIds] = useState<number[]>([])
  const [toyIds, setToyIds] = useState<number[]>([])
  const [photoDialog, setPhotoDialog] = useState<string | null>(null)

  const um = useMutation({
    mutationFn: (b: Parameters<typeof updateMachine>[1]) => updateMachine(mn, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["machine", mn] }),
  })
  const tm = useMutation({
    mutationFn: (ids: number[]) => updateMachineTechnicians(mn, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["machine", mn] }),
  })
  const rm = useMutation({
    mutationFn: (ids: number[]) => updateMachineRoutes(mn, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["machine", mn] }),
  })
  const tym = useMutation({
    mutationFn: (ids: number[]) => updateMachineToys(mn, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["machine", mn] }),
  })

  const save = useCallback((field: string, value: unknown) => {
    const body: Record<string, unknown> = {}
    if (field === "typeId") body.typeId = value
    if (field === "status") body.status = value
    if (field === "pricePerGame") body.pricePerGame = value
    if (field === "hasPrizeCounter") body.hasPrizeCounter = value === "true" || value === true
    if (field === "minServiceDays") body.minServiceDays = value === "" ? null : Number(value)
    if (field === "maxServiceDays") body.maxServiceDays = value === "" ? null : Number(value)
    um.mutate(body)
    setEdit(null)
  }, [um, mn])

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  if (error || !m) return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => navigate("/admin/machines")}><ArrowLeft className="h-4 w-4 mr-2" />Назад к списку</Button>
      <Card className="border-destructive/30"><CardContent className="py-8 text-center">
        <p className="text-destructive text-lg font-medium">Аппарат не найден или ошибка загрузки</p>
        <p className="text-muted-foreground mt-1">Проверьте номер аппарата и попробуйте снова</p>
      </CardContent></Card>
    </div>
  )

  const typeOptions = types?.map(t => ({ value: t.id, label: t.name })) ?? []
  const statusOpts = [{ value: "active", label: "Активен" }, { value: "inactive", label: "Неактивен" }]
  const prizeOpts = [{ value: "true", label: "Есть" }, { value: "false", label: "Нет" }]
  const staffOpts = (staff ?? []) as Array<{ id: number; name?: string; fullName?: string }>
  const mappedStaff = staffOpts.map(s => ({ id: s.id, name: (s.name || (s as Record<string, unknown>).fullName || "—") as string }))
  const mappedRoutes = (routes ?? []) as Array<{ id: number; name: string }>
  const mappedToys = (toys ?? []) as Array<{ id: number; name: string; price: number }>

  const statsCards = [
    { title: "Всего обслуживаний", value: String(m.stats.totalServices), icon: BarChart3 },
    { title: "Выручка за 30 дн.", value: `${m.stats.revenue30d.toLocaleString()} ₽`, icon: Coins },
    { title: "Средний ROI", value: m.stats.avgRoi != null ? m.stats.avgRoi.toFixed(2) : "—", icon: Wrench },
    { title: "Тренд ROI", value: m.roiTrend.length >= 2 ? `${m.roiTrend[0].roi.toFixed(2)} → ${m.roiTrend[m.roiTrend.length - 1].roi.toFixed(2)}` : "—", icon: BarChart3 },
  ]

  const editRow = (label: string, field: string, display: string, el: React.ReactNode, icon?: React.ReactNode) => (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}:</span>
      {edit === field ? el : <span className="text-sm font-medium">{display}</span>}
      <button className="ml-auto text-muted-foreground hover:text-foreground flex-shrink-0" onClick={() => setEdit(edit === field ? null : field)}>
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  const openTech = () => { setTechIds(m.technicians.map(t => t.id)); setTechOpen(!techOpen) }
  const openRoute = () => { setRouteIds(m.routes.map(r => r.id)); setRouteOpen(!routeOpen) }
  const openToy = () => { setToyIds(m.toys.map(t => t.id)); setToyOpen(!toyOpen) }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/machines")}><ArrowLeft className="h-5 w-5" /></Button>
        <div><h1 className="text-2xl font-bold tracking-tight">Карточка аппарата №{m.number}</h1><p className="text-muted-foreground">Детальная информация по аппарату</p></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((c, i) => (
          <Card key={i}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{c.title}</CardTitle><c.icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{c.value}</div></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Основная информация */}
        <Card>
          <CardHeader><CardTitle className="text-base">Основная информация</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editRow("Тип аппарата", "typeId", m.typeName,
              <InlineSelect value={m.typeId} options={typeOptions} onChange={(v) => save("typeId", v)} onClose={() => setEdit(null)} />,
              <Wrench className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground w-32">Адрес:</span><span className="text-sm font-medium">{m.locationName}</span>
            </div>
            {editRow("Цена игры", "pricePerGame", `${m.pricePerGame} ₽`,
              <InlineInput value={m.pricePerGame} type="number" onChange={(v) => save("pricePerGame", v)} onClose={() => setEdit(null)} />,
              <Coins className="h-4 w-4 text-muted-foreground" />
            )}
            {editRow("Статус", "status", m.status === "active" ? "Активен" : "Неактивен",
              <InlineSelect value={m.status} options={statusOpts} onChange={(v) => save("status", v)} onClose={() => setEdit(null)} />
            )}
            {editRow("Счётчик призов", "hasPrizeCounter", m.hasPrizeCounter ? "Есть" : "Нет",
              <InlineSelect value={m.hasPrizeCounter ? "true" : "false"} options={prizeOpts} onChange={(v) => save("hasPrizeCounter", v)} onClose={() => setEdit(null)} />
            )}
          </CardContent>
        </Card>

        {/* Настройки и назначения */}
        <Card>
          <CardHeader><CardTitle className="text-base">Настройки и назначения</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editRow("Мин. дней (обсл.)", "minServiceDays", m.minServiceDays != null ? String(m.minServiceDays) : "—",
              <InlineInput value={m.minServiceDays ?? ""} type="number" onChange={(v) => save("minServiceDays", v)} onClose={() => setEdit(null)} />
            )}
            {editRow("Макс. дней (обсл.)", "maxServiceDays", m.maxServiceDays != null ? String(m.maxServiceDays) : "—",
              <InlineInput value={m.maxServiceDays ?? ""} type="number" onChange={(v) => save("maxServiceDays", v)} onClose={() => setEdit(null)} />
            )}
            {/* Technicians */}
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm text-muted-foreground w-36">Техники:</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {m.technicians.length > 0 ? m.technicians.map(t => <Badge key={t.id} variant="outline">{t.name}</Badge>) : <span className="text-sm text-muted-foreground">Не назначены</span>}
              </div>
              <div className="relative flex-shrink-0">
                <button className="text-muted-foreground hover:text-foreground" onClick={openTech}><Pencil className="h-3.5 w-3.5" /></button>
                {techOpen && <MultiSelectPopover title="Выберите техников" allOptions={mappedStaff} selectedIds={techIds}
                  onToggle={(id: number) => setTechIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
                  onClose={() => { tm.mutate(techIds); setTechOpen(false) }} />}
              </div>
            </div>
            {/* Routes */}
            <div className="flex items-start gap-2">
              <Route className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm text-muted-foreground w-36">Маршруты:</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {m.routes.length > 0 ? m.routes.map(r => <Badge key={r.id} variant="outline">{r.name}</Badge>) : <span className="text-sm text-muted-foreground">Не назначены</span>}
              </div>
              <div className="relative flex-shrink-0">
                <button className="text-muted-foreground hover:text-foreground" onClick={openRoute}><Pencil className="h-3.5 w-3.5" /></button>
                {routeOpen && <MultiSelectPopover title="Выберите маршруты" allOptions={mappedRoutes} selectedIds={routeIds}
                  onToggle={(id: number) => setRouteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
                  onClose={() => { rm.mutate(routeIds); setRouteOpen(false) }} />}
              </div>
            </div>
            {/* Toys */}
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm text-muted-foreground w-36">Игрушки:</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {m.toys.length > 0 ? m.toys.map(t => <Badge key={t.id} variant="outline">{t.name} ({t.price}₽)</Badge>) : <span className="text-sm text-muted-foreground">Нет игрушек</span>}
              </div>
              <div className="relative flex-shrink-0">
                <button className="text-muted-foreground hover:text-foreground" onClick={openToy}><Pencil className="h-3.5 w-3.5" /></button>
                {toyOpen && <MultiSelectPopover title="Выберите игрушки" allOptions={mappedToys.map(t => ({ id: t.id, name: `${t.name} (${t.price}₽)` }))} selectedIds={toyIds}
                  onToggle={(id: number) => setToyIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
                  onClose={() => { tym.mutate(toyIds); setToyOpen(false) }} />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица обслуживаний */}
      <Card>
        <CardHeader><CardTitle className="text-base">История обслуживаний</CardTitle></CardHeader>
        <CardContent>
          {m.services.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Нет данных об обслуживаниях</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Техник</TableHead>
                    <TableHead>Счётчик игр</TableHead>
                    <TableHead>Выручка</TableHead>
                    <TableHead>Затраты на игрушки</TableHead>
                    <TableHead>Заложено игрушек</TableHead>
                    <TableHead>Фото счётчика</TableHead>
                    <TableHead>Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.services.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{new Date(s.serviceDate).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell>{s.staffName}</TableCell>
                      <TableCell>{s.gameCounter}</TableCell>
                      <TableCell>{s.revenue != null ? `${s.revenue.toLocaleString()} ₽` : "—"}</TableCell>
                      <TableCell>{s.costOfToys != null ? `${Number(s.costOfToys).toLocaleString()} ₽` : "—"}</TableCell>
                      <TableCell>
                        {s.toyDistribution?.length > 0
                          ? (s.toyDistribution as Array<{ toyName: string; quantity: number; priceSnapshot: number; totalCost: number }>).map((td, i) => (
                              <div key={i} className="text-xs">{td.toyName}: {td.quantity} шт.</div>
                            ))
                          : "—"}
                      </TableCell>
                      <TableCell align="center">
                        {s.photos?.counter ? (
                          <button
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setPhotoDialog(s.photos?.counter ?? null)}
                            title="Просмотреть фото счётчика"
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={s.comment || ""}>{s.comment || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог просмотра фото счётчика */}
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
    </div>
  )
}

// Inline helpers
const InlineSelect = ({ value, options, onChange, onClose }: {
  value: string | number
  options: { value: string | number; label: string }[]
  onChange: (v: string | number) => void
  onClose: () => void
}) => {
  const ref = useRef<HTMLSelectElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <select ref={ref} value={value} onBlur={onClose}
      onChange={(e) => onChange(typeof options[0]?.value === "number" ? Number(e.target.value) : e.target.value)}
      className="border rounded px-2 py-1 text-sm w-full max-w-[200px]"
    >{options.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}</select>
  )
}

const InlineInput = ({ value, type, onChange, onClose }: {
  value: string | number
  type?: "number" | "text"
  onChange: (v: string | number) => void
  onClose: () => void
}) => {
  const [local, setLocal] = useState<string | number>(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  const submit = useCallback(() => {
    const v = type === "number" ? Number(local) : local
    if (v === value) { onClose(); return }
    onChange(v)
  }, [local, type, value, onChange, onClose])
  return (
    <input ref={ref} type={type ?? "text"} value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose() }}
      className="border rounded px-2 py-1 text-sm w-full max-w-[160px]" />
  )
}

const MultiSelectPopover = ({ title, allOptions, selectedIds, onToggle, onClose }: {
  title: string
  allOptions: { id: number; name: string }[]
  selectedIds: number[]
  onToggle: (id: number) => void
  onClose: () => void
}) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [onClose])
  return (
    <div ref={ref} className="absolute right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg p-2 w-56 max-h-60 overflow-y-auto">
      <div className="text-xs font-semibold text-muted-foreground mb-1 px-1">{title}</div>
      {allOptions.length === 0 && <div className="text-xs text-muted-foreground px-1 py-2">Нет доступных</div>}
      {allOptions.map(opt => (
        <label key={opt.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-sm">
          <input type="checkbox" checked={selectedIds.includes(opt.id)} onChange={() => onToggle(opt.id)} className="rounded" />{opt.name}
        </label>
      ))}
    </div>
  )
}