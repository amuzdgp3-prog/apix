import { useEffect, useState } from "react"
import type { MachineType, MachineTypeCreate, MachineTypeUpdate } from "@apix/shared"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  item?: MachineType | null
  onSave: (data: MachineTypeCreate | MachineTypeUpdate) => Promise<void>
}

export function MachineTypeDialog({ open, onOpenChange, item, onSave }: Props) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setName(item?.name ?? "")
  }, [open, item])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ name: name.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{item ? "Редактировать тип" : "Добавить тип"}</DialogTitle>
          <DialogDescription>
            {item ? "Измените название типа автомата." : "Укажите название нового типа автомата."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label htmlFor="mt-name">Название *</Label>
            <Input id="mt-name" value={name} onChange={e => setName(e.target.value)} placeholder="Кран-машина" />
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