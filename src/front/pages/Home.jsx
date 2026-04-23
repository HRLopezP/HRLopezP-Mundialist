import React from "react";
import "../styles/home.css";

export const Home = () => {
    return (
        <div className="container-fluid pb-5">
            <div className="row justify-content-center mt-4">
                <div className="col-12 col-lg-9">

                    <div className="banner-container">
                        {/* La Imagen de Fondo */}
                        <img
                            src="https://res.cloudinary.com/dowqpndnq/image/upload/v1776978362/Home_elite_idjkpm.png"
                            alt="Mundial Élite"
                            className="banner-img"
                        />

                        {/* Título Superior */}
                        <div className="banner-title">
                            <h1 className="title-main">¡MUNDIAL ÉLITE!</h1>
                            <p className="title-sub">¡TU CAMINO A LA GLORIA!</p>
                        </div>

                        {/* Contenido Lateral Izquierdo */}
                        <div className="banner-overlay-left d-none d-md-block">
                            <h2 className="text-elite">
                                ¡DEMUESTRA<br />que eres el<br /><span>ÉLITE!</span>
                            </h2>
                            <p className="text-description">
                                Participa, Predice y Conquista la Gloria Mundial.
                            </p>

                            <div className="banner-buttons">
                                <button className="btn btn-outline-info rounded-pill px-4 mt-1 border-0">
                                    <i className="fas fa-gavel reglamento-icon"></i>
                                    Ver Reglamento ÉLITE
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};