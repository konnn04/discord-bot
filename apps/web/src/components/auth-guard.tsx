import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember where the user was headed so we can send them back after login.
    const returnTo = window.location.pathname + window.location.search;
    if (returnTo && returnTo !== "/login") {
      sessionStorage.setItem("foxybot_return_to", returnTo);
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
