import React from "react";
import { useCountdown } from "../hooks/useCountdown";

export const GameMatchCard = ({ match, index }) => {
  const { timeLeft, isMatchStarted } = useCountdown(match.match_date);

  return (
    <div className="accordion-item mb-3 border-0 shadow-sm">
      <h2 className="accordion-header" id={`heading${index}`}>
        <button
          className="accordion-button collapsed py-3"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target={`#collapse${index}`}
          style={{ backgroundColor: "#2c3e50", color: "white" }} 
        >
          <div className="d-flex justify-content-between align-items-center w-100 me-3">
            <div className="d-flex align-items-center">
              <img src={match.home_flag} alt="home" width="30" className="me-2" />
              <span className="fw-bold">{match.home_team} vs {match.away_team}</span>
              <img src={match.away_flag} alt="away" width="30" className="ms-2" />
            </div>
            <span className={`badge ${isMatchStarted ? 'bg-success' : 'bg-warning text-dark'}`}>
              {timeLeft}
            </span>
          </div>
        </button>
      </h2>
      <div id={`collapse${index}`} className="accordion-collapse collapse" data-bs-parent="#transparencyWall">
        <div className="accordion-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Participante</th>
                  <th className="text-center">Predicción</th>
                </tr>
              </thead>
              <tbody>
                {match.predictions.map((pred, pIdx) => (
                  <tr key={pIdx}>
                    <td className="ps-4 py-3">{pred.user}</td>
                    <td className="text-center fw-bold text-primary py-3">
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