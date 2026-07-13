import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Допустимые роли. Если не указано — требуется только авторизация. */
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    if (!roles.includes(user.role)) {
      // Редирект в зависимости от роли
      if (user.role === "admin") {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/machines" replace />;
    }
  }

  return <>{children}</>;
}
