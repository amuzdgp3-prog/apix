import { useEffect, useMemo, useState } from "react"
import { Search, Plus, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { ToyDialog } from "@/components/directories/ToyDialog"
import {
  fetchToys,
  createToy,
  updateToy,
  deleteToy,
} from "@/api/directories"
import type { Toy, ToyCreate, ToyUpdate } from "@apix/shared"

export default function Toys() {
  const [items, setItems] = useState<Toy[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Toy | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Toy | null>(null)

  const load = async () => {
    setLoading(true)
    try { setItems(await fetchToys()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i => i.name.toLowerCase().includes(q))
  }, [search, items])

  const handleSave = async (data: ToyCreate | ToyUpdate) => {
    if (editing) await updateToy(editing.id, data as ToyUpdate)
    else await createToy(data as ToyCreate)
    setDialogOpen(false); setEditing(null); await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteToy(deleteTarget.id)
    setDeleteTarget(null); await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Игрушки</h1>
          <p className="text-muted-foreground">Справочник игрушек и их цен</p>
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
        <CardHeader><CardTitle className="text-lg">Список игрушек</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead className="text-right">Цена (₽)</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right">{t.price}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(t); setDialogOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Ничего не найдено</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ToyDialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null) }} item={editing} onSave={handleSave} />

      <DeleteConfirmDialog
        open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}
        title="Удалить игрушку?"
        description={deleteTarget ? `Игрушка «${deleteTarget.name}» будет удалена безвозвратно.` : ""}
        onConfirm={handleDelete}
      />
    </div>
  )
}