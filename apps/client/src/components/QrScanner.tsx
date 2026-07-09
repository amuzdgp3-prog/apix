import { useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScan: (machineNumber: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const containerId = "qr-scanner-viewport";

  const startScanner = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      scannedRef.current = false;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Игнорируем повторные срабатывания
          if (scannedRef.current) return;
          scannedRef.current = true;

          // Останавливаем сканер и возвращаем результат
          scanner
            .stop()
            .then(() => {
              scannerRef.current = null;
            })
            .catch(() => {});

          // Парсим номер машины из URL или чистого текста
          let machineNumber = decodedText.trim();
          // Если это URL вида .../machines/123, извлекаем номер
          const urlMatch = machineNumber.match(/\/machines\/(\d+)/);
          if (urlMatch) {
            machineNumber = urlMatch[1];
          }
          // Если это просто число — используем как есть
          if (/^\d+$/.test(machineNumber)) {
            onScan(machineNumber);
          }
        },
        () => {
          // Ошибки сканирования игнорируем (сканирование в процессе)
        },
      );
    } catch (err) {
      // Ошибки инициализации (например, нет камеры)
      console.error("QR scanner init error:", err);
    }
  }, [onScan, containerId]);

  useEffect(() => {
    // Небольшая задержка, чтобы DOM-элемент отрендерился
    const timer = setTimeout(startScanner, 300);
    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [startScanner]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <span className="font-semibold">Сканирование QR-кода</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Область сканирования */}
        <div className="p-4">
          <div
            id={containerId}
            className="w-full aspect-square bg-muted rounded-md overflow-hidden"
          />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Наведите камеру на QR-код аппарата
          </p>
        </div>
      </div>
    </div>
  );
}