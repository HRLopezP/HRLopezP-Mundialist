import React, { useState, useEffect } from 'react';
import { apiFetch } from "../utils/api.js";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import Pagination from "../components/Pagination.jsx";
import { generateRankingReport } from "../utils/transparencyPdf.js";

export const Ranking = () => {
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);

    const [auditData, setAuditData] = useState({ predictions: [], total: 0, pages: 1, current_page: 1 });
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        loadRanking();
    }, []);

    const loadRanking = async () => {
        const { response, data } = await apiFetch("/ranking");
        if (response.ok) setRanking(data);
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


    const renderAuditContent = () => {
        const container = document.getElementById('audit-container');
        if (!container) return;

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-dark table-sm small">
                    <thead>
                        <tr>
                            <th>Partido</th>
                            <th>Pred.</th>
                            <th>Real</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${auditData.predictions.map(p => `
                            <tr>
                                <td class="text-dim">${p.match}</td>
                                <td class="fw-bold">${p.prediction}</td>
                                <td class="text-success">${p.real_result}</td>
                                <td><span class="badge ${p.points === 3 ? 'bg-success' : 'bg-warning text-dark'}">${p.points}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-emerald"></div></div>;

    return (
        <div className="admin-container animate__animated animate__fadeIn mt-4">
            <Toaster position="top-center" richColors />

            <div className="text-center mb-4">
                <h2 className="fw-bold text-white">🏆 Ranking Mundialista</h2>
                <p className="text-dim">Revisa quién lidera y audita sus predicciones.</p>

                {/* BOTÓN PDF PARA MÓVIL Y PC: Lo ponemos aquí arriba para que siempre sea visible */}
                <button
                    className="btn btn-sm btn-primary rounded-pill px-4 mt-2"
                    onClick={() => generateRankingReport(ranking)}
                >
                    <i className="fas fa-file-pdf me-2"></i> DESCARGAR RANKING
                </button>
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
                                    <td><div className="position-container me-3">
                                        {i === 0 ? (
                                            <span><small className='text-warning'><b>1° </b></small><i className="fa-solid fa-trophy fs-2 text-warning"></i></span>
                                        ) : i === 1 ? (
                                            <span><small className='text-info'><b>2° </b></small><i className="fa-solid fa-medal fs-2 text-info"></i></span>
                                        ) : i === 2 ? (
                                            <span><small className='text-danger'><b>3° </b></small><i className="fa-solid fa-medal fs-2 text-danger"></i></span>
                                        ) : (
                                            <span><small className='text-secondary'><b>{i + 1}° </b></small><i className="fa-solid fa-award fs-2 text-secondary"></i></span>
                                            // <span className="ranking-number text-danger">{i + 1}°</span>
                                        )}
                                    </div></td>
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

                {/* Vista Móvil Optimizado con Grilla */}
                <div className="d-md-none">
                    {ranking.map((u, i) => (
                        <div key={u.id_user} className="user-mobile-card p-3 mb-4 border-0">
                            <div className="row align-items-center admin-card">
                                {/* Columna Izquierda: Posición y Nombre */}
                                <div className="col-7 d-flex align-items-center">
                                    {/* Contenedor de Posición/Medalla */}
                                    <div className="position-container me-3">
                                        {i === 0 ? (
                                            <span><small className='text-warning fs-5'><b>1°</b></small><i className="fa-solid fa-trophy fs-2 text-warning"></i></span>
                                        ) : i === 1 ? (
                                            <span><small className='text-info fs-5'><b>2°</b></small><i className="fa-solid fa-medal fs-2 text-info"></i></span>
                                        ) : i === 2 ? (
                                            <span><small className='text-secondary fs-5'><b>3°</b></small><i className="fa-solid fa-medal fs-2 text-secondary"></i></span>
                                        ) : (
                                            <span><small className='text-danger fs-6'><b>{i + 1}°</b></small><i className="fa-solid fa-award fs-2 text-danger"></i></span>
                                            // <span className="ranking-number text-danger">{i + 1}°</span>
                                        )}
                                    </div>

                                    <div className="d-flex flex-column justify-content-center">
                                        <span className="fw-bold text-white text-truncate user-name-ranking">
                                            {u.username}
                                        </span>
                                    </div>
                                </div>

                                {/* Columna Derecha: Puntos totales */}
                                <div className="col-5 text-end">
                                    <span className="fw-bold text-pitch-green fs-5">{u.total_points} pts</span>
                                </div>

                                {/* Línea inferior: Info extra y Botón */}
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
            </div>
        </div>
    );
};