import React from "react";
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { toast } from "sonner"; 
import { getRolFromToken } from "../utils/auth"; 

const AdminRoute = ({ children }) => {
    const { store } = useGlobalReducer();

    if (!store.token || !store.user) {
        return <Navigate to="/login" />;
    }

    const isAdmin = getRolFromToken() === "Administrador"; 

    if (!isAdmin) {
        toast.error("Acceso denegado: Se requieren permisos de administrador");
        return <Navigate to="/" />;
    }

    return children;
};

export default AdminRoute;