import React, { useState, useEffect } from 'react';
import { apiFetch } from "../utils/api.js";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import Pagination from "../components/Pagination.jsx";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { generateRankingReport } from "../utils/transparencyPdf.js";
import { getRolFromToken } from "../utils/auth";

const Ranking = () => {
    const { store } = useGlobalReducer();
    const isAdmin = getRolFromToken() === "Administrador";
    const [ranking, setRanking] = useState([]);
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationData, setPaginationData] = useState({ total: 0, pages: 0 });
    const PER_PAGE = 12;

    const [auditData, setAuditData] = useState({ predictions: [], total: 0, pages: 1, current_page: 1 });
    const [selectedUser, setSelectedUser] = useState(null);
    const [exportingPdf, setExportingPdf] = useState(false);

    useEffect(() => {
        initData();
    }, []);

    useEffect(() => {
        if (activeGroup !== null) {
            setCurrentPage(1);
            loadRanking(1);
        }
    }, [activeGroup]);

    const initData = async () => {
        setLoading(true);
        if (isAdmin) {
            const { response, data } = await apiFetch("/groups");
            if (response.ok) {
                setGroups(data);
                setActiveGroup(store.user.group_id || (data.length > 0 ? data[0].id_group : null));
            }
        } else {
            setActiveGroup(store.user?.group_id);
        }
    };

    const loadRanking = async (page = 1) => {
        const base = (isAdmin && activeGroup)
            ? `/ranking?group_id=${activeGroup}`
            : "/ranking";
        const url = `${base}&page=${page}&per_page=${PER_PAGE}`;
        const finalUrl = url.includes("?") ? url : url.replace("&", "?");

        const { response, data } = await apiFetch(finalUrl);
        if (response.ok) {
            setRanking(data.ranking);
            setPaginationData({ total: data.total, pages: data.pages });
            setCurrentPage(data.current_page);
        }
        setLoading(false);
    };

    const loadUserAudit = async (userId, page = 1) => {
        const user = ranking.find(u => u.id_user === userId);
        if (!user) return;

        try {
            const { response, data } = await apiFetch(`/predictions/user/${userId}?page=${page}&per_page=8`);

            if (response.ok) {
                setAuditData(data);
                setSelectedUser(user);

                if (Swal.isVisible()) {
                    Swal.update({
                        html: getAuditHTML(user, data)
                    });
                    renderPaginationButtons(user.id_user, data);
                } else {
                    mostrarModalAuditoria(user, data);
                }
            }
        } catch (error) {
            toast.error("Error al cargar la auditoría");
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        loadRanking(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };


    const handleDownloadRankingPdf = async () => {
        try {
            setExportingPdf(true);
            const groupParam = isAdmin && activeGroup ? `?group_id=${activeGroup}` : "";
            const { response, data } = await apiFetch(`/ranking/export${groupParam}`);
            if (!response.ok) {
                toast.error("Error al generar el reporte");
                return;
            }
            generateRankingReport(data);
        } catch {
            toast.error("Error de conexión al exportar");
        } finally {
            setExportingPdf(false);
        }
    };

    const getAuditHTML = (user, currentData) => {
        return `
    <div id="audit-content">
        <div class="table-responsive">
            <table class="table table-dark table-sm align-middle" style="table-layout: fixed; width: 100%;">
                <thead>
                    <tr class="text-dim border-bottom border-secondary" style="font-size: 0.75rem;">
                        <th class="text-start pb-2" style="width: 45%;">Partido</th>
                        <th class="pb-2 text-center" style="width: 18%;">Pred.</th>
                        <th class="pb-2 text-center" style="width: 18%;">Real</th>
                        <th class="pb-2 text-center" style="width: 19%;">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentData.predictions.map(p => `
                        <tr class="border-bottom border-secondary-subtle">
                            <td class="text-start py-2 text-white-50" 
                                style="font-size: 0.9rem; line-height: 1.1; word-wrap: break-word;">
                                ${p.match}
                            </td>
                            <td class="fw-bold text-center small">${p.prediction}</td>
                            <td class="text-emerald text-center small">${p.real_result}</td>
                            <td class="text-center">
                                <span class="badge ${p.points === 3 ? 'bg-success' : p.points === 1 ? 'bg-warning text-dark' : 'bg-secondary text-white-50'}" 
                                      style="font-size: 0.65rem;">
                                    ${p.points}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div id="audit-pagination" class="d-flex justify-content-center gap-2 mt-3"></div>
    </div>
`;
    };

    const mostrarModalAuditoria = (user, currentData) => {
        Swal.fire({
            title: `<span class="modal-title-responsive">Historial: ${user.username}</span>`,
            html: getAuditHTML(user, currentData),
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#6c757d',
            showCloseButton: true,
            focusConfirm: false,
            background: 'var(--deep-navy)',
            color: '#fff',
            width: '620px',
            didOpen: () => {
                renderPaginationButtons(user.id_user, currentData);
            }
        });
    };

    const renderPaginationButtons = (userId, data) => {
        const container = document.getElementById('audit-pagination');
        if (!container || data.pages <= 1) return;

        let buttonsHtml = '';

        buttonsHtml += `
        <button id="prevAudit" class="btn btn-sm btn-outline-light" ${data.current_page === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i>
        </button>
    `;

        buttonsHtml += `<span class="mx-3 align-self-center small text-dim">Pág ${data.current_page} de ${data.pages}</span>`;

        buttonsHtml += `
        <button id="nextAudit" class="btn btn-sm btn-outline-light" ${data.current_page === data.pages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

        container.innerHTML = buttonsHtml;

        document.getElementById('prevAudit')?.addEventListener('click', () => {
            loadUserAudit(userId, data.current_page - 1);
        });
        document.getElementById('nextAudit')?.addEventListener('click', () => {
            loadUserAudit(userId, data.current_page + 1);
        });
    };


    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-emerald"></div></div>;

    return (
        <div className="admin-container animate__animated animate__fadeIn mt-4">
            <Toaster position="top-center" richColors />

            <div className="text-center mb-4">
                <h2 className="fw-bold text-white">🏆 Ranking Mundialista</h2>
                <p className="text-dim">Revisa quién lidera y audita sus predicciones.</p>

                {/* SELECTOR DE GRUPOS */}
                {isAdmin && groups.length > 0 && (
                    <div className="group-tabs-container mt-3">
                        {groups.map(g => (
                            <button
                                key={g.id_group}
                                className={`tab-btn ${activeGroup === g.id_group ? 'active' : ''}`}
                                onClick={() => setActiveGroup(g.id_group)}
                            >
                                {g.name_group}
                            </button>
                        ))}
                    </div>
                )}


                {/* BOTÓN PDF*/}
                <div className='d-flex justify-content-start'>
                    <button
                        className="btn btn-sm btn-primary rounded-pill px-4 mt-2"
                        onClick={handleDownloadRankingPdf}
                        disabled={exportingPdf}
                    >
                        {exportingPdf
                            ? <><span className="spinner-border spinner-border-sm me-2" role="status" /> Generando...</>
                            : <><i className="fas fa-file-pdf me-2" /> DESCARGAR RANKING</>
                        }
                    </button>
                </div>
            </div>
            <div className="admin-card2 p-0">

                <div className="table-responsive d-none d-md-block m-3 admin-card">
                    <table className="table table-hover table-dark custom-table mt-3">
                        <thead>
                            <tr className="text-dim small uppercase">
                                <th>Pos</th>
                                <th>Usuario</th>
                                <th className="text-center">Exactos (3pts)</th>
                                <th className="text-center">Tendencia (1pt)</th>
                                <th className="text-center">Total</th>
                                <th>Auditoría</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.map((u, i) => (
                                <tr key={u.id_user} className="align-middle">
                                    <td>
                                        <div className="position-container me-3">
                                            {/* Calculamos la posición global real */}
                                            {(() => {
                                                const globalRank = ((currentPage - 1) * PER_PAGE) + i + 1;

                                                if (globalRank === 1) return (
                                                    <span><small className='text-warning'><b>1° </b></small><i className="fa-solid fa-trophy fs-2 text-warning"></i></span>
                                                );
                                                if (globalRank === 2) return (
                                                    <span><small className='text-info'><b>2° </b></small><i className="fa-solid fa-medal fs-2 text-info"></i></span>
                                                );
                                                if (globalRank === 3) return (
                                                    <span><small className='text-danger'><b>3° </b></small><i className="fa-solid fa-medal fs-2 text-danger"></i></span>
                                                );
                                                return (
                                                    <span><small className='text-secondary'><b>{globalRank}° </b></small><i className="fa-solid fa-award fs-2 text-secondary"></i></span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td>{u.username}</td>
                                    <td className="text-center text-success">{u.exact_hits}</td>
                                    <td className="text-center text-warning">{u.trend_hits}</td>
                                    <td className="fw-bold text-white fs-5">{u.total_points}</td>
                                    <td>
                                        <button
                                            onClick={() => loadUserAudit(u.id_user)}
                                            className="btn btn-sm btn-outline-light border-0"
                                        >
                                            <i className="fa-solid fa-magnifying-glass-chart"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Vista Móvil */}
                <div className="d-md-none">
                    {ranking.map((u, i) => (
                        <div key={u.id_user} className="user-mobile-card p-3 mb-4 border-0">
                            <div className="row align-items-center admin-card">
                                {/* Columna Izquierda: Posición y Nombre */}
                                <div className="col-7 d-flex align-items-center">
                                    <div className="position-container me-3">
                                        {(() => {
                                            const globalRank = ((currentPage - 1) * PER_PAGE) + i + 1;

                                            if (globalRank === 1) return (
                                                <span><small className='text-warning fs-5'><b>1°</b></small><i className="fa-solid fa-trophy fs-2 text-warning"></i></span>
                                            );
                                            if (globalRank === 2) return (
                                                <span><small className='text-info fs-5'><b>2°</b></small><i className="fa-solid fa-medal fs-2 text-info"></i></span>
                                            );
                                            if (globalRank === 3) return (
                                                <span><small className='text-secondary fs-5'><b>3°</b></small><i className="fa-solid fa-medal fs-2 text-secondary"></i></span>
                                            );
                                            return (
                                                <span><small className='text-danger fs-6'><b>{globalRank}°</b></small><i className="fa-solid fa-award fs-2 text-danger"></i></span>
                                            );
                                        })()}
                                    </div>

                                    <div className="d-flex flex-column justify-content-center">
                                        <span className="fw-bold text-white text-truncate user-name-ranking">
                                            {u.username}
                                        </span>
                                    </div>
                                </div>

                                {/*Puntos totales */}
                                <div className="col-5 text-end">
                                    <span className="fw-bold text-pitch-green fs-5">{u.total_points} pts</span>
                                </div>

                                {/* Info extra y Botón */}
                                <div className="col-12 mt-3 d-flex justify-content-between align-items-center border-top border-secondary pt-2">
                                    <small className="text-dim">{u.exact_hits} Exactos</small>
                                    <button
                                        onClick={() => loadUserAudit(u.id_user)}
                                        className="btn btn-emerald btn-audit-sm"
                                    >
                                        <i className="fas fa-eye me-1"></i> Auditoría
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {paginationData.pages > 1 && (
                    <Pagination
                        total={paginationData.total}
                        pages={paginationData.pages}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        perPage={PER_PAGE}
                        itemsCount={ranking.length}
                    />
                )}
            </div>
            {ranking.length === 0 && !loading && (
                <div className="admin-card p-5 text-center text-dim">
                    <i className="fa-solid fa-circle-info fs-1 mb-3"></i>
                    <p>No hay usuarios con puntos en este grupo todavía.</p>
                </div>
            )}
        </div>
    );
};

export default Ranking;