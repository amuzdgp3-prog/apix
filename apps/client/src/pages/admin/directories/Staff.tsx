import { useEffect, useMemo, useState } from "react"
import { Search, Plus, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { StaffDialog } from "@/components/directories/StaffDialog"
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from "@/api/directories"
import type { Staff, StaffCreate, StaffUpdate } from "@apix/shared"

export default function StaffPage() {
  const [items, setItems] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)

  const load = async () => {
    setLoading(true)
    try { setItems(await fetchStaff()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    )
  }, [search, items])

  const handleSave = async (data: StaffCreate | StaffUpdate) => {
    if (editing) await updateStaff(editing.id, data as StaffUpdate)
    else await createStaff(data as StaffCreate)
    setDialogOpen(false); setEditing(null); await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteStaff(deleteTarget.id)
    setDeleteTarget(null); await load()
  }

  const roleLabel = (role: string) => (role === "admin" ? "Админ" : "Техник")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Сотрудники</h1>
          <p className="text-muted-foreground">Справочник персонала</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по ФИО, email, роли..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Список сотрудников</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell><Badge variant="outline">{roleLabel(s.role)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(s); setDialogOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(s)}>
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

      <StaffDialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null) }} item={editing} onSave={handleSave} />

      <DeleteConfirmDialog
        open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}
        title="Удалить сотрудника?"
        description={deleteTarget ? `Сотрудник «${deleteTarget.fullName}» будет удалён безвозвратно.` : ""}
        onConfirm={handleDelete}
      />
    </div>
  )
}