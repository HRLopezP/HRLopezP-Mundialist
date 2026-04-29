
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
            role = Rol.query.filter_by(name=role_name).first()
            if not role:
                new_role = Rol(name=role_name)
                db.session.add(new_role)
        
        db.session.commit()
        print("✅ Roles creados.")

        execute_match_sync()


    # pipenv run flask init-db
    # flask init-db    para correr en render y trae roles y partidos
    # flask sync-matches    solo trae los datos de los juegos y no los roles.