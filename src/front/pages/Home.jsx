import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../utils/api";
import useGlobalReducer from "../hooks/useGlobalReducer";
import Pagination from "../components/Pagination.jsx";
import { getRolFromToken } from "../utils/auth";
import "../styles/home.css";

// ─── Alcancía animada ────────────────────────────────────────────────────────
const PrizePoolPiggyBank = ({ prizePool, entryFee, activeCount }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 200);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            className={`prize-pool-card ${visible ? "prize-pool-card--visible" : ""}`}
            title={`${activeCount} participantes × $${entryFee} c/u`}
        >
            <div className="piggy-wrapper">
                <span className="piggy-icon" role="img" aria-label="premio">🏆</span>
                <span className="coin coin--1">💰</span>
                <span className="coin coin--2">💰</span>
                <span className="coin coin--3">💰</span>
            </div>
            <div className="prize-pool-info">
                <p className="prize-pool-label">Bolsa acumulada</p>
                <p className="prize-pool-amount">
                    <AnimatedNumber value={prizePool} />
                </p>
                <p className="prize-pool-sub">
                    {activeCount} participantes × ${entryFee.toFixed(2)} c/u
                </p>
            </div>
        </div>
    );
};

// ─── Número animado ──────────────────────────────────────────────────────────
const AnimatedNumber = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const elementRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setHasStarted(true); },
            { threshold: 0.5 }
        );
        if (elementRef.current) observer.observe(elementRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!hasStarted) return;
        let start = 0;
        const end = parseFloat(value);
        const increment = end / (2000 / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) { setDisplayValue(end); clearInterval(timer); }
            else setDisplayValue(start);
        }, 16);
        return () => clearInterval(timer);
    }, [hasStarted, value]);

    return (
        <span ref={elementRef}>
            {displayValue.toLocaleString("es-MX", {
                style: "currency", currency: "MXN", minimumFractionDigits: 2
            })}
        </span>
    );
};

// ─── Tarjeta de participante ─────────────────────────────────────────────────
const RivalCard = ({ member, rank }) => {
    const medalMap = { 1: "🥇", 2: "🥈", 3: "🥉" };
    const medal = medalMap[rank] || null;

    return (
        <div className={`rival-card ${member.is_me ? "rival-card--me" : ""}`}>
            {medal && <span className="rival-medal">{medal}</span>}
            <img
                src={member.profile}
                alt={`${member.name} ${member.lastname}`}
                className="rival-avatar"
                onError={(e) => {
                    const initials = `${member.name[0]}${member.lastname[0]}`.toUpperCase();
                    e.target.src = `https://ui-avatars.com/api/?name=${initials}&size=128&background=random&rounded=true`;
                }}
            />
            <p className="rival-name">
                {member.is_me ? "⭐ Tú" : `${member.name} ${member.lastname}`}
            </p>
            <p className="rival-points">{member.total_points} pts</p>
        </div>
    );
};

