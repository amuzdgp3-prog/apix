import { useEffect, useState } from "react"
import type { Location, LocationCreate, LocationUpdate } from "@apix/shared"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  item?: Location | null // null = create mode
  onSave: (data: LocationCreate | LocationUpdate) => Promise<void>
  parents: Location[]
}

export function LocationDialog({ open, onOpenChange, item, onSave, parents }: Props) {
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState<number | null>(null)
  const [nodeType, setNodeType] = useState("")
  const [minServiceDays, setMinServiceDays] = useState<number | null>(null)
  const [maxServiceDays, setMaxServiceDays] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setParentId(item?.parentId ?? null)
      setNodeType(item?.nodeType ?? "")
      setMinServiceDays(item?.minServiceDays ?? null)
      setMaxServiceDays(item?.maxServiceDays ?? null)
    }
  }, [open, item])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        parentId: parentId ?? undefined,
        nodeType: nodeType.trim() || undefined,
        minServiceDays: minServiceDays ?? undefined,
        maxServiceDays: maxServiceDays ?? undefined,
      }
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Редактировать точку" : "Добавить точку"}</DialogTitle>
          <DialogDescription>
            {item ? "Измените данные точки установки." : "Заполните данные новой точки установки."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label htmlFor="loc-name">Название *</Label>
            <Input id="loc-name" value={name} onChange={e => setName(e.target.value)} placeholder="ТЦ Мега" />
          </div>
          <div>
            <Label htmlFor="loc-parent">Родительская точка</Label>
            <select
              id="loc-parent"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={parentId ?? ""}
              onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— без родителя —</option>
              {parents.filter(p => p.id !== item?.id).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="loc-type">Тип узла</Label>
            <Input id="loc-type" value={nodeType} onChange={e => setNodeType(e.target.value)} placeholder="mall / cinema / store" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="loc-min">Мин. интервал (дней)</Label>
              <Input
                id="loc-min"
                type="number"
                value={minServiceDays ?? ""}
                onChange={e => setMinServiceDays(e.target.value ? Number(e.target.value) : null)}
                placeholder="14"
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="loc-max">Макс. интервал (дней)</Label>
              <Input
                id="loc-max"
                type="number"
                value={maxServiceDays ?? ""}
                onChange={e => setMaxServiceDays(e.target.value ? Number(e.target.value) : null)}
                placeholder="30"
                min={1}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Сохранение..." : item ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}