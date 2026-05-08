import React, { useState } from 'react';
import { toast } from 'sonner';

const ExportBackupButton = () => {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const urlBase = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("access_token");

            const response = await fetch(`${urlBase}/admin/export-master-backup`, {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                const date = new Date().toISOString().split('T')[0];
                a.download = `RESPALDO_QUINIELA_${date}.xlsx`;

                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success("Excel generado correctamente");
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.msg || "Error al exportar los datos");
            }
        } catch (error) {
            console.error("Error en la exportación:", error);
            toast.error("Error de comunicación con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className="btn btn-emerald btn-sm d-flex align-items-center gap-2"
            title="Exportar todas las predicciones a Excel"
        >
            {loading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
                <i className="fas fa-file-excel"></i>
            )}
            <span>{loading ? "Procesando..." : "Respaldar Todo"}</span>
        </button>
    );
};

export default ExportBackupButton;