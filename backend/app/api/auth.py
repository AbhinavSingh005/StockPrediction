import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import UserRegister, UserLogin, UserOut, Token, ForgotPasswordRequest, VerifyOTPRequest, ResendOTPRequest
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.services.email import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered"
            )
        else:
            # Delete unverified user to allow re-registration with updated passwords/details
            db.delete(existing_user)
            db.commit()
    
    # Hash password
    hashed_pwd = get_password_hash(user_in.password)
    
    # Generate 6-digit OTP code
    otp = "".join(random.choices(string.digits, k=6))
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    # Create new user (unverified by default)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        balance=100000.0,
        is_verified=False,
        verification_otp=otp,
        otp_expiry=otp_expiry
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send verification email in background
    background_tasks.add_task(send_otp_email, new_user.email, otp)
    
    return {"message": "Verification code sent to email.", "email": new_user.email}

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email is not verified. Please verify your account."
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/verify-otp", response_model=Token)
def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found."
        )
        
    if user.is_verified:
        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}
        
    if not user.verification_otp or user.verification_otp != request.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code."
        )
        
    if datetime.utcnow() > user.otp_expiry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )
        
    user.is_verified = True
    user.verification_otp = None
    user.otp_expiry = None
    db.commit()
    
    # Generate token on successful verification
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/resend-otp")
def resend_otp(request: ResendOTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    if user.is_verified:
        return {"message": "Account is already verified."}
        
    # Generate new OTP code
    otp = "".join(random.choices(string.digits, k=6))
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    user.verification_otp = otp
    user.otp_expiry = otp_expiry
    db.commit()
    
    # Send email in background
    background_tasks.add_task(send_otp_email, user.email, otp)
    
    return {"message": "Verification code resent."}

@router.get("/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    # Simulate forgot password request link generation
    return {
        "message": f"Password reset instructions have been dispatched to {request.email}. (Virtual Simulator Mode)"
    }
