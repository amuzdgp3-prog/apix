import { useState, useEffect } from "react";
import { Download, X, Share2, Smartphone } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const DISMISSED_KEY = "pwa_install_banner_dismissed_at";
const DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

/** Проверяет, не истёк ли срок скрытия баннера */
function wasDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISSED_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Баннер установки PWA на телефон (только для техников).
 * Показывается внизу экрана с анимацией появления.
 *
 * - Android/Chrome: нативная кнопка «Установить» через beforeinstallprompt
 * - iOS/Safari: инструкция с кнопкой «Поделиться» → «На экран Домой»
 * - Десктоп: не показывается
 * - При закрытии скрывается на 7 дней (localStorage)
 */
export function InstallBanner() {
  const { canInstall, isInstalled, isIos, promptInstall, showIosInstructions } =
    useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => wasDismissed());

  // Если PWA установили в другой вкладке — скрываем
  useEffect(() => {
    if (isInstalled) setDismissed(true);
  }, [isInstalled]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch { /* localStorage недоступен — скрываем на сессию */ }
    setDismissed(true);
  };

  // Уже установлено или закрыто — не показываем
  if (isInstalled || dismissed) return null;

  // Если нет ни возможности установки, ни iOS — не показываем
  if (!canInstall && !isIos) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pointer-events-none">
      <div className="mx-auto max-w-lg pointer-events-auto animate-slide-up">
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 shadow-2xl ring-1 ring-white/10">
          {/* Иконка */}
          <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-400/30">
            {isIos ? (
              <Share2 className="h-6 w-6 text-blue-400" />
            ) : (
              <Download className="h-6 w-6 text-blue-400" />
            )}
          </div>

          {/* Текст */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              {isIos
                ? "Установите на iPhone"
                : "Установите приложение"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight">
              {isIos
                ? "Нажмите «Поделиться» → «На экран Домой»"
                : "Быстрый доступ с главного экрана"}
            </p>
          </div>

          {/* Кнопка установки */}
          <button
            type="button"
            onClick={() => {
              if (isIos) {
                showIosInstructions();
              } else {
                promptInstall();
              }
            }}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all duration-150"
          >
            <Smartphone className="h-4 w-4" />
            <span>Установить</span>
          </button>

          {/* Кнопка закрытия */}
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}