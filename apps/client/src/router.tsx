import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";

// Technician pages (lazy)
const MachineList = lazy(() => import("./pages/technician/MachineList"));
const ServiceForm = lazy(() => import("./pages/technician/ServiceForm"));
const Drafts = lazy(() => import("./pages/technician/Drafts"));
const ForgottenMachines = lazy(
  () => import("./pages/technician/ForgottenMachines"),
);
const Login = lazy(() => import("./pages/Login"));



// Admin pages (lazy)
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const MachineCard = lazy(() => import("./pages/admin/MachineCard"));
const ServiceLog = lazy(() => import("./pages/admin/ServiceLog"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Audit = lazy(() => import("./pages/admin/Audit"));

// Directory pages (lazy)
const MachineTypes = lazy(
  () => import("./pages/admin/directories/MachineTypes"),
);
const Toys = lazy(() => import("./pages/admin/directories/Toys"));
const Staff = lazy(() => import("./pages/admin/directories/Staff"));
const Locations = lazy(() => import("./pages/admin/directories/Locations"));
const Routes = lazy(() => import("./pages/admin/directories/Routes"));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Загрузка...</div>
          </div>
        }
      >
        <Login />
      </Suspense>
    ),
  },
  
  {
    element: <Layout />,
    children: [
      // =============================
      // Technician routes
      // =============================
      {
        path: "/machines",
        element: (
          <Lazy>
            <MachineList />
          </Lazy>
        ),
      },
      {
        path: "/machines/:number/service",
        element: (
          <Lazy>
            <ServiceForm />
          </Lazy>
        ),
      },
      {
        path: "/drafts",
        element: (
          <Lazy>
            <Drafts />
          </Lazy>
        ),
      },
      {
        path: "/forgotten",
        element: (
          <Lazy>
            <ForgottenMachines />
          </Lazy>
        ),
      },

      // =============================
      // Admin routes
      // =============================
      {
        path: "/admin",
        element: (
          <Lazy>
            <Dashboard />
          </Lazy>
        ),
      },
      {
        path: "/admin/machines/:number",
        element: (
          <Lazy>
            <MachineCard />
          </Lazy>
        ),
      },
      {
        path: "/admin/services",
        element: (
          <Lazy>
            <ServiceLog />
          </Lazy>
        ),
      },
      {
        path: "/admin/reports",
        element: (
          <Lazy>
            <Reports />
          </Lazy>
        ),
      },
      {
        path: "/admin/analytics",
        element: (
          <Lazy>
            <Analytics />
          </Lazy>
        ),
      },
      {
        path: "/admin/audit",
        element: (
          <Lazy>
            <Audit />
          </Lazy>
        ),
      },

      // =============================
      // Directories (admin)
      // =============================
      {
        path: "/admin/machine-types",
        element: (
          <Lazy>
            <MachineTypes />
          </Lazy>
        ),
      },
      {
        path: "/admin/toys",
        element: (
          <Lazy>
            <Toys />
          </Lazy>
        ),
      },
      {
        path: "/admin/staff",
        element: (
          <Lazy>
            <Staff />
          </Lazy>
        ),
      },
      {
        path: "/admin/locations",
        element: (
          <Lazy>
            <Locations />
          </Lazy>
        ),
      },
      {
        path: "/admin/routes",
        element: (
          <Lazy>
            <Routes />
          </Lazy>
        ),
      },

      // =============================
      // Default redirect
      // =============================
      {
        path: "/",
        element: <Navigate to="/machines" replace />,
      },
      {
        path: "*",
        element: <Navigate to="/machines" replace />,
      },
    ],
  },
]);