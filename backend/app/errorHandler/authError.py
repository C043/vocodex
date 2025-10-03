class AuthError(Exception):
    def __init__(self, status_code: int, message: str = "Unauthorized"):
        self.status_code = status_code
        self.message = message
