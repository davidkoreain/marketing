from typing import TypedDict, Optional, List, Dict

class AgentState(TypedDict):
    thread_id: str
    product_name: str
    product_desc: str
    keywords: Optional[str]
    target_audience: str
    tone_and_manner: str
    
    # 현재 실행 중인 에이전트 아이덴티티
    current_agent: Optional[str]
    
    # 생성된 콘텐츠
    generated_post: Optional[str]
    generated_image_prompt: Optional[str]
    generated_image_url: Optional[str]
    generated_video_script: Optional[str]
    generated_video_url: Optional[str]
    
    # 배포 관련 정보
    publish_channels: List[str]
    publish_results: Dict[str, str]
    
    # Human-in-the-loop 제어용 상태
    user_feedback: Optional[str]
    # 사용자가 승인을 통과시킨 단계들 기록 (예: "post", "image", "video")
    approved_stages: List[str]

    # 사용자별 API 키 (세션 시작 시 DB에서 주입, 런타임 메모리에만 존재)
    openai_api_key: Optional[str]
    gemini_api_key: Optional[str]

