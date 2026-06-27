from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
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

    # AI 모델 선택 (글: openai/gemini, 이미지: openai/gemini, 영상: pollinations/runway)
    text_model = Column(String, nullable=True, default="gemini")
    image_model = Column(String, nullable=True, default="openai")
    video_model = Column(String, nullable=True, default="pollinations")

    # 인스타그램 연동
    instagram_access_token = Column(String, nullable=True)
    instagram_account_id = Column(String, nullable=True)

    # 카카오톡 채널 연동
    kakao_rest_api_key = Column(String, nullable=True)
    kakao_channel_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    thread_id = Column(String, nullable=True, index=True)

    # 상품 정보
    product_name = Column(String, nullable=True)
    product_desc = Column(Text, nullable=True)
    keywords = Column(String, nullable=True)
    target_audience = Column(String, nullable=True)
    tone_and_manner = Column(String, nullable=True)

    # 생성된 콘텐츠
    generated_post = Column(Text, nullable=True)
    generated_image_prompt = Column(Text, nullable=True)
    generated_image_url = Column(Text, nullable=True)   # Pollinations URL 또는 [IMAGE_DATA]
    generated_video_script = Column(Text, nullable=True)
    generated_video_url = Column(String, nullable=True)

    # 진행 상태
    stage = Column(String, nullable=True)               # input/post/image/video/publish/done
    publish_channels = Column(String, nullable=True)    # JSON 문자열
    publish_results = Column(Text, nullable=True)       # JSON 문자열

    # 사용 모델
    text_model = Column(String, nullable=True)
    image_model = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
