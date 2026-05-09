from flask import Flask, Response, send_file, request, jsonify, url_for, Blueprint, json, current_app
from api.models import db, User, Rol, Match, Prediction, AuditLog, Group
from sqlalchemy.orm import joinedload
from api.utils import generate_sitemap, APIException, val_email, val_password, generate_reset_token, confirm_reset_token, allowed_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from datetime import datetime, timedelta, date, timezone
import os
from sqlalchemy import func
from api.emails import send_password_reset_email
from .cloudinary_service import CloudinaryService
from .manager_decorator import manager_required
import re
import csv
from io import BytesIO
import openpyxl
import math

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)

NAME_REGEX = re.compile(r"^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']+$")

def val_name(text):
    return bool(NAME_REGEX.match(text))

def paginate_query(query, model_name="items", default_per_page=10):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', default_per_page, type=int)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return {
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": per_page,
        model_name: [item.serialize() for item in pagination.items]
    }

@api.route("/health-check", methods=["GET"])
def health_check():
    return jsonify({"status": "OK"}), 200


@api.route("/register", methods=["POST"])
def register_user():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "No se recibieron datos"}), 400

    email = data.get("email", "").lower().strip()
    password = data.get("password")
    name = data.get("name", "").strip()
    lastname = data.get("lastname", "").strip()

    if not all([email, password, name, lastname]):
        return jsonify({"message": "Todos los campos son obligatorios"}), 400
    
    if not (2 <= len(name) <= 50):
        return jsonify({"message": "El nombre debe tener entre 2 y 50 caracteres"}), 400
    
    if not val_name(name):
        return jsonify({"message": "Nombre inválido (solo puede contener letras, tildes y guiones)"}), 400
    
    if not (2 <= len(lastname) <= 50):
        return jsonify({"message": "El apellido debe tener entre 2 y 50 caracteres"}), 400
    
    if not val_name(lastname):
        return jsonify({"message": "Apellido inválido (solo puede contener letras, tildes y guiones)"}), 400

    if not val_email(email):
        return jsonify({"message": "Formato de correo inválido"}), 400

    if not val_password(password):
        return jsonify({"message": "La contraseña no cumple con los requisitos de seguridad"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Este correo ya está registrado"}), 422

    rol_to_find = "Participante"
    is_active_status = False

    target_rol = Rol.query.filter(Rol.name_rol.ilike(rol_to_find.strip())).first()
    if not target_rol:
        all_roles = [r.name_rol for r in Rol.query.all()]
        current_app.logger.error(f"Error crítico de configuración: El rol '{rol_to_find}' no existe en la DB. Roles actuales: {all_roles}")
        return jsonify({"message": "Error interno en la configuración de roles"}), 500

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
        return jsonify({"message": "Registro exitoso. Tu cuenta será activada pronto."}), 201
    except Exception as error:
        db.session.rollback()
        current_app.logger.error(f"Error al registrar usuario {email}: {str(error)}")
        return jsonify({"message": "Error interno al procesar el registro"}), 500


@api.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(silent=True)

        if data is None:
            return jsonify({"message": "No se proporcionaron datos"}), 400

        email = data.get("email", "").lower().strip()
        password = data.get("password", "").strip()

        if not email or not password:
            return jsonify({"message": "El correo y la contraseña son obligatorios"}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({"message": "Correo o contraseña incorrectos"}), 401

        if user.is_blocked or not user.is_active:
            return jsonify({"message": "Cuenta bloqueada o pendiente de activación. Contacta al administrador."}), 403

        if check_password_hash(user.password, password):
            user.failed_attempts = 0
            db.session.commit()

            user_role_name = user.rol.name_rol if user.rol else "Participante"
            is_admin = user_role_name == "Administrador"

            additional_claims = {
                "is_administrator": is_admin,
                "rol": user_role_name,
                "name": user.name 
            }

            access_token = create_access_token(
                identity=str(user.id_user),
                additional_claims=additional_claims
            )

            return jsonify({
                "message": "¡Bienvenido a Élite Mundialista!",
                "token": access_token,
                "user": user.serialize()
            }), 200

        else:
            user.failed_attempts += 1
            
            if user.failed_attempts >= 5:
                user.is_blocked = True
                user.is_active = False
                db.session.commit()
                current_app.logger.warning(f"Cuenta BLOQUEADA por intentos fallidos: {email}")
                return jsonify({"message": "Has superado el límite de intentos. Tu cuenta ha sido bloqueada por seguridad."}), 403
            
            db.session.commit()
            return jsonify({"message": "Credenciales inválidas"}), 401

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error en proceso de Login para {email}: {str(e)}")
        return jsonify({"message": "Error interno del servidor"}), 500

@api.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    try:
        data = request.get_json()
        raw_email = data.get('email', '')
        email_ingresado = raw_email.lower().strip() if raw_email else ""

        if not email_ingresado:
            return jsonify({"message": "El correo es obligatorio"}), 400

        user = User.query.filter_by(email=email_ingresado).first()

        if user:
            token = generate_reset_token(user.email)
            user_name = getattr(user, 'name', 'Usuario')
            send_password_reset_email(user.email, user_name, token)

        return jsonify({
            "message": "Si el correo está registrado, recibirás un enlace en breve"
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error en request_password_reset: {str(e)}")
        return jsonify({"message": "Error interno al procesar la solicitud"}), 500


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
    user = User.query.filter_by(email=email.lower()).first()
    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    # 5. Encriptar y guardar
    user.password = generate_password_hash(new_password)
    user.failed_attempts = 0
    if user.is_blocked:
        user.is_blocked = False
        user.is_active = True

    try:
        db.session.commit()
        return jsonify({"message": "¡Golazo! Contraseña actualizada. Ya puedes iniciar sesión."}), 200
    except Exception as e:
        current_app.logger.error(f"Error en reset_password para el token proporcionado: {str(e)}")
        return jsonify({"message": "Error al guardar la nueva contraseña"}), 500


#Desbloquear usuario
@api.route('/users/<int:user_id>/unlock', methods=['PATCH'])
@jwt_required()
@manager_required
def unlock_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    user.is_blocked = False
    user.failed_attempts = 0
    user.is_active = True
    
    db.session.commit()
    return jsonify({"message": f"El acceso de {user.name} ha sido restaurado."}), 200


#Ver Perfil
@api.route('/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"message": "Usuario no encontrado"}), 404

        return jsonify(user.serialize()), 200

    except Exception as e:
        current_app.logger.error(f"Error en get_profile (User ID: {user_id}): {str(e)}")
        return jsonify({"message": "Error interno del servidor"}), 500
    

# 2. Actualizar Foto de Perfil
@api.route('/user/update-photo', methods=['PATCH'])
@jwt_required()
def update_user_photo():
    try:
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"message": "Usuario no encontrado"}), 404
        
        if 'file' not in request.files:
            return jsonify({"message": "No se seleccionó ninguna imagen"}), 400
        
        file = request.files['file']

        if not allowed_file(file.filename):
            return jsonify({
                "message": "Formato no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP, GIF)."
            }), 400
        
        url, public_id = CloudinaryService.upload_file(file)
        
        if url:
            # Si tenía una foto vieja con ID, se borra
            if user.profile_public_id:
                CloudinaryService.delete_file(user.profile_public_id)
            
            user.profile = url
            user.profile_public_id = public_id
            
            db.session.commit()
            
            return jsonify({"message": "Foto actualizada", "profile": url}), 200
        
        return jsonify({"message": "No se pudo subir la imagen a la nube"}), 500

    except Exception as e:
        current_app.logger.error(f"Fallo en actualización de foto: {str(e)}")
        return jsonify({"message": "Error al procesar la imagen"}), 500


# Actualizar datos (Nombre, Apellido, Contraseña)
@api.route('/user/update-profile', methods=['PATCH'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.json
        
        if not user:
            return jsonify({"message": "Usuario no encontrado"}), 404
        
        if 'name' in data: user.name = data['name']
        if 'lastname' in data: user.lastname = data['lastname']
        
        if 'profile' in data:
            new_url = data['profile']
            if CloudinaryService.validate_cloudinary_url(new_url):
                user.profile = new_url
            else:
                return jsonify({"message": "La fuente de la imagen no es válida"}), 400

        if 'current_password' in data and 'new_password' in data:
            if not check_password_hash(user.password, data['current_password']):
                return jsonify({"message": "La contraseña actual es incorrecta"}), 400
            
            user.password = generate_password_hash(data['new_password'])
        
        db.session.commit()
        return jsonify({
            "message": "Perfil actualizado correctamente", 
            "user": user.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error en update_profile: {str(e)}")
        return jsonify({"message": "Error interno al actualizar el perfil"}), 500

# Rol-ver
@api.route('/roles', methods=['GET'])
@jwt_required()
@manager_required
def get_all_roles():
    try: 
        roles = Rol.query.all()
        return jsonify([rol.serialize() for rol in roles]), 200
    except Exception as e:
        current_app.logger.error(f"Error al obtener lista de roles: {str(e)}")
        return jsonify({"msg": "No se pudieron cargar los roles"}), 500


# Rol-crear
@api.route('/roles', methods=['POST'])
@jwt_required()
@manager_required
def create_rol():
    try:
        body = request.get_json()
        
        if not body or "name_rol" not in body:
            return jsonify({"msg": "El nombre del rol es obligatorio"}), 400
        
        new_rol = body["name_rol"].strip()

        if len(new_rol) < 3 or len(new_rol) > 30:
            return jsonify({"msg": "El nombre del rol debe tener entre 3 y 30 caracteres"}), 400
            
        exist = Rol.query.filter_by(name_rol=body["name_rol"]).first()
        if exist:
            return jsonify({"msg": "Este rol ya existe"}), 400

        new_rol = Rol(name_rol=body["name_rol"])
        db.session.add(new_rol)
        db.session.commit()
        
        return jsonify({"msg": "Rol creado con éxito", "rol": new_rol.serialize()}), 201
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al crear rol: {str(e)}")
        return jsonify({"msg": "Error interno al crear el rol"}), 500


SYSTEM_ROLES = [1, 2]

# Rol-editar
@api.route('/roles/<int:id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_rol(id):
    try:
        if id in SYSTEM_ROLES:
            return jsonify({"msg": "Los roles del sistema no pueden modificarse"}), 403

        rol = db.session.get(Rol, id)
        if not rol:
            return jsonify({"msg": "Rol no encontrado"}), 404
            
        body = request.get_json(silent=True)
        if not body or "name_rol" not in body:
            return jsonify({"msg": "El campo 'name_rol' es obligatorio"}), 400

        new_name = body["name_rol"].strip()

        if len(new_name) < 3 or len(new_name) > 30:
            return jsonify({"msg": "El nombre del rol debe tener entre 3 y 30 caracteres"}), 400

        existing_rol = Rol.query.filter(Rol.name_rol.ilike(new_name)).first()
        if existing_rol and existing_rol.id_rol != id:
            return jsonify({"msg": f"Ya existe un rol llamado '{new_name}'"}), 400
        
        rol.name_rol = new_name
        db.session.commit()
        
        return jsonify({"msg": "Rol actualizado con éxito", "rol": rol.serialize()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al editar rol ID {id}: {str(e)}")
        return jsonify({"msg": "Error interno al actualizar el rol"}), 500
    

# Rol-eliminar
@api.route('/roles/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_rol(id):
    try:
        if id in SYSTEM_ROLES:
            return jsonify({"msg": "Los roles del sistema no pueden eliminarse"}), 403
        rol = db.session.get(Rol, id)
        if not rol:
            return jsonify({"msg": "Rol no encontrado"}), 404
            
        user_count = User.query.filter_by(rol_id=id).count()
        if user_count > 0:
            return jsonify({"msg": "No se puede eliminar: hay usuarios vinculados a este rol"}), 400

        db.session.delete(rol)
        db.session.commit()
        return jsonify({"msg": "Rol eliminado correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al eliminar rol ID {id}: {str(e)}")
        return jsonify({"msg": "Error interno al intentar eliminar el rol"}), 500


#Usuarios- ver
@api.route('/users', methods=['GET'])
@jwt_required()
@manager_required
def get_users():
    try:
        search = request.args.get('search', '')
        status = request.args.get('status', 'all')
        
        query = User.query
        
        if search:
            query = query.filter(
                (User.name.ilike(f"%{search}%")) | 
                (User.lastname.ilike(f"%{search}%")) | 
                (User.email.ilike(f"%{search}%"))
            )
        
        if status == 'active':
            query = query.filter_by(is_active=True)
        elif status == 'inactive':
            query = query.filter_by(is_active=False)
            
        data = paginate_query(query, model_name="users")
        return jsonify(data), 200
    except Exception as e:
        current_app.logger.error(f"Error en get_users (filtros: {request.args}): {str(e)}")
        return jsonify({"msg": "Error interno al intentar ver todos los usuarios"}), 500

# Cambiar estatus
@api.route('/users/<int:id>/status', methods=['PATCH'])
@jwt_required()
@manager_required
def toggle_user_status(id):
    try: 
        current_user_id = get_jwt_identity()

        if id == int(current_user_id):
            return jsonify({"msg": "No puedes desactivar tu propia cuenta"}), 403

        user = User.query.get(id)
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        
        if user.is_root:
            return jsonify({"msg": "Este usuario no puede ser modificado"}), 403
        
        if not user.is_active and user.group_id is None:
            return jsonify({"msg": "No puedes activar a un usuario sin asignarle un grupo primero"}), 400
        
        user.is_active = not user.is_active
        db.session.commit()
        return jsonify({"msg": "Estatus actualizado", "user": user.serialize()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al cambiar estatus del usuario {id}: {str(e)}")
        return jsonify({"msg": "Error interno al cambiar estatus"}), 500
    

# Cambiar rol
@api.route('/users/<int:id>/role', methods=['PATCH'])
@jwt_required()
@manager_required
def change_user_role(id):
    try: 
        current_user_id = get_jwt_identity()

        if id == int(current_user_id):
            return jsonify({"msg": "No puedes cambiar tu propio rol"}), 403

        body = request.get_json(silent=True)
        if not body:
            return jsonify({"msg": "No se recibieron datos"}), 400
        
        new_rol_id = body.get("id_rol")
        if not new_rol_id:
            return jsonify({"msg": "El id del rol es obligatorio"}), 400

        user = db.session.get(User, id)
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        
        if user.is_root:
            return jsonify({"msg": "Este usuario no puede ser modificado"}), 403

        if user.rol.name_rol == "Administrador":
            admin_count = User.query.join(Rol).filter(
                Rol.name_rol == "Administrador"
            ).count()
            if admin_count <= 1:
                return jsonify({"msg": "No puedes quitar el rol al único administrador del sistema"}), 403

        if user.rol_id == new_rol_id:
            return jsonify({"msg": "El usuario ya tiene asignado este rol", "user": user.serialize()}), 200

        rol = db.session.get(Rol, new_rol_id)
        if not rol:
            return jsonify({"msg": "El rol especificado no existe"}), 404

        user.rol_id = new_rol_id
        db.session.commit()

        return jsonify({"msg": "Rol actualizado", "user": user.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al cambiar rol del usuario {id}: {str(e)}")
        return jsonify({"msg": "Error interno al intentar cambiar el rol"}), 500

# Usuarios borrar
@api.route('/users/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_user(id):
    try:
        current_user_id = get_jwt_identity()
        
        if id == int(current_user_id):
            return jsonify({"msg": "No puedes eliminar tu propia cuenta"}), 403

        user = db.session.get(User, id)
        
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        
        if user.is_root:
            return jsonify({"msg": "Este usuario no puede ser modificado"}), 403
        
        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "Usuario eliminado correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error crítico al eliminar usuario {id}: {str(e)}")
        return jsonify({"msg": "Error interno al intentar eliminar el usuario"}), 500


# ver todos los juegos
@api.route('/matches', methods=['GET'])
@jwt_required()
def get_matches():
    try:
        user_id = get_jwt_identity()
        
        matches = Match.query.order_by(Match.match_date.asc()).all()
        
        results = []
        for m in matches:
            match_data = m.serialize()
            
            if user_id:
                pred = Prediction.query.filter_by(user_id=user_id, match_id=m.id_match).first()
                if pred:
                    match_data["user_prediction"] = {
                        "home_score": pred.predicted_home_score,
                        "away_score": pred.predicted_away_score,
                        "id_prediction": pred.id_prediction
                    }
                else:
                    match_data["user_prediction"] = None
            else:
                match_data["user_prediction"] = None       
            results.append(match_data)
        return jsonify(results), 200
    except Exception as e:
        current_app.logger.error(f"Error al cargar matches para usuario {get_jwt_identity()}: {str(e)}")
        return jsonify({"msg": "Error interno al intentar ver todos los juegos"}), 500


# Crear-editar una predicción
@api.route('/predict', methods=['POST'])
@jwt_required() 
def save_prediction():
    user_id = get_jwt_identity()
    
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return jsonify({"msg": "Usuario no autorizado o inactivo"}), 403

    body = request.get_json(silent=True)
    if not body:
        return jsonify({"msg": "No se recibieron datos"}), 400

    match_id = body.get("match_id")
    home_score = body.get("home_score")
    away_score = body.get("away_score")

    if any(v is None for v in [match_id, home_score, away_score]):
        return jsonify({"msg": "Faltan datos (match_id, scores)"}), 400
    
    match = db.session.get(Match, match_id)
    if not match:
        return jsonify({"msg": "El partido no existe"}), 404

    try:
        h_score = int(home_score)
        a_score = int(away_score)
        if not (0 <= h_score <= 15 and 0 <= a_score <= 15):
            return jsonify({"msg": "El marcador debe estar entre 0 y 15 goles"}), 400
    except (ValueError, TypeError):
        return jsonify({"msg": "Los goles deben ser números válidos."}), 400

    ahora = datetime.now(timezone.utc)
    if ahora >= (match.match_date - timedelta(hours=24)) or match.status == "Finalizado":
        return jsonify({"msg": "El tiempo para esta predicción ha expirado (Cierra 24h antes)"}), 403

    prediction = Prediction.query.filter_by(user_id=user_id, match_id=match_id).first()
    
    if prediction:
        prediction.predicted_home_score = h_score
        prediction.predicted_away_score = a_score
        msg = "¡Predicción actualizada!"
    else:
        prediction = Prediction(
            user_id=user_id,
            match_id=match_id,
            predicted_home_score=h_score,
            predicted_away_score=a_score
        )
        db.session.add(prediction)
        msg = "¡Predicción guardada!"

    try:
        db.session.commit()
        return jsonify({"msg": msg, "prediction": prediction.serialize()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error en predicción: {str(e)}")
        return jsonify({"msg": "Error al procesar la predicción"}), 500


#Administrador sube marcador oficial
@api.route('/match-results/<int:match_id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_match_result(match_id):
    body = request.get_json()
    match = Match.query.get(match_id)
    if not match:
        return jsonify({"msg": "Partido no encontrado"}), 404
    
    old_home = match.home_score if match.home_score is not None else "?"
    old_away = match.away_score if match.away_score is not None else "?"
    old_score_str = f"{old_home}-{old_away}"
    
    ahora = datetime.now(timezone.utc)
    limite_correccion = match.match_date + timedelta(hours=4)

    if match.status == "Finalizado" and ahora > limite_correccion:
        return jsonify({"msg": "Tiempo de corrección agotado. Contactar soporte técnico."}), 403

    home_real = body.get("home_score")
    away_real = body.get("away_score")
    match.home_score = home_real
    match.away_score = away_real
    match.status = "Finalizado"

    predictions = Prediction.query.filter_by(match_id=match_id).all()
    
    for pred in predictions:
        pts = 0
        if pred.predicted_home_score == home_real and pred.predicted_away_score == away_real:
            pts = 3
        elif (home_real > away_real and pred.predicted_home_score > pred.predicted_away_score) or \
             (home_real < away_real and pred.predicted_home_score < pred.predicted_away_score) or \
             (home_real == away_real and pred.predicted_home_score == pred.predicted_away_score):
            pts = 1
        
        old_points = pred.points_earned or 0 
        pred.points_earned = pts          
        pred.user.total_points = (pred.user.total_points - old_points) + pts
    
    audit = AuditLog(
        action="MODIFICACION", 
        details=f"{match.home_team.name} vs {match.away_team.name}: Cambió de {old_score_str} a {home_real}-{away_real}",
        match_id=match_id,
        ip_address=request.remote_addr,
        user_id=get_jwt_identity()
    )
    db.session.add(audit)

    try:
        db.session.commit()
        return jsonify({"msg": "Resultado sellado. Tienes hasta 2 horas después del pitazo final para correcciones."}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"FALLO CRÍTICO al actualizar puntos - Partido {match_id}: {str(e)}")
        return jsonify({"msg": "Error crítico al actualizar los puntos de los usuarios"}), 500


# Ver auditoría de cambios de resultados finales
@api.route('/audit-logs', methods=['GET'])
@jwt_required()
@manager_required
def get_audit_logs():
    try:
        order_param = request.args.get('order', 'desc')
        sort_by = request.args.get('sort_by', 'date') 
        match_id = request.args.get('match_id')
        query = AuditLog.query

        if match_id:
            query = query.filter(AuditLog.match_id == int(match_id))
        
        if sort_by == 'match_id':
            order_col = AuditLog.match_id
        else:
            order_col = AuditLog.timestamp

        query = query.order_by(order_col.asc() if order_param == 'asc' else order_col.desc())
            
        return jsonify(paginate_query(query, model_name="logs")), 200
    except Exception as e:
        current_app.logger.error(f"Error al leer logs de auditoría: {str(e)}")
        return jsonify({"msg": "Error al cargar el historial de auditoría"}), 500


#Función auxiliar para el ranking
def get_ranking_by_group(group_id, page=1, per_page=12):
    ranking_data = db.session.query(
        User,
        func.sum(Prediction.points_earned).label('total_points'),
        func.count(Prediction.id_prediction).filter(Prediction.points_earned == 3).label('exact_hits'),
        func.count(Prediction.id_prediction).filter(Prediction.points_earned == 1).label('trend_hits')
    ).join(Prediction, User.id_user == Prediction.user_id, isouter=True)\
     .filter(User.is_active == True, User.group_id == group_id)\
     .group_by(User.id_user)\
     .order_by(func.sum(Prediction.points_earned).desc())\
     .all()

    ranking_list = []
    for user, total_points, exact_hits, trend_hits in ranking_data:
        ranking_list.append({
            "id_user": user.id_user,
            "username": f"{user.name} {user.lastname}",
            "total_points": int(total_points or 0),
            "exact_hits": exact_hits,
            "trend_hits": trend_hits,
            "group_name": user.group.name_group if user.group else ""
        })

    ranking_list.sort(
        key=lambda x: (x['total_points'], x['exact_hits'], x['trend_hits']),
        reverse=True
    )

    total = len(ranking_list)
    pages = math.ceil(total / per_page) if per_page > 0 else 1
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "ranking": ranking_list[start:end],
        "total": total,
        "pages": pages,
        "current_page": page,
        "per_page": per_page
    }


# Ver el ranking actualizado
@api.route('/ranking', methods=['GET'])
@jwt_required()
def get_ranking():
    try:
        current_user = db.session.get(User, get_jwt_identity())
        is_admin = current_user.rol.name_rol == "Administrador"
        requested_group_id = request.args.get('group_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)

        if not is_admin:
            target_group_id = current_user.group_id
            if not target_group_id:
                return jsonify({"msg": "No perteneces a ningún grupo todavía"}), 400
            return jsonify(get_ranking_by_group(target_group_id, page, per_page)), 200

        else:
            if requested_group_id:
                if not db.session.get(Group, requested_group_id):
                    return jsonify({"msg": "El grupo especificado no existe"}), 404
                return jsonify(get_ranking_by_group(requested_group_id, page, per_page)), 200

            all_groups = Group.query.all()
            response = []
            for group in all_groups:
                result = get_ranking_by_group(group.id_group, page, per_page)
                response.append({
                    "group_id": group.id_group,
                    "group_name": group.name_group,
                    "ranking": result["ranking"],
                    "total": result["total"],
                    "pages": result["pages"],
                    "current_page": result["current_page"]
                })
            return jsonify(response), 200

    except Exception as e:
        current_app.logger.error(f"Error al generar el Ranking: {str(e)}")
        return jsonify({"msg": "Error interno al calcular el ranking"}), 500



# Ver las predicciones finalizadas
@api.route('/predictions/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_predictions_detail(user_id):
    try:
        requester = User.query.get(get_jwt_identity())
        target_user = User.query.get(user_id)

        if not target_user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        
        is_admin = requester.rol.name_rol == "Administrador"

        if not is_admin and requester.group_id != target_user.group_id:
            current_app.logger.warning(f"Intento de acceso no autorizado: Usuario {requester.id_user} a datos de {user_id}")
            return jsonify({"msg": "Solo puedes auditar puntos de miembros de tu propio grupo"}), 403
    
        query = Prediction.query.join(Match).filter(
            Prediction.user_id == user_id,
            Match.home_score != None
        ).options(joinedload(Prediction.match))

        paginated_results = paginate_query(query, model_name="predictions")
        
        formatted_preds = []
        for p_serial in paginated_results["predictions"]:
            p = Prediction.query.get(p_serial["id_prediction"]) 
            formatted_preds.append({
                "match": f"{p.match.home_team.name} vs {p.match.away_team.name}",
                "real_result": f"{p.match.home_score} - {p.match.away_score}",
                "prediction": f"{p.predicted_home_score} - {p.predicted_away_score}",
                "points": p.points_earned
            })
        
        paginated_results["predictions"] = formatted_preds

        return jsonify(paginated_results), 200
    except Exception as e:
        current_app.logger.error(f"Error al cargar detalle de predicciones para usuario {user_id}: {str(e)}")
        return jsonify({"msg": "Error interno al cargar el historial de predicciones"}), 500


#Ver los juegos de menos 24 horas y sin finalizar
@api.route('/transparency-wall', methods=['GET'])
@jwt_required()
def get_transparency_wall():
    try:
        user = db.session.get(User, get_jwt_identity())
        is_admin = user.rol.name_rol == "Administrador"

        target_group_id = request.args.get('group_id', user.group_id, type=int) if is_admin else user.group_id

        if not target_group_id:
            return jsonify({"msg": "Debes pertenecer a un grupo para ver el muro"}), 400

        if is_admin and not db.session.get(Group, target_group_id):
            return jsonify({"msg": "El grupo especificado no existe"}), 404

        PER_PAGE   = 10
        ahora      = datetime.now(timezone.utc)
        limite_24h = ahora + timedelta(hours=24)

        matches = Match.query.options(
            joinedload(Match.home_team),
            joinedload(Match.away_team)
        ).filter(
            Match.match_date <= limite_24h,
            Match.home_score == None
        ).order_by(Match.match_date.asc()).all()

        results = []
        for m in matches:
            preds_query = Prediction.query.join(User).options(
                joinedload(Prediction.user)
            ).filter(
                Prediction.match_id == m.id_match,
                User.group_id == target_group_id,
                User.is_active == True
            )

            pagination = preds_query.paginate(page=1, per_page=PER_PAGE, error_out=False)
            total = pagination.total
            pages = pagination.pages
            preds = pagination.items

            results.append({
                "id_match":                 m.id_match,
                "home_team":                m.home_team.name,
                "away_team":                m.away_team.name,
                "home_flag":                m.home_team.flag_url,
                "away_flag":                m.away_team.flag_url,
                "match_date":               m.match_date.isoformat(),
                "predictions_total":        total,
                "predictions_pages":        pages,
                "predictions_current_page": 1,
                "predictions_per_page":     PER_PAGE,
                "predictions":              [
                    {
                        "user":    f"{p.user.name} {p.user.lastname}",
                        "user_id": p.user_id,
                        "h_score": p.predicted_home_score,
                        "a_score": p.predicted_away_score
                    } for p in preds
                ]
            })

        return jsonify(results), 200

    except Exception as e:
        current_app.logger.error(f"Error en el Muro de Transparencia: {str(e)}")
        return jsonify({"msg": "Error interno del servidor"}), 500

#Ver las predicciones de menos 24 horas y sin finalizar
@api.route('/transparency-wall/<int:match_id>/predictions', methods=['GET'])
@jwt_required()
def get_match_predictions(match_id):
    try:
        user = db.session.get(User, get_jwt_identity())
        is_admin = user.rol.name_rol == "Administrador"

        target_group_id = request.args.get('group_id', user.group_id, type=int) if is_admin else user.group_id

        if not target_group_id:
            return jsonify({"msg": "Debes pertenecer a un grupo para ver las predicciones"}), 400

        match = db.session.get(Match, match_id)
        if not match:
            return jsonify({"msg": "Partido no encontrado"}), 404

        if is_admin and not db.session.get(Group, target_group_id):
            return jsonify({"msg": "El grupo especificado no existe"}), 404

        page = request.args.get('page', 1, type=int)
        per_page = min(max(request.args.get('per_page', 10, type=int), 5), 25)
        search = request.args.get('search', '', type=str).strip()
     
        preds_query = Prediction.query.join(User).options(
            joinedload(Prediction.user)
        ).filter(
            Prediction.match_id == match_id,
            User.group_id == target_group_id,
            User.is_active == True
        )

        if search:
            preds_query = preds_query.filter(
                (User.name.ilike(f"%{search}%")) |
                (User.lastname.ilike(f"%{search}%"))
            )

        total = preds_query.count()
        pages = math.ceil(total / per_page) if total > 0 else 1
        preds = preds_query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            "match_id": match_id,
            "total": total,
            "pages": pages,
            "current_page": page,
            "per_page": per_page,
            "predictions": [
                {
                    "user": f"{p.user.name} {p.user.lastname}",
                    "user_id": p.user_id,
                    "h_score": p.predicted_home_score,
                    "a_score": p.predicted_away_score
                } for p in preds
            ]
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error al paginar predicciones del partido {match_id}: {str(e)}")
        return jsonify({"msg": "Error interno del servidor"}), 500
    
    

# Ver todos los grupos
@api.route('/groups', methods=['GET'])
@jwt_required()
def get_groups():
    try:
        groups = Group.query.all()
        return jsonify([g.serialize() for g in groups]), 200
    except Exception as e:
        current_app.logger.error(f"Error al mostar los grupos: {str(e)}")
        return jsonify({"msg": "No se pudieron cargar los grupos"}), 500


# crear G
@api.route('/groups', methods=['POST'])
@jwt_required()
@manager_required
def create_group():
    try:
        data = request.get_json()
        if not data or "name_group" not in data:
            return jsonify({"msg": "El nombre del grupo es obligatorio"}), 400
        
        if Group.query.filter_by(name_group=data["name_group"]).first():
            return jsonify({"msg": "Este grupo ya existe"}), 400

        fee = data.get("entry_fee", 0.0)

        if not isinstance(fee, (int, float)) or fee < 0:
            return jsonify({"msg": "La cuota debe ser un número positivo"}), 400
        
        new_group = Group(
            name_group=data["name_group"].strip(),
            entry_fee=float(fee)
        )

        db.session.add(new_group)
        db.session.commit()
        return jsonify({"msg": "Grupo creado con éxito", "group": new_group.serialize()}), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al crear grupo: {str(e)}") 
        return jsonify({"msg": "Error interno al crear grupo"}), 500
    
#Editar nombre de G
@api.route('/groups/<int:id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_group(id):
    try:
        group = Group.query.get(id)
        if not group:
            return jsonify({"msg": "Grupo no encontrado"}), 404

        body = request.get_json()
        updated = False

        if "name_group" in body:
            new_name = body["name_group"].strip()
            if not new_name:
                return jsonify({"msg": "El nombre no puede estar vacío"}), 400
            exist = Group.query.filter(
                Group.name_group == new_name,
                Group.id_group != id
            ).first()
            if exist:
                return jsonify({"msg": "Ya existe otro grupo con ese nombre"}), 400
            group.name_group = new_name
            updated = True

        if "entry_fee" in body:
            fee = body["entry_fee"]
            if not isinstance(fee, (int, float)) or fee < 0:
                return jsonify({"msg": "La cuota debe ser un número positivo"}), 400
            group.entry_fee = float(fee)
            updated = True

        if not updated:
            return jsonify({"msg": "Nada que actualizar"}), 400

        db.session.commit()
        return jsonify({"msg": "Grupo actualizado", "group": group.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al editar grupo ID {id}: {str(e)}")
        return jsonify({"msg": "Error interno al actualizar el grupo"}), 500

#Eliminar G
@api.route('/groups/<int:id>', methods=['DELETE'])
@jwt_required()
@manager_required
def delete_group(id):
    try:
        group = Group.query.get(id)
        if not group:
            return jsonify({"msg": "Grupo no encontrado"}), 404

        if len(group.users) > 0:
            return jsonify({
                "msg": "No se puede eliminar un grupo que tiene usuarios. Mueve a los usuarios a otro grupo primero."
            }), 400

        db.session.delete(group)
        db.session.commit()
        return jsonify({"msg": "Grupo eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al eliminar grupo ID {id}: {str(e)}")
        return jsonify({"msg": "Error interno al intentar eliminar el grupo"}), 500
    

# Asignar Grupo
@api.route('/users/<int:id>/assign-group', methods=['PATCH'])
@jwt_required()
@manager_required
def assign_group(id):
    try:
        user = User.query.get(id)
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        body = request.get_json()
        group_id = body.get("group_id")

        if group_id:
            group = Group.query.get(group_id)
            if not group:
                return jsonify({"msg": "El grupo seleccionado no existe"}), 404
            user.group_id = group_id
        else:
            user.group_id = None 

        db.session.commit()
        status_msg = f"al grupo {group.name_group}" if user.group_id else "a ningún grupo (Sin Grupo)"
        return jsonify({"msg": f"Usuario {user.name} asignado {status_msg}", "user": user.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al asignar grupo al usuario {id}: {str(e)}")
        return jsonify({"msg": "Error interno al asignar grupo"}), 500
    
#Inform. del grupo del usuario
@api.route('/group/my-info', methods=['GET'])
@jwt_required()
def get_my_group_info():
    try:
        user_id = get_jwt_identity()
        current_user = db.session.get(User, user_id)
        if not current_user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        is_admin = current_user.rol.name_rol == "Administrador"

        if is_admin:
            group_id = request.args.get("group_id", type=int)
            if not group_id:
                return jsonify({"msg": "Indica un group_id"}), 400
        else:
            group_id = current_user.group_id

        if not group_id:
            return jsonify({"msg": "No perteneces a ningún grupo"}), 404

        group = db.session.get(Group, group_id)
        if not group:
            return jsonify({"msg": "Grupo no encontrado"}), 404

        if not is_admin and current_user.group_id != group_id:
            return jsonify({"msg": "No tienes acceso a este grupo"}), 403

        active_count = User.query.filter_by(group_id=group_id, is_active=True).count()
        prize_pool = round(group.entry_fee * active_count, 2)

        members_query = User.query.filter_by(group_id=group_id, is_active=True).order_by(User.total_points.desc())

        paginated_data = paginate_query(members_query, model_name="members", default_per_page=9)

        def get_avatar(u_data):

            initials = f"{u_data['name'][0]}{u_data['lastname'][0]}".upper()
            return u_data.get('profile') or f"https://ui-avatars.com/api/?name={initials}&size=128&background=random&rounded=true"

        formatted_members = []
        for u in paginated_data["members"]:
            clean_member = {
                "id_user": u["id_user"],
                "name": u["name"],
                "lastname": u["lastname"],
                "total_points": u["total_points"],
                "rol": u["rol"],
                "is_me": u["id_user"] == int(user_id)
            }

            if not u.get("profile"):
                initials = f"{u['name'][0]}{u['lastname'][0]}".upper()
                clean_member["profile"] = f"https://ui-avatars.com/api/?name={initials}&size=128&background=random&rounded=true"
            else:
                clean_member["profile"] = u["profile"]

            formatted_members.append(clean_member)

        return jsonify({
            "group_name": group.name_group,
            "entry_fee": group.entry_fee,
            "active_count": active_count,
            "prize_pool": prize_pool,
            "members": formatted_members, 
            "total": paginated_data["total"],
            "pages": paginated_data["pages"],
            "current_page": paginated_data["current_page"]
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error en /group/my-info: {str(e)}")
        return jsonify({"msg": "Error interno al cargar la info del grupo"}), 500


@api.route('/admin/export-master-backup', methods=['GET'])
@jwt_required()
@manager_required
def export_master_backup():
    try:
        import openpyxl
        wb = openpyxl.Workbook()
        ws1 = wb.active
        ws1.title = "Predicciones Completas"

        ws1.append([
            "Grupo", "Usuario", "Email", "Partido",
            "Fecha Partido", "Predicción", "Resultado Real",
            "Puntos Ganados", "Estado", "Fecha Registro", "Última Modificación"
        ])

        usuarios = User.query.filter_by(is_active=True)\
            .order_by(User.group_id, User.lastname).all()
        partidos = Match.query.order_by(Match.match_date.asc()).all()

        todas_predicciones = Prediction.query.all()

        pred_map = {
            (p.user_id, p.match_id): p for p in todas_predicciones
        }

        for u in usuarios:
            nombre_grupo = u.group.name_group if u.group else "Sin grupo"
            nombre_completo = f"{u.name} {u.lastname}"
            
            for p in partidos:
                pred = pred_map.get((u.id_user, p.id_match))

                res_h = p.home_score if p.home_score is not None else "-"
                res_a = p.away_score if p.away_score is not None else "-"
                
                if pred:
                    jugada = f"{pred.predicted_home_score} - {pred.predicted_away_score}"
                    puntos = pred.points_earned
                    fecha_creacion = pred.created_at.strftime("%Y-%m-%d %H:%M")
                    fecha_modificacion = pred.updated_at.strftime("%Y-%m-%d %H:%M")
                else:
                    jugada = "NO REALIZADA"
                    puntos = 0
                    fecha_creacion = "-"
                    fecha_modificacion = "-"

                ws1.append([
                    nombre_grupo,
                    nombre_completo,
                    u.email,
                    f"{p.home_team.name} vs {p.away_team.name}",
                    p.match_date.strftime("%Y-%m-%d %H:%M"),
                    jugada,
                    f"{res_h} - {res_a}",
                    puntos,
                    p.status,
                    fecha_creacion,
                    fecha_modificacion
                ])

        ws2 = wb.create_sheet("Ranking General")
        ws2.append(["Grupo", "Posición", "Usuario", "Email", "Puntos Totales"])
        
        groups = Group.query.all()
        for group in groups:
            users = User.query.filter_by(
                group_id=group.id_group, is_active=True
            ).order_by(User.total_points.desc()).all()
            
            for pos, user in enumerate(users, 1):
                ws2.append([
                    group.name_group, 
                    pos,
                    f"{user.name} {user.lastname}",
                    user.email,
                    user.total_points
                ])


        output = BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"RESPALDO_QUINIELA_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        current_app.logger.error(f"Error en Excel: {str(e)}")
        return jsonify({"msg": "Error al generar el respaldo"}), 500


#Obtener pdf del muro
@api.route('/transparency-wall/export', methods=['GET'])
@jwt_required()
def export_transparency_wall():
    try:
        user = db.session.get(User, get_jwt_identity())
        is_admin = user.rol.name_rol == "Administrador"

        target_group_id = request.args.get('group_id', user.group_id, type=int) if is_admin else user.group_id

        if not target_group_id:
            return jsonify({"msg": "Debes pertenecer a un grupo para exportar"}), 400

        if is_admin and not db.session.get(Group, target_group_id):
            return jsonify({"msg": "El grupo especificado no existe"}), 404

        ahora      = datetime.now(timezone.utc)
        limite_24h = ahora + timedelta(hours=24)

        matches = Match.query.options(
            joinedload(Match.home_team),
            joinedload(Match.away_team)
        ).filter(
            Match.match_date <= limite_24h,
            Match.home_score == None
        ).order_by(Match.match_date.asc()).all()

        results = []
        for m in matches:
            preds = Prediction.query.join(User).options(
                joinedload(Prediction.user)
            ).filter(
                Prediction.match_id == m.id_match,
                User.group_id == target_group_id,
                User.is_active == True
            ).all()  

            if not preds:
                continue  

            results.append({
                "id_match":   m.id_match,
                "home_team":  m.home_team.name,
                "away_team":  m.away_team.name,
                "home_flag":  m.home_team.flag_url,
                "away_flag":  m.away_team.flag_url,
                "match_date": m.match_date.isoformat(),
                "predictions": [
                    {
                        "user":    f"{p.user.name} {p.user.lastname}",
                        "user_id": p.user_id,
                        "h_score": p.predicted_home_score,
                        "a_score": p.predicted_away_score
                    } for p in preds
                ]
            })

        return jsonify(results), 200

    except Exception as e:
        current_app.logger.error(f"Error al exportar el Muro de Transparencia: {str(e)}")
        return jsonify({"msg": "Error interno del servidor"}), 500

#Obtener pdf del ranking
@api.route('/ranking/export', methods=['GET'])
@jwt_required()
def export_ranking():
    try:
        current_user = db.session.get(User, get_jwt_identity())
        is_admin = current_user.rol.name_rol == "Administrador"
        requested_group_id = request.args.get('group_id', type=int)

        if not is_admin:
            target_group_id = current_user.group_id
            if not target_group_id:
                return jsonify({"msg": "No perteneces a ningún grupo todavía"}), 400
            result = get_ranking_by_group(target_group_id, page=1, per_page=9999)
            return jsonify(result["ranking"]), 200

        else:
            if requested_group_id:
                if not db.session.get(Group, requested_group_id):
                    return jsonify({"msg": "El grupo especificado no existe"}), 404
                result = get_ranking_by_group(requested_group_id, page=1, per_page=9999)
                return jsonify(result["ranking"]), 200

            all_groups = Group.query.all()
            response = []
            for group in all_groups:
                result = get_ranking_by_group(group.id_group, page=1, per_page=9999)
                response.append({
                    "group_id":   group.id_group,
                    "group_name": group.name_group,
                    "ranking":    result["ranking"]
                })
            return jsonify(response), 200

    except Exception as e:
        current_app.logger.error(f"Error al exportar el Ranking: {str(e)}")
        return jsonify({"msg": "Error interno al exportar el ranking"}), 500