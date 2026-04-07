from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from typing import List, Optional

db = SQLAlchemy()

class Rol(db.Model):
    __tablename__ = 'rol'
    id_rol: Mapped[int] = mapped_column(primary_key=True)
    name_rol: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    
    users: Mapped[List["User"]] = relationship(back_populates="rol")

class User(db.Model):
    __tablename__ = 'user'
    id_user: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    lastname: Mapped[str] = mapped_column(String(100), nullable=False) # Agregado para paridad con SIGSSEP
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Siguiendo tu regla: Inician inactivos por defecto
    is_active: Mapped[bool] = mapped_column(Boolean(), default=False, nullable=False)
    
    total_points: Mapped[float] = mapped_column(Float, default=0.0)
    
    rol_id: Mapped[int] = mapped_column(ForeignKey('rol.id_rol'), nullable=False)
    rol: Mapped["Rol"] = relationship(back_populates="users")
    
    predictions: Mapped[List["Prediction"]] = relationship(back_populates="user")

class Match(db.Model):
    __tablename__ = 'match'
    id_match: Mapped[int] = mapped_column(primary_key=True)
    home_team: Mapped[str] = mapped_column(String(100), nullable=False)
    away_team: Mapped[str] = mapped_column(String(100), nullable=False)
    match_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Para el responsive: Guardaremos URLs de las banderas (iconos)
    home_flag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    away_flag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    home_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    away_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), default="Pendiente")
    
    predictions: Mapped[List["Prediction"]] = relationship(back_populates="match")

class Prediction(db.Model):
    __tablename__ = 'prediction'
    id_prediction: Mapped[int] = mapped_column(primary_key=True)
    predicted_home_score: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_away_score: Mapped[int] = mapped_column(Integer, nullable=False)
    points_earned: Mapped[float] = mapped_column(Float, default=0.0)
    
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id_user'), nullable=False)
    match_id: Mapped[int] = mapped_column(ForeignKey('match.id_match'), nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="user")
    match: Mapped["Match"] = relationship(back_populates="predictions")