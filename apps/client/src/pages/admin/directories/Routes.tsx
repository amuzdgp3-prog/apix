import { useEffect, useMemo, useState } from "react"
import { Search, Plus, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { RouteDialog } from "@/components/directories/RouteDialog"
import {
  fetchRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
} from "@/api/directories"
import type { Route, RouteCreate, RouteUpdate } from "@apix/shared"

export default function Routes() {
  const [items, setItems] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Route | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null)

  const load = async () => {
    setLoading(true)
    try { setItems(await fetchRoutes()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)))
  }, [search, items])

  const handleSave = async (data: RouteCreate | RouteUpdate) => {
    if (editing) await updateRoute(editing.id, data as RouteUpdate)
    else await createRoute(data as RouteCreate)
    setDialogOpen(false); setEditing(null); await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteRoute(deleteTarget.id)
    setDeleteTarget(null); await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Маршруты</h1>
          <p className="text-muted-foreground">Справочник маршрутов обслуживания</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по названию или описанию..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Список маршрутов</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead className="text-right">Мин. дней</TableHead>
                  <TableHead className="text-right">Макс. дней</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    </TableCell>
                    <TableCell className="text-right"><Badge variant="outline">{r.minServiceDays ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">{r.maxServiceDays ?? "—"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setDialogOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Ничего не найдено</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RouteDialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null) }} item={editing} onSave={handleSave} />

      <DeleteConfirmDialog
        open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}
        title="Удалить маршрут?"
        description={deleteTarget ? `Маршрут «${deleteTarget.name}» будет удалён безвозвратно.` : ""}
        onConfirm={handleDelete}
      />
    </div>
  )
}