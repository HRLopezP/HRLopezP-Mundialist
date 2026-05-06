
import click
import requests
from datetime import datetime
from api.models import db, User, Team, Match, Rol
import os

def setup_commands(app):
    
    def execute_match_sync():
        TOKEN = os.getenv("FOOTBALL_API_TOKEN")
        URL = "https://api.football-data.org/v4/competitions/WC/matches?season=2026"
        headers = { "X-Auth-Token": TOKEN }

        print("🚀 Iniciando conexión con la API de fútbol...")
        try:
            response = requests.get(URL, headers=headers)
            response.raise_for_status()
            data = response.json()
            matches = data.get("matches", [])
            print(f"📦 Se encontraron {len(matches)} partidos. Procesando...")

            for m in matches:
                if not m.get('homeTeam') or not m['homeTeam'].get('name'):
                    continue

                home_info = m['homeTeam']
                home_team = Team.query.filter_by(name=home_info['name']).first()
                if not home_team:
                    home_team = Team(
                        name=home_info['name'],
                        flag_url=home_info.get('crest'),
                        group_name=m.get('group', 'N/A')
                    )
                    db.session.add(home_team)
                    db.session.flush()

                away_info = m['awayTeam']
                away_team = Team.query.filter_by(name=away_info['name']).first()
                if not away_team:
                    away_team = Team(
                        name=away_info['name'],
                        flag_url=away_info.get('crest'),
                        group_name=m.get('group', 'N/A')
                    )
                    db.session.add(away_team)
                    db.session.flush()

                match_date = datetime.fromisoformat(m['utcDate'].replace('Z', '+00:00'))
                existing_match = Match.query.filter_by(
                    home_team_id=home_team.id_team,
                    away_team_id=away_team.id_team,
                ).first()

                if existing_match:
                    existing_match.match_date = match_date
                    print(f"⏰ Hora actualizada para {home_team.name} vs {away_team.name}")
                else:
                    new_match = Match(
                        home_team_id=home_team.id_team,
                        away_team_id=away_team.id_team,
                        match_date=match_date,
                        stadium=m.get('venue', 'Por definir'),
                        status="Pendiente"
                    )
                    db.session.add(new_match)
            db.session.commit()
            print("✅ ¡Sincronización de partidos completada!")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {str(e)}")


    @app.cli.command("sync-matches")
    def sync_matches():
        """Solo sincroniza los partidos"""
        execute_match_sync()

    @app.cli.command("init-db")
    def init_db():
        """Crea roles e inmediatamente sincroniza partidos"""
        print("🛠️ Configurando roles...")
        roles = ["Administrador", "Participante"]
        for role_name in roles:
            role = Rol.query.filter_by(name_rol=role_name).first()
            if not role:
                new_role = Rol(name_rol=role_name)
                db.session.add(new_role)
        
        db.session.commit()
        print("✅ Roles creados.")

        execute_match_sync()

    @app.cli.command("create-admin")
    @click.argument("email")
    def create_admin(email):
        """Promueve a un usuario existente al rol de Administrador y lo activa.
        Uso: flask create-admin correo@ejemplo.com
        """
        email = email.lower().strip()
        user = User.query.filter_by(email=email).first()

        if not user:
            print(f"❌ No se encontró ningún usuario con el email: {email}")
            print("   Asegúrate de que el usuario ya esté registrado primero.")
            return

        admin_rol = Rol.query.filter_by(name_rol="Administrador").first()
        if not admin_rol:
            print("❌ El rol 'Administrador' no existe en la base de datos.")
            print("   Ejecuta primero: flask init-db")
            return

        user.rol_id = admin_rol.id_rol
        user.is_active = True
        user.is_blocked = False

        db.session.commit()
        print(f"✅ ¡Listo! {user.name} {user.lastname} ({email}) ahora es Administrador.")


    # pipenv run flask init-db
    # flask init-db    para correr en render y trae roles y partidos
    # flask sync-matches    solo trae los datos de los juegos y no los roles.


# 1. Primero crear los roles y sincronizar partidos (ya lo tienes)
# flask init-db

# 2. Registrarte normalmente en la app como cualquier usuario

# 3. Ejecutar este comando UNA SOLA VEZ para promoverte a admin
# flask create-admin correo@ejemplo.com