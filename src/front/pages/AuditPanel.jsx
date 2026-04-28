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
            const { response, data } = await apiFetch(url);

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

    useEffect(() => {
        fetchLogs(1, sortOrder, searchId);
    }, [sortOrder]); // Se dispara cuando cambias el select de orden

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            fetchLogs(1);
        }
    };

    const getReference = (details) => {
        if (details.includes(":")) return details.split(":")[0];
        return "Ref: " + details.substring(0, 15);
    };

    const getChangeDetail = (details) => {
        if (details.includes(":")) return details.split(":")[1];
        return details;
    };

    const handlePageChange = (page) => {
        fetchLogs(page);
    };

    return (
        <div className="admin-container animate__animated animate__fadeIn">
            <Toaster position="top-center" richColors />
            
            {/* ENCABEZADO CENTRADO Y RESPONSIVE */}
            <div className="text-center mb-4">
                <h2 className="text-white mb-1 h3 fw-bold">
                    <i className="fas fa-history me-2 text-emerald"></i>
                    Historial de Auditoría
                </h2>
                <p className="text-dim small mb-4">Control de modificaciones del sistema SIGSSEP</p>

                {/* FILTROS Y BUSCADOR */}
                <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 bg-dark-soft p-3 rounded-4 mx-auto" style={{ maxWidth: "800px" }}>
                    
                    {/* Buscador por ID */}
                    <div className="input-group input-group-sm" style={{ maxWidth: "250px" }}>
                        <span className="input-group-text bg-dark border-secondary text-dim">ID</span>
                        <input
                            type="number"
                            className="form-control bg-dark text-white border-secondary"
                            placeholder="Buscar partido..."
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button className="btn btn-emerald" onClick={() => fetchLogs(1)}>
                            <i className="fas fa-search"></i>
                        </button>
                    </div>

                    {/* Selector de Orden */}
                    <div className="d-flex align-items-center gap-2">
                        <label className="small text-dim d-none d-sm-block">Ordenar:</label>
                        <select 
                            className="form-select form-select-sm bg-dark text-white border-secondary"
                            style={{ width: "160px" }}
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="desc">Más recientes</option>
                            <option value="asc">Más antiguos</option>
                        </select>
                    </div>

                    {/* Botón Limpiar */}
                    <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => { setSearchId(""); setSortOrder("desc"); fetchLogs(1, "desc", ""); }}
                    >
                        <i className="fas fa-sync-alt me-1"></i> Limpiar
                    </button>
                </div>
            </div>

            <div className="admin-card p-4 shadow">
                <div className="table-responsive border-0">
                    <table className="table table-dark table-hover table-oxford border-0">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Admin</th>
                                <th>Acción</th>
                                <th>Referencia</th>
                                <th>Detalle</th>
                                <th className="text-end">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-5">Cargando...</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id_audit} className="align-middle">
                                        <td className="small">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="text-info fw-bold">{log.user_email}</td>
                                        <td>
                                            <span className="badge bg-dark-soft text-uppercase" style={{ fontSize: "0.7rem" }}>
                                                {log.action.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="fw-bold text-emerald">{getReference(log.details)}</td>
                                        <td className="small text-white-50">{getChangeDetail(log.details)}</td>
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