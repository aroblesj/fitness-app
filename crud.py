from sqlalchemy.orm import Session
import database
import json

def upsert_user_biometrics(db: Session, user_id: int, biometric_data: dict):
    existing_biometrics = db.query(database.BiometricModel).filter(database.BiometricModel.user_id == user_id).first()
    
    if existing_biometrics:
        existing_biometrics.weight_kg = biometric_data['weight_kg']
        existing_biometrics.height_cm = biometric_data['height_cm']
        existing_biometrics.age = biometric_data['age']
        existing_biometrics.sex = biometric_data['sex']
        existing_biometrics.activity_level = biometric_data['activity_level']
        existing_biometrics.body_fat = biometric_data.get('body_fat')

        db.commit()
        db.refresh(existing_biometrics)
        return existing_biometrics
    
    else:
        new_biometrics = database.BiometricModel(
        user_id = user_id,
        weight_kg = biometric_data['weight_kg'],
        height_cm = biometric_data['height_cm'],
        age = biometric_data['age'],
        sex = biometric_data['sex'],
        activity_level = biometric_data['activity_level'],
        body_fat = biometric_data.get('body_fat')
        )

        db.add(new_biometrics)
        db.commit()
        db.refresh(new_biometrics)
        
        return new_biometrics
    
def upsert_user_strength(db: Session, user_id: int, strength_data: dict):
    new_strength = database.StrengthModel(
        user_id = user_id,
        exercise = strength_data["exercise"],
        weight_lifted =  strength_data["weight_lifted"],
        reps = strength_data["reps"],
        estimated_1rm = strength_data["estimated_1rm"],
        strength_curve = strength_data["strength_curve"]
    )

    db.add(new_strength)
    db.commit()
    db.refresh(new_strength)
    return new_strength
    
def get_user_biometric(db:Session, user_id: int):
    return db.query(database.BiometricModel).filter(database.BiometricModel.user_id == user_id).first()

def get_user_strength_by_exercise(db: Session, user_id: int, exercise: str):
    record = db.query(database.StrengthModel).filter(
        database.StrengthModel.user_id == user_id,
        database.StrengthModel.exercise == exercise
    ).order_by(database.StrengthModel.timestamp.desc()).first()

    return record
