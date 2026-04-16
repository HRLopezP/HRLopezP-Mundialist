import React from "react";
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { toast } from "sonner"; 

const AdminRoute = ({ children }) => {
    const { store } = useGlobalReducer();

    if (!store.token) {
        return <Navigate to="/login" />;
    }

    const hasAccess = ["Administrador", "Gerente"].includes(store.user?.rol);

    if (!hasAccess) {
        toast.error("Acceso denegado: Se requieren permisos de administrador");
        return <Navigate to="/" />;
    }

    return children;
};

export default AdminRoute;