import { useEffect, useMemo, useState } from "react"
import { Search, Plus, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { LocationDialog } from "@/components/directories/LocationDialog"
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "@/api/directories"
import type { Location, LocationCreate, LocationUpdate } from "@apix/shared"

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchLocations()
      setLocations(data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return locations.filter(l => l.name.toLowerCase().includes(q))
  }, [search, locations])

  const handleSave = async (data: LocationCreate | LocationUpdate) => {
    if (editing) {
      await updateLocation(editing.id, data as LocationUpdate)
    } else {
      await createLocation(data as LocationCreate)
    }
    setDialogOpen(false)
    setEditing(null)
    await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteLocation(deleteTarget.id)
    setDeleteTarget(null)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Точки</h1>
          <p className="text-muted-foreground">Справочник точек установки автоматов</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по названию..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Список точек</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Родитель</TableHead>
                  <TableHead>Тип узла</TableHead>
                  <TableHead>Интервал (дней)</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.parentId ? locations.find(p => p.id === l.parentId)?.name ?? `#${l.parentId}` : "—"}
                    </TableCell>
                    <TableCell><Badge variant="outline">{l.nodeType || "—"}</Badge></TableCell>
                    <TableCell>
                      {l.minServiceDays ?? "—"} / {l.maxServiceDays ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(l); setDialogOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(l)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Ничего не найдено</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LocationDialog
        open={dialogOpen}
        onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null) }}
        item={editing}
        onSave={handleSave}
        parents={locations}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={v => { if (!v) setDeleteTarget(null) }}
        title="Удалить точку?"
        description={deleteTarget ? `Точка «${deleteTarget.name}» будет удалена безвозвратно.` : ""}
        onConfirm={handleDelete}
      />
    </div>
  )
}