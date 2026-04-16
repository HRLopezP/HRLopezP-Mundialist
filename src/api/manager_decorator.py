from functools import wraps
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask import jsonify

def manager_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        # Primero verificamos el token (esto asume que ya pasó por @jwt_required)
        claims = get_jwt()
        # Verificamos si en los claims del token pusimos que es admin
        # O podemos buscar al usuario en la BD por su ID y ver su rol
        if claims.get("is_administrator") is not True:
            return jsonify({"message": "Acceso denegado: Se requieren permisos de Administrador"}), 403
        return fn(*args, **kwargs)
    return wrapper