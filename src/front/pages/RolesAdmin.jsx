import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { toast } from "sonner";
import Swal from "sweetalert2";
import useGlobalReducer from "../hooks/useGlobalReducer";
import "../styles/admin.css";

const RolesAdmin = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState("");

    useEffect(() => {
        getRoles();
    }, []);

    const getRoles = async () => {
        try {
            const { response, data } = await apiFetch("/roles");
            if (response.ok) setRoles(data);
        } catch (error) {
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!newRoleName.trim()) return toast.warning("El nombre no puede estar vacío");

        const { response, data } = await apiFetch("/roles", {
            method: "POST",
            body: JSON.stringify({ name_rol: newRoleName })
        });

        if (response.ok) {
            toast.success("Rol creado correctamente");
            setNewRoleName("");
            getRoles();
        } else {
            toast.error(data.msg || "Error al crear");
        }
    };

    const handleDeleteRole = (id, name) => {
        Swal.fire({
            title: `¿Eliminar el rol ${name}?`,
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#28c87d", // Tu Emerald Green
            cancelButtonColor: "#303030", // Oxford Grey oscuro
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            background: "#051426", // Deep Navy del index.css
            color: "#fff"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { response, data } = await apiFetch(`/roles/${id}`, { method: "DELETE" });
                if (response.ok) {
                    toast.success("Rol eliminado");
                    getRoles();
                } else {
                    Swal.fire("Error", data.msg, "error");
                }
            }
        });
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-emerald"></div></div>;

    return (
        <div className="admin-container animate__animated animate__fadeIn">
            <div className="admin-card p-4">
                <h2 className="mb-4 text-white"><i className="fa-solid fa-user-shield me-2 text-emerald"></i> Gestión de Roles</h2>
                
                {/* Formulario de creación */}
                <form onSubmit={handleCreateRole} className="mb-5">
                    <label className="auth-label">Nuevo Rol</label>
                    <div className="d-flex gap-2">
                        <input 
                            type="text" 
                            className="form-control auth-input" 
                            placeholder="Ej: Auditor"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                        />
                        <button className="btn btn-emerald px-4" type="submit">Crear</button>
                    </div>
                </form>

                {/* Tabla Responsive */}
                <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle">
                        <thead className="table-oxford">
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Rol</th>
                                <th className="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((rol) => (
                                <tr key={rol.id_rol}>
                                    <td>{rol.id_rol}</td>
                                    <td><span className="badge bg-dark-soft">{rol.name_rol}</span></td>
                                    <td className="text-end">
                                        <button 
                                            className="btn btn-outline-danger btn-sm rounded-pill"
                                            onClick={() => handleDeleteRole(rol.id_rol, rol.name_rol)}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RolesAdmin;