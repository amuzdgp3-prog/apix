import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Camera,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
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
import { uploadMultipart } from "@/api/client";
import QrScanner from "@/components/QrScanner";
import type { SyncResponse, PreviewResponse } from "@apix/shared";

// ==========================================
// ╨Т╤Б╨┐╨╛╨╝╨╛╨│╨░╤В╨╡╨╗╤М╨╜╤Л╨╡ ╤В╨╕╨┐╤Л
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
// ╨Ъ╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В
// ==========================================

export default function ServiceForm() {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const machineNumber = Number(machineId ?? 0);

  // ╨Я╨╛╨╗╤П ╤Д╨╛╤А╨╝╤Л
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

  // ╨д╨╛╤В╨╛ (File-╨╛╨▒╤К╨╡╨║╤В╤Л)
  const [photoBefore, setPhotoBefore] = useState<File | null>(null);
  const [photoAfter, setPhotoAfter] = useState<File | null>(null);
  const [photoCounter, setPhotoCounter] = useState<File | null>(null);

  // ╨Я╤А╨╡╨┤╨┐╤А╨╛╤Б╨╝╨╛╤В╤А ╤Д╨╛╤В╨╛
  const [photoBeforePreview, setPhotoBeforePreview] = useState<string | null>(null);
  const [photoAfterPreview, setPhotoAfterPreview] = useState<string | null>(null);
  const [photoCounterPreview, setPhotoCounterPreview] = useState<string | null>(null);

  // ╨Я╤А╨╡╨┤╨▓╨░╤А╨╕╤В╨╡╨╗╤М╨╜╤Л╨╣ ╤А╨░╤Б╤З╤С╤В
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // ╨б╨╛╤Б╤В╨╛╤П╨╜╨╕╨╡ ╨╛╤В╨┐╤А╨░╨▓╨║╨╕
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    recordId: number;
    newGames: number;
    revenue: number;
    roi: number | null;
    periodDays: number;
  } | null>(null);

  // ╨б╨┐╤А╨░╨▓╨╛╤З╨╜╨╕╨║ ╨╕╨│╤А╤Г╤И╨╡╨║ (computed ╤Б ╤Б╨╡╤А╨▓╨╡╤А╨░: ╨▒╨░╨╖╨╛╨▓╤Л╨╣ ╨╜╨░╨▒╨╛╤А + ╨╕╨╜╨┤╨╕╨▓╨╕╨┤╤Г╨░╨╗╤М╨╜╤Л╨╡ ╨┐╤А╨░╨▓╨║╨╕)
  // ==========================================

  const [toyCatalog, setToyCatalog] = useState<
    Array<{ id: number; name: string; price: number }>
  >([]);

  useEffect(() => {
    if (!machineNumber) return;
    fetch(`/api/machines/${machineNumber}/toys`)
      .then((res) => res.json())
      .then((rows: Array<{ id: number; name: string; price: number }>) =>
        setToyCatalog(rows),
      )
      .catch(() => {});
  }, [machineNumber]);

  // ==========================================
  // ╨Р╨┤╤А╨╡╤Б ╨╝╨░╤И╨╕╨╜╤Л ╨┤╨╗╤П ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║╨░
  // ==========================================

  const [machineAddress, setMachineAddress] = useState("");

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
  // ╨Я╤А╨╡╨┤╨▓╨░╤А╨╕╤В╨╡╨╗╤М╨╜╤Л╨╣ ╤А╨░╤Б╤З╤С╤В (debounced)
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

    fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machineNumber,
        serviceDate,
        gameCounter: gCount,
        testGames: Number(testGames) || 0,
        toys: toysForPreview,
      }),
      signal: abortController.current.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { message?: string }).message ?? "Preview failed",
          );
        }
        return res.json() as Promise<PreviewResponse>;
      })
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
  // ╨г╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╨╡ ╨╕╨│╤А╤Г╤И╨║╨░╨╝╨╕
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
  // ╨Ч╨░╨│╤А╤Г╨╖╨║╨░ ╤Д╨╛╤В╨╛
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
  // ╨б╨╛╤Е╤А╨░╨╜╨╡╨╜╨╕╨╡ ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║╨░
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
        prizeCounter: prizeCounter ? Number(prizeCounter) : undefined,
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
          ? `╨Ю╤И╨╕╨▒╨║╨░ ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╨╕╤П ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║╨░: ${err.message}`
          : "╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╤Б╨╛╤Е╤А╨░╨╜╨╕╤В╤М ╤З╨╡╤А╨╜╨╛╨▓╨╕╨║",
      );
    }
  };

  // ==========================================
  // ╨Ю╤В╨┐╤А╨░╨▓╨║╨░ ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А
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

      if (prizeCounter) fields.prizeCounter = String(prizeCounter);
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
        setSubmitResult({
          recordId: response.recordId,
          newGames: response.calculations.newGames,
          revenue: response.calculations.revenue,
          roi: response.calculations.roi,
          periodDays: response.calculations.periodDays,
        });
      } else {
        const messages = response.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join("; ");
        setSubmitError(messages || "╨Ю╤И╨╕╨▒╨║╨░ ╤Б╨╕╨╜╤Е╤А╨╛╨╜╨╕╨╖╨░╤Ж╨╕╨╕");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSubmitError(
        err instanceof Error ? err.message : "╨Ю╤И╨╕╨▒╨║╨░ ╨╛╤В╨┐╤А╨░╨▓╨║╨╕ ╨┤╨░╨╜╨╜╤Л╤Е",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // ╨Т╤Л╤З╨╕╤Б╨╗╨╡╨╜╨╕╨╡ ╤Б╤Г╨╝╨╝
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
  // ╨н╨║╤А╨░╨╜ ╤Г╤Б╨┐╨╡╤Е╨░
  // ==========================================

  if (submitResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              ╨Ю╨▒╤Б╨╗╤Г╨╢╨╕╨▓╨░╨╜╨╕╨╡ ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╨╛
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-muted-foreground">╨Э╨╛╨╝╨╡╤А ╨╖╨░╨┐╨╕╤Б╨╕:</span>{" "}
              <span className="font-mono">{submitResult.recordId}</span>
            </p>
            <p>
              <span className="text-muted-foreground">╨Э╨╛╨▓╤Л╤Е ╨╕╨│╤А:</span>{" "}
              {submitResult.newGames}
            </p>
            <p>
              <span className="text-muted-foreground">╨Т╤Л╤А╤Г╤З╨║╨░:</span>{" "}
              {submitResult.revenue.toFixed(2)} тВ╜
            </p>
            {submitResult.roi !== null && (
              <p>
                <span className="text-muted-foreground">ROI:</span>{" "}
                {submitResult.roi.toFixed(2)}%
              </p>
            )}
            <p>
              <span className="text-muted-foreground">╨Я╨╡╤А╨╕╨╛╨┤:</span>{" "}
              {submitResult.periodDays} ╨┤╨╜.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate("/machines")}>
            ╨Ъ ╤Б╨┐╨╕╤Б╨║╤Г ╨╝╨░╤И╨╕╨╜
          </Button>
          <Button
            onClick={() => {
              setSubmitResult(null);
              setGameCounter("");
              setPrizeCounter("");
              setPhotoBefore(null);
              setPhotoAfter(null);
              setPhotoCounter(null);
              setPhotoBeforePreview(null);
              setPhotoAfterPreview(null);
              setPhotoCounterPreview(null);
              setToys([]);
              setComment("");
              setPreview({ status: "idle" });
            }}
          >
            ╨Э╨╛╨▓╨╛╨╡ ╨╛╨▒╤Б╨╗╤Г╨╢╨╕╨▓╨░╨╜╨╕╨╡
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // ╨Ю╤Б╨╜╨╛╨▓╨╜╨░╤П ╤Д╨╛╤А╨╝╨░
  // ==========================================

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ╨и╨░╨┐╨║╨░ */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Обслуживание №{machineId}
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
      </div>

      {/* ╨Ф╨░╤В╨░ ╨╕ ╨▓╤А╨╡╨╝╤П */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">╨Ф╨░╤В╨░ ╨╕ ╨▓╤А╨╡╨╝╤П</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="serviceDate">╨Ф╨░╤В╨░</Label>
            <Input
              id="serviceDate"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceTime">╨Т╤А╨╡╨╝╤П</Label>
            <Input
              id="serviceTime"
              type="time"
              value={serviceTime}
              onChange={(e) => setServiceTime(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ╨б╤З╤С╤В╤З╨╕╨║╨╕ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">╨б╤З╤С╤В╤З╨╕╨║╨╕ ╨░╨▓╤В╨╛╨╝╨░╤В╨░</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gameCounter">╨б╤З╤С╤В╤З╨╕╨║ ╨╕╨│╤А</Label>
            <Input
              id="gameCounter"
              type="number"
              placeholder="0"
              value={gameCounter}
              onChange={(e) => setGameCounter(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prizeCounter">╨б╤З╤С╤В╤З╨╕╨║ ╨┐╤А╨╕╨╖╨╛╨▓</Label>
            <Input
              id="prizeCounter"
              type="number"
              placeholder="0"
              value={prizeCounter}
              onChange={(e) => setPrizeCounter(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="testGames">╨в╨╡╤Б╤В╨╛╨▓╤Л╤Е ╨╕╨│╤А</Label>
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

      {/* ╨б╨╛╤Б╤В╨╛╤П╨╜╨╕╨╡ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">╨б╨╛╤Б╤В╨╛╤П╨╜╨╕╨╡ ╨░╨▓╤В╨╛╨╝╨░╤В╨░</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="operational">╨а╨░╨▒╨╛╤В╨░╨╡╤В</Label>
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

      {/* ╨Ш╨│╤А╤Г╤И╨║╨╕ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">╨Т╤Л╨┤╨░╤З╨░ ╨╕╨│╤А╤Г╤И╨╡╨║</CardTitle>
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
                    {toy.name} ({toy.price.toFixed(2)}тВ╜)
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

          {toyCatalog.length > 0 && (
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
          )}

          {toys.length > 0 && (
            <p className="text-sm text-muted-foreground">
              ╨Ш╤В╨╛╨│╨╛ ╨╕╨│╤А╤Г╤И╨╡╨║: {toysCost.toFixed(2)}тВ╜
            </p>
          )}
        </CardContent>
      </Card>

      {/* ╨д╨╛╤В╨╛ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">╨д╨╛╤В╨╛╨╛╤В╤З╤С╤В</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* ╨д╨╛╤В╨╛ ╨Ф╨Ю */}
          <div className="space-y-2">
            <Label>╨Ф╨╛</Label>
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
                    alt="╨д╨╛╤В╨╛ ╨Ф╨Ю"
                    className="max-h-32 mx-auto rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М ╤Д╨╛╤В╨╛</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* ╨д╨╛╤В╨╛ ╨Я╨Ю╨б╨Ы╨Х */}
          <div className="space-y-2">
            <Label>╨Я╨╛╤Б╨╗╨╡</Label>
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
                    alt="╨д╨╛╤В╨╛ ╨Я╨Ю╨б╨Ы╨Х"
                    className="max-h-32 mx-auto rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М ╤Д╨╛╤В╨╛</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* ╨д╨╛╤В╨╛ ╤Б╤З╤С╤В╤З╨╕╨║╨░ */}
          <div className="space-y-2">
            <Label>╨б╤З╤С╤В╤З╨╕╨║</Label>
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
                    alt="╨д╨╛╤В╨╛ ╤Б╤З╤С╤В╤З╨╕╨║╨░"
                    className="max-h-32 mx-auto rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М ╤Д╨╛╤В╨╛</span>
                  </div>
                )}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ╨Ъ╨╛╨╝╨╝╨╡╨╜╤В╨░╤А╨╕╨╣ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">╨Ъ╨╛╨╝╨╝╨╡╨╜╤В╨░╤А╨╕╨╣</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="╨Ч╨░╨╝╨╡╤В╨║╨╕ ╨╛ ╤Б╨╛╤Б╤В╨╛╤П╨╜╨╕╨╕ ╨░╨▓╤В╨╛╨╝╨░╤В╨░..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* ╨Я╤А╨╡╨┤╨▓╨░╤А╨╕╤В╨╡╨╗╤М╨╜╤Л╨╣ ╤А╨░╤Б╤З╤С╤В */}
      {preview.status === "loading" && (
        <Card>
          <CardContent className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              ╨а╨░╤Б╤З╤С╤В ╨┐╨╛╨║╨░╨╖╨░╤В╨╡╨╗╨╡╨╣...
            </span>
          </CardContent>
        </Card>
      )}

      {preview.status === "ready" && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">╨Я╤А╨╡╨┤╨▓╨░╤А╨╕╤В╨╡╨╗╤М╨╜╤Л╨╣ ╤А╨░╤Б╤З╤С╤В</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {previewNewGames !== null && (
              <>
                <span className="text-muted-foreground">╨Э╨╛╨▓╤Л╤Е ╨╕╨│╤А:</span>
                <span className="font-mono">{previewNewGames}</span>
              </>
            )}
            {previewPeriodDays !== null && (
              <>
                <span className="text-muted-foreground">╨Я╨╡╤А╨╕╨╛╨┤:</span>
                <span className="font-mono">{previewPeriodDays} ╨┤╨╜.</span>
              </>
            )}
            {previewRevenue !== null && (
              <>
                <span className="text-muted-foreground">╨Т╤Л╤А╤Г╤З╨║╨░:</span>
                <span className="font-mono">
                  {previewRevenue.toFixed(2)} тВ╜
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

      {/* ╨Ю╤И╨╕╨▒╨║╨░ ╨╛╤В╨┐╤А╨░╨▓╨║╨╕ */}
      {submitError && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">{submitError}</span>
          </CardContent>
        </Card>
      )}

      {/* ╨Ъ╨╜╨╛╨┐╨║╨╕ */}
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
              ╨Ю╤В╨┐╤А╨░╨▓╨║╨░...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              ╨Ю╤В╨┐╤А╨░╨▓╨╕╤В╤М
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
          ╨з╨╡╤А╨╜╨╛╨▓╨╕╨║
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
