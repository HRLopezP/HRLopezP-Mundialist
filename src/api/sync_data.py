import requests
from models import db, Team, Match
from datetime import datetime

def sync_world_cup_data(app):
    TOKEN = "f4cab83c9e7a4d7bb5e0fb832cc88d2b"
    URL = "https://api.football-data.org/v4/competitions/WC/matches?season=2026"
    headers = { "X-Auth-Token": TOKEN }

    with app.app_context():
        print("Iniciando secuestro de datos...")
        response = requests.get(URL, headers=headers)
        
        if response.status_code != 200:
            print("Error al conectar con la API")
            return

        data = response.json()
        matches = data.get("matches", [])

        for m in matches:
            # 1. Procesar Equipo Local
            home_data = m['homeTeam']
            home_team = Team.query.filter_by(name=home_data['name']).first()
            if not home_team:
                home_team = Team(
                    name=home_data['name'],
                    flag_url=home_data.get('crest'),
                    group_name=m.get('group', 'N/A')
                )
                db.session.add(home_team)
                db.session.flush() # Para obtener el ID del equipo de inmediato

            # 2. Procesar Equipo Visitante
            away_data = m['awayTeam']
            away_team = Team.query.filter_by(name=away_data['name']).first()
            if not away_team:
                away_team = Team(
                    name=away_data['name'],
                    flag_url=away_data.get('crest'),
                    group_name=m.get('group', 'N/A')
                )
                db.session.add(away_team)
                db.session.flush()

            # 3. Crear el Partido (Match)
            # Evitamos duplicados buscando por la fecha y los equipos
            match_date = datetime.fromisoformat(m['utcDate'].replace('Z', '+00:00'))
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
                    stadium=m.get('venue'),
                    status="Pendiente"
                )
                db.session.add(new_match)

        db.session.commit()
        print(f"¡Proceso terminado! Datos guardados en tu base de datos.")