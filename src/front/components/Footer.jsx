import React from "react";
import "../styles/footer.css"; 

export const Footer = () => {
	return (
		<footer className="footer-hrlp mt-auto py-2">
			<div className="container-fluid px-4">
				<div className="d-flex flex-wrap justify-content-between align-items-center text-muted-custom">

					{/* Branding */}
					<div className="d-flex align-items-center gap-2">
						<i className="fa fa-soccer-ball-o me-2 accent-text"></i>
						<span className="brand-text">Quiniela <span className="accent-text">HRLP</span></span>
						<span className="d-none d-sm-inline divider">|</span>
						<span>&copy; {new Date().getFullYear()}</span>
					</div>

					{/* Navegación */}
					<div className="d-flex align-items-center gap-3">
						<a href="/rules" className="link-custom">Reglas</a>
						<a href="/ranking" className="link-custom">Ranking</a>
					</div>

					{/* Autoría */}
					<div className="d-flex align-items-center">
						<span>Desarrollado por <strong className="author-text">Héctor López</strong></span>
						<a
							href="https://github.com/HRLopezP"
							target="_blank"
							rel="noopener noreferrer"
							className="accent-text ms-2"
						>
							<i className="fab fa-github fa-lg"></i>
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
};