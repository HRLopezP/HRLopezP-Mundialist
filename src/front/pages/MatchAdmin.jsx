import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api.js";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import "../styles/Predictions.css";

const MatchAdmin = () => {
    const [matches, setMatches] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMatches();
    }, []);

    const loadMatches = async () => {
        setLoading(true);
        try {
            const { response, data } = await apiFetch("/matches");
            if (response.ok && Array.isArray(data)) {
                setMatches(data);
                const groups = [...new Set(data.map(m => m.home_team?.group_name))].filter(Boolean).sort();
                if (groups.length > 0) setSelectedGroup(current => current || groups[0]);
            }
        } catch (error) {
            toast.error("Error al cargar partidos");
        } finally {
            setLoading(false);
        }
    };

    const loadMatchesSilently = async () => {
        try {
            const { response, data } = await apiFetch("/matches");
            if (response.ok && Array.isArray(data)) {
                setMatches(data);
            }
        } catch (error) {
            console.error("Error en actualización silenciosa", error);
        }
    };

    const handleResultChange = (matchId, team, value) => {
        setMatches(prev => prev.map(m =>
            m.id_match === matchId ? { ...m, [team]: value === "" ? null : value } : m
        ));
    };

    const saveOfficialResult = async (match) => {
        if (match.home_score === null || match.away_score === null) {
            toast.error("Por favor, ingresa ambos puntajes");
            return;
        }

        const isUpdate = match.home_score !== null && match.away_score !== null; // Determina si es modif.

        const confirm = await Swal.fire({
            title: '¿Confirmar resultado oficial?',
            text: "Se recalcularán los puntos de todos los usuarios registrados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--pitch-green)',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, publicar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            const toastId = toast.loading("Actualizando marcadores...");
            try {
                const { response } = await apiFetch(`/match-results/${match.id_match}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        home_score: parseInt(match.home_score),
                        away_score: parseInt(match.away_score)
                    })
                });

                if (response.ok) {
                    toast.success(isUpdate ? "📝 Resultado modificado correctamente" : "🏆 ¡Resultado publicado con éxito!", { id: toastId });
                    loadMatchesSilently();
                } else {
                    toast.dismiss(toastId);
                    toast.error("Error al procesar la solicitud");
                }
            } catch (error) {
                toast.dismiss(toastId);
                toast.error("Error de conexión");
            }
        }
    };

    if (loading) return (
        <div className="d-flex flex-column justify-content-center align-items-center vh-100 text-white">
            <div className="spinner-border text-info mb-3" role="status"></div>
            <h5>Accediendo al Panel de Control...</h5>
        </div>
    );

    return (
        <div className="container py-5">
            <Toaster position="top-center" richColors />
            <h1 className="text-center mb-5 mt-4 text-gold-admin">⚙️ ADMINISTRACIÓN DE RESULTADOS</h1>

            <div className="group-tabs-container mb-4">
                {[...new Set(matches.map(m => m.home_team?.group_name))].filter(Boolean).sort().map(group => (
                    <button
                        key={group}
                        className={`tab-btn ${selectedGroup === group ? "active" : ""}`}
                        onClick={() => setSelectedGroup(group)}
                    >
                        Grupo {group.toString().replace(/Group_/i, "").trim()}
                    </button>
                ))}
            </div>

            <div className="row justify-content-center">
                {matches.filter(m => m.home_team?.group_name === selectedGroup).map((match) => {
                    const hasResult = match.home_score !== null && match.away_score !== null;

                    return (
                        <div key={match.id_match} className="col-12 col-md-10 col-lg-8 col-xl-6 mb-5">
                            <div className="admin-card-gold p-4 shadow-lg">
                                <div className="text-center mb-3">
                                    <span className="badge bg-dark text-info border border-info px-3">
                                        PARTIDO: #{match.id_match}
                                    </span>
                                    <div className="text-dim small mt-1" style={{ fontSize: "0.8rem" }}>
                                        📅 {new Date(match.match_date).toLocaleDateString('es-ES', {
                                            day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </div>
                                </div>

                                <div className="row align-items-center">
                                    <div className="col-4 text-center">
                                        <img src={match.home_team.flag_url} className="img-fluid rounded mb-2" style={{ maxWidth: "45px" }} alt="flag" />
                                        <h6 className="text-white small">{match.home_team.name}</h6>
                                    </div>

                                    <div className="col-4 d-flex justify-content-center align-items-center gap-2">
                                        <input
                                            type="number"
                                            className="form-control score-input text-center border-secondary"
                                            value={match.home_score ?? ""}
                                            onChange={(e) => handleResultChange(match.id_match, 'home_score', e.target.value)}
                                            style={{ width: "60px" }}
                                        />
                                        <span className="text-white fw-bold">-</span>
                                        <input
                                            type="number"
                                            className="form-control score-input text-center border-secondary"
                                            value={match.away_score ?? ""}
                                            onChange={(e) => handleResultChange(match.id_match, 'away_score', e.target.value)}
                                            style={{ width: "60px" }}
                                        />
                                    </div>

                                    <div className="col-4 text-center">
                                        <img src={match.away_team.flag_url} className="img-fluid rounded mb-2" style={{ maxWidth: "45px" }} alt="flag" />
                                        <h6 className="text-white small">{match.away_team.name}</h6>
                                    </div>
                                </div>

                                {/* BOTÓN DINÁMICO Y AJUSTADO */}
                                <button
                                    className={`btn mt-4 py-2 fw-bold transition-all mx-auto d-block ${hasResult ? 'btn-outline-info' : 'btn-emerald'}`}
                                    style={{ width: "75%", maxWidth: "280px" }}
                                    onClick={() => saveOfficialResult(match)}
                                >
                                    {hasResult ? "📝 MODIFICAR RESULTADO" : "✅ PUBLICAR FINAL"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MatchAdmin;