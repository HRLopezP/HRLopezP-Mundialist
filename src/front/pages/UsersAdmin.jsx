import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { toast } from "sonner";
import Swal from "sweetalert2";
import Pagination from "../components/Pagination";
import "../styles/admin.css";

const UsersAdmin = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ total: 0, pages: 0, current: 1 });
    const [filters, setFilters] = useState({ search: "", status: "all" });

    useEffect(() => {
        loadInitialData();
    }, [pagination.current, filters.status]);

    const loadInitialData = async () => {
        setLoading(true);
        const [resRoles, resUsers] = await Promise.all([
            apiFetch("/roles"),
            apiFetch(`/users?page=${pagination.current}&status=${filters.status}&search=${filters.search}`)
        ]);

        if (resRoles.response.ok) setRoles(resRoles.data);
        if (resUsers.response.ok) {
            setUsers(resUsers.data.users);
            setPagination(prev => ({ ...prev, total: resUsers.data.total, pages: resUsers.data.pages }));
        }
        setLoading(false);
    };

    const handleRoleChange = async (userId, roleId) => {
        const { response } = await apiFetch(`/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ id_rol: roleId })
        });
        if (response.ok) toast.success("Rol actualizado");
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

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPagination(prev => ({ ...prev, current: 1 }));
            loadInitialData();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [filters.search]);

    return (
        <div className="admin-container animate__animated animate__fadeIn">
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
                                            <select
                                                className="form-select form-select-sm bg-dark text-white border-secondary"
                                                disabled={isRoot}
                                                defaultValue={u.rol_id}
                                                onChange={(e) => handleRoleChange(u.id_user, e.target.value)}
                                            >
                                                {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.name_rol}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input custom-switch" type="checkbox"
                                                    checked={u.is_active} disabled={isRoot}
                                                    onChange={() => handleToggleStatus(u)}
                                                />
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {!isRoot && (
                                                <button className="btn btn-link text-danger p-0" onClick={() => handleDelete(u)}>
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Vista teléfonos */}
                <div className="d-md-none">
                    {users.map(u => (
                        <div key={u.id_user} className={`user-mobile-card p-3 mb-2 ${u.id_user === 1 ? "opacity-50" : ""}`}>
                            <div className="d-flex justify-content-between">
                                <span className="fw-bold">{u.name} {u.lastname}</span>
                                {u.id_user !== 1 && <i className="fa-solid fa-trash text-danger" onClick={() => handleDelete(u)}></i>}
                            </div>
                            <div className="small text-dim mb-2">{u.email}</div>
                            <div className="row g-2 align-items-center">
                                <div className="col-8">
                                    <select
                                        className="form-select form-select-sm bg-dark text-white border-secondary"
                                        disabled={u.id_user === 1}
                                        defaultValue={u.rol_id}
                                        onChange={(e) => handleRoleChange(u.id_user, e.target.value)}
                                    >
                                        {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.name_rol}</option>)}
                                    </select>
                                </div>
                                <div className="col-4 d-flex justify-content-end">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input custom-switch" type="checkbox"
                                            checked={u.is_active} disabled={u.id_user === 1}
                                            onChange={() => handleToggleStatus(u)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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