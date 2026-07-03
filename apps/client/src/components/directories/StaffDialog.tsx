import { useEffect, useState } from "react"
import type { Staff, StaffCreate, StaffUpdate, StaffRoleEnum } from "@apix/shared"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  item?: Staff | null
  onSave: (data: StaffCreate | StaffUpdate) => Promise<void>
}

export function StaffDialog({ open, onOpenChange, item, onSave }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<StaffRoleEnum>("technician")
  const [saving, setSaving] = useState(false)

  const isEdit = !!item

  useEffect(() => {
    if (open) {
      setEmail(item?.email ?? "")
      setPassword("")
      setFullName(item?.fullName ?? "")
      setRole(item?.role ?? "technician")
    }
  }, [open, item])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isEdit) {
        const data: StaffUpdate = {
          email: email.trim(),
          fullName: fullName.trim(),
          role,
        }
        await onSave(data)
      } else {
        const data: StaffCreate = {
          email: email.trim(),
          password: password,
          fullName: fullName.trim(),
          role,
        }
        await onSave(data)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать сотрудника" : "Добавить сотрудника"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Измените данные сотрудника." : "Укажите данные нового сотрудника."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label htmlFor="staff-fullname">ФИО *</Label>
            <Input id="staff-fullname" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Иванов Иван" />
          </div>
          <div>
            <Label htmlFor="staff-email">Email *</Label>
            <Input id="staff-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ivanov@example.com" />
          </div>
          {!isEdit && (
            <div>
              <Label htmlFor="staff-password">Пароль *</Label>
              <Input id="staff-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов" />
            </div>
          )}
          <div>
            <Label htmlFor="staff-role">Роль *</Label>
            <Select value={role} onValueChange={v => setRole(v as StaffRoleEnum)}>
              <SelectTrigger id="staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technician">Техник</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave} disabled={!email.trim() || !fullName.trim() || (!isEdit && !password) || saving}>
            {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}