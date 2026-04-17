
import click
import requests
from datetime import datetime
from api.models import db, User, Team, Match

"""
In this file, you can add as many commands as you want using the @app.cli.command decorator
Flask commands are usefull to run cronjobs or tasks outside of the API but sill in integration 
with youy database, for example: Import the price of bitcoin every night as 12am
"""
def setup_commands(app):
    
    """ 
    This is an example command "insert-test-users" that you can run from the command line
    by typing: $ flask insert-test-users 5
    Note: 5 is the number of users to add
    """
    @app.cli.command("insert-test-users") # name of our command
    @click.argument("count") # argument of out command
    def insert_test_users(count):
        print("Creating test users")
        for x in range(1, int(count) + 1):
            user = User()
            user.email = "test_user" + str(x) + "@test.com"
            user.password = "123456"
            user.is_active = True
            db.session.add(user)
            db.session.commit()
            print("User: ", user.email, " created.")

        print("All test users created")

    @app.cli.command("sync-matches")
    def sync_matches():
        """Sincroniza los partidos del Mundial 2026 desde la API"""
        TOKEN = "f4cab83c9e7a4d7bb5e0fb832cc88d2b"
        # Endpoint extraído de tu documentación PDF
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
                # --- FILTRO DE SEGURIDAD ---
                # Si no hay datos de equipos todavía (partidos por definir), saltamos este partido
                if not m.get('homeTeam') or not m['homeTeam'].get('name'):
                    print(f"⏩ Saltando partido ID {m.get('id')} por equipos no definidos.")
                    continue

                # --- PROCESAR EQUIPOS ---
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

                # --- PROCESAR PARTIDO ---
                # Convertimos la fecha de la API (ISO) a objeto datetime de Python
                match_date = datetime.fromisoformat(m['utcDate'].replace('Z', '+00:00'))
                
                # Verificamos si el partido ya existe para no duplicarlo
                existing_match = Match.query.filter_by(
                    home_team_id=home_team.id_team,
                    away_team_id=away_team.id_team,
                    match_date=match_date
                ).first()

                if not existing_match:
                    new_match = Match(
                        home_team_id=home_team.id_team,
                        away_team_id=away_team.id_team,
                        match_date=match_date,
                        stadium=m.get('venue', 'Por definir'),
                        status="Pendiente"
                    )
                    db.session.add(new_match)

            db.session.commit()
            print("✅ ¡Base de datos actualizada con éxito!")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error durante la sincronización: {str(e)}")



# pipenv run flask sync-matches