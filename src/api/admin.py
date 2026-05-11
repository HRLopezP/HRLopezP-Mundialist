import os
import inspect
from flask_admin import Admin, AdminIndexView
from . import models
from .models import db
from flask_admin.contrib.sqla import ModelView
from flask_admin.theme import Bootstrap4Theme
from flask import redirect, url_for, request, flash, session
from flask_jwt_extended import decode_token


class SecureModelView(ModelView):
    form_base_class = type('Proxy', (object,), {'meta': {'csrf': False}})

    # Cambiamos la firma para aceptar args y kwargs
    def is_accessible(self, *args, **kwargs):
        # Primero intentamos capturar el token de la URL
        token = request.args.get('token')
        
        if token:
            session['admin_token'] = token
            return True 

        # Si no está en la URL, lo buscamos en la sesión
        stored_token = session.get('admin_token')
        if not stored_token:
            return False

        try:
            decoded = decode_token(stored_token)
            return decoded.get("sub") and decoded.get("is_administrator") == True
        except Exception as e:
            session.pop('admin_token', None)
            return False

    def inaccessible_callback(self, name, **kwargs):
        return redirect("/")

class MyAdminIndexView(AdminIndexView):
    # Hacemos lo mismo aquí: aceptar cualquier argumento extra
    def is_accessible(self, *args, **kwargs):
        token = request.args.get('token')
        if token:
            session['admin_token'] = token
            return True

        stored_token = session.get('admin_token')
        if not stored_token:
            return False
            
        try:
            decoded = decode_token(stored_token)
            return decoded.get("sub") and decoded.get("is_administrator") == True
        except Exception as e:
            session.pop('admin_token', None)
            return False

    def inaccessible_callback(self, name, **kwargs):
        return redirect("/")

def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY')
    admin = Admin(
        app,
        name='4Geeks Admin',
        url='/admin',
        index_view=MyAdminIndexView(url='/admin'),
        theme=Bootstrap4Theme(swatch='cerulean')
    )
