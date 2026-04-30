import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name = os.getenv('VITE_CLOUDINARY_CLOUD_NAME'),
    api_key = os.getenv('CLOUDINARY_API_KEY'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET'),
    secure = True
)

class CloudinaryService:
    @staticmethod
    def upload_file(file):
        try:
            result = cloudinary.uploader.upload(
                file,
                upload_preset = os.getenv('VITE_CLOUDINARY_UPLOAD_PRESET'),
                resource_type = "image"
            )
            return result.get("secure_url"), result.get("public_id")
        except Exception as e:
            print(f"Error en Cloudinary: {str(e)}")
            return None, None

    @staticmethod
    def delete_file(public_id):
        if not public_id: return False
        try:
            res = cloudinary.uploader.destroy(public_id)
            return res.get("result") == "ok"
        except Exception as e:
            print(f"Error al eliminar: {str(e)}")
            return False

    @staticmethod
    def validate_cloudinary_url(url):
        if not url: return False
        cloud_name = os.getenv('VITE_CLOUDINARY_CLOUD_NAME')
        return f"res.cloudinary.com/{cloud_name}" in url