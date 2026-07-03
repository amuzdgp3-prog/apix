import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header onMenuClick={() => setMobileOpen((prev) => !prev)} />
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