from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # AI API 키
    openai_api_key = Column(String, nullable=True)
    gemini_api_key = Column(String, nullable=True)

    # AI 모델 선택 (글: openai/gemini, 이미지: openai/gemini)
    text_model = Column(String, nullable=True, default="gemini")
    image_model = Column(String, nullable=True, default="openai")

    # 인스타그램 연동
    instagram_access_token = Column(String, nullable=True)
    instagram_account_id = Column(String, nullable=True)

    # 카카오톡 채널 연동
    kakao_rest_api_key = Column(String, nullable=True)
    kakao_channel_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
