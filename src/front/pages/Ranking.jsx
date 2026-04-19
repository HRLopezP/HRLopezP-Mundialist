import React, { useState, useEffect } from 'react';
import { apiFetch } from "../utils/api.js";
import { toast } from "sonner";
import Swal from "sweetalert2";

export const Ranking = () => {
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRanking();
    }, []);

    const loadRanking = async () => {
        const { response, data } = await apiFetch("/ranking");
        if (response.ok) setRanking(data);
        setLoading(false);
    };

    const verDetalleTransparencia = async (user) => {
        const { response, data } = await apiFetch(`/predictions/user/${user.id_user}`);
        if (response.ok) {
            Swal.fire({
                title: `Auditoría: ${user.username}`,
                html: `<div class="text-start">${data.map(p => `
                    <div class="border-bottom border-secondary mb-2 pb-1">
                        <small class="text-success">${p.match}</small><br/>
                        <b>Predijo: ${p.prediction}</b> | Puntos: ${p.points}
                    </div>`).join('')}</div>`,
                background: 'var(--deep-navy)',
                color: '#fff',
                confirmButtonColor: 'var(--pitch-green)'
            });
        }
    };

    if (loading) return <div className="text-center text-white mt-5">Calculando posiciones...</div>;

    return (
        <div className="admin-container">
            <div className="admin-card p-3 p-md-4">
                <h3 className="text-center mb-4" style={{ color: 'var(--pitch-green)' }}>🏆 RANKING</h3>

                {/* Tabla para Desktop */}
                <div className="d-none d-md-block">
                    <table className="table table-dark table-hover text-center">
                        <thead className="table-oxford">
                            <tr>
                                <th>#</th>
                                <th>Participante</th>
                                <th>Puntos</th>
                                <th>Ver</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.map((u, i) => (
                                <tr key={u.id_user}>
                                    <td>{i + 1}</td>
                                    <td>{u.username}</td>
                                    <td className="fw-bold text-warning">{u.total_points}</td>
                                    <td><button onClick={() => verDetalleTransparencia(u)} className="btn btn-sm btn-outline-light">🔍</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Tarjetas para Móvil */}
                <div className="d-md-none">
                    {ranking.map((u, i) => (
                        <div key={u.id_user} className="user-mobile-card p-3 mb-2 d-flex justify-content-between align-items-center">
                            <div>
                                <span className="user-count-badge me-2">{i + 1}</span>
                                <strong>{u.username}</strong>
                            </div>
                            <div className="text-end">
                                <span className="d-block fw-bold text-warning">{u.total_points} pts</span>
                                <button onClick={() => verDetalleTransparencia(u)} className="btn btn-sm btn-emerald mt-1">Detalles</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Ranking;