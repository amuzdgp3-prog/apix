import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Camera,
  Download,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db, type DraftService } from "@/store/db";
import { api, uploadMultipart } from "@/api/client";
import QrScanner from "@/components/QrScanner";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import type { SyncResponse, PreviewResponse } from "@apix/shared";

// ==========================================
// Вспомогательные типы
// ==========================================

type ToyEntry = {
  toyId: number;
  name: string;
  quantity: number;
  price: number;
};

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: PreviewResponse }
  | { status: "error"; message: string };

// ==========================================
// Компонент
// ==========================================

export default function ServiceForm() {
  const { number } = useParams<{ number: string }>();
  const navigate = useNavigate();
  const machineNumber = Number(number ?? 0);

  // Поля формы
  const [serviceDate, setServiceDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [serviceTime, setServiceTime] = useState(
    () =>
      `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
  );
  const [gameCounter, setGameCounter] = useState("");
  const [prizeCounter, setPrizeCounter] = useState("");
  const [testGames, setTestGames] = useState("3");
  const [isOperational, setIsOperational] = useState(true);
  const [comment, setComment] = useState("");
  const [toys, setToys] = useState<ToyEntry[]>([]);

  // Фото (File-объекты)
  const [photoBefore, setPhotoBefore] = useState<File | null>(null);
  const [photoAfter, setPhotoAfter] = useState<File | null>(null);
  const [photoCounter, setPhotoCounter] = useState<File | null>(null);

  // Предпросмотр фото
  const [photoBeforePreview, setPhotoBeforePreview] = useState<string | null>(null);
  const [photoAfterPreview, setPhotoAfterPreview] = useState<string | null>(null);
  const [photoCounterPreview, setPhotoCounterPreview] = useState<string | null>(null);

  // Предварительный расчёт
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Состояние отправки
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    recordId: number;
    newGames: number;
    revenue: number;
    roi: number | null;
    periodDays: number;
  } | null>(null);

  // Справочник игрушек — загружаем ВСЕ игрушки из общего справочника,
  // чтобы техник мог добавить любые игрушки при обслуживании
  // ==========================================

  const [toyCatalog, setToyCatalog] = useState<
    Array<{ id: number; name: string; price: number }>
  >([]);

  useEffect(() => {
    api
      .get<Array<{ id: number; name: string; price: string | number }>>("/toys")
      .then(async (rows) => {
        const catalog = rows.map((r) => ({
          id: r.id,
          name: r.name,
          price: typeof r.price === "string" ? parseFloat(r.price) : r.price,
        }));
        setToyCatalog(catalog);

        // Сохранить в IndexedDB для оффлайн-режима
        try {
          await db.toys.clear();
          await db.toys.bulkPut(
            catalog.map((t) => ({
              id: String(t.id),
              name: t.name,
              price: t.price,
              category: null,
              created_at: new Date().toISOString(),
            })),
          );
        } catch {
          // Игнорируем ошибки записи в IndexedDB
        }
      })
      .catch(async () => {
        // Fallback: загрузить игрушки из IndexedDB (оффлайн-режим)
        try {
          const stored = await db.toys.toArray();
          if (stored.length > 0) {
            setToyCatalog(
              stored.map((t) => ({
                id: Number(t.id),
                name: t.name,
                price: t.price,
              })),
            );
          }
        } catch {
          // IndexedDB тоже недоступен — каталог останется пустым
        }
      });
  }, []);

  // ==========================================
  // Адрес машины для черновика
  // ==========================================

  const [machineAddress, setMachineAddress] = useState("");

  // PWA установка
  const { canInstall, isIos, promptInstall, showIosInstructions } = useInstallPrompt();

  // QR-сканер
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!machineNumber) return;
    Promise.all([
      db.placements.toArray(),
      db.locations.toArray(),
      db.machines.toArray(),
    ])
      .then(([placements, locations, machines]) => {
        const machine = machines.find(
          (m) => Number(m.number) === machineNumber,
        );
        if (!machine) return;
        const placement = placements.find(
          (p) => Number(p.machine_id) === machineNumber,
        );
        if (!placement) return;
        const location = locations.find(
          (l) => Number(l.id) === Number(placement.location_id),
        );
        setMachineAddress(location?.address ?? location?.name ?? "");
      })
      .catch(() => {});
  }, [machineNumber]);

  // ==========================================
  // Предварительный расчёт (debounced)
  // ==========================================

  const requestPreview = useCallback(() => {
    if (!machineNumber || !serviceDate || !gameCounter) {
      setPreview({ status: "idle" });
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    const gCount = Number(gameCounter);
    if (isNaN(gCount) || gCount < 0) {
      setPreview({ status: "idle" });
      return;
    }

    const toysForPreview = toys.map((t) => ({
      toyId: t.toyId,
      quantity: t.quantity,
    }));

    setPreview({ status: "loading" });

    api
      .post<PreviewResponse>(
        "/preview",
        {
          machineNumber,
          serviceDate,
          gameCounter: gCount,
          testGames: Number(testGames) || 0,
          toys: toysForPreview,
        },
        { signal: abortController.current.signal },
      )
      .then((data) => setPreview({ status: "ready", data }))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPreview({
          status: "error",
          message: err instanceof Error ? err.message : "Preview failed",
        });
      });
  }, [machineNumber, serviceDate, gameCounter, toys, testGames]);

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(requestPreview, 600);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [requestPreview]);

  // ==========================================
  // Управление игрушками
  // ==========================================

  const addToy = (toy: (typeof toyCatalog)[0]) => {
    const existing = toys.find((t) => t.toyId === toy.id);
    if (existing) {
      setToys(
        toys.map((t) =>
          t.toyId === toy.id ? { ...t, quantity: t.quantity + 1 } : t,
        ),
      );
    } else {
      setToys([
        ...toys,
        {
          toyId: toy.id,
          name: toy.name,
          quantity: 1,
          price: toy.price,
        },
      ]);
    }
  };

  const removeToy = (toyId: number) => {
    setToys(toys.filter((t) => t.toyId !== toyId));
  };

  const updateToyQty = (toyId: number, quantity: number) => {
    if (quantity <= 0) {
      removeToy(toyId);
      return;
    }
    setToys(toys.map((t) => (t.toyId === toyId ? { ...t, quantity } : t)));
  };

  // ==========================================
  // Загрузка фото
  // ==========================================

  const handlePhoto = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreviewUrl: (u: string | null) => void,
  ) => {
    if (file) {
      setFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  // ==========================================
  // Сохранение черновика
  // ==========================================

  const handleSaveDraft = async () => {
    try {
      const localId = crypto.randomUUID();
      const draft: DraftService = {
        localId,
        machineNumber,
        machineAddress,
        serviceDate,
        serviceTime,
        gameCounter: Number(gameCounter) || 0,
        prizeCounter: Number(prizeCounter) || 0,
        testGames: Number(testGames) || 0,
        isOperational,
        comment: comment || undefined,
        toys: JSON.stringify(
          toys.map((t) => ({ toyId: t.toyId, quantity: t.quantity })),
        ),
        photoBefore: photoBefore ?? undefined,
        photoAfter: photoAfter ?? undefined,
        photoCounter: photoCounter ?? undefined,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await db.drafts.put(draft);
      navigate(`/drafts?draft=${localId}`, { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? `Ошибка сохранения черновика: ${err.message}`
          : "Не удалось сохранить черновик",
      );
    }
  };

  // ==========================================
  // Отправка на сервер
  // ==========================================

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    try {
      const fields: Record<string, string> = {
        localId: crypto.randomUUID(),
        machineNumber: String(machineNumber),
        serviceDate,
        serviceTime,
        gameCounter: String(gameCounter),
        testGames: String(testGames),
        isOperational: String(isOperational),
        toys: JSON.stringify(
          toys.map((t) => ({ toyId: t.toyId, quantity: t.quantity })),
        ),
      };

      fields.prizeCounter = String(Number(prizeCounter) || 0);
      if (comment) fields.comment = comment;

      const files: Record<string, Blob> = {};
      if (photoBefore) files.photoBefore = photoBefore;
      if (photoAfter) files.photoAfter = photoAfter;
      if (photoCounter) files.photoCounter = photoCounter;

      const response = await uploadMultipart<SyncResponse>(
        "/sync",
        fields,
        files,
      );

      if (response.success) {
        // Сохраняем результат и сразу редиректим на список машин
        navigate(`/machines?synced=${response.recordId}`, { replace: true });
        return;
      } else {
        const messages = response.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join("; ");
        setSubmitError(messages || "Ошибка синхронизации");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSubmitError(
        err instanceof Error ? err.message : "Ошибка отправки данных",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // Вычисление сумм
  // ==========================================

  const toysCost = toys.reduce((sum, t) => sum + t.quantity * t.price, 0);

  const previewNewGames =
    preview.status === "ready" ? preview.data.newGames : null;
  const previewRevenue =
    preview.status === "ready" ? preview.data.revenue : null;
  const previewRoi = preview.status === "ready" ? preview.data.roi : null;
  const previewPeriodDays =
    preview.status === "ready" ? preview.data.periodDays : null;

  // ==========================================
  // Экран успеха
  // ==========================================

  // После успешного сохранения сразу переходим к списку машин
  if (submitResult) {
    useEffect(() => {
      navigate("/machines");
    }, []);
    return null;
  }

  // ==========================================
  // Основная форма
  // ==========================================

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Шапка */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Обслуживание №{number}
          </h1>
          {machineAddress && (
            <p className="text-muted-foreground">{machineAddress}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScannerOpen(true)}
          title="Сканировать QR-код"
        >
          <QrCode className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (canInstall) {
              promptInstall();
            } else if (isIos) {
              showIosInstructions();
            } else {
              alert(
                "Чтобы установить приложение на телефон:\n\n" +
                  "1. Откройте этот сайт в браузере на телефоне\n" +
                  "(Chrome для Android или Safari для iPhone)\n\n" +
                  "2. Нажмите кнопку «Установить»\n\n" +
                  "3. Приложение появится на главном экране"
              );
            }
          }}
          title="Установить как приложение"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Дата и время */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Дата и время</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="serviceDate">Дата</Label>
            <Input
              id="serviceDate"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceTime">Время</Label>
            <Input
              id="serviceTime"
              type="time"
              value={serviceTime}
              onChange={(e) => setServiceTime(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Счётчики */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Счётчики автомата</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gameCounter">Счётчик игр</Label>
            <Input
              id="gameCounter"
              type="number"
              placeholder="0"
              value={gameCounter}
              onChange={(e) => setGameCounter(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prizeCounter">Счётчик призов</Label>
            <Input
              id="prizeCounter"
              type="number"
              placeholder="0"
              value={prizeCounter}
              onChange={(e) => setPrizeCounter(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="testGames">Тестовых игр</Label>
            <Input
              id="testGames"
              type="number"
              placeholder="0"
              value={testGames}
              onChange={(e) => setTestGames(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Состояние */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Состояние автомата</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="operational">Работает</Label>
            <input
              id="operational"
              type="checkbox"
              checked={isOperational}
              onChange={(e) => setIsOperational(e.target.checked)}
              className="h-5 w-5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Игрушки */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Выдача игрушек</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toys.length > 0 && (
            <div className="space-y-2">
              {toys.map((toy) => (
                <div
                  key={toy.toyId}
                  className="flex items-center gap-2 border rounded-md p-2"
                >
                  <span className="flex-1 text-sm">
                    {toy.name} ({toy.price.toFixed(2)}₽)
                  </span>
                  <Input
                    type="number"
                    className="w-16 h-8"
                    value={toy.quantity}
                    min={0}
                    onChange={(e) =>
                      updateToyQty(toy.toyId, Number(e.target.value) || 0)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeToy(toy.toyId)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {toyCatalog.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {toyCatalog
                .filter((t) => !toys.find((tt) => tt.toyId === t.id))
                .map((toy) => (
                  <Button
                    key={toy.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addToy(toy)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {toy.name}
                  </Button>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Нет доступных игрушек. Проверьте подключение к интернету или
              добавьте игрушки в справочнике.
            </p>
          )}

          {toys.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Итого игрушек: {toysCost.toFixed(2)}₽
            </p>
          )}
        </CardContent>
      </Card>

      {/* Фото */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Фотоотчёт</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Фото ДО */}
          <div className="space-y-2">
            <Label>До</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="photoBefore"
                className="hidden"
                onChange={(e) =>
                  handlePhoto(
                    e.target.files?.[0] ?? null,
                    setPhotoBefore,
                    setPhotoBeforePreview,
                  )
                }
              />
              <label htmlFor="photoBefore" className="cursor-pointer">
                {photoBeforePreview ? (
                  <img
                    src={photoBeforePreview}
                    alt="Фото ДО"
                    className="max-h-32 mx-auto rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Добавить фото</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Фото ПОСЛЕ */}
          <div className="space-y-2">
            <Label>После</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="photoAfter"
                className="hidden"
                onChange={(e) =>
                  handlePhoto(
                    e.target.files?.[0] ?? null,
                    setPhotoAfter,
                    setPhotoAfterPreview,
                  )
                }
              />
              <label htmlFor="photoAfter" className="cursor-pointer">
                {photoAfterPreview ? (
                  <img
                    src={photoAfterPreview}
                    alt="Фото ПОСЛЕ"
                    className="max-h-32 mx-auto rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Добавить фото</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Фото счётчика */}
          <div className="space-y-2">
            <Label>Счётчик</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="photoCounter"
                className="hidden"
                onChange={(e) =>
                  handlePhoto(
                    e.target.files?.[0] ?? null,
                    setPhotoCounter,
                    setPhotoCounterPreview,
                  )
                }
              />
              <label htmlFor="photoCounter" className="cursor-pointer">
                {photoCounterPreview ? (
                  <img
                    src={photoCounterPreview}
                    alt="Фото счётчика"
                    className="max-h-32 mx-auto rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Добавить фото</span>
                  </div>
                )}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Комментарий */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Комментарий</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Заметки о состоянии автомата..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Предварительный расчёт */}
      {preview.status === "loading" && (
        <Card>
          <CardContent className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Расчёт показателей...
            </span>
          </CardContent>
        </Card>
      )}

      {preview.status === "ready" && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Предварительный расчёт</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {previewNewGames !== null && (
              <>
                <span className="text-muted-foreground">Новых игр:</span>
                <span className="font-mono">{previewNewGames}</span>
              </>
            )}
            {previewPeriodDays !== null && (
              <>
                <span className="text-muted-foreground">Период:</span>
                <span className="font-mono">{previewPeriodDays} дн.</span>
              </>
            )}
            {previewRevenue !== null && (
              <>
                <span className="text-muted-foreground">Выручка:</span>
                <span className="font-mono">
                  {previewRevenue.toFixed(2)} ₽
                </span>
              </>
            )}
            {previewRoi !== null && (
              <>
                <span className="text-muted-foreground">ROI:</span>
                <span className="font-mono">
                  {previewRoi.toFixed(2)}%
                </span>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {preview.status === "error" && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">{preview.message}</span>
          </CardContent>
        </Card>
      )}

      {/* Ошибка отправки */}
      {submitError && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">{submitError}</span>
          </CardContent>
        </Card>
      )}

      {/* Кнопки */}
      <div className="flex gap-4">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !gameCounter}
          className="flex-1"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Отправить
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={submitting}
        >
          <Save className="mr-2 h-4 w-4" />
          Черновик
        </Button>
      </div>

      {/* QR-сканер */}
      {scannerOpen && (
        <QrScanner
          onScan={(number) => {
            setScannerOpen(false);
            navigate(`/machines/${number}`, { replace: true });
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
