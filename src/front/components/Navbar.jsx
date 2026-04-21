import React from "react";
import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { toast } from "sonner";
import "../styles/navbar.css";

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch({ type: "LOGOUT" });
        toast.success("¡Sesión cerrada! Vuelve pronto.");
        navigate("/login");
    };

    const getShortName = () => {
        if (!store.user) return "Usuario";
        const firstName = store.user.name ? store.user.name.split(' ')[0] : "";
        const firstLastName = store.user.lastname ? store.user.lastname.split(' ')[0] : "";
        return `${firstName} ${firstLastName}`;
    };

    const defaultAvatar = `https://ui-avatars.com/api/?name=${store.user?.name || 'U'}+${store.user?.lastname || ''}&background=28c87d&color=fff`;

    return (
        <nav className="navbar navbar-expand-lg custom-navbar sticky-top shadow-sm">
            <div className="container">
                <Link className="navbar-brand d-flex align-items-center me-0" to="/">
                    <i className="fa-solid fa-trophy me-2 text-emerald animate__animated animate__pulse animate__infinite"></i>
                    {/* Ocultamos "ELITE" en pantallas muy pequeñas para ganar espacio */}
                    <span className="brand-text">MUNDIAL <span className="text-emerald d-none d-sm-inline">ELITE</span></span>
                </Link>

                {!store.user && (
                    <div className="d-flex d-lg-none ms-auto me-2 align-items-center">
                        <Link to="/login" className="btn btn-login-custom rounded-pill me-1">
                            Ingresar
                        </Link>
                        <Link to="/register" className="btn btn-register-custom rounded-pill">
                            Unirse
                        </Link>
                    </div>
                )}

                <button
                    className="navbar-toggler border-0"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <i className="fa-solid fa-bars-staggered text-white"></i>
                </button>


                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto align-items-center gap-2">

                        {/* --- RUTAS PARA TODOS LOS LOGUEADOS --- */}
                        {store.user && (
                            <>
                                <li className="nav-item w-100">
                                    <Link className="nav-link px-3 py-2 rounded-pill transition-all" to="/predictions">
                                        <i className="fa-solid fa-futbol me-2 text-emerald"></i> Mis Predicciones
                                    </Link>
                                </li>
                                <li className="nav-item w-100">
                                    <Link className="nav-link px-3 py-2 rounded-pill transition-all" to="/transparency-wall">
                                        <i className="fa-solid fa-shield-halved me-2 text-emerald"></i> Transparencia
                                    </Link>
                                </li>
                                <li className="nav-item w-100">
                                    <Link className="nav-link px-3 py-2 rounded-pill transition-all" to="/ranking">
                                        <i className="fa-solid fa-chart-line me-2 text-emerald"></i> Ranking
                                    </Link>
                                </li>

                                {/* --- RUTAS DE ADMINISTRADOR --- */}
                                {store.user?.rol === "Administrador" && (
                                    <li className="nav-item dropdown w-100">
                                        <a
                                            className="nav-link dropdown-toggle px-3 py-2 rounded-pill btn-admin-hover"
                                            href="#"
                                            role="button"
                                            data-bs-toggle="dropdown"
                                        >
                                            <i className="fa-solid fa-gears me-2 text-warning"></i> Gestión
                                        </a>
                                        <ul className="dropdown-menu dropdown-menu-dark border-secondary shadow-lg">
                                            <li>
                                                <Link className="dropdown-item py-2" to="/admin/users">
                                                    <i className="fa-solid fa-users-gear me-2"></i> Usuarios
                                                </Link>
                                            </li>
                                            <li>
                                                <Link className="dropdown-item py-2" to="/admin/roles">
                                                    <i className="fa-solid fa-user-shield me-2"></i> Roles
                                                </Link>
                                            </li>
                                            <li>
                                                <Link className="dropdown-item py-2" to="/admin/matches">
                                                    <i className="fa-solid fa-calendar-check me-2"></i> Partidos
                                                </Link>
                                            </li>
                                        </ul>
                                    </li>
                                )}
                            </>
                        )}

                        {!store.user ? (
                            <div className="d-none d-lg-flex gap-2 ms-lg-3">
                                <Link to="/login" className="btn btn-login-custom rounded-pill">
                                    Ingresar
                                </Link>
                                <Link to="/register" className="btn btn-register-custom rounded-pill">
                                    Registrarme
                                </Link>
                            </div>
                        ) : (
                            <li className="nav-item dropdown ms-lg-3 w-100">
                                <a className="nav-link d-flex align-items-center user-profile-pill px-2" href="#" role="button" data-bs-toggle="dropdown">
                                    <div className="nav-avatar-wrapper me-2">
                                        <img src={store.user?.profile || defaultAvatar} alt="Perfil" className="nav-profile-img" />
                                    </div>
                                    <span className="nav-username me-2">{getShortName()}</span>
                                    <i className="fa-solid fa-chevron-down small opacity-50"></i>
                                </a>
                                <ul className="dropdown-menu dropdown-menu-end dropdown-menu-dark custom-dropdown animate__animated animate__fadeIn">
                                    <li className="px-3 py-2 border-bottom border-secondary mb-2">
                                        <p className="small text-white mb-0">Cuenta de:</p>
                                        <p className="small fw-bold mb-0 text-emerald">{store.user?.email}</p>
                                    </li>
                                    <li><Link className="dropdown-item py-2" to="/profile"><i className="fa-solid fa-id-card me-2"></i> Perfil</Link></li>
                                    <li><hr className="dropdown-divider opacity-10" /></li>
                                    <li><button className="dropdown-item text-danger py-2" onClick={handleLogout}><i className="fa-solid fa-power-off me-2"></i> Cerrar Sesión</button></li>
                                </ul>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};