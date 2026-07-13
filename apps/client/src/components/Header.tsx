import { useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const PATH_MAP: Record<string, string> = {
  machines: "Автоматы",
  drafts: "Черновики",
  forgotten: "Забытые",
  admin: "Панель",
  "admin/services": "Обслуживания",
  "admin/reports": "Отчёты",
  "admin/analytics": "Аналитика",
  "admin/audit": "Аудит",
  "admin/monitoring": "Мониторинг",
  "admin/machine-types": "Типы автоматов",
  "admin/toys": "Игрушки",
  "admin/staff": "Сотрудники",
  "admin/locations": "Точки",
  "admin/routes": "Маршруты",
  "admin/machines": "Карточка автомата",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.replace(/^\/+/, "").split("/");
  const crumbs: { label: string; path: string }[] = [
    { label: "Главная", path: "/" },
  ];

  let accumulated = "";
  for (const seg of segments) {
    if (!seg) continue;
    accumulated += "/" + seg;
    const key = accumulated.replace(/^\/+/, "");
    crumbs.push({ label: PATH_MAP[key] ?? seg, path: accumulated });
  }

  return crumbs;
}

/** Декодируем payload JWT без верификации (имя уже проверено сервером) */
function parseJwtPayload(token: string): { sub?: string; email?: string; role?: string; name?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const raw = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = getBreadcrumbs(location.pathname);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const payload = parseJwtPayload(token);
      const name = payload?.name ?? payload?.email ?? "";
      setUserName(name);
    }
  }, []);

  const initials = userName ? getInitials(userName) : "?";

  const handleLogout = async () => {
    // Удаляем accessToken и пытаемся сбросить refresh-куку на сервере
    localStorage.removeItem("accessToken");
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // игнорируем ошибку — токен уже удалён локально
    }
    navigate("/login");
  };

  return (
    <header className="bg-slate-800 text-white">
      {/* Upper row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-slate-700 md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Apix Slot Manager</h1>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium"
            title={userName || "Пользователь"}
          >
            {initials}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-slate-700"
            title="Выйти"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Breadcrumbs row */}
      <div className="px-4 pb-2 flex items-center gap-1 text-xs text-slate-300">
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {i === 0 ? (
              <Home className="h-3 w-3" />
            ) : null}
            <span
              className={`cursor-pointer hover:text-white transition-colors ${
                i === crumbs.length - 1 ? "text-white font-medium" : ""
              }`}
              onClick={() => navigate(crumb.path)}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </div>
    </header>
  );
}
