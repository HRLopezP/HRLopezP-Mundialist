import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api.js";
import { toast } from "sonner";

export const MatchAdmin = () => {
    const [matches, setMatches] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState("");
    const [loading, setLoading] = useState(true);

    // 1. CARGA INICIAL DE DATOS
    useEffect(() => {
        loadMatches();
    }, []);

    const loadMatches = async () => {
        setLoading(true);
        try {
            const { response, data } = await apiFetch("/matches");
            if (response.ok && Array.isArray(data)) {
                setMatches(data);

                // Obtenemos los nombres de los grupos para las pestañas
                const availableGroups = [...new Set(data.map(m => m.home_team?.group_name))].filter(Boolean).sort();

                if (availableGroups.length > 0) {
                    setSelectedGroup(availableGroups[0]);
                }
            }
        } catch (error) {
            console.error("Error al cargar partidos:", error);
            toast.error("No se pudieron cargar los partidos");
        } finally {
            setLoading(false);
        }
    };

    const handleResultChange = (matchId, team, value) => {
        setMatches(prev => prev.map(m =>
            m.id_match === matchId ? { ...m, [team]: value === "" ? "" : parseInt(value) } : m
        ));
    };

    const saveOfficialResult = async (match) => {
        if (match.home_score === "" || match.away_score === "") {
            return toast.error("Ingresa ambos marcadores antes de publicar");
        }

        const toastId = toast.loading("Actualizando resultado oficial...");
        try {
            const { response } = await apiFetch(`/match-results/${match.id_match}`, {
                method: "PUT",
                body: JSON.stringify({
                    home_score: match.home_score,
                    away_score: match.away_score
                })
            });

            if (response.ok) {
                toast.success("¡Resultado publicado con éxito!", { id: toastId });
                loadMatches(); // Recargamos para confirmar los datos
            }
        } catch (error) {
            toast.error("Error al conectar con el servidor", { id: toastId });
        }
    };

    // Lógica para filtrar grupos (igual que en Predictions)
    const groups = [...new Set(matches.map(m => m.home_team?.group_name))].filter(Boolean).sort();
    const filteredMatches = matches.filter(m => m.home_team?.group_name === selectedGroup);

    if (loading) return <div className="text-center mt-5 text-white"><h3>⚙️ Cargando panel de administración...</h3></div>;

    return (
        <div className="container py-5 bg-dark-main min-vh-100">
            <h1 className="text-center text-white mb-5 mt-4">⚙️ GESTIÓN DE RESULTADOS</h1>

            {/* Pestañas de Grupos (Reutilizando tu estilo de Predictions) */}
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
                    filteredMatches.map((match) => (
                        <div key={`admin-match-${match.id_match}`} className="col-12 col-md-10 col-lg-8 mb-4">
                            <div className="admin-card p-4 border-0 shadow-lg" style={{ backgroundColor: "#1a1a1a" }}>
                                <div className="text-dim small mb-3 text-center">
                                    {new Date(match.match_date).toLocaleString()}
                                </div>

                                <div className="row align-items-center">
                                    <div className="col-4 text-center">
                                        <img src={match.home_team.flag_url} className="img-fluid rounded mb-2" style={{ maxWidth: "45px" }} alt="flag" />
                                        <h6 className="text-white small">{match.home_team.name}</h6>
                                    </div>

                                    <div className="col-4 d-flex justify-content-center align-items-center gap-2">
                                        <input
                                            type="number"
                                            className="form-control bg-dark text-white text-center border-secondary"
                                            value={match.home_score ?? ""}
                                            onChange={(e) => handleResultChange(match.id_match, 'home_score', e.target.value)}
                                            style={{ width: "60px" }}
                                        />
                                        <span className="text-white h4 mb-0">-</span>
                                        <input
                                            type="number"
                                            className="form-control bg-dark text-white text-center border-secondary"
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

                                <button
                                    className="btn btn-emerald w-100 mt-4 py-2 fw-bold"
                                    onClick={() => saveOfficialResult(match)}
                                >
                                    ✅ PUBLICAR RESULTADO FINAL
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-white mt-5">
                        <p>No hay partidos en este grupo.</p>
                    </div>
                )}
            </div>
        </div>
    );
};