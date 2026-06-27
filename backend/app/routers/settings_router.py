from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.auth import get_current_user
from app import models

router = APIRouter(prefix="/api/settings", tags=["settings"])

class UpdateSettingsRequest(BaseModel):
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    fal_api_key: Optional[str] = None
    text_model: Optional[str] = None
    image_model: Optional[str] = None
    video_model: Optional[str] = None
    instagram_access_token: Optional[str] = None
    instagram_account_id: Optional[str] = None
    kakao_rest_api_key: Optional[str] = None
    kakao_channel_id: Optional[str] = None

def mask_key(key: Optional[str]) -> Optional[str]:
    if not key or len(key) < 8:
        return None
    return key[:4] + "••••••••" + key[-4:]

@router.get("")
def get_settings(current_user: models.User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "openai_api_key_masked": mask_key(current_user.openai_api_key),
        "gemini_api_key_masked": mask_key(current_user.gemini_api_key),
        "text_model": current_user.text_model or "gemini",
        "image_model": current_user.image_model or "gemini",
        "video_model": current_user.video_model or "pollinations",
        "instagram_access_token_masked": mask_key(current_user.instagram_access_token),
        "instagram_account_id": current_user.instagram_account_id or "",
        "kakao_rest_api_key_masked": mask_key(current_user.kakao_rest_api_key),
        "kakao_channel_id": current_user.kakao_channel_id or "",
        "fal_api_key_masked": mask_key(current_user.fal_api_key),
        "has_openai": bool(current_user.openai_api_key),
        "has_gemini": bool(current_user.gemini_api_key),
        "has_fal": bool(current_user.fal_api_key),
        "has_instagram": bool(current_user.instagram_access_token),
        "has_kakao": bool(current_user.kakao_rest_api_key),
    }

@router.put("")
def update_settings(
    data: UpdateSettingsRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if data.openai_api_key is not None:
        current_user.openai_api_key = data.openai_api_key or None
    if data.gemini_api_key is not None:
        current_user.gemini_api_key = data.gemini_api_key or None
    if data.fal_api_key is not None:
        current_user.fal_api_key = data.fal_api_key or None
    if data.text_model is not None:
        current_user.text_model = data.text_model
    if data.image_model is not None:
        current_user.image_model = data.image_model
    if data.video_model is not None:
        current_user.video_model = data.video_model
    if data.instagram_access_token is not None:
        current_user.instagram_access_token = data.instagram_access_token or None
    if data.instagram_account_id is not None:
        current_user.instagram_account_id = data.instagram_account_id or None
    if data.kakao_rest_api_key is not None:
        current_user.kakao_rest_api_key = data.kakao_rest_api_key or None
    if data.kakao_channel_id is not None:
        current_user.kakao_channel_id = data.kakao_channel_id or None

    db.commit()
    return {
        "message": "설정이 저장되었습니다.",
        "text_model": current_user.text_model or "gemini",
        "image_model": current_user.image_model or "gemini",
        "video_model": current_user.video_model or "pollinations",
        "has_openai": bool(current_user.openai_api_key),
        "has_gemini": bool(current_user.gemini_api_key),
        "has_fal": bool(current_user.fal_api_key),
        "has_instagram": bool(current_user.instagram_access_token),
        "has_kakao": bool(current_user.kakao_rest_api_key),
    }
