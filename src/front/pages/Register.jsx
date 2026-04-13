import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Toaster, toast } from "sonner";
import "../styles/auth.css";
import { apiFetch } from "../utils/api"

const initialUserState = {
    name: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: ""
};

const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
    { key: 'lowerCase', label: 'Al menos una letra minúscula', regex: /[a-z]/ },
    { key: 'upperCase', label: 'Al menos una letra mayúscula', regex: /[A-Z]/ },
    { key: 'number', label: 'Al menos un número', regex: /[0-9]/ },
    { key: 'specialChar', label: 'Al menos un carácter especial (!@#$%^&*...)', regex: /[!@#$%^&*()-+\.]/ },
];

const Register = () => {
    const [user, setUser] = useState(initialUserState);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const [passwordValidity, setPasswordValidity] = useState({
        minLength: false, lowerCase: false, upperCase: false, number: false, specialChar: false,
    });

    const navigate = useNavigate();

    const validatePassword = (password) => {
        const newValidity = {};
        passwordRequirements.forEach(req => {
            newValidity[req.key] = req.regex.test(password);
        });
        setPasswordValidity(newValidity);
    };

    const handleChange = ({ target }) => {
        const { name, value } = target;
        setUser(prev => ({ ...prev, [name]: value }));
        if (name === 'password') validatePassword(value);
    };

    const isPasswordValid = Object.values(passwordValidity).every(v => v);
    const isFormIncomplete = !user.email || !user.name || !user.lastname || !isPasswordValid || user.password !== user.confirmPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await apiFetch("/register", {
                method: "POST",
                body: JSON.stringify({
                    name: user.name,
                    lastname: user.lastname,
                    email: user.email,
                    password: user.password
                })
            });

            const data = await res.json();

            if (res && res.ok) {
                toast.success(data.message || "¡Registro exitoso!");
                setTimeout(() => navigate("/login"), 1500);
            } else {
                toast.error(data?.message || "Error al registrar");
            }
        } catch (error) {
            toast.error("Error de conexión con el estadio");
        }
    };

    return (
        <div className="auth-page">
            <Toaster position="top-center" richColors />
            <div className="container d-flex justify-content-center">
                <div className="auth-card w-100" style={{ maxWidth: '500px' }}>
                    <div className="auth-header text-center">
                        <h2 style={{ color: 'var(--pitch-green)' }}>Mundial Elite</h2>
                        <p className="text-dim small mb-0">Crea tu cuenta de vaticinios</p>
                    </div>

                    <div className="p-4">
                        <form onSubmit={handleSubmit}>
                            <div className="mt-3">
                                <label className="auth-label">Nombre</label>
                                <input type="text" name="name" className="form-control auth-input" placeholder="Ej. Lionel" value={user.name} onChange={handleChange} required />
                            </div>

                            <div className="mt-3">
                                <label className="auth-label">Apellido</label>
                                <input type="text" name="lastname" className="form-control auth-input" placeholder="Ej. Messi" value={user.lastname} onChange={handleChange} required />
                            </div>
                            <div className="mt-3">
                                <label className="auth-label">Correo Electrónico</label>
                                <input type="email" name="email" className="form-control auth-input" placeholder="thegoat@ejemplo.com" value={user.email} onChange={handleChange} required />
                            </div>
                            <div className="mt-3">
                                <label className="auth-label">Contraseña</label>
                                <div className="input-group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        className={`form-control auth-input ${user.password.length > 0 && (isPasswordValid ? 'border-success' : 'border-danger')}`}
                                        placeholder="******************"
                                        value={user.password}
                                        onChange={handleChange}
                                        onFocus={() => setIsPasswordFocused(true)}
                                        onBlur={() => setIsPasswordFocused(false)}
                                        required
                                    />
                                    <button type="button" className="btn-icon-inside border-0 rounded" onClick={() => setShowPassword(!showPassword)}>
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>

                                {/* Solo se muestra si el input tiene el foco o si ya hay texto */}
                                {(isPasswordFocused || user.password.length > 0) && (
                                    <div className="mt-2 p-2 rounded bg-dark-soft shadow-sm" style={{ border: '1px solid rgba(255,215,0,0.1)' }}>
                                        {passwordRequirements.map(req => (
                                            <div key={req.key} className="small d-flex align-items-center">
                                                <i className={`fa-solid ${passwordValidity[req.key] ? 'fa-check text-success' : 'fa-xmark text-danger'} me-2`}></i>
                                                <span className="text-dim">{req.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 mb-4">
                                <label className="auth-label">Confirmar Contraseña</label>
                                <div className="input-group">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        className={`form-control auth-input ${user.confirmPassword.length > 0 && (user.password === user.confirmPassword ? 'border-success' : 'border-danger')}`}
                                        placeholder="******************"
                                        value={user.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button type="button" className="btn-icon-inside border-0 rounded" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                                {user.confirmPassword && user.password !== user.confirmPassword && (
                                    <p className="text-danger small mt-1 animate__animated animate__fadeIn">
                                        ¡Las contraseñas no coinciden!
                                    </p>
                                )}
                            </div>

                            <button type="submit" className="btn-emerald w-100" disabled={isFormIncomplete}>
                                Registrarme para el Mundial
                            </button>

                            <div className="text-center mt-4">
                                <Link to="/login" className="text-dim small text-decoration-none hover-gold">
                                    ¿Ya tienes cuenta? Inicia sesión aquí
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;