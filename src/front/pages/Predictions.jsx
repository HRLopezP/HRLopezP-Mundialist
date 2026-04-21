import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api.js";
import { toast } from "sonner";
import Swal from "sweetalert2";

const calculatePoints = (prediction, match) => {
    if (!prediction || match.home_score === null || match.away_score === null) return null;

    const pHome = parseInt(prediction.home_score);
    const pAway = parseInt(prediction.away_score);
    const mHome = parseInt(match.home_score);
    const mAway = parseInt(match.away_score);

    // 1. ACIERTO EXACTO: 3 Puntos
    if (pHome === mHome && pAway === mAway) return 3;

    // 2. ACIERTO DE TENDENCIA: 1 Punto
    const realResult = mHome > mAway ? "home" : mHome < mAway ? "away" : "draw";
    const predResult = pHome > pAway ? "home" : pHome < pAway ? "away" : "draw";

    if (realResult === predResult) return 1;

    return 0;
};

export const Predictions = () => {
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

                const availableGroups = [...new Set(data.map(m => m.home_team?.group_name))].filter(Boolean).sort();

                if (availableGroups.length > 0) {
                    setSelectedGroup(availableGroups[0]);
                }
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (matchId, team, value) => {
        setMatches(prevMatches => prevMatches.map(m => {
            if (m.id_match === matchId) {
                const currentPred = m.user_prediction || { home_score: 0, away_score: 0 };
                return {
                    ...m,
                    user_prediction: {
                        ...currentPred,
                        [team === 'home' ? 'home_score' : 'away_score']: value === "" ? "" : parseInt(value)
                    }
                };
            }
            return m;
        }));
    };

    const savePrediction = async (match) => {
        const home_score = match.user_prediction?.home_score;
        const away_score = match.user_prediction?.away_score;
        const hasPrediction = !!match.user_prediction?.id_prediction;

        if (home_score === undefined || away_score === undefined || home_score === "" || away_score === "") {
            return toast.error("Por favor completa ambos marcadores");
        }

        const toastId = toast.loading("Procesando...");

        try {
            const { response, data } = await apiFetch("/predict", {
                method: "POST",
                body: JSON.stringify({
                    match_id: match.id_match,
                    home_score: parseInt(home_score),
                    away_score: parseInt(away_score)
                })
            });

            if (response.ok) {
                toast.success("¡Guardado!", { id: toastId });
                loadMatches();
            } else {
                toast.dismiss(toastId);
                Swal.fire("Atención", data.msg, "warning");
            }
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Error de conexión");
        }
    };

    useEffect(() => {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            activeTab.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedGroup]);

    const safeMatches = Array.isArray(matches) ? matches : [];
    const groups = [...new Set(safeMatches.map(m => m.home_team?.group_name))].filter(Boolean).sort();
    const filteredMatches = safeMatches.filter(m => m.home_team?.group_name === selectedGroup);

    if (loading) return <div className="text-center mt-5 text-white"><h3>🏟️ Abriendo las puertas del estadio...</h3></div>;

    return (
        <div className="container py-5">
            <h1 className="text-center text-white mb-5 mt-4" style={{ textShadow: "0 0 10px var(--pitch-green)" }}>
                MIS PREDICCIONES
            </h1>

            {/* Pestañas de Grupos */}
            <div className="group-tabs-container mb-5 d-flex justify-content-start justify-content-md-center">
                {groups.map((group, index) => (
                    <button
                        key={`group-btn-${index}`}
                        className={`tab-btn ${selectedGroup === group ? 'active' : ''}`}
                        onClick={() => setSelectedGroup(group)}
                    >
                        {group.replace("_", " ")}
                    </button>
                ))}
            </div>

            <div className="row justify-content-center">
                {filteredMatches.length > 0 ? (
                    filteredMatches.map((match) => {
                        const hasPrediction = !!match.user_prediction?.id_prediction;
                        const matchDate = new Date(match.match_date);
                        const now = new Date();
                        const hoursUntilMatch = (matchDate - now) / (1000 * 60 * 60);
                        const isEditable = hoursUntilMatch > 24;
                        const cardStyle = isEditable ? "admin-card p-4 border-0 shadow-lg" : "admin-card p-4 border-0 shadow-lg opacity-50 gray-filter";
                        const isFinished = match.home_score !== null && match.away_score !== null;
                        const points = calculatePoints(match.user_prediction, match);
                        return (
                            <div key={`match-card-${match.id_match}`} className="col-12 col-md-10 col-lg-8 mb-4">
                                <div className="admin-card p-4 border-0 shadow-lg">
                                    <div className="d-flex justify-content-between text-dim small mb-3">
                                        <span>{new Date(match.match_date).toLocaleString()}</span>
                                        <span className="badge bg-dark-soft">{match.group_name}</span>
                                        {/* MOSTRAR PUNTOS SI EL JUEGO TERMINÓ */}
                                        {isFinished ? (
                                            <div className={`px-3 py-1 rounded-pill fw-bold ${points === 3 ? 'bg-emerald text-white' : 'bg-oxford-grey text-light'}`}
                                                style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
                                                {points} {points === 1 ? 'PUNTO' : 'PUNTOS'} OBTENIDOS
                                            </div>
                                        ) : (
                                            !isEditable && <span className="badge bg-danger">🚫 CERRADO</span>
                                        )}
                                    </div>

                                    <div className="row align-items-center mb-2">
                                        {/* Equipo Local */}
                                        <div className="col-4 text-center">
                                            <img src={match.home_team.flag_url} className="img-fluid rounded mb-2 shadow" style={{ maxWidth: "55px", height: "35px", objectFit: "cover" }} alt="flag" />
                                            <h6 className="text-white text-truncate">{match.home_team.name}</h6>
                                            {/* RESULTADO REAL LOCAL */}
                                            {isFinished && <h2 className="text-emerald fw-bold mt-1">{match.home_score}</h2>}
                                        </div>

                                        {/* Marcadores de Predicción */}
                                        <div className="col-4 text-center">
                                            <div className="text-dim small mb-2" style={{ fontSize: '0.65rem' }}>TU PREDICCIÓN</div>
                                            <div className="d-flex justify-content-center align-items-center gap-2">
                                                <input
                                                    type="number"
                                                    disabled={!isEditable || isFinished}
                                                    className={`form-control score-input text-center bg-dark text-white border-secondary ${isFinished ? 'opacity-75' : ''}`}
                                                    style={{ width: "50px" }}
                                                    value={match.user_prediction?.home_score ?? ""}
                                                    onChange={(e) => handleInputChange(match.id_match, 'home', e.target.value)}
                                                />
                                                <span className="h4 text-white mb-0">-</span>
                                                <input
                                                    type="number"
                                                    disabled={!isEditable || isFinished}
                                                    className={`form-control score-input text-center bg-dark text-white border-secondary ${isFinished ? 'opacity-75' : ''}`}
                                                    style={{ width: "50px" }}
                                                    value={match.user_prediction?.away_score ?? ""}
                                                    onChange={(e) => handleInputChange(match.id_match, 'away', e.target.value)}
                                                />
                                            </div>
                                            {isFinished && <div className="mt-2 text-info fw-bold small">FINAL</div>}
                                        </div>

                                        {/* Equipo Visitante */}
                                        <div className="col-4 text-center">
                                            <img src={match.away_team.flag_url} className="img-fluid rounded mb-2 shadow" style={{ maxWidth: "55px", height: "35px", objectFit: "cover" }} alt="flag" />
                                            <h6 className="text-white text-truncate">{match.away_team.name}</h6>
                                            {/* RESULTADO REAL VISITANTE */}
                                            {isFinished && <h2 className="text-emerald fw-bold mt-1">{match.away_score}</h2>}
                                        </div>
                                    </div>

                                    {/* BOTÓN O MENSAJE FINAL */}
                                    {!isFinished && (
                                        isEditable ? (
                                            <button
                                                className={`btn w-100 mt-3 py-2 fw-bold transition-all ${hasPrediction ? 'btn-outline-warning btn-update-pulse' : 'btn-emerald'}`}
                                                onClick={() => savePrediction(match)}
                                            >
                                                {hasPrediction ? "🔄 ACTUALIZAR" : "⚽ GUARDAR"}
                                            </button>
                                        ) : (
                                            <div className="text-center mt-3 text-warning small p-2 border border-warning rounded">
                                                <i className="fas fa-lock me-2"></i> Tiempo agotado para predecir
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-white mt-5">
                        <p>Selecciona un grupo para ver los partidos.</p>
                    </div>
                )}
            </div>
        </div>
    );
};