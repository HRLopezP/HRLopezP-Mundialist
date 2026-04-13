import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { apiFetch } from "../utils/api";
import "../styles/auth.css";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { response, data } = await apiFetch("/request-password-reset", {
                method: "POST",
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                toast.success("¡Pase enviado! Revisa tu correo.");
                setIsSent(true);
            } else {
                toast.error(data.message || "No pudimos encontrar ese jugador en el sistema.");
            }
        } catch (error) {
            toast.error("Error de conexión. El VAR está revisando el sistema.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <Toaster position="top-center" richColors />
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-12 col-md-6 col-lg-5">
                        <div className="auth-card">
                            <div className="auth-header">
                                <h2 className="mb-0" style={{ color: 'var(--pitch-green)' }}>¿Perdiste tu Acceso?</h2>
                                <p className="text-white-50">Te enviaremos un nuevo pase por correo</p>
                            </div>

                            <div className="p-4">
                                {!isSent ? (
                                    <form onSubmit={handleSubmit}>
                                        <p className="instruction-text text-center mb-4">
                                            Ingresa tu correo y te enviaremos un enlace seguro para restablecer tu contraseña.
                                        </p>
                                        <div className="mb-4">
                                            <label className="auth-label mb-2">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                className="form-control auth-input"
                                                placeholder="thegoat@email.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn-emerald w-100 py-3"
                                            disabled={loading}
                                        >
                                            {loading ? "Enviando..." : "SOLICITAR RECUPERACIÓN"}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="mb-3">
                                            <i className="fa-solid fa-envelope-circle-check fa-4x" style={{ color: 'var(--pitch-green)' }}></i>
                                        </div>
                                        <h4 className="text-white">¡Correo en el área!</h4>
                                        <p className="text-white-50">
                                            Hemos enviado instrucciones a <strong>{email}</strong>.
                                            Revisa tu bandeja de entrada.
                                        </p>
                                        <button className="btn btn-link text-decoration-none" onClick={() => setIsSent(false)} style={{ color: 'var(--accent-gold)' }}>
                                            ¿No recibiste nada? Intentar de nuevo
                                        </button>
                                    </div>
                                )}

                                <div className="mt-4 text-center">
                                    <Link to="/login" className="text-white-50 small text-decoration-none">
                                        <i className="fas fa-arrow-left me-2"></i>Volver a la cancha (Login)
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;