import React from "react";
import { Link } from "react-router-dom"; // Importante para la navegación
import "../styles/home.css";

export const Home = () => {
    return (
        <div className="container-fluid pb-5 animate__animated animate__fadeIn">
            <div className="row justify-content-center mt-4">
                <div className="col-12 col-lg-9">
                    <div className="banner-container shadow-lg">
                        <img
                            src="https://res.cloudinary.com/dowqpndnq/image/upload/v1776978362/Home_elite_idjkpm.png"
                            alt="Mundial Élite"
                            className="banner-img"
                        />

                        <div className="banner-title">
                            <h1 className="title-main">¡MUNDIAL ÉLITE!</h1>
                            <p className="title-sub">¡TU CAMINO A LA GLORIA!</p>
                        </div>

                        <div className="banner-overlay-left d-none d-md-block">
                            <h2 className="text-elite">
                                ¡DEMUESTRA<br />que eres el<br /><span>ÉLITE!</span>
                            </h2>
                            <p className="text-description">
                                Participa, Predice y Conquista la Gloria Mundial.
                            </p>

                            <div className="banner-buttons">
                                {/* Ahora el botón es un enlace real */}
                                <Link to="/ranking" className="btn btn-predict">
                                    ¡HACER MIS PREDICCIONES!
                                </Link>
                                
                                <button className="btn btn-link text-info text-decoration-none p-0 mt-2">
                                    <i className="fas fa-gavel me-2"></i>
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