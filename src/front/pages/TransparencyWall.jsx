import React, { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { GameMatchCard } from "../components/GameMatchCard";
import { generateTransparencyReport } from "../utils/transparencyPdf";
import { Toaster, toast } from "sonner";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { getRolFromToken } from "../utils/auth";
import "../styles/Predictions.css";

const TransparencyWall = () => {
    const { store } = useGlobalReducer();
    const isAdmin = getRolFromToken() === "Administrador";

    const [matches, setMatches] = useState([]);
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const debounceRef = useRef(null);

    const handleSearch = (value) => {
        setSearchTerm(value);
        // Debounce: espera 400ms después del último teclazo
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchAllMatches(value.trim());
        }, 400);
    };

    // Nueva función que busca en todos los partidos activos
    const searchAllMatches = useCallback(async (search) => {
        if (matches.length === 0) return;
        try {
            const groupParam = isAdmin && activeGroup ? `&group_id=${activeGroup}` : "";
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";

            const requests = matches.map(m =>
                apiFetch(`/transparency-wall/${m.id_match}/predictions?page=1&per_page=10${groupParam}${searchParam}`)
            );
            const responses = await Promise.all(requests);

            setMatches(prev =>
                prev.map((m, i) => {
                    const { response, data } = responses[i];
                    if (!response.ok) return m;
                    return {
                        ...m,
                        predictions: data.predictions,
                        predictions_current_page: data.current_page,
                        predictions_pages: data.pages,
                        predictions_total: data.total,
                    };
                })
            );
        } catch {
            toast.error("Error al buscar");
        }
    }, [matches, isAdmin, activeGroup]);


    useEffect(() => {
        const initTransparency = async () => {
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
        initTransparency();
    }, [store.user]);

    useEffect(() => {
        if (activeGroup !== null) loadWall();
    }, [activeGroup]);

    const loadWall = async () => {
        try {
            setLoading(true);
            const groupParam = isAdmin && activeGroup ? `?group_id=${activeGroup}` : "";
            const { response, data } = await apiFetch(`/transparency-wall${groupParam}`);
            if (response.ok) {
                setMatches(data);
            } else {
                toast.error("Error al cargar el muro");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleMatchPageChange = useCallback(async (matchId, newPage) => {
        try {
            const groupParam = isAdmin && activeGroup ? `&group_id=${activeGroup}` : "";
            const url = `/transparency-wall/${matchId}/predictions?page=${newPage}&per_page=10${groupParam}`;
            const { response, data } = await apiFetch(url);
            if (response.ok) {
                setMatches(prev =>
                    prev.map(m => m.id_match === matchId
                        ? {
                            ...m,
                            predictions: data.predictions,
                            predictions_current_page: data.current_page,
                            predictions_pages: data.pages,
                            predictions_total: data.total,
                        }
                        : m
                    )
                );
            }
        } catch {
            toast.error("Error al cambiar de página");
        }
    }, [isAdmin, activeGroup]);

    const filteredMatches = searchTerm.trim()
        ? matches.filter(m => m.predictions.length > 0)
        : matches;

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="spinner-border text-info" role="status" />
        </div>
    );

    return (
        <div className="container py-5">
            <Toaster position="top-center" richColors />

            <div className="text-center mb-4">
                <h2 className="fw-bold transparency-header">🛡️ Muro de Transparencia</h2>
                <p className="text-dim small">Las predicciones se liberan 24h antes de cada partido.</p>

                {isAdmin && groups.length > 0 && (
                    <div className="group-tabs-container mt-3 mb-2">
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
            </div>

            <div className="row justify-content-center align-items-center g-3 mb-4">
                <div className="col-12 col-md-6">
                    <input
                        type="text"
                        className="form-control search-input-glass"
                        placeholder="Buscar rival por nombre..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="col-12 text-center d-flex justify-content-between align-items-center gap-2">
                    <p className="text-dim mb-0 small">
                        <i className="fas fa-info-circle me-1 text-info" />
                        Haz click para auditar
                    </p>
                    {matches.length > 0 && (
                        <button
                            className="btn btn-sm btn-outline-info rounded-pill px-3 py-1"
                            style={{ fontSize: '0.75rem', borderWidth: '1px' }}
                            onClick={() => generateTransparencyReport(filteredMatches)}
                        >
                            <i className="fas fa-file-pdf me-1" /> DESCARGAR PDF
                        </button>
                    )}
                </div>
            </div>

            <div className="accordion accordion-flush bg-transparent" id="transparencyWall">
                {filteredMatches.length > 0 ? (
                    filteredMatches.map((match, index) => (
                        <GameMatchCard
                            key={match.id_match}
                            match={match}
                            index={index}
                            onPageChange={handleMatchPageChange}
                        />
                    ))
                ) : (
                    <div className="alert bg-dark text-info border-info text-center mt-5">
                        No hay partidos para auditar.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransparencyWall;