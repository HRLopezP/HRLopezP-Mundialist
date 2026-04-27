import requests
import os

def test_mundial_data():
    # Tu token que vimos en la imagen
    TOKEN = os.getenv("FOOTBALL_API_TOKEN")
    
    # Según tu PDF, el endpoint para partidos de una competición es este [cite: 12, 29]
    # Usamos 'WC' que es el código estándar para la World Cup
    url = "https://api.football-data.org/v4/competitions/WC/matches"
    
    headers = { "X-Auth-Token": TOKEN }
    
    # Filtramos por la temporada 2026 como indica tu manual 
    params = { "season": "2026" }
    
    print("Conectando con la biblioteca de fútbol...")
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code == 200:
        data = response.json()
        partidos = data.get("matches", [])
        print(f"¡Éxito! Se encontraron {len(partidos)} partidos.")
        
        # Vamos a ver los detalles de los primeros 3 para entender el formato
        for i in range(min(3, len(partidos))):
            p = partidos[i]
            home = p['homeTeam']['name']
            away = p['awayTeam']['name']
            fecha = p['utcDate']
            grupo = p.get('group', 'N/A')
            print(f"Juego {i+1}: {home} vs {away} | Fecha: {fecha} | {grupo}")
    else:
        print(f"Error {response.status_code}: No pudimos entrar a la biblioteca.")
        print(response.json())

if __name__ == "__main__":
    test_mundial_data()


# pipenv run python src/api/test_api.py