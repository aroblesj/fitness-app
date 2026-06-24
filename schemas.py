from datetime import datetime
from pydantic import BaseModel

class BiometricBase(BaseModel):
    weight_kg: float
    height_cm: float
    age: int
    sex: str
    activity_level: str
    body_fat: float | None = None

class BiometricCreate(BiometricBase):
    pass

class BiometricResponse(BiometricBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class StrengthCreate(BaseModel):
    exercise: str
    weight_lifted: float
    reps: int

class StrengthResponse(BaseModel):
    id: int
    user_id: int
    exercise: str
    weight_lifted: float
    reps: int
    estimated_1rm: float
    strength_curve: dict

    class Config:
        from_attributes = True

class TodoBase(BaseModel):
    title: str
    completed: bool = False

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    title: str | None = None
    completed: bool | None = None

class TodoResponse(TodoBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        from_attributes = True