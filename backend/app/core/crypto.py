import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _derive_fernet_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def get_fernet() -> Fernet:
    return Fernet(_derive_fernet_key(settings.SECRET_KEY))


def encrypt_text(plaintext: str) -> str:
    f = get_fernet()
    token = f.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_text(token: str) -> str:
    f = get_fernet()
    plaintext = f.decrypt(token.encode("utf-8"))
    return plaintext.decode("utf-8")

