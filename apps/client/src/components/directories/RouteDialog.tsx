import { useEffect, useState } from "react"
import type { Route, RouteCreate, RouteUpdate } from "@apix/shared"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  item?: Route | null
  onSave: (data: RouteCreate | RouteUpdate) => Promise<void>
}

export function RouteDialog({ open, onOpenChange, item, onSave }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [minServiceDays, setMinServiceDays] = useState("")
  const [maxServiceDays, setMaxServiceDays] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setDescription(item?.description ?? "")
      setMinServiceDays(item?.minServiceDays != null ? String(item.minServiceDays) : "")
      setMaxServiceDays(item?.maxServiceDays != null ? String(item.maxServiceDays) : "")
    }
  }, [open, item])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: RouteCreate = {
        name: name.trim(),
        description: description.trim() || null,
        minServiceDays: minServiceDays ? Number(minServiceDays) : null,
        maxServiceDays: maxServiceDays ? Number(maxServiceDays) : null,
      }
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{item ? "Редактировать маршрут" : "Добавить маршрут"}</DialogTitle>
          <DialogDescription>
            {item ? "Измените параметры маршрута." : "Укажите параметры нового маршрута."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label htmlFor="route-name">Название *</Label>
            <Input id="route-name" value={name} onChange={e => setName(e.target.value)} placeholder="Маршрут Юг" />
          </div>
          <div>
            <Label htmlFor="route-desc">Описание</Label>
            <Textarea id="route-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Южное направление" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="route-min">Мин. дней</Label>
              <Input id="route-min" type="number" min={1} value={minServiceDays} onChange={e => setMinServiceDays(e.target.value)} placeholder="7" />
            </div>
            <div>
              <Label htmlFor="route-max">Макс. дней</Label>
              <Input id="route-max" type="number" min={1} value={maxServiceDays} onChange={e => setMaxServiceDays(e.target.value)} placeholder="14" />
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