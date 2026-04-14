import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "../styles/navbar.css";

export const Navbar = ({ user, onLogout }) => {
	const navigate = useNavigate();

	// Imagen por defecto si el usuario no tiene una
	const defaultAvatar = `https://ui-avatars.com/api/?name=${user?.name || 'U'}+${user?.lastname || ''}&background=28c87d&color=fff`;

	return (
		<nav className="navbar navbar-expand-lg custom-navbar sticky-top">
			<div className="container">
				{/* Logo / Título */}
				<Link className="navbar-brand d-flex align-items-center" to="/">
					<i className="fa-solid fa-trophy me-2 text-emerald"></i>
					<span className="brand-text">MUNDIAL <span className="text-emerald">ELITE</span></span>
				</Link>

				<button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
					<i className="fa-solid fa-bars text-white"></i>
				</button>

				<div className="collapse navbar-collapse" id="navbarNav">
					<ul className="navbar-nav ms-auto align-items-center">
						{user ? (
							<li className="nav-item dropdown">
								<a
									className="nav-link dropdown-toggle d-flex align-items-center user-dropdown"
									href="#"
									role="button"
									data-bs-toggle="dropdown"
									aria-expanded="false"
								>
									<div className="nav-avatar-wrapper me-2">
										<img
											src={user.profile || defaultAvatar}
											alt="Perfil"
											className="nav-profile-img"
										/>
									</div>
									<span className="nav-username d-none d-sm-inline">
										{user.name}
									</span>
								</a>
								<ul className="dropdown-menu dropdown-menu-end custom-dropdown animate__animated animate__fadeIn">
									<li className="px-3 py-2 border-bottom border-secondary mb-2">
										<p className="small text-dim mb-0">Sesión iniciada como</p>
										<p className="small fw-bold mb-0 text-white">{user.email}</p>
									</li>
									<li>
										<Link className="dropdown-item" to="/profile">
											<i className="fa-solid fa-user-gear me-2"></i> Mi Perfil
										</Link>
									</li>
									<li><hr className="dropdown-divider opacity-10" /></li>
									<li>
										<button className="dropdown-item text-danger" onClick={onLogout}>
											<i className="fa-solid fa-right-from-bracket me-2"></i> Cerrar Sesión
										</button>
									</li>
								</ul>
							</li>
						) : (
							<div className="d-flex gap-2">
								<Link to="/login" className="btn btn-outline-light btn-sm rounded-pill px-3">Ingresar</Link>
								<Link to="/register" className="btn btn-emerald btn-sm rounded-pill px-3">Registro</Link>
							</div>
						)}
					</ul>
				</div>
			</div>
		</nav>
	);
};