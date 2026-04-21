import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { GameMatchCard } from "../components/GameMatchCard";
import { generateTransparencyReport } from "../utils/transparencyPdf";
import { toast } from "sonner";

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

    // Filtrar por nombre de usuario si se desea buscar a alguien específico
    const filteredMatches = matches.map(match => ({
        ...match,
        predictions: match.predictions.filter(p =>
            p.user.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(match => match.predictions.length > 0);

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container mt-4 mb-5" style={{ maxWidth: "800px" }}>
            <div className="text-center mb-4">
                <h2 className="fw-bold" style={{ color: "#2c3e50" }}>Muro de Transparencia</h2>
                <p className="text-muted">Predicciones visibles 24h antes del pitazo inicial.</p>
                {!loading && matches.length > 0 && (
                    <button
                        className="btn btn-outline-success btn-sm shadow-sm mt-2"
                        onClick={() => generateTransparencyReport(filteredMatches)}
                    >
                        📥 Descargar PDF de Transparencia
                    </button>
                )}
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    className="form-control shadow-sm"
                    placeholder="🔍 Buscar rival por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="accordion shadow-sm" id="transparencyWall">
                {filteredMatches.length > 0 ? (
                    filteredMatches.map((match, index) => (
                        <GameMatchCard key={match.id_match} match={match} index={index} />
                    ))
                ) : (
                    <div className="alert alert-info text-center">
                        No hay partidos disponibles en el muro en este momento.
                    </div>
                )}
            </div>
        </div>
    );
};