import { useEffect, useState } from "react"
import type { Toy, ToyCreate, ToyUpdate } from "@apix/shared"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  item?: Toy | null
  onSave: (data: ToyCreate | ToyUpdate) => Promise<void>
}

export function ToyDialog({ open, onOpenChange, item, onSave }: Props) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setPrice(item?.price != null ? String(item.price) : "")
    }
  }, [open, item])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: ToyCreate = {
        name: name.trim(),
        price: price ? Number(price) : 0,
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
          <DialogTitle>{item ? "Редактировать игрушку" : "Добавить игрушку"}</DialogTitle>
          <DialogDescription>
            {item ? "Измените название и цену игрушки." : "Укажите название и цену новой игрушки."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label htmlFor="toy-name">Название *</Label>
            <Input id="toy-name" value={name} onChange={e => setName(e.target.value)} placeholder="Мягкий мишка" />
          </div>
          <div>
            <Label htmlFor="toy-price">Цена (₽) *</Label>
            <Input id="toy-price" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="300" min={0} step="0.01" />
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