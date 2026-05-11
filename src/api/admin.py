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

    # Agregamos **kwargs para que acepte cualquier argumento extra que Flask-Admin le envíe
    def is_accessible(self, **kwargs):
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
        except:
            session.pop('admin_token', None)
            return False

    def inaccessible_callback(self, name, **kwargs):
        return redirect("/")

class MyAdminIndexView(AdminIndexView):
    # También agregamos **kwargs aquí por seguridad
    def is_accessible(self, **kwargs):
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
        except:
            session.pop('admin_token', None)
            return False

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
            admin.add_view(SecureModelView(obj, db.session))
