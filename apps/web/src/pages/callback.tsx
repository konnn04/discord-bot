import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      handleCallback(token).then(() => {
        const stored = sessionStorage.getItem("foxybot_return_to");
        sessionStorage.removeItem("foxybot_return_to");
        const returnTo =
          stored && stored.startsWith("/") && !stored.startsWith("//")
            ? stored
            : "/admin";
        navigate(returnTo, { replace: true });
      });
    } else {
      navigate("/login", { replace: true });
    }
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground">Đang xác thực...</p>
      </div>
    </div>
  );
}
