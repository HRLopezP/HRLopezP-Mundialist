import os
import inspect
from flask_admin import Admin, AdminIndexView
from . import models
from .models import db
from flask_admin.contrib.sqla import ModelView
from flask_admin.theme import Bootstrap4Theme
from flask import redirect, url_for, request, flash
from flask_jwt_extended import decode_token

class SecureModelView(ModelView):
    def is_accessible(self):
        # Buscamos el token en los parámetros de la URL o en las cookies
        # Para simplificar en pruebas, usaremos un parámetro 'token' en la URL
        token = request.args.get('token')
        if not token:
            return False
        
        try:
            # Decodificamos el token que generaste en el Login
            decoded = decode_token(token)
            # Verificamos si en los claims adicionales pusimos que es administrador
            return decoded.get("sub") and decoded.get("is_administrator") == True
        except:
            return False

    def inaccessible_callback(self, name, **kwargs):
        # Si no tiene el token correcto, lo mandamos al home del frontend
        return redirect("/")

class MyAdminIndexView(AdminIndexView):
    def is_accessible(self):
        token = request.args.get('token')
        if not token: return False
        try:
            decoded = decode_token(token)
            return decoded.get("sub") and decoded.get("is_administrator") == True
        except: return False

    def inaccessible_callback(self, name, **kwargs):
        return redirect("/")
    
def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY')
    admin = Admin(
        app, 
        name='4Geeks Admin', 
        url='/hrlp-mundialist-9843', 
        index_view=MyAdminIndexView(url='/hrlp-mundialist-9843'),
        theme=Bootstrap4Theme(swatch='cerulean')
    )

    # Dynamically add all models to the admin interface
    for name, obj in inspect.getmembers(models):
        # Verify that the object is a SQLAlchemy model before adding it to the admin. 
        if inspect.isclass(obj) and issubclass(obj, db.Model):
            admin.add_view(ModelView(obj, db.session))