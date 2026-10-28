import hashlib
import hmac
import secrets
from typing import Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from app.core.config import settings

# Initialize Argon2id hasher with secure parameters
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hash password using Argon2id algorithm."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash with timing safety."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError):
        return False


def generate_session_token() -> Tuple[str, str]:
    """
    Generate cryptographically secure session token and its SHA-256 hash.
    Returns: (raw_cookie_token, token_hash_for_db_lookup)
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash


def hash_session_token(raw_token: str) -> str:
    """Hash a raw session token to look up in the database."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_csrf_token(session_token: str) -> str:
    """Generate CSRF token bound to session token using HMAC-SHA256."""
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        session_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_csrf_token(session_token: str, csrf_token: str) -> bool:
    """Constant time verification of CSRF token."""
    expected = generate_csrf_token(session_token)
    return hmac.compare_digest(expected, csrf_token)


def generate_qr_challenge(session_id: str, sequence: int) -> Tuple[str, str]:
    """
    Generate cryptographic random challenge token for dynamic QR code.
    Returns (challenge_token, qr_data_string).
    """
    rand_bytes = secrets.token_hex(16)
    challenge_token = secrets.token_urlsafe(24)
    # The payload encoded inside the QR code
    qr_data = f"ATTENDX:{session_id}:{sequence}:{challenge_token}"
    return challenge_token, qr_data
