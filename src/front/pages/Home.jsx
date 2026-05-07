import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../utils/api";
import useGlobalReducer from "../hooks/useGlobalReducer";
import "../styles/home.css";

const PrizePoolPiggyBank = ({ prizePool, entryFee, activeCount }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 200);
        return () => clearTimeout(t);
    }, []);

    const formattedPool = prizePool.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2
    });

    return (
        <div
            className={`prize-pool-card ${visible ? "prize-pool-card--visible" : ""}`}
            title={`${activeCount} participantes × $${entryFee} c/u`}
        >
            {/* Ícono alcancía animado */}
            <div className="piggy-wrapper">
                <span className="piggy-icon" role="img" aria-label="alcancía">🐷</span>
                {/* Monedas animadas cayendo */}
                <span className="coin coin--1">💰</span>
                <span className="coin coin--2">💰</span>
                <span className="coin coin--3">💰</span>
            </div>

            <div className="prize-pool-info">
                <p className="prize-pool-label">Bolsa acumulada </p>
                <p className="prize-pool-amount">{formattedPool}</p>
                <p className="prize-pool-sub">
                    {activeCount} participantes × ${entryFee.toFixed(2)} c/u
                </p>
            </div>
        </div>
    );
};

// ─── Componente: Tarjeta de rival ────────────────────────────────────────────
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

// ─── Componente principal: Home ──────────────────────────────────────────────
export const Home = () => {
    const { store } = useGlobalReducer();
    const isLoggedIn = !!store.user;
    const isAdmin = store.user?.rol === "Administrador";

    const [groupInfo, setGroupInfo] = useState(null);
    const [loadingGroup, setLoadingGroup] = useState(false);
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);

    useEffect(() => {
        if (!isLoggedIn) {
            setGroupInfo(null);
            setGroups([]);
            setActiveGroup(null);
            return;
        }
        if (isAdmin) {
            loadAdminGroups();
        } else {
            fetchGroupInfo(null);
        }
    }, [isLoggedIn, store.user?.id_user]);

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
        } catch (_) { }
    };


    useEffect(() => {
        if (isAdmin && activeGroup !== null) {
            fetchGroupInfo(activeGroup);
        }
    }, [activeGroup]);


    const fetchGroupInfo = async (groupId) => {
        setLoadingGroup(true);
        try {
            const url = (isAdmin && groupId)
                ? `/group/my-info?group_id=${groupId}`
                : "/group/my-info";
            const { response, data } = await apiFetch(url);
            if (response.ok) setGroupInfo(data);
            else setGroupInfo(null);
        } catch (_) {
            setGroupInfo(null);
        } finally {
            setLoadingGroup(false);
        }
    };



    const rivals = groupInfo?.members?.filter((m) => !m.is_me) ?? [];

    return (
        <div className="container-fluid pb-5 animate__animated animate__fadeIn">
            <div className="row justify-content-center mt-4">
                <div className="col-12 col-lg-9">

                    {/* Banner */}
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

                    {/* Sección grupo: SOLO si hay sesión activa */}
                    {isLoggedIn && (
                        <div className="group-section mt-5 animate__animated animate__fadeInUp">

                            {/* Tabs de grupos (solo admin) */}
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
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="rival-card rival-card--skeleton">
                                            <div className="skeleton-avatar"></div>
                                            <div className="skeleton-line"></div>
                                            <div className="skeleton-line skeleton-line--short"></div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Datos del grupo */}
                            {!loadingGroup && groupInfo && (
                                <>
                                    {groupInfo.entry_fee > 0 && (
                                        <PrizePoolPiggyBank
                                            prizePool={groupInfo.prize_pool}
                                            entryFee={groupInfo.entry_fee}
                                            activeCount={groupInfo.active_count}
                                        />
                                    )}

                                    <div className="group-header mt-4">
                                        <h3 className="group-title">
                                            <i className="fa-solid fa-people-group me-2 text-emerald"></i>
                                            Jugadores listos para · <span className="text-emerald">La Élite Mundialista</span>
                                        </h3>
                                        <p className="group-sub text-dim">
                                            {rivals.length > 0
                                                ? `Tienes ${rivals.length} rival${rivals.length !== 1 ? "es" : ""} expertos. ¡Supéralos!`
                                                : "Aún eres el único en tu grupo. ¡Espera a tus rivales!"}
                                        </p>
                                    </div>

                                    {groupInfo.members.length > 0 && (
                                        <div className="rivals-grid">
                                            {groupInfo.members.map((member, index) => (
                                                <RivalCard
                                                    key={member.id_user}
                                                    member={member}
                                                    rank={index + 1}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Sin grupo asignado */}
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
