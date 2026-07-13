import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";

// PWA update handler (vite-plugin-pwa virtual module)
// Используем autoUpdate — SW обновляется автоматически, без prompt
import { registerSW } from "virtual:pwa-register";

registerSW({
  onOfflineReady() {
    console.log("[PWA] Приложение готово к оффлайн-работе.");
  },
  onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration | undefined) {
    console.log("[PWA] Service Worker зарегистрирован:", swUrl, r);
    if (r) {
      // Проверяем обновления каждый час
      setInterval(() => {
        r.update().catch(console.warn);
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error: Error) {
    console.error("[PWA] Ошибка регистрации Service Worker:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
