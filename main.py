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
def create_or_update_biomeetrics(
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
    stregnth_data: schemas.StrengthCreate,
    db: Session = Depends(get_db)
):
    db_strength = crud.upsert_user_strength(
        db=db,
        user_id=user_id,
        strength_data=stregnth_data.model_dump()
    )
    return db_strength

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
        return calculated_strategy
    
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