// ─── Home principal ──────────────────────────────────────────────────────────
export const Home = () => {
    const { store } = useGlobalReducer();
    const isLoggedIn  = !!store.user;
    const isAdmin = getRolFromToken() === "Administrador"; 

    const [groupInfo,    setGroupInfo]    = useState(null);
    const [loadingGroup, setLoadingGroup] = useState(false);
    const [groups,       setGroups]       = useState([]);
    const [activeGroup,  setActiveGroup]  = useState(null);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const PER_PAGE = 9;

    // ── Reacciona a login / logout ───────────────────────────────────────────
    useEffect(() => {
        if (!isLoggedIn) {
            setGroupInfo(null);
            setGroups([]);
            setActiveGroup(null);
            setCurrentPage(1);
            return;
        }
        if (isAdmin) loadAdminGroups();
        else fetchGroupInfo(null, 1);
    }, [isLoggedIn, store.user?.id_user]);

    // ── Admin: cargar lista de grupos ────────────────────────────────────────
    const loadAdminGroups = async () => {
        try {
            const { response, data } = await apiFetch("/groups");
            if (response.ok && data.length > 0) {
                setGroups(data);
                const defaultId = store.user?.group_id
                    ? (data.find(g => g.id_group === store.user.group_id)?.id_group ?? data[0].id_group)
                    : data[0].id_group;
                setActiveGroup(defaultId);
            }
        } catch (_) {}
    };

    // ── Cuando admin cambia de tab → resetear página ─────────────────────────
    useEffect(() => {
        if (isAdmin && activeGroup !== null) {
            setCurrentPage(1);
            fetchGroupInfo(activeGroup, 1);
        }
    }, [activeGroup]);

    // ── Fetch principal ──────────────────────────────────────────────────────
    const fetchGroupInfo = async (groupId, page = currentPage) => {
        setLoadingGroup(true);
        try {
            const base = (isAdmin && groupId)
                ? `/group/my-info?group_id=${groupId}`
                : "/group/my-info";
            const url = `${base}${base.includes("?") ? "&" : "?"}page=${page}&per_page=${PER_PAGE}`;

            const { response, data } = await apiFetch(url);
            if (response.ok) setGroupInfo(data);
            else setGroupInfo(null);
        } catch (_) {
            setGroupInfo(null);
        } finally {
            setLoadingGroup(false);
        }
    };

    // ── Cambio de página ─────────────────────────────────────────────────────
    const handlePageChange = (page) => {
        setCurrentPage(page);
        fetchGroupInfo(isAdmin ? activeGroup : null, page);
        // Scroll suave hasta la sección de rivales
        document.getElementById("rivals-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const rivals = groupInfo?.members?.filter((m) => !m.is_me) ?? [];

    // Rango real de items mostrados (para el label de Pagination)
    const shownCount = groupInfo?.members?.length ?? 0;

    return (
        <div className="container-fluid pb-5 animate__animated animate__fadeIn">
            <div className="row justify-content-center mt-4">
                <div className="col-12 col-lg-9">

                    {/* ── Banner ── */}
                    <div className="banner-container shadow-lg">
                        <img
                            src="https://res.cloudinary.com/dowqpndnq/image/upload/v1776978362/Home_elite_idjkpm.png"
                            alt="Mundial Élite"
                            className="banner-img"
                        />
                        <div className="banner-title">
                            <h1 className="title-main">¡ÉLITE MUNDIALISTA!</h1>
                            <p className="title-sub">¡TU CAMINO A LA GLORIA!</p>
                        </div>
                        <div className="banner-overlay-left d-none d-md-block">
                            <h2 className="text-elite">
                                ¡DEMUESTRA<br />que eres el<br /><span>Mejor!</span>
                            </h2>
                            <p className="text-description">
                                Participa, Predice y Conquista la Gloria Mundial.
                            </p>
                            <div className="banner-buttons">
                                <Link to="/predictions" className="btn btn-predict">
                                    ¡HACER MIS PREDICCIONES!
                                </Link>
                                <Link to="/rules" className="btn btn-outline-info rounded-pill px-4 mt-1 border-0">
                                    <i className="fas fa-gavel reglamento-icon"></i>
                                    Ver Reglamento ÉLITE
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* ── Sección grupo ── */}
                    {isLoggedIn && (
                        <div id="rivals-section" className="group-section mt-5 animate__animated animate__fadeInUp">

                            {/* Tabs admin */}
                            {isAdmin && groups.length > 0 && (
                                <div className="group-tabs-container mb-4">
                                    {groups.map(g => (
                                        <button
                                            key={g.id_group}
                                            className={`tab-btn ${activeGroup === g.id_group ? "active" : ""}`}
                                            onClick={() => setActiveGroup(g.id_group)}
                                        >
                                            {g.name_group}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Skeleton */}
                            {loadingGroup && (
                                <div className="rivals-grid">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="rival-card rival-card--skeleton">
                                            <div className="skeleton-avatar"></div>
                                            <div className="skeleton-line"></div>
                                            <div className="skeleton-line skeleton-line--short"></div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Contenido */}
                            {!loadingGroup && groupInfo && (
                                <>
                                    {/* Bolsa */}
                                    {groupInfo.entry_fee > 0 && (
                                        <PrizePoolPiggyBank
                                            prizePool={groupInfo.prize_pool}
                                            entryFee={groupInfo.entry_fee}
                                            activeCount={groupInfo.active_count}
                                        />
                                    )}

                                    {/* Encabezado */}
                                    <div className="group-header mt-4">
                                        <h3 className="group-title">
                                            <i className="fa-solid fa-people-group me-2 text-emerald"></i>
                                            Jugadores listos para ·{" "}
                                            <span className="text-emerald">La Élite Mundialista</span>
                                        </h3>
                                        <p className="group-sub text-dim">
                                            {rivals.length > 0
                                                ? `Tienes ${groupInfo.active_count - 1} rival${groupInfo.active_count - 1 !== 1 ? "es" : ""} expertos. ¡Supéralos!`
                                                : "Aún eres el único en tu grupo. ¡Espera a tus rivales!"}
                                        </p>
                                    </div>

                                    {/* Grid de tarjetas */}
                                    {groupInfo.members.length > 0 && (
                                        <div className="rivals-grid">
                                            {groupInfo.members.map((member, index) => {
                                                // El rank real considera la página actual
                                                const globalRank = (currentPage - 1) * PER_PAGE + index + 1;
                                                return (
                                                    <RivalCard
                                                        key={member.id_user}
                                                        member={member}
                                                        rank={globalRank}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Paginación — solo si hay más de una página */}
                                    {groupInfo.pages > 1 && (
                                        <Pagination
                                            total={groupInfo.active_count}
                                            pages={groupInfo.pages}
                                            currentPage={currentPage}
                                            onPageChange={handlePageChange}
                                            perPage={PER_PAGE}
                                            itemsCount={shownCount}
                                        />
                                    )}
                                </>
                            )}

                            {/* Sin grupo */}
                            {!loadingGroup && !groupInfo && (
                                <p className="text-dim text-center py-3">
                                    Aún no tienes un grupo asignado.
                                </p>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
