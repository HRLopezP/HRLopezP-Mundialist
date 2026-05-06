import React from "react";
import { Link } from "react-router-dom";
import "../styles/footer.css";

export const Footer = () => {
    return (
        <footer className="footer-hrlp mt-auto py-3">
            <div className="container-fluid px-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 text-muted-custom">

                    {/* Branding */}
                    <div className="d-flex align-items-center gap-2 order-2 order-md-1">
                        <i className="fa fa-soccer-ball-o accent-text"></i>
                        <span className="brand-text">Quiniela <span className="accent-text">HRLP</span></span>
                        <span className="divider d-none d-md-inline">|</span>
                        <span>&copy; {new Date().getFullYear()}</span>
                    </div>

                    {/* Navegación */}
                    <div className="d-flex align-items-center gap-4 order-1 order-md-2">
                        <Link to="/rules" className="link-custom">Reglas</Link>
                        <Link to="/ranking" className="link-custom">Ranking</Link>
                    </div>

                    {/* Autoría */}
                    <div className="d-flex align-items-center order-3">
                        <span className="small">Desarrollado por <strong className="author-text">Héctor López</strong></span>
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