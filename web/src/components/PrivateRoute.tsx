import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoute() {
    const token = localStorage.getItem("token");
    // Simple check. Real app might verify token validity or expiration.
    return token ? <Outlet /> : <Navigate to="/" replace />;
}
