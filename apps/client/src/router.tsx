import { createHashRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

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
const Monitoring = lazy(() => import("./pages/admin/Monitoring"));

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

export const router = createHashRouter([
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
      // Technician routes (protected)
      // =============================
      {
        path: "/machines",
        element: (
          <ProtectedRoute roles={["technician"]}>
            <Lazy>
              <MachineList />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/machines/:number/service",
        element: (
          <ProtectedRoute roles={["technician"]}>
            <Lazy>
              <ServiceForm />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/service/:number",
        element: (
          <ProtectedRoute roles={["technician"]}>
            <Lazy>
              <ServiceForm />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/drafts",
        element: (
          <ProtectedRoute roles={["technician"]}>
            <Lazy>
              <Drafts />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/forgotten",
        element: (
          <ProtectedRoute roles={["technician"]}>
            <Lazy>
              <ForgottenMachines />
            </Lazy>
          </ProtectedRoute>
        ),
      },

      // =============================
      // Admin routes (protected)
      // =============================
      {
        path: "/admin",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Dashboard />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/machines/:number",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <MachineCard />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/services",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <ServiceLog />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/reports",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Reports />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/analytics",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Analytics />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/audit",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Audit />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/monitoring",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Monitoring />
            </Lazy>
          </ProtectedRoute>
        ),
      },

      // =============================
      // Directories (admin, protected)
      // =============================
      {
        path: "/admin/machine-types",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <MachineTypes />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/toys",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Toys />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/staff",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Staff />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/locations",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Locations />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/routes",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Lazy>
              <Routes />
            </Lazy>
          </ProtectedRoute>
        ),
      },

      // =============================
      // Default redirect (redirect based on role — handled by Login page)
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