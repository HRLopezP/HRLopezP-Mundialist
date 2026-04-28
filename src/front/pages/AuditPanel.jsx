import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api.js";
import Pagination from "../components/Pagination.jsx";
import { Toaster, toast } from "sonner";
import "../styles/admin.css";

export const AuditPanel = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState("desc");
    const [searchId, setSearchId] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [paginationData, setPaginationData] = useState({
        total: 0,
        pages: 0,
        per_page: 10
    });

    const fetchLogs = async (page = 1, order = sortOrder, mId = searchId) => {
        setLoading(true);
        try {
            const url = `/audit-logs?order=${order}&page=${page}&per_page=10${mId ? `&match_id=${mId}` : ''}`;
            const { response, data } = await apiFetch(url);;

            if (response.ok) {
                setLogs(data.logs);
                setPaginationData({
                    total: data.total,
                    pages: data.pages,
                    per_page: data.per_page
                });
                setCurrentPage(data.current_page);
            }
        } catch (error) {
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        fetchLogs(newPage, sortOrder);
    };

    const toggleOrder = () => {
        const newOrder = sortOrder === "desc" ? "asc" : "desc";
        setSortOrder(newOrder);
        fetchLogs(1, newOrder);
    };

    useEffect(() => { fetchLogs(); }, []);

    const formatTeams = (details) => {
        // Si tus detalles son: "Partido ID 13: Cambió de 0-0 a 2-1" 
        // Podríamos mejorar el endpoint update_match_result para enviar los nombres
        // Pero si quieres ver quiénes jugaron, lo ideal es que el detalle ya lo incluya.
        return details.split(":")[0]; // Retorna "Partido ID 13" o el nombre si lo envías desde el backend
    };

    return (
        <div className="admin-container py-4">
            <Toaster richColors position="top-right" />
            <div className="admin-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="text-white mb-1">🛡️ Auditoría de Resultados</h2>
                        <p className="text-dim small mb-0">Seguimiento de modificaciones manuales</p>
                    </div>
                    <div className="d-flex gap-2">
                        <input
                            type="number"
                            className="form-control form-control-sm auth-input"
                            placeholder="Buscar por ID Partido..."
                            style={{ width: "180px" }}
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            onKeyUp={(e) => e.key === 'Enter' && fetchLogs(1)}
                        />
                        <button className="btn btn-emerald btn-sm" onClick={() => fetchLogs(1)}>
                            <i className="fas fa-search"></i>
                        </button>
                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={toggleOrder}
                            title={sortOrder === "desc" ? "Ver más antiguos primero" : "Ver más recientes primero"}
                        >
                            <i className={`fas ${sortOrder === "desc" ? "fa-sort-amount-up" : "fa-sort-amount-down"} me-2`}></i>
                            {sortOrder === "desc" ? "Más recientes" : "Más antiguos"}
                        </button>
                        <button className="btn btn-emerald btn-sm" onClick={() => fetchLogs()}>
                            <i className="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: "600px", overflowY: "auto" }}>
                    <table className="table table-dark table-hover table-oxford border-0 align-middle">
                        <thead className="sticky-top" style={{ zIndex: 1, backgroundColor: "#051426" }}>
                            <tr>
                                <th className="py-3">Fecha y Hora</th>
                                <th className="py-3">Usuario (Admin)</th>
                                <th className="py-3">Acción</th>
                                <th className="py-3">Referencia</th>
                                <th className="py-3">Detalle del Cambio</th>
                                <th className="py-3 text-end">Origen (IP)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-5 text-dim">Cargando bitácora...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-5 text-dim">No hay registros de auditoría aún.</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id_audit} className="border-bottom border-secondary-subtle">
                                        <td className="small">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="text-info fw-bold">{log.user_email}</td>
                                        <td>
                                            <span className="badge bg-dark-soft text-uppercase" style={{ fontSize: "0.7rem" }}>
                                                {log.action.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="fw-bold text-emerald">{formatTeams(log.details)}</td>
                                        <td className="small italic text-white-50">{log.details}</td>
                                        <td className="text-end text-dim small font-monospace">{log.ip_address || "0.0.0.0"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && logs.length > 0 && (
                    <Pagination
                        total={paginationData.total}
                        pages={paginationData.pages}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        perPage={paginationData.per_page}
                        itemsCount={logs.length}
                    />
                )}
            </div>
        </div>
    );
};