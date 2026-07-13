import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createMachine } from "@/api/machines";
import {
  fetchMachineTypes,
  fetchRoutes,
} from "@/api/directories";
import type { MachineCreateFull } from "@apix/shared";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export default function CreateMachineDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState<MachineCreateFull>({
    number: 0,
    locationName: "",
    typeId: 0,
    pricePerGame: 100,
    gameCounterInitial: 0,
    prizeCounterInitial: 0,
    maxServiceDays: null,
    routeIds: [],
  });

  const [error, setError] = useState<string | null>(null);
  const { data: machineTypes = [] } = useQuery({
    queryKey: ["machineTypes"],
    queryFn: fetchMachineTypes,
    enabled: open,
  });

  const { data: routesList = [] } = useQuery({
    queryKey: ["routes"],
    queryFn: fetchRoutes,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: createMachine,
    onSuccess: () => {
      setForm({
        number: 0,
        locationName: "",
        typeId: 0,
        pricePerGame: 100,
        gameCounterInitial: 0,
        prizeCounterInitial: 0,
        maxServiceDays: null,
        routeIds: [],
      });
      setError(null);
      onSuccess();
    },
    onError: (err: any) => {
      setError(err?.message ?? "Ошибка при создании аппарата");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.number || !form.locationName.trim() || !form.typeId) {
      setError("Заполните номер аппарата, адрес и тип");
      return;
    }
    mutation.mutate(form);
  };

  const toggleRouteId = (id: number) => {
    setForm((prev) => ({
      ...prev,
      routeIds: prev.routeIds?.includes(id)
        ? prev.routeIds.filter((rid) => rid !== id)
        : [...(prev.routeIds ?? []), id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить аппарат</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mach-number">Номер аппарата *</Label>
            <Input
              id="mach-number"
              type="number"
              min={1}
              placeholder="Например: 1234"
              value={form.number || ""}
              onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mach-type">Тип аппарата *</Label>
            <select
              id="mach-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.typeId || ""}
              onChange={(e) => setForm({ ...form, typeId: Number(e.target.value) })}
              required
            >
              <option value="" disabled>Выберите тип</option>
              {machineTypes.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

            <div className="space-y-2">
             <Label htmlFor="mach-location">Адрес установки *</Label>
            <Input
              id="mach-location"
              placeholder="Например: ул. Ленина, 15, ТЦ Европа, 2 этаж"
              value={form.locationName || ""}
              onChange={(e) => setForm({ ...form, locationName: e.target.value })}
              required
            />
            </div>

          <div className="space-y-2">
            <Label htmlFor="mach-price">Цена игры (₽) *</Label>
            <Input
              id="mach-price"
              type="number"
              min={0}
              placeholder="100"
              value={form.pricePerGame ?? ""}
              onChange={(e) => setForm({ ...form, pricePerGame: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mach-game-counter">Начальный игровой счётчик *</Label>
              <Input
                id="mach-game-counter"
                type="number"
                min={0}
                placeholder="0"
                value={form.gameCounterInitial ?? ""}
                onChange={(e) => setForm({ ...form, gameCounterInitial: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mach-prize-counter">Начальный призовой счётчик *</Label>
              <Input
                id="mach-prize-counter"
                type="number"
                min={0}
                placeholder="0"
                value={form.prizeCounterInitial ?? ""}
                onChange={(e) => setForm({ ...form, prizeCounterInitial: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mach-max-days">Макс. перерыв в обслуживании (дней)</Label>
            <Input
              id="mach-max-days"
              type="number"
              min={0}
              placeholder="Не задано"
              value={form.maxServiceDays ?? ""}
              onChange={(e) =>
                setForm({ ...form, maxServiceDays: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>

          {routesList.length > 0 && (
            <div className="space-y-2">
              <Label>Маршруты</Label>
              <div className="flex flex-wrap gap-2">
                {routesList.map((r: any) => (
                  <Badge
                    key={r.id}
                    variant={form.routeIds?.includes(r.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleRouteId(r.id)}
                  >
                    {r.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">Отмена</Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Создание..." : "Создать аппарат"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}