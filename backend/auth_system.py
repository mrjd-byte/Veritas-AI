from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import json

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ------------------ SECURITY ------------------
security = HTTPBearer()

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ------------------ DB ------------------
DATABASE_URL = "sqlite:///./backend/test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ------------------ MODELS ------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password = Column(String)

    analyses = relationship("Analysis", back_populates="owner")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    input_text = Column(Text)
    result_json = Column(Text)

    owner = relationship("User", back_populates="analyses")


Base.metadata.create_all(bind=engine)

# ------------------ PASSWORD ------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password):
    # Truncate to 72 bytes safely, handling multi-byte unicode characters
    truncated = password.encode('utf-8')[:72].decode('utf-8', 'ignore')
    return pwd_context.hash(truncated)

def verify_password(plain, hashed):
    # Truncate to 72 bytes safely, handling multi-byte unicode characters
    truncated = plain.encode('utf-8')[:72].decode('utf-8', 'ignore')
    return pwd_context.verify(truncated, hashed)

# ------------------ TOKEN ------------------
def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ------------------ AUTH DEP ------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# ------------------ SCHEMAS ------------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ------------------ DB DEP ------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------ ROUTER ------------------
router = APIRouter(prefix="/auth")

# ------------------ REGISTER ------------------
@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        email=user.email,
        password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()

    return {"message": "User created"}

# ------------------ LOGIN ------------------
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"user_id": db_user.id})

    return {"access_token": token, "token_type": "bearer"}

# ------------------ SAVE ANALYSIS ------------------
def save_analysis(db: Session, user_id: int, text: str, result: dict):
    analysis = Analysis(
        user_id=user_id,
        input_text=text,
        result_json=json.dumps(result)
    )
    db.add(analysis)
    db.commit()
# ------------------ HISTORY ------------------
@router.get("/history")
def get_history(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    records = db.query(Analysis).filter(Analysis.user_id == user_id).all()

    return [
        {
            "id": r.id,
            "input": r.input_text,
            "output": json.loads(r.result_json)
        }
        for r in records
    ]

@router.delete("/history/{analysis_id}")
def delete_history(
    analysis_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.user_id == user_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Case not found")
    
    db.delete(record)
    db.commit()
    return {"message": "Case permanently deleted"}
