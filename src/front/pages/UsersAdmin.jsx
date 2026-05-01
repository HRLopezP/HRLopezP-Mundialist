import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import Pagination from "../components/Pagination";
import "../styles/admin.css";

const UsersAdmin = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ total: 0, pages: 0, current: 1 });
    const [filters, setFilters] = useState({ search: "", status: "all" });

    useEffect(() => {
        loadInitialData();
    }, [pagination.current, filters.status]);

    const loadInitialData = async () => {
        setLoading(true);
        const [resRoles, resUsers, resGroups] = await Promise.all([
            apiFetch("/roles"),
            apiFetch(`/users?page=${pagination.current}&status=${filters.status}&search=${filters.search}`),
            apiFetch("/groups")
        ]);

        if (resRoles.response.ok) setRoles(resRoles.data);
        if (resGroups.response.ok) setGroups(resGroups.data);
        if (resUsers.response.ok) {
            setUsers(resUsers.data.users);
            setPagination(prev => ({ ...prev, total: resUsers.data.total, pages: resUsers.data.pages }));
        }
        setLoading(false);
    };

    const handleRoleChange = async (userId, roleId) => {
        const nuevoRol = roles.find(r => r.id_rol == roleId)?.name_rol;

        Swal.fire({
            title: "¿Confirmar cambio de rol?",
            text: `¿Estás seguro de que deseas asignar el rol de "${nuevoRol}" a este usuario?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "var(--pitch-green)",
            cancelButtonColor: "#343a40",
            confirmButtonText: "Sí, cambiar",
            cancelButtonText: "Cancelar",
            background: "#051426",
            color: "#fff"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { response } = await apiFetch(`/users/${userId}/role`, {
                    method: 'PATCH',
                    body: JSON.stringify({ id_rol: roleId })
                });
                if (response.ok) {
                    toast.success(`Rol actualizado a ${nuevoRol}`);
                    loadInitialData();
                }
            } else {
                loadInitialData();
            }
        });
    };

    const handleToggleStatus = async (user) => {
        const { response, data } = await apiFetch(`/users/${user.id_user}/status`, { method: 'PATCH' });
        if (response.ok) {
            const accion = !user.is_active ? "activado" : "desactivado";
            toast.success(`El usuario ${user.name} se ha ${accion} correctamente`, {
                icon: !user.is_active ? '✅' : '🚫'
            });
            setUsers(users.map(u => u.id_user === user.id_user ? { ...u, is_active: !u.is_active } : u));
        }
    };

    const handleGroupChange = async (userId, groupId) => {
        const nuevoGrupo = groups.find(g => g.id_group == groupId)?.name_group || "Sin Grupo";

        Swal.fire({
            title: "¿Cambiar de grupo?",
            text: `¿Mover a este usuario al grupo "${nuevoGrupo}"?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "var(--pitch-green)",
            cancelButtonColor: "#343a40",
            confirmButtonText: "Sí, mover",
            background: "#051426",
            color: "#fff"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { response } = await apiFetch(`/users/${userId}/assign-group`, {
                    method: 'PATCH',
                    body: JSON.stringify({ group_id: groupId })
                });
                if (response.ok) {
                    toast.success(`Usuario movido a ${nuevoGrupo}`);
                    loadInitialData();
                }
            } else {
                loadInitialData();
            }
        });
    };

    const handleDelete = (user) => {
        Swal.fire({
            title: `¿Eliminar a ${user.name}?`,
            text: "Esta acción es irreversible.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#343a40",
            confirmButtonText: "Eliminar",
            background: "#051426", color: "#fff"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { response } = await apiFetch(`/users/${user.id_user}`, { method: 'DELETE' });
                if (response.ok) {
                    toast.success("Usuario eliminado");
                    loadInitialData();
                }
            }
        });
    };

    const handleUnlock = async (user) => {
        const { response, data } = await apiFetch(`/users/${user.id_user}/unlock`, { method: 'PATCH' });
        if (response.ok) {
            toast.success(data.message, { icon: '🔓' });
            setUsers(users.map(u => u.id_user === user.id_user ? { ...u, is_blocked: false, is_active: true } : u));
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPagination(prev => ({ ...prev, current: 1 }));
            loadInitialData();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [filters.search]);

    return (
        <div className="admin-container animate__animated animate__fadeIn">
            <Toaster position="top-center" richColors />
            <div className="admin-card p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <h2 className="text-white mb-4">
                        <i className="fa-solid fa-user-shield text-emerald me-2"></i> Gestión de Usuarios
                    </h2>
                    {/* 4. Contador de usuarios */}
                    <div className="user-count-badge animate__animated animate__fadeIn">
                        Total: {pagination.total} usuarios
                    </div>
                </div>

                {/* Filtros */}
                <div className="row g-2 mb-4">
                    <div className="col-12 col-md-7">
                        <input
                            type="text" className="form-control auth-input"
                            placeholder="Buscar por nombre o email..."
                            value={filters.search}
                            onKeyUp={(e) => e.key === 'Enter' && loadInitialData()}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <div className="col-12 col-md-5">
                        <select
                            className="form-select auth-input"
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="all">Todos los estatus</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>
                </div>

                {/* Tabla */}
                <div className="table-responsive d-none d-md-block">
                    <table className="table table-dark table-hover align-middle">
                        <thead className="table-oxford">
                            <tr>
                                <th>Nombre y Apellido</th>
                                <th>Correo</th>
                                <th>Rol</th>
                                <th>Grupo</th>
                                <th>Estatus</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => {
                                const isRoot = u.id_user === 1;
                                return (
                                    <tr key={u.id_user} className={isRoot ? "opacity-50" : ""}>
                                        <td>{u.name} {u.lastname}</td>
                                        <td className="small text-dim">{u.email}</td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className={`badge ${u.rol_id == 1 ? 'bg-info' : 'bg-secondary'} me-2`} style={{ fontSize: '0.7rem' }}>
                                                    {u.name_rol}
                                                </span>
                                                <select
                                                    className="form-select form-select-sm role-select-pc"
                                                    disabled={isRoot}
                                                    value={u.rol_id}
                                                    onChange={(e) => handleRoleChange(u.id_user, e.target.value)}
                                                >
                                                    {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.name_rol}</option>)}
                                                </select>
                                            </div>
                                        </td>
                                        <td>
                                            <select
                                                className="form-select form-select-sm auth-input"
                                                disabled={isRoot}
                                                value={u.group_id || ""}
                                                onChange={(e) => handleGroupChange(u.id_user, e.target.value)}
                                            >
                                                <option value="">Seleccionar Grupo</option>
                                                {groups.map(g => <option key={g.id_group} value={g.id_group}>{g.name_group}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                {u.is_blocked ? (
                                                    <span className="badge bg-danger animate__animated animate__pulse animate__infinite" title="Bloqueado por intentos fallidos">
                                                        BLOQUEADO
                                                    </span>
                                                ) : (
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input custom-switch" type="checkbox"
                                                            checked={u.is_active} disabled={isRoot}
                                                            onChange={() => handleToggleStatus(u)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                {u.is_blocked && (
                                                    <button className="btn btn-link text-warning p-0" onClick={() => handleUnlock(u)} title="Desbloquear acceso">
                                                        <i className="fa-solid fa-lock-open"></i>
                                                    </button>
                                                )}
                                                {!isRoot && (
                                                    <button className="btn btn-link text-danger p-0" onClick={() => handleDelete(u)}>
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Vista teléfonos */}
                <div className="d-md-none">
                    {users.map(u => {
                        const isRoot = u.id_user === 1;
                        return (
                            <div key={u.id_user}
                                className={`user-mobile-card p-3 mb-4 border-0 ${isRoot ? "border-start border-4 border-warning" : ""}`}
                                style={{ opacity: isRoot ? 0.85 : 1 }}>

                                <div className="row align-items-start">
                                    {/* Nombre y Email */}
                                    <div className="col-10">
                                        <span className={`fw-bold d-block ${isRoot ? 'text-warning' : 'text-emerald'}`}>
                                            {u.name} {u.lastname} {isRoot && "👑"}
                                        </span>
                                        <small className="text-dim d-block text-truncate" style={{ maxWidth: '200px' }}>
                                            {u.email}
                                        </small>
                                    </div>

                                    {/* Acción Eliminar */}
                                    <div className="col-2 text-end">
                                        {!isRoot && (
                                            <button className="btn btn-link text-danger p-0" onClick={() => handleDelete(u)}>
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="row mt-3 align-items-center border-top border-secondary pt-2">
                                    {/* Selector de Rol */}
                                    <div className="col-8">
                                        <select
                                            className="form-select form-select-sm auth-input border-0"
                                            disabled={isRoot}
                                            defaultValue={u.rol_id}
                                            onChange={(e) => handleRoleChange(u.id_user, e.target.value)}
                                        >
                                            {roles.map(r => (
                                                <option key={r.id_rol} value={r.id_rol}>{r.name_rol}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-2">
                                        <label className="text-dim" style={{ fontSize: '0.7rem' }}>GRUPO</label>
                                        <select
                                            className="form-select form-select-sm auth-input"
                                            disabled={isRoot}
                                            value={u.group_id || ""}
                                            onChange={(e) => handleGroupChange(u.id_user, e.target.value)}
                                        >
                                            <option value="">Sin Grupo</option>
                                            {groups.map(g => <option key={g.id_group} value={g.id_group}>{g.name_group}</option>)}
                                        </select>
                                    </div>

                                    {/* Switch de Estatus */}
                                    <div className="col-4 d-flex justify-content-end align-items-center gap-2">
                                        {u.is_blocked ? (
                                            <button className="btn btn-sm btn-outline-warning border-0" onClick={() => handleUnlock(u)}>
                                                <i className="fa-solid fa-lock-open"></i>
                                            </button>
                                        ) : (
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input custom-switch" type="checkbox"
                                                    checked={u.is_active} disabled={isRoot}
                                                    onChange={() => handleToggleStatus(u)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Pagination
                    total={pagination.total}
                    pages={pagination.pages}
                    currentPage={pagination.current}
                    itemsCount={users.length}
                    onPageChange={(page) => setPagination({ ...pagination, current: page })}
                />
            </div>
        </div>
    );
};

export default UsersAdmin;