import { Navigate, Outlet } from "react-router-dom";

export default function PublicRoute() {
    const token = localStorage.getItem("token");
    // If authenticated, redirect to dashboard
    return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
