import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { GameMatchCard } from "../components/GameMatchCard";
import { generateTransparencyReport } from "../utils/transparencyPdf";
import Pagination from "../components/Pagination";
import { Toaster, toast } from "sonner";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { getRolFromToken } from "../utils/auth";
import "../styles/Predictions.css";

const TransparencyWall = () => {
    const { store } = useGlobalReducer();
    const isAdmin = getRolFromToken() === "Administrador";

    const [matches, setMatches]       = useState([]);
    const [groups, setGroups]         = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [loading, setLoading]       = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [pagesMap, setPagesMap] = useState({});

    const PER_PAGE = 10;

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
        if (activeGroup !== null) {
            setPagesMap({});   
            loadData(1);
        }
    }, [activeGroup]);

    const loadData = async (page = 1) => {
        try {
            setLoading(true);
            const groupParam = isAdmin && activeGroup ? `&group_id=${activeGroup}` : "";
            const url = `/transparency-wall?page=${page}&per_page=${PER_PAGE}${groupParam}`;
            const { response, data } = await apiFetch(url);
            if (response.ok) {
                setMatches(data);
                const initialPages = {};
                data.forEach(m => { initialPages[m.id_match] = page; });
                setPagesMap(initialPages);
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
            const url = `/transparency-wall?page=${newPage}&per_page=${PER_PAGE}${groupParam}`;
            const { response, data } = await apiFetch(url);
            if (response.ok) {
                const updatedMatch = data.find(m => m.id_match === matchId);
                if (updatedMatch) {
                    setMatches(prev =>
                        prev.map(m => m.id_match === matchId ? updatedMatch : m)
                    );
                    setPagesMap(prev => ({ ...prev, [matchId]: newPage }));
                }
            }
        } catch {
            toast.error("Error al cambiar de página");
        }
    }, [isAdmin, activeGroup]);


    const filteredMatches = matches
        .map(match => ({
            ...match,
            predictions: match.predictions.filter(p =>
                p.user.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }))
        .filter(match => match.predictions.length > 0 || searchTerm === "");

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="spinner-border text-info" role="status"></div>
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

            {/* Buscador y Botón PDF */}
            <div className="row justify-content-center align-items-center g-3 mb-4">
                <div className="col-12 col-md-6">
                    <div className="position-relative">
                        <input
                            type="text"
                            className="form-control search-input-glass"
                            placeholder="Buscar rival por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-12 text-center d-flex justify-content-between align-items-center gap-2">
                    <p className="text-dim mb-0 small">
                        <i className="fas fa-info-circle me-1 text-info"></i>
                        Haz click para auditar
                    </p>
                    {!loading && matches.length > 0 && (
                        <button
                            className="btn btn-sm btn-outline-info rounded-pill px-3 py-1"
                            style={{ fontSize: '0.75rem', borderWidth: '1px' }}
                            onClick={() => generateTransparencyReport(filteredMatches)}
                        >
                            <i className="fas fa-file-pdf me-1"></i> DESCARGAR PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Partidos con paginación individual por partido */}
            <div className="accordion accordion-flush bg-transparent" id="transparencyWall">
                {filteredMatches.length > 0 ? (
                    filteredMatches.map((match, index) => (
                        <div key={match.id_match}>
                            <GameMatchCard match={match} index={index} />

                            {/* Paginación debajo de cada partido */}
                            {match.predictions_pages > 1 && (
                                <div className="px-3 pb-3">
                                    <Pagination
                                        total={match.predictions_total}
                                        pages={match.predictions_pages}
                                        currentPage={pagesMap[match.id_match] || 1}
                                        perPage={PER_PAGE}
                                        itemsCount={match.predictions.length}
                                        onPageChange={(newPage) =>
                                            handleMatchPageChange(match.id_match, newPage)
                                        }
                                    />
                                </div>
                            )}
                        </div>
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