import React from "react";

import "../styles/rules.css";

const Rules = () => {
    return (
        <div className="container py-5 animate__animated animate__fadeIn">
            <div className="row justify-content-center">
                <div className="col-12 col-lg-10">
                    <div className="rules-header text-center mb-5">
                        <i className="fa-solid fa-scroll fa-3x text-emerald mb-3"></i>
                        <h1 className="display-5 fw-bold text-white">Reglamento <span className="text-emerald">ÉLITE</span></h1>
                        <p className="text-dim">Todo lo que necesitas saber para conquistar la gloria.</p>
                    </div>

                    <div className="accordion custom-accordion" id="rulesAccordion">
                        {/* SECCIÓN 1: PUNTUACIÓN */}
                        <div className="accordion-item">
                            <h2 className="accordion-header">
                                <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                                    <i className="fa-solid fa-star me-2 text-warning"></i> Sistema de Puntuación
                                </button>
                            </h2>
                            <div id="collapseOne" className="accordion-collapse collapse show" data-bs-parent="#rulesAccordion">
                                <div className="accordion-body">
                                    <ul className="list-unstyled">
                                        <li className="mb-3">
                                            <span className="badge bg-emerald-pr me-2">1 PT</span>
                                            <strong>Tendencia:</strong> Si aciertas al ganador o si el partido termina en empate.
                                        </li>
                                        <li className="mb-3">
                                            <span className="badge bg-gold-pts me-2">3 PTS</span>
                                            <strong>Marcador Exacto:</strong> Si aciertas el resultado final exacto.
                                        </li>
                                        <li>
                                            <i className="fa-solid fa-circle-info text-info me-2"></i>
                                            En caso de empate en el ranking global, el criterio de desempate será quien tenga <strong>más marcadores exactos</strong>.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: REGLAS DE TIEMPO */}
                        <div className="accordion-item">
                            <h2 className="accordion-header">
                                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                                    <i className="fa-solid fa-clock me-2 text-info"></i> Tiempos y Predicciones
                                </button>
                            </h2>
                            <div id="collapseTwo" className="accordion-collapse collapse" data-bs-parent="#rulesAccordion">
                                <div className="accordion-body">
                                    <p><i className="fa-solid fa-lock text-danger me-2"></i> <strong>Regla de las 24h:</strong> Las predicciones se cierran automáticamente 24 horas antes del inicio del partido.</p>
                                    <p><i className="fa-solid fa-pen-to-square text-success me-2"></i> Puedes actualizar tus pronósticos cuantas veces quieras siempre que falten más de 24 horas.</p>
                                    <p className="small text-dim italic border-top pt-2 mt-2">
                                        * Los puntos se asignan basados en los 90 min reglamentarios (incluye tiempo añadido, no incluye prórrogas o penales).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 3: ADMINISTRACIÓN */}
                        <div className="accordion-item">
                            <h2 className="accordion-header">
                                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree">
                                    <i className="fa-solid fa-user-shield me-2 text-emerald"></i> Registro y Gestión
                                </button>
                            </h2>
                            <div id="collapseThree" className="accordion-collapse collapse" data-bs-parent="#rulesAccordion">
                                <div className="accordion-body">
                                    <p><i className="fa-solid fa-id-card me-2 text-info"></i> Registro obligatorio con <strong>Nombre y Apellido</strong> reales para validar premios.</p>
                                    <p><i className="fa-solid fa-person-circle-check text-emerald"></i> Tras registrarte, contacta al administrador para activar tu acceso.</p>
                                    <p><i className="fa-solid fa-receipt me-2 text-warning"></i> El 10% de la quiniela se reserva para gastos operativos y mantenimiento de la plataforma.</p>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 4: CONSEJOS PRO */}
                        <div className="accordion-item">
                            <h2 className="accordion-header">
                                <button className="accordion-button collapsed bg-dark-soft" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour">
                                    <i className="fa-solid fa-lightbulb me-2 text-warning"></i> Consejos de Experto
                                </button>
                            </h2>
                            <div id="collapseFour" className="accordion-collapse collapse" data-bs-parent="#rulesAccordion">
                                <div className="accordion-body bg-dark-transparent">
                                    <div className="custom-tip-alert mb-3">
                                        <div className="d-flex alert alert-warning align-items-center">
                                            <i className="fa-solid fa-lightbulb me-3 fa-lg text-warning"></i>
                                            <div>
                                                <strong>⚠️ Tip de guardado:</strong> Primero modifica los valores del marcador y LUEGO presiona "Actualizar". Así garantizas que se guardan los resultados.
                                            </div>
                                        </div>
                                    </div>
                                    <ul className="list-group list-group-flush">
                                        <li className="list-group-item bg-transparent text-white border-secondary">
                                            <i className="fa-solid fa-magnifying-glass-chart me-2 text-info"></i> Revisa las predicciones de otros jugadores desde la sección de <strong>Transparencia</strong>. Pero solo puedes verlas cuando falten menos de 24 horas.
                                        </li>
                                        <li className="list-group-item bg-transparent text-white border-secondary">
                                            <i className="fa-solid fa-magnifying-glass-chart me-2 text-info"></i> También puedes ver los resultados de otros jugadores desde el <strong>Ranking</strong> en el botón de <strong>Auditoría</strong>.
                                        </li>
                                        <li className="list-group-item bg-transparent text-white border-0">
                                            <i className="fa-solid fa-calendar-check me-2 text-emerald"></i> Predice todos los juegos pronto para evitar olvidos por la regla de las 24h.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Rules;