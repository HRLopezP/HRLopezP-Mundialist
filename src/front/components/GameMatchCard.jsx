import React from "react";
import { useCountdown } from "../hooks/useCountdown";
import "../styles/Predictions.css"; 

export const GameMatchCard = ({ match, index }) => {
  const { timeLeft, isMatchStarted } = useCountdown(match.match_date);

  return (
    <div className="accordion-item mb-3 border-0 shadow-sm bg-transparent">
      <h2 className="accordion-header" id={`heading${index}`}>
        <button
          className="accordion-button collapsed py-3"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target={`#collapse${index}`}
          style={{ backgroundColor: "rgba(44, 62, 80, 0.7)", color: "white" }}
        >
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center w-100 me-3">

            {/* BADGE DE TIEMPO*/}
            <div className="status-badge-mobile mb-2 mb-sm-0 order-first order-sm-last ms-sm-3">
              <span className={`badge ${isMatchStarted ? 'bg-success' : 'bg-warning text-dark'} shadow-sm`}>
                {isMatchStarted ? "⚽ EN JUEGO" : `⏳ ${timeLeft}`}
              </span>
            </div>

            {/* CONTENEDOR CENTRAL */}
            <div className="match-main-content d-flex align-items-center justify-content-center flex-grow-1">

              {/* Equipo Local */}
              <div className="team-container-mobile d-flex flex-column flex-sm-row align-items-center text-center me-auto me-sm-4">
                <img src={match.home_flag} alt="home" width="35" className="mb-1 mb-sm-0 me-sm-2 shadow-sm rounded" />
                <span className="match-team-name fw-bold">{match.home_team}</span>
              </div>

              <span className="mx-2 mx-sm-4 fw-bold text-info fs-5">VS</span>

              {/* Equipo Visitante */}
              <div className="team-container-mobile d-flex flex-column flex-sm-row-reverse align-items-center text-center ms-auto ms-sm-4">
                <img src={match.away_flag} alt="away" width="35" className="mb-1 mb-sm-0 ms-sm-2 shadow-sm rounded" />
                <span className="match-team-name fw-bold">{match.away_team}</span>
              </div>

            </div>
          </div>
        </button>
      </h2>

      <div id={`collapse${index}`} className="accordion-collapse collapse" data-bs-parent="#transparencyWall">
        <div className="accordion-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-dark mb-0" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
              <thead>
                <tr className="text-info small">
                  <th className="ps-4">Participante</th>
                  <th className="text-center">Predicción</th>
                </tr>
              </thead>
              <tbody>
                {match.predictions.map((pred, pIdx) => (
                  <tr key={pIdx} className="border-secondary">
                    <td className="ps-4 py-3 small text-white-50">{pred.user}</td>
                    <td className="text-center fw-bold text-info py-3">
                      {pred.h_score} - {pred.a_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};