from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import database
import crud
import schemas
from nutrition_engine import UserBiometrics, BiometricInputError
from strength_engine import StrengthAnalytics, StrengthInputError

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Fitness & Nutrition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            weight_kg=int(db_biometrics.weight_kg),
            height_cm=int(db_biometrics.height_cm),
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

@app.get("/users/{user_id}/todo", response_model=list[schemas.TodoResponse])
def get_todo_list(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    user_todo_items = crud.get_user_todos(db=db, user_id=user_id, skip=skip, limit=limit)
    return user_todo_items

@app.post("/users/{user_id}/todo", response_model=schemas.TodoResponse)
def create_todo_item(
    user_id: int,
    todo_data: schemas.TodoCreate,
    db: Session = Depends(get_db)
):
    new_todo = crud.create_todo(db=db, user_id=user_id, todo_data=todo_data.model_dump())
    return new_todo

@app.put("/users/{user_id}/todo/{todo_id}", response_model=schemas.TodoResponse)
def update_todo_item(
    user_id: int,
    todo_id: int,
    todo_data: schemas.TodoUpdate,
    db: Session = Depends(get_db)
):
    updated_todo = crud.update_todo(
        db=db,
        user_id=user_id,
        todo_id=todo_id,
        todo_data=todo_data.model_dump(exclude_unset=True)
    )
    if not updated_todo:
        raise HTTPException(status_code=404, detail="Todo item not found for this user.")
    return updated_todo

@app.delete("/users/{user_id}/todo/{todo_id}")
def delete_todo_item(user_id: int, todo_id: int, db: Session = Depends(get_db)):
    success = crud.delete_todo(db=db, user_id=user_id, todo_id=todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo item not found for this user.")
    return {"message": "Todo item deleted successfully."}

@app.get("/users/{user_id}/calendar/activity", response_model=dict[str, schemas.CalendarActivityDay])
def get_calendar_activity(
    user_id: int,
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12.")

    try:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    lifts = db.query(database.StrengthModel).filter(
        database.StrengthModel.user_id == user_id,
        database.StrengthModel.timestamp >= start_date,
        database.StrengthModel.timestamp < end_date
    ).all()

    biometrics = db.query(database.BiometricModel).filter(
        database.BiometricModel.user_id == user_id,
        database.BiometricModel.timestamp >= start_date,
        database.BiometricModel.timestamp < end_date
    ).all()

    activity = {}

    def get_or_create_day(date_str):
        if date_str not in activity:
            activity[date_str] = {"lift": False, "biometrics": False}
        return activity[date_str]

    for lift in lifts:
        date_str = lift.timestamp.strftime("%Y-%m-%d")
        get_or_create_day(date_str)["lift"] = True

    for bio in biometrics:
        date_str = bio.timestamp.strftime("%Y-%m-%d")
        get_or_create_day(date_str)["biometrics"] = True

    return activity

@app.get("/users/{user_id}/logs/date/{date_string}", response_model=dict)
def get_logs_by_date(user_id: int, date_string: str, db: Session = Depends(get_db)):
    try:
        # Parse the input date string (YYYY-MM-DD)
        target_date = datetime.strptime(date_string, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Retrieve strength logs on this date
    # In SQLite, date() extracts the date part of the timestamp string/datetime
    from sqlalchemy import func
    lifts = db.query(database.StrengthModel).filter(
        database.StrengthModel.user_id == user_id,
        func.date(database.StrengthModel.timestamp) == target_date
    ).all()

    biometrics = db.query(database.BiometricModel).filter(
        database.BiometricModel.user_id == user_id,
        func.date(database.BiometricModel.timestamp) == target_date
    ).all()

    serialized_lifts = []
    for lift in lifts:
        serialized_lifts.append({
            "id": lift.id,
            "exercise": lift.exercise.replace('_', ' ').title(),
            "weight_lifted": lift.weight_lifted,
            "reps": lift.reps,
            "estimated_1rm": round(lift.estimated_1rm, 1)
        })

    serialized_biometrics = []
    for bio in biometrics:
        serialized_biometrics.append({
            "id": bio.id,
            "weight_kg": round(bio.weight_kg, 1),
            "weight_lbs": round(bio.weight_kg * 2.20462, 1),
            "height_cm": round(bio.height_cm, 1),
            "age": bio.age,
            "sex": bio.sex,
            "activity_level": bio.activity_level.replace('_', ' ').title(),
            "body_fat": round(bio.body_fat * 100, 1) if bio.body_fat is not None else None
        })

    return {
        "date": date_string,
        "lifts": serialized_lifts,
        "biometrics": serialized_biometrics
    }


