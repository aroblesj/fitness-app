from sqlalchemy import DateTime, create_engine, Column, Integer, String, Float, ForeignKey, JSON, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timezone

DATABASE_URL = "sqlite:///database.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)

class BiometricModel(Base):
    __tablename__ = "biometrics"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(String, nullable=False)
    activity_level = Column(String, nullable=False)
    body_fat = Column(Float, nullable=True)

class StrengthModel(Base):
    __tablename__ = "strength"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    exercise = Column(String, nullable=False)
    weight_lifted = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    estimated_1rm = Column(Float, nullable=False)
    strength_curve = Column(JSON, nullable=False)

class TodoModel(Base):
    __tablename__ = "todo"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
