import React from "react";
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const AdminRoute = ({ children }) => {
    const { store } = useGlobalReducer();

    // 1. ¿Hay token? Si no, al login
    if (!store.token) {
        return <Navigate to="/login" />;
    }

    // 2. ¿Es administrador? 
    // Revisamos la propiedad que configuramos en el login (user.rol)
    const isAdmin = store.user?.rol === "Administrador";

    if (!isAdmin) {
        // Si no es admin, lo mandamos al home o a una página de "No autorizado"
        return <Navigate to="/" />;
    }

    // Si pasa ambas, puede ver el contenido
    return children;
};

export default AdminRoute;