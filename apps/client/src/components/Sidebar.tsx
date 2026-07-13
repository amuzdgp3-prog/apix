import { NavLink } from "react-router-dom";
import {
  Smartphone,
  FileText,
  Archive,
  LayoutDashboard,
  Wrench,
  BarChart3,
  PieChart,
  ScrollText,
  Activity,
  Cpu,
  ToyBrick,
  Users,
  MapPin,
  Route,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { isAdmin } = useAuth();
  return (
    <>
      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 bg-slate-100 border-r flex flex-col
          transform transition-transform duration-200
          md:relative md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Close button for mobile */}
        <div className="flex items-center justify-between p-3 md:hidden border-b">
          <span className="font-semibold text-sm text-slate-700">Меню</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-auto">
          <Section title="Техник">
            <NavItem to="/machines" icon={Smartphone}>Автоматы</NavItem>
            <NavItem to="/drafts" icon={FileText}>Черновики</NavItem>
            <NavItem to="/forgotten" icon={Archive}>Забытые</NavItem>
          </Section>

          {isAdmin && (
            <>
              <Section title="Администратор">
                <NavItem to="/admin" icon={LayoutDashboard}>Панель</NavItem>
                <NavItem to="/admin/services" icon={Wrench}>Обслуживания</NavItem>
                <NavItem to="/admin/reports" icon={BarChart3}>Отчёты</NavItem>
                <NavItem to="/admin/analytics" icon={PieChart}>Аналитика</NavItem>
                <NavItem to="/admin/audit" icon={ScrollText}>Аудит</NavItem>
                <NavItem to="/admin/monitoring" icon={Activity}>Мониторинг</NavItem>
              </Section>

              <Section title="Справочники">
                <NavItem to="/admin/machine-types" icon={Cpu}>Типы автоматов</NavItem>
                <NavItem to="/admin/toys" icon={ToyBrick}>Игрушки</NavItem>
                <NavItem to="/admin/staff" icon={Users}>Сотрудники</NavItem>
                <NavItem to="/admin/locations" icon={MapPin}>Точки</NavItem>
                <NavItem to="/admin/routes" icon={Route}>Маршруты</NavItem>
              </Section>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-semibold uppercase text-slate-500 px-1">
        {title}
      </div>
      {children}
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-200 ${
          isActive ? "bg-slate-300 font-medium" : ""
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </NavLink>
  );
}