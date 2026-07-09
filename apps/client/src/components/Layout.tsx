import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useForgottenMachines } from "../hooks/useForgottenMachines";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Баннер забытых аппаратов (только для техников)
  const { machines: forgottenMachines } = useForgottenMachines(30);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isTechnician = location.pathname.startsWith("/machines") ||
    location.pathname.startsWith("/drafts") ||
    location.pathname.startsWith("/forgotten");

  return (
    <div className="flex min-h-screen flex-col">
      <Header onMenuClick={() => setMobileOpen((prev) => !prev)} />
      {/* Баннер забытых аппаратов */}
      {isTechnician && forgottenMachines.length > 0 && (
        <div
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => navigate("/forgotten")}
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">
            {forgottenMachines.length === 1
              ? "1 аппарат давно не обслуживался"
              : `${forgottenMachines.length} аппаратов давно не обслуживались`}
          </span>
          <span className="text-xs text-amber-600 ml-auto">Перейти →</span>
        </div>
      )}
      <div className="flex flex-1 relative">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <main className="flex-1 p-4 overflow-auto md:ml-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
