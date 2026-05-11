import os
import inspect
from flask_admin import Admin, AdminIndexView
from . import models
from .models import db
from flask_admin.contrib.sqla import ModelView
from flask_admin.theme import Bootstrap4Theme
from flask import redirect, request


class SecureModelView(ModelView):
    def is_accessible(self):
        return True

    def inaccessible_callback(self, name, **kwargs):
        return redirect("/")


class MyAdminIndexView(AdminIndexView):
    def is_accessible(self):
        return True

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

    for name, obj in inspect.getmembers(models):
        if inspect.isclass(obj) and issubclass(obj, db.Model):
            admin.add_view(SecureModelView(obj, db.session))