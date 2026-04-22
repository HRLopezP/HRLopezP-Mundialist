import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { GameMatchCard } from "../components/GameMatchCard";
import { generateTransparencyReport } from "../utils/transparencyPdf";
import { Toaster, toast } from "sonner";
import "../styles/Predictions.css"; // Reutilizamos el CSS

export const TransparencyWall = () => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const loadData = async () => {
        try {
            const { response, data } = await apiFetch("/transparency-wall");
            if (response.ok) {
                setMatches(data);
            } else {
                toast.error("Error al cargar el muro");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredMatches = matches.map(match => ({
        ...match,
        predictions: match.predictions.filter(p =>
            p.user.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(match => match.predictions.length > 0);

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
            </div>

            {/* Buscador y Botón PDF en una misma zona */}
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
                    
                    {/* Botón PDF a un ladito, más pequeño y elegante */}
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

            <div className="accordion accordion-flush bg-transparent" id="transparencyWall">
                {filteredMatches.length > 0 ? (
                    filteredMatches.map((match, index) => (
                        <div className="accordion-item" key={match.id_match}>
                            {/* IMPORTANTE: Aquí GameMatchCard debe manejar las clases 
                                .match-row-mobile y .team-container-mobile para el ajuste de banderas 
                            */}
                            <GameMatchCard match={match} index={index} />
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