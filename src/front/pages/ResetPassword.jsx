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
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [loading, setLoading] = useState(false);

    const [passwordValidity, setPasswordValidity] = useState({
        minLength: false, lowerCase: false, upperCase: false, number: false, specialChar: false,
    });

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);

        const newValidity = {};
        passwordRequirements.forEach(req => {
            newValidity[req.key] = req.regex.test(value);
        });
        setPasswordValidity(newValidity);
    };

    const isPasswordValid = Object.values(passwordValidity).every(isValid => isValid);
    const shouldShowRequirements = isPasswordFocused || password.length > 0;
    const passwordsDoNotMatch = confirmPassword.length > 0 && password !== confirmPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isPasswordValid) return toast.error("La contraseña no es segura.");
        if (password !== confirmPassword) return toast.error("Las contraseñas no coinciden.");

        setLoading(true);
        try {
            const { response, data } = await apiFetch("/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, password })
            });

            if (response.ok) {
                toast.success("¡Contraseña actualizada! Entrando al campo de juego...");
                setTimeout(() => navigate("/login"), 3000);
            } else {
                toast.error(data.message || "El pase ha expirado. Solicita uno nuevo.");
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
                                <h2 style={{ color: 'var(--pitch-green)' }}>Nueva Contraseña</h2>
                                <p className="text-white-50">Asegura tu cuenta para el próximo partido</p>
                            </div>

                            <div className="p-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-5">
                                        <label className="auth-label mb-0">Contraseña Nueva</label>
                                        <div className="password-container">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className={`form-control auth-input ${password.length > 0 && (isPasswordValid ? 'border-success' : 'border-danger')}`}
                                                value={password}
                                                onFocus={() => setIsPasswordFocused(true)}
                                                onBlur={() => setIsPasswordFocused(false)}
                                                onChange={handlePasswordChange}
                                                placeholder="Mínimo 8 caracteres"
                                                required
                                            />
                                            <button
                                                className="btn-icon-inside border-0 bg-transparent"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ color: 'var(--text-dim)' }}></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Requisitos visuales dinámicos */}
                                    {shouldShowRequirements && (
                                        <div className="mb-3 p-3 rounded" style={{ background: 'rgba(255,255,255,0.05)', animation: 'fadeIn 0.3s ease' }}>
                                            <ul className="list-unstyled mb-0">
                                                {passwordRequirements.map(req => {
                                                    const isCompleted = passwordValidity[req.key];
                                                    return (
                                                        <li key={req.key} className="small mb-1 d-flex align-items-center">
                                                            <i className={`fas ${passwordValidity[req.key] ? 'fa-check-circle text-success' : 'fa-circle-xmark text-danger'} me-2`} style={{ color: isCompleted ? 'var(--accent-color)' : '#e63946', fontSize: '0.8rem' }}></i>
                                                            <span className={passwordValidity[req.key] ? 'text-success' : 'text-white-50'}>
                                                                {req.label}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="mb-5">
                                        <label className="auth-label mb-0">Confirmar Contraseña</label>
                                        <div className="password-container">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                className={`form-control auth-input ${confirmPassword.length > 0 && (password === confirmPassword ? 'border-success' : 'border-danger')}`}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Repite tu contraseña"
                                                required
                                            />
                                            <button
                                                className="btn-icon-inside border-0 bg-transparent"
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ color: 'var(--text-dim)' }}></i>
                                            </button>
                                        </div>
                                        {passwordsDoNotMatch && (
                                            <small className="text-danger mt-1 d-block">Las contraseñas no coinciden</small>
                                        )}
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