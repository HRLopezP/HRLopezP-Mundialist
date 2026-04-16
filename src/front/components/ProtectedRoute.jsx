import React from "react";
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const ProtectedRoute = ({ children }) => {
    const { store } = useGlobalReducer();

    // Si no hay token, lo mandamos al login
    if (!store.token) {
        return <Navigate to="/login" replace />;
    }

    // Si hay token, lo dejamos pasar al componente que quería ver
    return children;
};

export default ProtectedRoute;