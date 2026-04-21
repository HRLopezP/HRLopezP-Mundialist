import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { toast } from "sonner";
import useGlobalReducer from "../hooks/useGlobalReducer";
import "../styles/profile.css";

const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
    { key: 'lowerCase', label: 'Al menos una letra minúscula', regex: /[a-z]/ },
    { key: 'upperCase', label: 'Al menos una letra mayúscula', regex: /[A-Z]/ },
    { key: 'number', label: 'Al menos un número', regex: /[0-9]/ },
    { key: 'specialChar', label: 'Caracter especial (!@#$...)', regex: /[!@#$%^&*()-+\.]/ },
];

const Profile = () => {
    const { store, dispatch } = useGlobalReducer();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: "", lastname: "" });

    // Estados de Contraseña (Recuperados)
    const [showPassModal, setShowPassModal] = useState(false);
    const [passData, setPassData] = useState({ current: "", new: "", confirm: "" });
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
    const [passwordValidity, setPasswordValidity] = useState({});
    const [passMatch, setPassMatch] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const { response, data } = await apiFetch("/user/profile");
            if (response.ok) {
                setUser(data);
                setFormData({ name: data.name, lastname: data.lastname });
            }
        } catch (error) {
            toast.error("Error al cargar el perfil");
        } finally {
            setLoading(false);
        }
    };

    // Validación de contraseña en tiempo real
    const validatePassword = (pass) => {
        const newValidity = {};
        passwordRequirements.forEach(req => {
            newValidity[req.key] = req.regex.test(pass);
        });
        setPasswordValidity(newValidity);
    };

    const handlePasswordChange = (field, value) => {
        const newData = { ...passData, [field]: value };
        setPassData(newData);

        if (field === 'new') validatePassword(value);
        if (field === 'new' || field === 'confirm') {
            setPassMatch(newData.new === newData.confirm);
        }
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            toast.info("Subiendo imagen...");

            const { response, data } = await apiFetch("/user/update-photo", {
                method: "PATCH",
                body: formData,
            });

            if (response.ok) {
                setUser({ ...user, profile: data.profile });

                dispatch({
                    type: "SET_USER",
                    payload: { ...store.user, profile: data.profile }
                });

                toast.success("¡Foto de perfil actualizada!");
            } else {
                toast.error(data.message || "Error al subir");
            }
        } catch (error) {
            console.error("Error en la subida:", error);
            toast.error("Error de conexión");
        }
    };


    const updateInfo = async () => {
        const { response, data } = await apiFetch("/user/update-profile", {
            method: "PATCH",
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            setUser(data.user);
            setIsEditing(false);
            toast.success("Información actualizada");
        } else {
            toast.error(data.message);
        }
    };

    const updatePassword = async () => {
        const isAllValid = passwordRequirements.every(req => passwordValidity[req.key]);
        if (!isAllValid || !passMatch) {
            toast.error("Revisa los requisitos de seguridad");
            return;
        }

        const { response, data } = await apiFetch("/user/update-profile", {
            method: "PATCH",
            body: JSON.stringify({
                current_password: passData.current,
                new_password: passData.new
            })
        });

        if (response.ok) {
            toast.success("Contraseña actualizada con éxito");
            setShowPassModal(false);
            setPassData({ current: "", new: "", confirm: "" });
        } else {
            toast.error(data.message);
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-success"></div></div>;

    return (
        <div className="profile-container animate__animated animate__fadeIn">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="avatar-wrapper">
                        <img
                            src={user?.profile || `https://ui-avatars.com/api/?name=${user?.name}+${user?.lastname}&background=28c87d&color=fff`}
                            alt="Profile"
                            className="profile-img"
                        />
                        <label className="edit-photo-btn">
                            <i className="fa-solid fa-camera"></i>
                            <input
                                type="file"
                                id="upload-photo"
                                className="d-none"
                                accept="image/*"
                                onChange={handlePhotoChange}
                            />
                        </label>
                    </div>
                    <h2 className="mt-3">{user?.name} {user?.lastname}</h2>
                    <span className="badge bg-dark-soft">{user?.rol?.name_rol || "Jugador"}</span>
                </div>

                <div className="profile-body">
                    <div className="info-section">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="section-title">Datos Personales</h4>
                            <button className="btn-edit-link" onClick={() => setIsEditing(!isEditing)}>
                                {isEditing ? "Cancelar" : "Editar"}
                            </button>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label text-dim">Nombre</label>
                                <input
                                    type="text"
                                    className={`form-control profile-input ${isEditing ? 'active' : ''}`}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label text-dim">Apellido</label>
                                <input
                                    type="text"
                                    className={`form-control profile-input ${isEditing ? 'active' : ''}`}
                                    value={formData.lastname}
                                    onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label text-dim">Correo Electrónico</label>
                                <input type="text" className="form-control profile-input" value={user?.email} disabled />
                            </div>
                        </div>

                        {isEditing && (
                            <button className="btn btn-emerald w-100 mt-4" onClick={updateInfo}>
                                Guardar Cambios
                            </button>
                        )}
                    </div>

                    <hr className="my-4 opacity-10" />

                    <div className="security-section">
                        <h4 className="section-title">Seguridad</h4>
                        <button className="btn btn-outline-light w-100 mt-2" onClick={() => setShowPassModal(true)}>
                            Cambiar Contraseña
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Contraseña Pro con Validaciones */}
            {showPassModal && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal animate__animated animate__zoomIn">
                        <h3>Actualizar Seguridad</h3>

                        <div className="mt-3">
                            {['current', 'new', 'confirm'].map((field) => (
                                <div key={field} className="mb-3">
                                    <div className="input-group">
                                        <input
                                            type={showPass[field] ? "text" : "password"}
                                            placeholder={field === 'current' ? "Contraseña Actual" : field === 'new' ? "Nueva Contraseña" : "Confirmar Nueva"}
                                            className={`form-control auth-input ${field === 'confirm' && !passMatch ? 'border-danger' : ''}`}
                                            value={passData[field]}
                                            onChange={(e) => handlePasswordChange(field, e.target.value)}
                                        />
                                        <button
                                            className="btn btn-outline-secondary"
                                            type="button"
                                            onClick={() => setShowPass({ ...showPass, [field]: !showPass[field] })}
                                        >
                                            <i className={`fa-solid ${showPass[field] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                    </div>
                                    {field === 'confirm' && !passMatch && <small className="text-danger">Las contraseñas no coinciden</small>}
                                </div>
                            ))}
                        </div>

                        {/* Caja de Requisitos Visuales */}
                        <div className="password-requirements-box mb-3">
                            {passwordRequirements.map(req => (
                                <div key={req.key} className="requirement-item">
                                    <i className={`fa-solid ${passwordValidity[req.key] ? 'fa-check-circle text-success' : 'fa-circle-xmark text-danger'} me-2`}></i>
                                    <span className={passwordValidity[req.key] ? 'text-success' : 'text-dim'}>{req.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-emerald w-100"
                                onClick={updatePassword}
                                disabled={!passMatch || !passwordRequirements.every(req => passwordValidity[req.key])}
                            >
                                Actualizar
                            </button>
                            <button className="btn btn-dark w-100" onClick={() => setShowPassModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;