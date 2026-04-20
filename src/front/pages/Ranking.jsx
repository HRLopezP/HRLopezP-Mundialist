import React, { useState, useEffect } from 'react';
import { apiFetch } from "../utils/api.js";
import { toast } from "sonner";
import Swal from "sweetalert2";
import Pagination from "../components/Pagination.jsx";

export const Ranking = () => {
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para la Auditoría Paginada
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

    // Función para cargar la auditoría con paginación
    const loadUserAudit = async (userId, page = 1) => {
        const user = ranking.find(u => u.id_user === userId);
        if (!user) return;

        try {
            const { response, data } = await apiFetch(`/predictions/user/${userId}?page=${page}&per_page=6`);

            if (response.ok) {
                // Guardamos en el estado por si acaso, pero usamos 'data' para el modal
                setAuditData(data);
                setSelectedUser(user);

                // Si es la primera vez (page 1), abrimos el modal
                // Si ya está abierto, SweetAlert2 permite actualizar el contenido sin cerrarse
                mostrarModalAuditoria(user, data);
            }
        } catch (error) {
            toast.error("Error al cargar la auditoría");
        }
    };

    const mostrarModalAuditoria = (user, currentData) => {
        Swal.fire({
            title: `Auditoría: ${user.username}`,
            html: `
            <div id="audit-content">
                <div class="table-responsive">
                    <table class="table table-dark table-sm small">
                        <thead>
                            <tr class="text-dim">
                                <th>Partido</th>
                                <th>Pred.</th>
                                <th>Real</th>
                                <th>Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${currentData.predictions.map(p => `
                                <tr>
                                    <td class="text-start">${p.match}</td>
                                    <td>${p.prediction}</td>
                                    <td class="text-emerald">${p.real_result}</td>
                                    <td><span class="badge ${p.points === 3 ? 'bg-success' : 'bg-warning text-dark'}">${p.points}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div id="audit-pagination" class="d-flex justify-content-center gap-2 mt-3"></div>
            </div>
        `,
            showConfirmButton: false,
            background: 'var(--deep-navy)',
            color: '#fff',
            width: '600px',
            didOpen: () => {
                renderPaginationButtons(user.id_user, currentData);
            }
        });
    };

    // Función para renderizar botones de paginación manuales dentro de SweetAlert
    const renderPaginationButtons = (userId, data) => {
        const container = document.getElementById('audit-pagination');
        if (!container || data.pages <= 1) return;

        let buttonsHtml = '';

        // Botón Anterior
        buttonsHtml += `
        <button id="prevAudit" class="btn btn-sm btn-outline-light" ${data.current_page === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i>
        </button>
    `;

        // Indicador de página
        buttonsHtml += `<span class="mx-3 align-self-center small text-dim">Pág ${data.current_page} de ${data.pages}</span>`;

        // Botón Siguiente
        buttonsHtml += `
        <button id="nextAudit" class="btn btn-sm btn-outline-light" ${data.current_page === data.pages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

        container.innerHTML = buttonsHtml;

        // Asignar eventos a los botones manuales
        document.getElementById('prevAudit')?.addEventListener('click', () => {
            loadUserAudit(userId, data.current_page - 1);
        });
        document.getElementById('nextAudit')?.addEventListener('click', () => {
            loadUserAudit(userId, data.current_page + 1);
        });
    };

    
    // Esta función renderiza el contenido dentro del modal (o puedes usar un Modal de Bootstrap para más control)
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
        <div className="admin-container animate__animated animate__fadeIn">
            <div className="admin-card p-4">
                <h3 className="text-white mb-4 text-center">🏆 Ranking Mundialista</h3>

                <div className="table-responsive d-none d-md-block">
                    <table className="table table-hover table-dark custom-table">
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
                                    <td className="fw-bold text-dim">#{i + 1}</td>
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

                {/* Vista Móvil Optimizado */}
                <div className="d-md-none">
                    {ranking.map((u, i) => (
                        <div key={u.id_user} className="user-mobile-card p-3 mb-2">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="badge bg-dark-soft me-2">#{i + 1}</span>
                                    <span className="fw-bold">{u.username}</span>
                                </div>
                                <div className="text-end">
                                    <span className="d-block fw-bold text-pitch-green fs-5">{u.total_points} pts</span>
                                    <small className="text-dim">{u.exact_hits} Exactos</small>
                                </div>
                            </div>
                            <button
                                onClick={() => loadUserAudit(u.id_user)}
                                className="btn btn-emerald w-100 mt-2 py-1 btn-sm"
                            >
                                Ver Transparencia
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};