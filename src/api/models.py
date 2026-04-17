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

    def serialize(self):
        return {
            "id_rol": self.id_rol,
            "name_rol": self.name_rol
        }

class User(db.Model):
    __tablename__ = 'user'
    id_user: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    lastname: Mapped[str] = mapped_column(String(100), nullable=False) 
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), default=False, nullable=False)
    profile: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    profile_public_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    total_points: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    rol_id: Mapped[int] = mapped_column(ForeignKey('rol.id_rol'), nullable=False)
    rol: Mapped["Rol"] = relationship("Rol", back_populates="users")
    predictions: Mapped[List["Prediction"]] = relationship("Prediction", back_populates="user")

    def __repr__(self):
        return f'<User {self.email}>'

    def serialize(self):
        initials = f"{self.name[0]}{self.lastname[0]}".upper()
        default_avatar = f"https://ui-avatars.com/api/?name={initials}&size=128&background=random&rounded=true"
        return {
            "id_user": self.id_user,
            "email": self.email,
            "name": self.name,
            "lastname": self.lastname,
            "is_active": self.is_active,
            "profile": self.profile if self.profile else default_avatar,
            "total_points": self.total_points,
            "profile_public_id": self.profile_public_id,
            "rol": self.rol.name_rol if self.rol else "Sin Rol",
            "rol_id": self.rol_id
        }
    
    
class Team(db.Model):
    __tablename__ = 'team'
    id_team: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    flag_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    group_name: Mapped[str] = mapped_column(String(10), nullable=False)

    # Relaciones para acceder a los juegos desde el equipo
    home_matches: Mapped[List["Match"]] = relationship("Match", foreign_keys="[Match.home_team_id]", back_populates="home_team")
    away_matches: Mapped[List["Match"]] = relationship("Match", foreign_keys="[Match.away_team_id]", back_populates="away_team")

    def serialize(self):
        return {
            "id_team": self.id_team,
            "name": self.name,
            "flag_url": self.flag_url,
            "group_name": self.group_name
        }

class Match(db.Model):
    __tablename__ = 'match'
    id_match: Mapped[int] = mapped_column(primary_key=True)
    
    # Llaves foráneas a la tabla Team
    home_team_id: Mapped[int] = mapped_column(ForeignKey('team.id_team'), nullable=False)
    away_team_id: Mapped[int] = mapped_column(ForeignKey('team.id_team'), nullable=False)
    
    # Relaciones para obtener el objeto Team completo
    home_team: Mapped["Team"] = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team: Mapped["Team"] = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")

    match_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    stadium: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    home_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    away_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Pendiente")
    
    predictions: Mapped[List["Prediction"]] = relationship(back_populates="match")

    def serialize(self):
        return {
            "id_match": self.id_match,
            "home_team": self.home_team.serialize() if self.home_team else None,
            "away_team": self.away_team.serialize() if self.away_team else None,
            "match_date": self.match_date.isoformat(),
            "stadium": self.stadium,
            "home_score": self.home_score,
            "away_score": self.away_score,
            "status": self.status
        }

class Prediction(db.Model):
    __tablename__ = 'prediction'
    id_prediction: Mapped[int] = mapped_column(primary_key=True)
    predicted_home_score: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_away_score: Mapped[int] = mapped_column(Integer, nullable=False)
    points_earned: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user_id: Mapped[int] = mapped_column(ForeignKey('user.id_user'), nullable=False)
    match_id: Mapped[int] = mapped_column(ForeignKey('match.id_match'), nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="predictions")
    match: Mapped["Match"] = relationship(back_populates="predictions")

    def serialize(self):
        return {
            "id_prediction": self.id_prediction,
            "predicted_home_score": self.predicted_home_score,
            "predicted_away_score": self.predicted_away_score,
            "points_earned": self.points_earned,
            "created_at": self.created_at.isoformat(),
            "user_id": self.user_id,
            "match_id": self.match_id,
            "match_details": f"{self.match.home_team.name} vs {self.match.away_team.name}" if self.match else None
        }