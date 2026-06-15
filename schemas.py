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

class StrengthBase(BaseModel):
    exercise: str
    estimated_1rm: float
    strength_curve: dict

class StrengthCreate(StrengthBase):
    pass

class StrengthResponse(StrengthBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True