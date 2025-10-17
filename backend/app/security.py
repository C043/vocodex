import os, time, bcrypt, jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-me")
JWT_EXPIRES = int(os.getenv("JWT_EXPIRES", "3600"))
ALGO = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(user_id: int, username: str) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "username": username,
        "iat": now,
        "exp": now + JWT_EXPIRES,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGO)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGO])
