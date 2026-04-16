from flask_mail import Message
from api.extensions import mail
import os


def send_password_reset_email(user_email, user_name, token):
    frontend_url = os.getenv("FRONTEND_URL").rstrip('/')
    reset_url = f"{frontend_url}/reset-password?token={token}"

    msg = Message(
        "🏆 Recupera tu acceso - Mundial Elite Predictor",
        recipients=[user_email]
    )

    # Diseño deportivo: Usamos una combinación de verde césped, dorado y blanco
    msg.html = f"""
    <div style="font-family: 'Arial', sans-serif; background-color: #1a1a1a; padding: 40px 10px; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #242424; border-radius: 20px; overflow: hidden; border: 2px solid #2d6a4f;">
            
            <div style="background: linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffca28; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 3px;">
                    Mundial Elite Predictor
                </h1>
                <p style="color: #d8f3dc; margin: 5px 0 0 0; font-weight: bold;">¡La emoción del fútbol en tus manos!</p>
            </div>

            <div style="padding: 40px; text-align: center;">
                <h2 style="color: #ffffff;">¡Hola, {user_name}! ⚽</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #b7e4c7;">
                    Parece que tu pase de entrada al estadio ha fallado. No te quedes fuera de la jugada, haz clic en el botón de abajo para restablecer tu contraseña y seguir con tus pronósticos.
                </p>
                
                <div style="margin: 40px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #ffca28; color: #1a1a1a; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 15px rgba(255,202,40,0.3);">
                       RESTABLECER CONTRASEÑA
                    </a>
                </div>

                <p style="font-size: 14px; color: #74c69d;">
                    Este enlace de recuperación es válido por solo 15 minutos.<br>
                    Si tú no solicitaste este cambio, puedes ignorar este mensaje y seguir disfrutando del juego.
                </p>
            </div>

            <div style="background-color: #1b4332; padding: 20px; text-align: center; border-top: 1px solid #2d6a4f;">
                <p style="font-size: 12px; color: #95d5b2; margin: 0;">
                    &copy; 2026 Mundial Elite Predictor - La Quiniela de los Expertos.
                </p>
            </div>
        </div>
    </div>
    """

    try:
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error enviando correo: {str(e)}")
        return False
