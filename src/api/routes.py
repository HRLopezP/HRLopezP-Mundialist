from flask import Flask, request, jsonify, url_for, Blueprint, json, current_app
from api.models import db, User, Rol, Match, Prediction, AuditLog, Group
from sqlalchemy.orm import joinedload
from api.utils import generate_sitemap, APIException, val_email, val_password, generate_reset_token, confirm_reset_token, allowed_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from datetime import datetime, timedelta, date, timezone
import os
from api.emails import send_password_reset_email
from .cloudinary_service import CloudinaryService
from .manager_decorator import manager_required

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)

def paginate_query(query, model_name="items"):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
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

    email = data.get("email").lower().strip() if data.get("email") else None
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
        msg = "¡Bienvenido, Administrador!" if is_active_status else "Registro exitoso. Tu cuenta será activada pronto."
        return jsonify({"message": msg}), 201
    except Exception as error:
        db.session.rollback()
        current_app.logger.error(f"Error al registrar usuario {email}: {str(error)}")
        return jsonify({"message": "Error en el servidor", "error": str(error)}), 500


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

            email_sent = send_password_reset_email(user.email, user_name, token)

            if email_sent:
                return jsonify({"message": "Si el correo existe, se ha enviado un enlace de recuperación"}), 200
            else:
                return jsonify({"message": "Error al procesar el envío del correo"}), 500

        return jsonify({"message": "Usuario no encontrado"}), 404

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
        user = User.query.get(user_id)
        
        if 'file' not in request.files:
            return jsonify({"message": "No se seleccionó ninguna imagen"}), 400
        
        file = request.files['file']

        if not allowed_file(file.filename):
            return jsonify({
                "message": "Formato no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP, GIF)."
            }), 400
        
        url, public_id = CloudinaryService.upload_file(file)
        
        if url:
            # Si tenía una foto vieja con ID, la borramos
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
            
        # Verificar si ya existe
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

