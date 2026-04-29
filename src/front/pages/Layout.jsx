import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import ScrollToTop from "../components/ScrollToTop";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const Layout = () => {
    const { dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    useEffect(() => {
        let timer;

        const logout = () => {
            dispatch({ type: "LOGOUT" });
            navigate("/login");
            console.log("Sesión cerrada por inactividad");
        };

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            // 900,000 milisegundos = 15 minutos
            timer = setTimeout(logout, 900000);
        };

        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer(); 

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
            clearTimeout(timer);
        };
    }, [dispatch, navigate]);

    return (
       <ScrollToTop>
            <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </ScrollToTop>
    );
};