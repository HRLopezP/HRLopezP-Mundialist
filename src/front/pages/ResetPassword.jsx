import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { apiFetch } from "../utils/api";
import "../styles/auth.css";

const passwordRequirements = [
    { key: 'minLength', label: '8+ caracteres', regex: /.{8,}/ },
    { key: 'lowerCase', label: 'Minúscula', regex: /[a-z]/ },
    { key: 'upperCase', label: 'Mayúscula', regex: /[A-Z]/ },
    { key: 'number', label: 'Número', regex: /[0-9]/ },
    { key: 'specialChar', label: 'Especial (!@#$...)', regex: /[!@#$%^&*()-+\.]/ },
];

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const isPasswordValid = passwordRequirements.every(req => req.regex.test(password));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isPasswordValid || password !== confirmPassword) return;

        setLoading(true);
        try {
            const { response, data } = await apiFetch("/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, password })
            });

            if (response.ok) {
                toast.success("¡GOL! Contraseña actualizada con éxito.");
                setTimeout(() => navigate("/login"), 3000);
            } else {
                toast.error(data.message || "El token expiró. Pide un nuevo pase.");
            }
        } catch (error) {
            toast.error("Error en la conexión con el estadio.");
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
                                <h2 style={{color: 'var(--pitch-green)'}}>Nueva Contraseña</h2>
                                <p className="text-white-50">Asegura tu cuenta para el próximo partido</p>
                            </div>

                            <div className="p-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="auth-label mb-2">Nueva Contraseña</label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control auth-input border-end-0"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                            <button 
                                                className="btn auth-input border-start-0" 
                                                type="button" 
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{color: 'var(--pitch-green)'}}></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Requisitos Visuales */}
                                    <div className="mb-3 p-3 rounded" style={{background: 'rgba(255,255,255,0.05)'}}>
                                        {passwordRequirements.map(req => (
                                            <div key={req.key} className="small mb-1">
                                                <i className={`fas ${req.regex.test(password) ? 'fa-check-circle text-success' : 'fa-circle-xmark text-danger'} me-2`}></i>
                                                <span className={req.regex.test(password) ? 'text-success' : 'text-white-50'}>{req.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mb-4">
                                        <label className="auth-label mb-2">Confirmar Contraseña</label>
                                        <input
                                            type="password"
                                            className={`form-control auth-input ${password !== confirmPassword && confirmPassword ? 'border-danger' : ''}`}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="btn-emerald w-100 py-3" 
                                        disabled={loading || !isPasswordValid || password !== confirmPassword}
                                    >
                                        {loading ? "PROCESANDO..." : "ACTUALIZAR CONTRASEÑA"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;