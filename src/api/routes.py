from flask import Flask, request, jsonify, url_for, Blueprint, json
from api.models import db, User, Rol
from api.utils import generate_sitemap, APIException, val_email, val_password
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta, date

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

    target_rol = Rol.query.filter_by(name_rol=rol_to_find).first()
    if not target_rol:
        return jsonify({"message": f"Error crítico: El rol '{rol_to_find}' no está configurado"}), 500

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