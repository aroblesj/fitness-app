from sqlalchemy.orm import Session
import database
import json

def upsert_user_biometrics(db: Session, user_id: int, biometric_data: dict):
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
    return db.query(database.BiometricModel).filter(
        database.BiometricModel.user_id == user_id
    ).order_by(database.BiometricModel.timestamp.desc()).first()

def get_user_strength_by_exercise(db: Session, user_id: int, exercise: str):
    record = db.query(database.StrengthModel).filter(
        database.StrengthModel.user_id == user_id,
        database.StrengthModel.exercise == exercise
    ).order_by(database.StrengthModel.timestamp.desc()).first()

    return record

def create_todo(db: Session, user_id: int, todo_data: dict):
    # Determine position: default to count of current user's todos
    if todo_data.get('position') is None:
        pos = db.query(database.TodoModel).filter(database.TodoModel.user_id == user_id).count()
    else:
        pos = todo_data['position']

    new_todo = database.TodoModel(
        user_id=user_id,
        title=todo_data['title'],
        completed=todo_data.get('completed', False),
        position=pos
    )
    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)
    return new_todo

def get_user_todos(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(database.TodoModel)
        .filter(database.TodoModel.user_id == user_id)
        .order_by(database.TodoModel.position.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_user_todo_by_id(db: Session, user_id: int, todo_id: int):
    return (
        db.query(database.TodoModel)
        .filter(database.TodoModel.id == todo_id, database.TodoModel.user_id == user_id)
        .first()
    )

def update_todo(db: Session, user_id: int, todo_id: int, todo_data: dict):
    db_todo = get_user_todo_by_id(db=db, user_id=user_id, todo_id=todo_id)
    if db_todo:
        if todo_data.get('title') is not None:
            db_todo.title = todo_data['title']
        if todo_data.get('completed') is not None:
            db_todo.completed = todo_data['completed']
        if todo_data.get('position') is not None:
            db_todo.position = todo_data['position']
        db.commit()
        db.refresh(db_todo)
    return db_todo

def delete_todo(db: Session, user_id: int, todo_id: int):
    db_todo = get_user_todo_by_id(db=db, user_id=user_id, todo_id=todo_id)
    if db_todo:
        db.delete(db_todo)
        db.commit()
        return True
    return False