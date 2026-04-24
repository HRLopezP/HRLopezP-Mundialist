from functools import wraps
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask import jsonify

def manager_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("is_administrator") is not True:
            return jsonify({"message": "Acceso denegado: Se requieren permisos de Administrador"}), 403
        return fn(*args, **kwargs)
    return wrapper