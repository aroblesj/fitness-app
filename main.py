from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import crud
import schemas
from nutrition_engine import UserBiometrics, BiometricInputError
from strength_engine import StrengthAnalytics, StrengthInputError

app = FastAPI(title="Fitness & Nutrition API")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/biometrics/", response_model=schemas.BiometricResponse)
def create_or_update_biometrics(
    user_id: int,
    biometrics: schemas.BiometricCreate,
    db: Session = Depends(get_db)
):
    db_biometrics = crud.upsert_user_biometrics(
        db=db,
        user_id=user_id,
        biometric_data=biometrics.model_dump()
    )
    return db_biometrics

@app.post("/strength/", response_model=schemas.StrengthResponse)
def create_or_update_strength(
    user_id: int,
    strength_data: schemas.StrengthCreate,
    db: Session = Depends(get_db)
):

    try:
        engine = StrengthAnalytics(
            weight_lifted=strength_data.weight_lifted,
            reps=strength_data.reps
        )

        estimated_1rm = engine.calculate_1rm()
        computed_curve = engine.calculate_strength_curve()

        strength_data_dict = {
            "exercise": strength_data.exercise,
            "weight_lifted": strength_data.weight_lifted,
            "reps": strength_data.reps,
            "estimated_1rm": estimated_1rm,
            "strength_curve": computed_curve
        }

        db_strength = crud.upsert_user_strength(
            db=db,
            user_id=user_id,
            strength_data=strength_data_dict
        )
        return db_strength
    
    except StrengthInputError as error:
        raise HTTPException(status_code=400, detail=error.message)


@app.get("/users/{user_id}/macros", response_model=dict)
def  get_calculated_macros(user_id: int, goal: str, db: Session = Depends(get_db)):
    db_biometrics = crud.get_user_biometric(db=db, user_id=user_id)

    if not db_biometrics:
        raise HTTPException(status_code=404, detail="Biometric profile not found for this user.")
    
    try:
        engine = UserBiometrics(
            age=db_biometrics.age,
            weight=int(db_biometrics.weight_kg),
            height=int(db_biometrics.height_cm),
            sex=db_biometrics.sex.capitalize(),
            activity_level=db_biometrics.activity_level,
            body_fat=db_biometrics.body_fat
        )

        calculated_strategy = engine.generate_macros(goal=goal.lower())
        return {key: round(value, 2) for key, value in calculated_strategy.items()}
    
    except BiometricInputError as error:
        raise HTTPException(status_code=400, detail=error.message)
    
@app.get("/users/{user_id}/strengthm/{exercise}", response_model=dict)
def get_calculated_strength_curve(user_id:int, exercise: str, db: Session = Depends(get_db)):
    db_strength = crud.get_user_strength_by_exercise(db=db, user_id=user_id, exercise=exercise)

    if not db_strength:
        raise HTTPException(status_code=404, detail=f"No performance baseline for {exercise}.")
    
    try:
        engine = StrengthAnalytics(
            weight_lifted=db_strength.estimated_1rm,
            reps=1
        )
    
        computed_curve = engine.calculate_strength_curve()

        return {
            "exercise": db_strength.exercise,
            "estimated": db_strength.estimated_1rm,
            "strength_curve": computed_curve
        }

    except StrengthInputError as error:
        raise HTTPException(status_code=400, detail=error.message)
    
@app.get("/users/{user_id}/strength/{exercise}/curve", response_model=list)
def get_strength_progression_timeline(user_id: int, exercise: str, db: Session = Depends(get_db)):
    strength_history = db.query(database.StrengthModel).filter(
        database.StrengthModel.user_id == user_id,
        database.StrengthModel.exercise == exercise
    ).order_by(database.StrengthModel.timestamp.asc()).all()

    payload = []

    for lift in strength_history:
        closest_biometric = db.query(database.BiometricModel).filter(
            database.BiometricModel.user_id == user_id,
            database.BiometricModel.timestamp <= lift.timestamp
        ).order_by(database.BiometricModel.timestamp.desc()).first()

        entry_data = {
            "timestamp": lift.timestamp,
            "exercise": lift.exercise,
            "estimated_1rm": round(lift.estimated_1rm),
            "recorded_body_weight": None,
            "relative_stregnth_ratio": None, 
            "has_relative_data": False
        }

        if closest_biometric and closest_biometric.weight_kg:
            body_weight = closest_biometric.weight_kg
            ratio = lift.estimated_1rm / body_weight

            entry_data["recorded_body_weight"] = round(body_weight, 2)
            entry_data["relative_stregnth_ratio"] = round(ratio, 2)
            entry_data["has_relative_data"] = True

        payload.append(entry_data)

    return payload