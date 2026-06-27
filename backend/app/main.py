import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.database import engine, get_db
from app import models
from app.auth import get_current_user
from app.routers.auth_router import router as auth_router
from app.routers.settings_router import router as settings_router
from app.routers.campaigns_router import router as campaigns_router
from app.agent.graph import app_graph
from app.agent.nodes import publish_node
from app.config import PORT
from sqlalchemy.orm import Session

# DB 테이블 자동 생성 + 컬럼 마이그레이션
models.Base.metadata.create_all(bind=engine)

from sqlalchemy import text
with engine.connect() as _conn:
    _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS text_model VARCHAR"))
    _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS image_model VARCHAR"))
    _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS video_model VARCHAR"))
    _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS fal_api_key VARCHAR"))
    _conn.commit()

app = FastAPI(
    title="SoMaBi API",
    description="소상공인 SNS 마케팅 자동화 서비스를 위한 LangGraph 백엔드 API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(campaigns_router)


class StartSessionRequest(BaseModel):
    product_name: str
    product_desc: str
    keywords: Optional[str] = None
    target_audience: Optional[str] = "일반 대중"
    tone_and_manner: Optional[str] = "친근한"

class FeedbackRequest(BaseModel):
    thread_id: str
    stage: str
    action: str
    feedback: Optional[str] = None

class PublishRequest(BaseModel):
    thread_id: str
    publish_channels: List[str]


@app.get("/")
def read_root():
    return {"message": "Welcome to SoMaBi Marketing API Service!"}


@app.post("/api/start")
def start_session(
    data: StartSessionRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "thread_id": thread_id,
        "product_name": data.product_name,
        "product_desc": data.product_desc,
        "keywords": data.keywords,
        "target_audience": data.target_audience,
        "tone_and_manner": data.tone_and_manner,
        "current_agent": None,
        "approved_stages": [],
        "generated_post": None,
        "generated_image_prompt": None,
        "generated_image_url": None,
        "generated_video_script": None,
        "generated_video_url": None,
        "publish_channels": [],
        "publish_results": {},
        "user_feedback": None,
        # 사용자 DB에서 API 키 및 모델 선택 주입
        "openai_api_key": current_user.openai_api_key,
        "gemini_api_key": current_user.gemini_api_key,
        "fal_api_key": current_user.fal_api_key,
        "text_model": current_user.text_model or "gemini",
        "image_model": current_user.image_model or "gemini",
        "video_model": current_user.video_model or "pollinations",
    }

    try:
        app_graph.invoke(initial_state, config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"에이전트 구동 실패: {str(e)}")

    state_info = app_graph.get_state(config)
    return {
        "thread_id": thread_id,
        "state": state_info.values,
        "next": state_info.next,
        "message": "홍보 본문 초안 작성이 완료되었습니다. 피드백을 대기 중입니다."
    }


@app.post("/api/feedback")
def process_feedback(
    data: FeedbackRequest,
    current_user: models.User = Depends(get_current_user)
):
    config = {"configurable": {"thread_id": data.thread_id}}

    state_info = app_graph.get_state(config)
    if not state_info.values:
        raise HTTPException(status_code=404, detail="해당 스레드 ID의 마케팅 세션을 찾을 수 없습니다.")

    current_approved = list(state_info.values.get("approved_stages", []))

    if data.action == "approve":
        if data.stage not in current_approved:
            current_approved.append(data.stage)
        update_values = {"approved_stages": current_approved, "user_feedback": None}
    elif data.action == "reject":
        if not data.feedback:
            raise HTTPException(status_code=400, detail="반려(reject) 시에는 피드백(feedback) 내용이 필수입니다.")
        if data.stage in current_approved:
            current_approved.remove(data.stage)
        update_values = {"approved_stages": current_approved, "user_feedback": data.feedback}
    else:
        raise HTTPException(status_code=400, detail="action 필드는 'approve' 또는 'reject'여야 합니다.")

    try:
        app_graph.update_state(config, update_values, as_node=f"{data.stage}_review")
        app_graph.invoke(None, config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"에이전트 resume 실패: {str(e)}")

    updated_state_info = app_graph.get_state(config)
    is_finished = len(updated_state_info.next) == 0

    stage_names = {
        "post_review": "글 피드백 대기",
        "image_review": "이미지 피드백 대기",
        "video_review": "영상 피드백 대기",
    }
    if is_finished and "video" in updated_state_info.values.get("approved_stages", []):
        message = "콘텐츠 생성이 완료되었습니다. 배포 채널을 선택하고 배포를 실행해 주세요."
    elif is_finished:
        message = "마케팅 콘텐츠 제작 파이프라인이 완료되었습니다."
    else:
        next_step = updated_state_info.next[0] if updated_state_info.next else "알 수 없음"
        message = f"피드백이 반영되었습니다. 현재 상태: [{stage_names.get(next_step, next_step)}]"

    return {
        "thread_id": data.thread_id,
        "state": updated_state_info.values,
        "next": updated_state_info.next,
        "is_finished": is_finished,
        "message": message
    }


@app.post("/api/publish")
def publish_content(
    data: PublishRequest,
    current_user: models.User = Depends(get_current_user)
):
    config = {"configurable": {"thread_id": data.thread_id}}

    state_info = app_graph.get_state(config)
    if not state_info.values:
        raise HTTPException(status_code=404, detail="해당 세션을 찾을 수 없습니다.")
    if not data.publish_channels:
        raise HTTPException(status_code=400, detail="배포할 채널(publish_channels) 목록이 필수입니다.")

    state = dict(state_info.values)
    state["publish_channels"] = data.publish_channels
    # 배포 시 사용자 SNS 자격증명 주입
    state["instagram_access_token"] = current_user.instagram_access_token
    state["instagram_account_id"] = current_user.instagram_account_id
    state["kakao_rest_api_key"] = current_user.kakao_rest_api_key
    state["kakao_channel_id"] = current_user.kakao_channel_id

    result = publish_node(state)
    publish_results = result.get("publish_results", {})

    app_graph.update_state(config, {
        "publish_channels": data.publish_channels,
        "publish_results": publish_results,
        "current_agent": "배포 에이전트"
    })

    return {
        "thread_id": data.thread_id,
        "publish_results": publish_results,
        "is_finished": True,
        "message": "마케팅 콘텐츠 배포가 성공적으로 완료되었습니다."
    }


@app.get("/api/status/{thread_id}")
def get_session_status(
    thread_id: str,
    current_user: models.User = Depends(get_current_user)
):
    config = {"configurable": {"thread_id": thread_id}}
    state_info = app_graph.get_state(config)
    if not state_info.values:
        raise HTTPException(status_code=404, detail="해당 세션을 찾을 수 없습니다.")
    return {
        "thread_id": thread_id,
        "state": state_info.values,
        "next": state_info.next,
        "is_finished": len(state_info.next) == 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
