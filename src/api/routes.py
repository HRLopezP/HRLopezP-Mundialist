from flask import Flask, request, jsonify, url_for, Blueprint, json
from api.models import db, User, Rol
from api.utils import generate_sitemap, APIException, val_email, val_password, generate_reset_token, confirm_reset_token
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from datetime import datetime, timedelta, date
import os
from api.emails import send_password_reset_email

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


@api.route("/health-check", methods=["GET"])
def health_check():
    return jsonify({"status": "OK"}), 200


@api.route("/register", methods=["POST"])
def register_user():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "No se recibieron datos"}), 400

    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    lastname = data.get("lastname")

    if not all([email, password, name, lastname]):
        return jsonify({"message": "Todos los campos son obligatorios"}), 400

    if not val_email(email):
        return jsonify({"message": "Formato de correo inválido"}), 400

    if not val_password(password):
        return jsonify({"message": "La contraseña no cumple con los requisitos de seguridad"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Este correo ya está registrado"}), 422

    ADMIN_EMAIL = "hrlp843@gmail.com"
    
    if email == ADMIN_EMAIL:
        rol_to_find = "Administrador"
        is_active_status = True
    else:
        rol_to_find = "Participante"
        is_active_status = False

    target_rol = Rol.query.filter(Rol.name_rol.ilike(rol_to_find.strip())).first()
    if not target_rol:
        all_roles = [r.name_rol for r in Rol.query.all()]
        return jsonify({
            "message": f"Error crítico: El rol '{rol_to_find}' no coincide.",
            "debug_roles_en_db": all_roles 
        }), 500

    hashed_password = generate_password_hash(password)
    
    new_user = User(
        email=email,
        password=hashed_password,
        name=name,
        lastname=lastname,
        rol_id=target_rol.id_rol,
        is_active=is_active_status
    )

    try:
        db.session.add(new_user)
        db.session.commit()
        msg = "¡Bienvenido, Administrador!" if is_active_status else "Registro exitoso. Tu cuenta será activada pronto."
        return jsonify({"message": msg}), 201
    except Exception as error:
        db.session.rollback()
        return jsonify({"message": "Error en el servidor", "error": str(error)}), 500


@api.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)

    if data is None:
        return jsonify({"message": "No se proporcionaron datos"}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"message": "El correo y la contraseña son obligatorios"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Correo o contraseña incorrectos"}), 401

    if not user.is_active:
        return jsonify({"message": "Tu cuenta está pendiente de activación por el administrador."}), 403

    user_role_name = user.rol.name_rol if user.rol else "Participante"
    is_admin = user_role_name == "Administrador"

    additional_claims = {
        "is_administrator": is_admin,
        "rol": user_role_name,
    }

    access_token = create_access_token(
        identity=str(user.id_user),
        additional_claims=additional_claims
    )

    return jsonify({
        "message": "¡Bienvenido a Mundial Elite Predictor!",
        "token": access_token,
        "user": user.serialize()
    }), 200


@api.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    try:
        data = request.get_json()
        email = data.get('email')
        user = User.query.filter_by(email=email).first()

        if user:
            # 1. Generamos el token seguro
            token = generate_reset_token(email)
            
            # 2. Preparamos el nombre para el saludo
            # Ajusta según tus campos (ej. user.name o user.username)
            user_name = getattr(user, 'name', 'Usuario') 

            # 3. Delegamos el envío al "Chef de correos"
            email_sent = send_password_reset_email(email, user_name, token)

            if email_sent:
                return jsonify({"message": "Si el correo existe, se ha enviado un enlace de recuperación"}), 200
            else:
                return jsonify({"message": "Error al procesar el envío del correo"}), 500

        # Por seguridad, a veces es mejor devolver 200 aunque no exista, 
        # pero para desarrollo el 404 está bien.
        return jsonify({"message": "Usuario no encontrado"}), 404

    except Exception as e:
        return jsonify({"message": "Error interno", "error": str(e)}), 500


@api.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')

    # 1. Verificación básica de datos
    if not token or not new_password:
        return jsonify({"message": "Token y contraseña son requeridos"}), 400

    # 2. Validar seguridad de la contraseña
    if not val_password(new_password):
        return jsonify({"message": "La contraseña no cumple con los requisitos mínimos (8+ caracteres, Mayúscula, Número y Símbolo)."}), 400

    # 3. Validar si el token es real y no ha expirado (15 min)
    email = confirm_reset_token(token)
    if not email:
        return jsonify({"message": "El enlace ha expirado o es inválido. Solicita uno nuevo."}), 400

    # 4. Buscar al usuario y actualizar
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    # 5. Encriptar y guardar
    user.password = generate_password_hash(new_password)

    try:
        db.session.commit()
        return jsonify({"message": "¡Golazo! Contraseña actualizada. Ya puedes iniciar sesión."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error al guardar la nueva contraseña"}), 500