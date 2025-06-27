from enum import Enum as PythonEnum


class UserRole(PythonEnum):
    USER = "user"
    ADMIN = "admin"
    REVIEWER = "reviewer"
