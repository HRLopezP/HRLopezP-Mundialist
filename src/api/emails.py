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
    
    # Diseño ajustado a los colores de la quiniela:
    # Neon Blue: #00d4ff | Pitch Green: #28c87d | Deep Navy: #051426
    msg.html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; background-color: #051426; padding: 40px 10px; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: rgba(10, 20, 50, 0.95); border-radius: 24px; overflow: hidden; border: 1px solid rgba(0, 212, 255, 0.3); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            
            <div style="background: linear-gradient(135deg, #051426 0%, #00d4ff 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 4px; font-weight: 800;">
                    MUNDIAL <span style="color: #28c87d;">ÉLITE</span>
                </h1>
                <p style="color: rgba(255,255,255,0.8); margin-top: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                    ¡Tu camino a la gloria!
                </p>
            </div>

            <div style="padding: 40px 30px; text-align: center;">
                <div style="background-color: rgba(40, 200, 125, 0.1); border-radius: 50%; width: 80px; height: 80px; line-height: 80px; margin: 0 auto 25px auto;">
                    <span style="font-size: 40px;">🔑</span>
                </div>
                
                <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 20px;">¿Olvidaste tu estrategia, {user_name}?</h2>
                
                <p style="color: #a8b2d1; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Parece que tu pase de entrada al estadio ha fallado. No te quedes fuera de la jugada, haz clic en el botón de abajo para restablecer tu contraseña.
                </p>
                
                <div style="margin: 40px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #28c87d; color: #051426; padding: 18px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(40, 200, 125, 0.4);">
                       RESTABLECER CONTRASEÑA
                    </a>
                </div>

                <p style="font-size: 13px; color: #00d4ff; opacity: 0.8;">
                    Este enlace de recuperación es válido por solo 15 minutos.<br>
                    Si tú no solicitaste este cambio, puedes ignorar este mensaje.
                </p>
            </div>

            <div style="background-color: rgba(0,0,0,0.3); padding: 25px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                <p style="font-size: 11px; color: #a8b2d1; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                    &copy; 2026 MUNDIAL ÉLITE PREDICTOR<br>
                    <span style="color: #28c87d;">La Quiniela de los Verdaderos Expertos</span>
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
