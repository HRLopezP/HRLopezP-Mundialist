import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { apiFetch } from "../utils/api"
import { Toaster, toast } from "sonner";
import "../styles/auth.css";

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { response, data } = await apiFetch('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                dispatch({ type: "LOGIN", payload: { token: data.token, user: data.user } });
                toast.success(`¡Bienvenido de nuevo, ${data.user.name}!`);
                navigate("/");
            } else {
                toast.error(data.message || "Credenciales incorrectas");
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor");
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
                        <div className="auth-card animate__animated animate__fadeIn">
                            <div className="auth-header">
                                <h2 className="text-pitch-green fw-bold">ÉLITE <span className="text-emerald d-sm-inline">MUNDIALISTA</span></h2>
                                <p className="text-dim">Ingresa a tu panel de control</p>
                            </div>

                            <div className="p-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label className="auth-label mb-2">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            className="form-control auth-input"
                                            placeholder="thegoat@ejemplo.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="auth-label mb-2">Contraseña</label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control auth-input"
                                                placeholder="**********"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="btn-icon-inside border-0 rounded"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-4 d-flex justify-content-end">
                                        <Link
                                            to="/forgot-password"
                                            className="text-dim small text-decoration-none hover-gold animate__animated animate__fadeIn"
                                            style={{ fontSize: "0.8rem" }}
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </Link>
                                    </div>

                                    <button type="submit" className="btn-emerald w-100" disabled={loading}>
                                        {loading ? "Verificando entrada..." : "Iniciar Sesión"}
                                    </button>
                                </form>


                                <div className="mt-4 text-center">
                                    <Link to="/register" className="text-dim small text-decoration-none hover-gold">
                                        ¿Aún no tienes entrada? Regístrate aquí
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default Login;