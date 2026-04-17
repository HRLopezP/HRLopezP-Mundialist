import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api.js";
import { toast } from "sonner";
import Swal from "sweetalert2";

export const Predictions = () => {
    const [matches, setMatches] = useState([]);

    useEffect(() => {
        loadMatches();
    }, []);

    const loadMatches = async () => {
        const { response, data } = await apiFetch("/matches");
        if (response.ok) setMatches(data);
    };

    const handleInputChange = (matchId, team, value) => {
        setMatches(prevMatches => prevMatches.map(m => {
            if (m.id_match === matchId) {
                const currentPred = m.user_prediction || { home_score: 0, away_score: 0 };
                return {
                    ...m,
                    user_prediction: {
                        ...currentPred,
                        [team === 'home' ? 'home_score' : 'away_score']: parseInt(value) || 0
                    }
                };
            }
            return m;
        }));
    };

    const savePrediction = async (match) => {
        const pred = match.user_prediction;
        if (!pred) return toast.error("Por favor ingresa un marcador");

        const { response, data } = await apiFetch("/predict", {
            method: "POST",
            body: JSON.stringify({
                match_id: match.id_match,
                home_score: pred.home_score,
                away_score: pred.away_score
            })
        });

        if (response.ok) {
            toast.success(data.msg);
            loadMatches(); // Recargamos para confirmar el estado
        } else {
            Swal.fire("¡Bloqueado!", data.msg, "warning");
        }
    };

    return (
        <div className="container py-5">
            <h1 className="text-center text-white mb-5 mt-4" style={{textShadow: "0 0 10px var(--pitch-green)"}}>
                🏟️ MIS PREDICCIONES
            </h1>
            <div className="row justify-content-center">
                {matches.map(match => {
                    const hasPrediction = !!match.user_prediction?.id_prediction;
                    return (
                        <div key={match.id_match} className="col-12 col-md-10 col-lg-8 mb-4">
                            <div className="admin-card p-4 border-0 shadow-lg">
                                <div className="d-flex justify-content-between text-dim small mb-3">
                                    <span>{new Date(match.match_date).toLocaleString()}</span>
                                    <span className="badge bg-dark-soft">{match.group_name}</span>
                                </div>

                                <div className="row align-items-center">
                                    {/* Equipo Local */}
                                    <div className="col-4 text-center">
                                        <img src={match.home_team.flag_url} className="img-fluid rounded mb-2 shadow" style={{maxWidth: "60px"}} alt="flag" />
                                        <h5 className="text-white text-truncate">{match.home_team.name}</h5>
                                    </div>

                                    {/* Marcador Electrónico */}
                                    <div className="col-4 d-flex justify-content-center align-items-center gap-2">
                                        <input 
                                            type="number" 
                                            className="form-control score-input text-center" 
                                            value={match.user_prediction?.home_score ?? ""}
                                            onChange={(e) => handleInputChange(match.id_match, 'home', e.target.value)}
                                        />
                                        <span className="h3 text-white mb-0">-</span>
                                        <input 
                                            type="number" 
                                            className="form-control score-input text-center" 
                                            value={match.user_prediction?.away_score ?? ""}
                                            onChange={(e) => handleInputChange(match.id_match, 'away', e.target.value)}
                                        />
                                    </div>

                                    {/* Equipo Visitante */}
                                    <div className="col-4 text-center">
                                        <img src={match.away_team.flag_url} className="img-fluid rounded mb-2 shadow" style={{maxWidth: "60px"}} alt="flag" />
                                        <h5 className="text-white text-truncate">{match.away_team.name}</h5>
                                    </div>
                                </div>

                                <button 
                                    className={`btn w-100 mt-4 py-2 fw-bold transition-all ${hasPrediction ? 'btn-outline-info' : 'btn-emerald'}`}
                                    onClick={() => savePrediction(match)}
                                >
                                    {hasPrediction ? "📝 ACTUALIZAR RESULTADO" : "⚽ GUARDAR PREDICCIÓN"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};