# Rol-editar
@api.route('/roles/<int:id>', methods=['PUT'])
@jwt_required()
@manager_required
def update_rol(id):
    try:
        rol = Rol.query.get(id)
        if not rol:
            return jsonify({"msg": "Rol no encontrado"}), 404
            
        body = request.get_json()
        if "name_rol" in body:
            rol.name_rol = body["name_rol"]
            db.session.commit()
            return jsonify({"msg": "Rol actualizado", "rol": rol.serialize()}), 200
            
        return jsonify({"msg": "Nada que actualizar"}), 400
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
        rol = Rol.query.get(id)
        if not rol:
            return jsonify({"msg": "Rol no encontrado"}), 404
            
        if len(rol.users) > 0:
            return jsonify({"msg": "No se puede eliminar un rol que tiene usuarios asignados"}), 400

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
        
        if id == 1:
            return jsonify({"msg": "El Administrador Principal es intocable"}), 403
        if id == int(current_user_id):
            return jsonify({"msg": "No puedes desactivar tu propia cuenta"}), 403

        user = User.query.get(id)
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        
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
        
        if id == 1:
            return jsonify({"msg": "No se puede cambiar el rol del Administrador Principal"}), 403
        if id == int(current_user_id):
            return jsonify({"msg": "No puedes cambiar tu propio rol"}), 403

        body = request.get_json()
        user = User.query.get(id)
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        user.rol_id = body.get("id_rol")
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
        
        if id == 1:
            return jsonify({"msg": "Acción prohibida: El Administrador Principal no puede ser eliminado"}), 403
        if id == int(current_user_id):
            return jsonify({"msg": "No puedes eliminarte a ti mismo"}), 403

        user = User.query.get(id)
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        
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
    body = request.get_json()
    match_id = body.get("match_id")
    home_score = body.get("home_score")
    away_score = body.get("away_score")

    if None in [match_id, home_score, away_score]:
        return jsonify({"msg": "Faltan datos (match_id, scores)"}), 400

    try:
        h_score = int(home_score)
        a_score = int(away_score)

        if h_score < 0 or h_score > 10 or a_score < 0 or a_score > 10:
            return jsonify({"msg": "El marcador debe estar entre 0 y 10 goles."}), 400
    except (ValueError, TypeError):
        return jsonify({"msg": "Los goles deben ser números válidos."}), 400

    match = Match.query.get(match_id)
    
    if not match:
        return jsonify({"msg": "El partido no existe"}), 404

    ahora = datetime.now(timezone.utc)
    limite_apuesta = match.match_date - timedelta(hours=24)

    if ahora > limite_apuesta or ahora >= match.match_date or match.status == "Finalizado":
        return jsonify({"msg": "Las predicciones para este juego están cerradas."}), 403

    prediction = Prediction.query.filter_by(user_id=user_id, match_id=match_id).first()

    if prediction:
        prediction.predicted_home_score = h_score
        prediction.predicted_away_score = a_score
        msg = "Predicción actualizada con éxito"
    else:
        prediction = Prediction(
            user_id=user_id,
            match_id=match_id,
            predicted_home_score=h_score,
            predicted_away_score=a_score
        )
        db.session.add(prediction)
        msg = "Predicción guardada con éxito"

    try:
        db.session.commit()
        return jsonify({"msg": msg, "prediction": prediction.serialize()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al guardar predicción (User: {user_id}, Match: {match_id}): {str(e)}")
        return jsonify({"msg": "Error interno al procesar tu predicción. Intenta de nuevo."}), 500


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
        details=f"{match.home_team.name} vs {match.away_team.name} (ID {match_id}): Cambió de {old_score_str} a {home_real}-{away_real}",
        ip_address=request.remote_addr,
        user_id=get_jwt_identity()
    )
    db.session.add(audit)

    try:
        db.session.commit()
        return jsonify({"msg": "Resultado sellado. Tienes 2 horas para correcciones."}), 200
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
        match_id = request.args.get('match_id')
        query = AuditLog.query

        if match_id:
            query = query.filter(AuditLog.details.contains(f"(ID {match_id})"))
        
        if order_param == 'asc':
            query = query.order_by(AuditLog.timestamp.asc())
        else:
            query = query.order_by(AuditLog.timestamp.desc())
            
        return jsonify(paginate_query(query, model_name="logs")), 200
    except Exception as e:
        current_app.logger.error(f"Error al leer logs de auditoría: {str(e)}")
        return jsonify({"msg": "Error al cargar el historial de auditoría"}), 500


# Ver el ranking actualizado
@api.route('/ranking', methods=['GET'])
@jwt_required()
def get_ranking():
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        if not current_user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        # 1. DETERMINAR QUÉ GRUPO QUEREMOS VER
        # El Administrador puede pasar un group_id por el selector (URL args)
        target_group_id = request.args.get('group_id', type=int)

        # Si no se pasó un group_id por el selector:
        if not target_group_id:
            # Si el usuario (sea Admin o no) pertenece a un grupo, usamos ese por defecto
            if current_user.group_id:
                target_group_id = current_user.group_id
            else:
                # Si es Admin pero no eligió grupo y no pertenece a ninguno
                if current_user.rol.name_rol == "Administrador":
                    return jsonify({"msg": "Como administrador, selecciona un grupo para ver su ranking"}), 200
                return jsonify({"msg": "No perteneces a ningún grupo"}), 400

        users = User.query.filter_by(group_id=target_group_id, is_active=True).all()
        ranking_list = []
        
        for user in users:
            preds = Prediction.query.filter(
                Prediction.user_id == user.id_user,
                Prediction.points_earned != None
            ).all()
            
            total_points = sum(p.points_earned for p in preds)
            exact_hits = sum(1 for p in preds if p.points_earned == 3)
            trend_hits = sum(1 for p in preds if p.points_earned == 1)
            
            ranking_list.append({
                "id_user": user.id_user,
                "username": f"{user.name} {user.lastname}",
                "total_points": total_points,
                "exact_hits": exact_hits,
                "trend_hits": trend_hits,
                "group_name": user.group.name_group if user.group else ""
            })
        
        ranking_list.sort(key=lambda x: (x['total_points'], x['exact_hits'], x['trend_hits']), reverse=True)
        
        return jsonify(ranking_list), 200
    except Exception as e:
        current_app.logger.error(f"Error al generar el Ranking: {str(e)}")
        return jsonify({"msg": "No se pudo calcular el ranking en este momento"}), 500


# Ver las predicciones finalizadas
@api.route('/predictions/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_predictions_detail(user_id):
    try:
        requester = User.query.get(get_jwt_identity())
        target_user = User.query.get(user_id)

        if not target_user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        
        if requester.rol.name_rol != "Administrador" and requester.group_id != target_user.group_id:
            current_app.logger.warning(f"Intento de espionaje: Usuario {requester.id_user} intentó ver datos del Usuario {user_id} de otro grupo.")
            return jsonify({"msg": "No tienes permiso para ver datos de usuarios de otros grupos"}), 403
    
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


#Ver las predicciones de menos 24 horas y sin finalizar
@api.route('/transparency-wall', methods=['GET'])
@jwt_required()
def get_transparency_wall():
    try:
        user = User.query.get(get_jwt_identity())
        target_group_id = request.args.get('group_id', user.group_id, type=int)

        ahora = datetime.now(timezone.utc)
        limite_24h = ahora + timedelta(hours=24)

        matches = Match.query.filter(
            Match.match_date <= limite_24h,
            Match.home_score == None
        ).order_by(Match.match_date.asc()).all()

        results = []
        for m in matches:
            preds = Prediction.query.join(User).filter(
                Prediction.match_id == m.id_match,
                User.group_id == target_group_id
            ).all()
            
            results.append({
                "id_match": m.id_match,
                "home_team": m.home_team.name,
                "away_team": m.away_team.name,
                "home_flag": m.home_team.flag_url,
                "away_flag": m.away_team.flag_url,
                "match_date": m.match_date.isoformat(),
                "predictions": [
                    {
                        "user": f"{p.user.name} {p.user.lastname}",
                        "user_id": p.user_id,
                        "h_score": p.predicted_home_score,
                        "a_score": p.predicted_away_score
                    } for p in preds
                ]
            })

        return jsonify(results), 200
    except Exception as e:
        current_app.logger.error(f"Error en el Muro de Transparencia: {str(e)}")
        return jsonify({"msg": "No se pudo cargar el muro de transparencia en este momento"}), 500
    

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

        new_group = Group(name_group=data["name_group"])
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
        if "name_group" in body:
            exist = Group.query.filter(Group.name_group == body["name_group"], Group.id_group != id).first()
            if exist:
                return jsonify({"msg": "Ya existe otro grupo con ese nombre"}), 400

            group.name_group = body["name_group"]
            db.session.commit()
            return jsonify({"msg": "Nombre del grupo actualizado", "group": group.serialize()}), 200
            
        return jsonify({"msg": "Nada que actualizar"}), 400
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
        return jsonify({"msg": f"Grupo de {user.name} actualizado", "user": user.serialize()}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al asignar grupo al usuario {id}: {str(e)}")
        return jsonify({"msg": "Error interno al asignar grupo"}), 500