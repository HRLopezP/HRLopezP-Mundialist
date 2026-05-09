import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { toast } from "sonner";
import Swal from "sweetalert2";
import "../styles/admin.css";

const GroupsAdmin = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupFee, setNewGroupFee] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editFee, setEditFee] = useState("");

    useEffect(() => {
        getGroups();
    }, []);

    const getGroups = async () => {
        try {
            const { response, data } = await apiFetch("/groups");
            if (response.ok) setGroups(data);
        } catch (error) {
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return toast.warning("El nombre del grupo no puede estar vacío");

        const fee = parseFloat(newGroupFee) || 0;
        if (fee < 0) return toast.warning("La cuota no puede ser negativa");

        const { response, data } = await apiFetch("/groups", {
            method: "POST",
            body: JSON.stringify({ name_group: newGroupName, entry_fee: fee })
        });

        if (response.ok) {
            toast.success("Grupo creado correctamente");
            setNewGroupName("");
            setNewGroupFee("");
            getGroups();
        } else {
            toast.error(data.msg || "Error al crear el grupo");
        }
    };

    const startEdit = (group) => {
        setEditingId(group.id_group);
        setEditName(group.name_group);
        setEditFee(group.entry_fee ?? 0);
    };

    const handleUpdateGroup = async (id) => {
        if (!editName.trim()) return toast.warning("El nombre no puede estar vacío");

        const fee = parseFloat(editFee);
        if (isNaN(fee) || fee < 0) return toast.warning("La cuota debe ser un número positivo");

        const { response, data } = await apiFetch(`/groups/${id}`, {
            method: "PUT",
            body: JSON.stringify({ name_group: editName, entry_fee: fee })
        });

        if (response.ok) {
            toast.success("Grupo actualizado correctamente");
            setEditingId(null);
            getGroups();
        } else {
            toast.error(data.msg || "Error al actualizar");
        }
    };

    const handleDeleteGroup = (id, name) => {
        Swal.fire({
            title: `¿Eliminar el grupo "${name}"?`,
            text: "Cuidado: Esto podría afectar a los usuarios asignados a este grupo.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#28c87d",
            cancelButtonColor: "#303030",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            background: "#051426",
            color: "#fff"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { response, data } = await apiFetch(`/groups/${id}`, { method: "DELETE" });
                if (response.ok) {
                    toast.success("Grupo eliminado exitosamente");
                    getGroups();
                } else {
                    Swal.fire("Error", data.msg, "error");
                }
            }
        });
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-emerald"></div>
            <p className="text-dim mt-2">Cargando grupos...</p>
        </div>
    );

    return (
        <div className="admin-container animate__animated animate__fadeIn">
            <div className="admin-card p-4">
                <h2 className="mb-4 text-white">
                    <i className="fa-solid fa-people-group me-2 text-emerald"></i>
                    Gestión de Grupos
                </h2>

                {/* Formulario para nuevo grupo */}
                <form onSubmit={handleCreateGroup} className="mb-5">
                    <div className="row g-2 align-items-end">
                        <div className="col-12 col-md-6">
                            <label className="auth-label">Nombre del Nuevo Grupo</label>
                            <input
                                type="text"
                                className="form-control auth-input"
                                placeholder="Ej: Oficina Central o Amigos FC"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                        </div>
                        <div className="col-12 col-md-3">
                            <label className="auth-label">
                                <i className="fa-solid fa-piggy-bank me-1 text-emerald"></i>
                                Cuota por Participante ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control auth-input"
                                placeholder="Ej: 10.00"
                                value={newGroupFee}
                                onChange={(e) => setNewGroupFee(e.target.value)}
                            />
                        </div>
                        <div className="col-12 col-md-3">
                            <button className="btn btn-emerald w-100" type="submit">
                                <i className="fa-solid fa-plus me-1"></i> Crear Grupo
                            </button>
                        </div>
                    </div>
                </form>

                {/* Listado de Grupos */}
                <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle">
                        <thead className="table-oxford">
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Grupo</th>
                                <th>
                                    <i className="fa-solid fa-piggy-bank me-1 text-emerald"></i>
                                    Cuota
                                </th>
                                <th>Usuarios</th>
                                <th>
                                    <i className="fa-solid fa-trophy me-1 text-warning"></i>
                                    Bolsa
                                </th>
                                <th className="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((group) => (
                                <tr key={group.id_group}>
                                    <td className="small text-dim">#{group.id_group}</td>

                                    {/* Nombre */}
                                    <td>
                                        {editingId === group.id_group ? (
                                            <div className="animate__animated animate__fadeIn">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm auth-input border-emerald"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <span className="badge bg-dark-soft px-3 py-2">
                                                {group.name_group}
                                            </span>
                                        )}
                                    </td>

                                    {/* Cuota */}
                                    <td>
                                        {editingId === group.id_group ? (
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="form-control form-control-sm auth-input border-emerald"
                                                style={{ width: "100px" }}
                                                value={editFee}
                                                onChange={(e) => setEditFee(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateGroup(group.id_group)}
                                            />
                                        ) : (
                                            <span className="text-emerald fw-semibold">
                                                ${(group.entry_fee ?? 0).toFixed(2)}
                                            </span>
                                        )}
                                    </td>

                                    {/* Usuarios activos */}
                                    <td>
                                        <span className="text-dim small">
                                            {group.active_users ?? 0} activos / {group.total_users} total
                                        </span>
                                    </td>

                                    {/* Bolsa acumulada */}
                                    <td>
                                        <span className="text-warning fw-bold">
                                            ${(group.prize_pool ?? 0).toFixed(2)}
                                        </span>
                                    </td>

                                    {/* Acciones */}
                                    <td className="text-end">
                                        {editingId === group.id_group ? (
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className="btn btn-emerald btn-sm rounded-pill px-3"
                                                    onClick={() => handleUpdateGroup(group.id_group)}
                                                    title="Guardar cambios"
                                                >
                                                    <i className="fa-solid fa-check"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-light btn-sm rounded-pill"
                                                    onClick={() => setEditingId(null)}
                                                    title="Cancelar"
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className="btn btn-outline-info btn-sm rounded-pill"
                                                    onClick={() => startEdit(group)}
                                                    title="Editar grupo"
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm rounded-pill"
                                                    onClick={() => handleDeleteGroup(group.id_group, group.name_group)}
                                                    title="Eliminar grupo"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {groups.length === 0 && (
                        <div className="text-center py-4 text-dim">
                            No hay grupos creados todavía. ¡Crea el primero arriba!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupsAdmin;