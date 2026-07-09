import { useEffect, useMemo, useState } from "react"
import { Search, Plus, Pencil, Trash2, X, PackageOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { MachineTypeDialog } from "@/components/directories/MachineTypeDialog"
import {
  fetchMachineTypes,
  createMachineType,
  updateMachineType,
  deleteMachineType,
  fetchMachineTypeToys,
  addMachineTypeToy,
  removeMachineTypeToy,
  fetchToys,
} from "@/api/directories"
import type { MachineType, MachineTypeCreate, MachineTypeUpdate, Toy } from "@apix/shared"

export default function MachineTypes() {
  const [items, setItems] = useState<MachineType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MachineType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MachineType | null>(null)

  // Управление игрушками типа
  const [toysDialogOpen, setToysDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<MachineType | null>(null)
  const [typeToys, setTypeToys] = useState<Toy[]>([])
  const [allToys, setAllToys] = useState<Toy[]>([])
  const [toysLoading, setToysLoading] = useState(false)
  const [selectedToyId, setSelectedToyId] = useState<string>("")

  const load = async () => {
    setLoading(true)
    try { setItems(await fetchMachineTypes()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i => i.name.toLowerCase().includes(q))
  }, [search, items])

  const handleSave = async (data: MachineTypeCreate | MachineTypeUpdate) => {
    if (editing) await updateMachineType(editing.id, data as MachineTypeUpdate)
    else await createMachineType(data as MachineTypeCreate)
    setDialogOpen(false); setEditing(null); await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteMachineType(deleteTarget.id)
    setDeleteTarget(null); await load()
  }

  // Открыть диалог управления игрушками типа
  const openToysDialog = async (type: MachineType) => {
    setSelectedType(type)
    setToysDialogOpen(true)
    setToysLoading(true)
    setSelectedToyId("")
    try {
      const [toys, all] = await Promise.all([
        fetchMachineTypeToys(type.id),
        fetchToys(),
      ])
      setTypeToys(toys)
      setAllToys(all)
    } finally {
      setToysLoading(false)
    }
  }

  const handleAddToy = async () => {
    if (!selectedType || !selectedToyId) return
    await addMachineTypeToy(selectedType.id, Number(selectedToyId))
    setSelectedToyId("")
    // Перезагрузить список игрушек типа
    setTypeToys(await fetchMachineTypeToys(selectedType.id))
  }

  const handleRemoveToy = async (toyId: number) => {
    if (!selectedType) return
    await removeMachineTypeToy(selectedType.id, toyId)
    setTypeToys(prev => prev.filter(t => t.id !== toyId))
  }

  // Доступные для добавления игрушки (ещё не привязанные)
  const availableToys = useMemo(
    () => allToys.filter(t => !typeToys.some(tt => tt.id === t.id)),
    [allToys, typeToys]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Типы автоматов</h1>
          <p className="text-muted-foreground">Справочник типов игровых автоматов</p>
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
        <CardHeader><CardTitle className="text-lg">Список типов</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Базовый набор игрушек</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openToysDialog(t)}
                      >
                        <PackageOpen className="h-3.5 w-3.5 mr-1" />
                        Настроить игрушки
                      </Button>
                    </TableCell>
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

      {/* Диалог управления базовым набором игрушек */}
      <Dialog open={toysDialogOpen} onOpenChange={setToysDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Базовый набор игрушек — {selectedType?.name}</DialogTitle>
          </DialogHeader>

          {toysLoading ? (
            <p className="text-muted-foreground text-center py-4">Загрузка...</p>
          ) : (
            <div className="space-y-4">
              {/* Текущий набор */}
              <div>
                <p className="text-sm font-medium mb-2">Текущий набор:</p>
                {typeToys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет игрушек в базовом наборе</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {typeToys.map(toy => (
                      <Badge key={toy.id} variant="secondary" className="gap-1 pr-1">
                        {toy.name} ({toy.price} ₽)
                        <button
                          type="button"
                          className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                          onClick={() => handleRemoveToy(toy.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Добавить игрушку */}
              <div>
                <p className="text-sm font-medium mb-2">Добавить игрушку:</p>
                {availableToys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Все игрушки уже добавлены</p>
                ) : (
                  <div className="flex gap-2">
                    <Select value={selectedToyId} onValueChange={setSelectedToyId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Выберите игрушку..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToys.map(toy => (
                          <SelectItem key={toy.id} value={String(toy.id)}>
                            {toy.name} ({toy.price} ₽)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!selectedToyId}
                      onClick={handleAddToy}
                    >
                      Добавить
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MachineTypeDialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null) }} item={editing} onSave={handleSave} />

      <DeleteConfirmDialog
        open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}
        title="Удалить тип автомата?"
        description={deleteTarget ? `Тип «${deleteTarget.name}» будет удалён безвозвратно.` : ""}
        onConfirm={handleDelete}
      />
    </div>
  )
}