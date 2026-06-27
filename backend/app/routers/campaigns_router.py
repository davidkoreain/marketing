from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.auth import get_current_user
from app import models

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


class CampaignSaveRequest(BaseModel):
    thread_id: Optional[str] = None
    product_name: Optional[str] = None
    product_desc: Optional[str] = None
    keywords: Optional[str] = None
    target_audience: Optional[str] = None
    tone_and_manner: Optional[str] = None
    generated_post: Optional[str] = None
    generated_image_prompt: Optional[str] = None
    generated_image_url: Optional[str] = None
    generated_video_script: Optional[str] = None
    generated_video_url: Optional[str] = None
    stage: Optional[str] = None
    publish_channels: Optional[str] = None
    publish_results: Optional[str] = None
    text_model: Optional[str] = None
    image_model: Optional[str] = None


@router.post("")
def save_campaign(
    data: CampaignSaveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # thread_id 기준으로 upsert (없으면 신규 생성)
    campaign = None
    if data.thread_id:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.user_id == current_user.id,
            models.Campaign.thread_id == data.thread_id,
        ).first()

    if not campaign:
        campaign = models.Campaign(user_id=current_user.id)
        db.add(campaign)

    for field, value in data.dict(exclude_none=True).items():
        # base64 이미지는 DB 용량 보호를 위해 플래그로 대체
        if field == "generated_image_url" and value and value.startswith("data:"):
            value = "[BASE64_IMAGE]"
        setattr(campaign, field, value)

    db.commit()
    db.refresh(campaign)
    return {"id": campaign.id, "message": "캠페인이 저장되었습니다."}


@router.get("")
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaigns = (
        db.query(models.Campaign)
        .filter(models.Campaign.user_id == current_user.id)
        .order_by(models.Campaign.updated_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": c.id,
            "product_name": c.product_name,
            "stage": c.stage,
            "text_model": c.text_model,
            "image_model": c.image_model,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in campaigns
    ]


@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id,
        models.Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="캠페인을 찾을 수 없습니다.")
    return {
        "id": campaign.id,
        "thread_id": campaign.thread_id,
        "product_name": campaign.product_name,
        "product_desc": campaign.product_desc,
        "keywords": campaign.keywords,
        "target_audience": campaign.target_audience,
        "tone_and_manner": campaign.tone_and_manner,
        "generated_post": campaign.generated_post,
        "generated_image_prompt": campaign.generated_image_prompt,
        "generated_image_url": campaign.generated_image_url,
        "generated_video_script": campaign.generated_video_script,
        "generated_video_url": campaign.generated_video_url,
        "stage": campaign.stage,
        "publish_channels": campaign.publish_channels,
        "publish_results": campaign.publish_results,
        "text_model": campaign.text_model,
        "image_model": campaign.image_model,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
        "updated_at": campaign.updated_at.isoformat() if campaign.updated_at else None,
    }
