import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'  
import { RouterProvider } from "react-router-dom";  
import { router } from "./routes";  
import { StoreProvider } from './hooks/useGlobalReducer';  
import { BackendURL } from './components/BackendURL';

const Main = () => {
    // Si falta la URL del backend, mostramos el aviso de configuración
    if(!import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL == "") {
        return <BackendURL />;
    }

    return (
        <StoreProvider> 
            <RouterProvider router={router} />
        </StoreProvider>
    );
}

// 1. Creamos la raíz UNA SOLA VEZ fuera del componente
const root = ReactDOM.createRoot(document.getElementById('root'));

// 2. Renderizamos el componente Main dentro de esa raíz protegida por StrictMode
root.render(
    <React.StrictMode>
        <Main />
    </React.StrictMode>
);