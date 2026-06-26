from app.agent.state import AgentState
from app.config import OPENAI_API_KEY, GEMINI_API_KEY, DEFAULT_LLM_MODEL

def get_llm(state: dict):
    """사용자가 선택한 text_model 우선, 없으면 사용 가능한 키로 fallback"""
    model_pref = state.get("text_model") or "gemini"
    openai_key = state.get("openai_api_key") or OPENAI_API_KEY
    gemini_key = state.get("gemini_api_key") or GEMINI_API_KEY

    def _openai():
        if openai_key and not openai_key.startswith("your_openai"):
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model=DEFAULT_LLM_MODEL, openai_api_key=openai_key, temperature=0.7)
        return None

    def _gemini():
        if gemini_key and not gemini_key.startswith("your_gemini"):
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key, temperature=0.7)
        return None

    if model_pref == "openai":
        return _openai() or _gemini()
    else:  # gemini (default)
        return _gemini() or _openai()


# Node 1: SNS 홍보글 생성
def generate_post_node(state: AgentState) -> dict:
    llm = get_llm(state)

    product_name = state.get("product_name", "")
    product_desc = state.get("product_desc", "")
    keywords = state.get("keywords") or ""
    target_audience = state.get("target_audience", "일반 대중")
    tone_and_manner = state.get("tone_and_manner", "친근한")

    feedback = state.get("user_feedback")
    previous_post = state.get("generated_post")

    if llm:
        if feedback and previous_post:
            prompt = (
                f"기존에 작성된 SNS 홍보글:\n{previous_post}\n\n"
                f"사용자의 수정 피드백: \"{feedback}\"\n\n"
                f"위 피드백을 충실히 반영하여 홍보글을 수정해 주세요. "
                f"반드시 해시태그를 포함하고 원래 요구되었던 톤앤매너({tone_and_manner})를 유지해 주세요."
            )
        else:
            keywords_line = f"핵심 키워드/해시태그 (반드시 포함): {keywords}\n" if keywords else ""
            prompt = (
                f"상품명: {product_name}\n"
                f"상품 설명: {product_desc}\n"
                f"타겟 고객층: {target_audience}\n"
                f"브랜드 톤앤매너: {tone_and_manner}\n"
                f"{keywords_line}\n"
                f"위 정보를 바탕으로 인스타그램과 카카오톡 채널에 배포할 매력적인 SNS 홍보글을 작성해 주세요. "
                f"글 중간에 자연스럽게 이모지를 섞어 쓰고, 하단에 핵심 해시태그 3~5개를 추가해 주세요. "
                f"핵심 키워드가 제공된 경우 해당 키워드는 반드시 해시태그로 포함해 주세요."
            )

        response = llm.invoke(prompt)
        post_content = response.content
    else:
        if feedback and previous_post:
            post_content = (
                f"[⚠️ Mock 모드 안내]\n"
                f"피드백 반영은 설정 페이지에서 API 키를 입력해야 작동합니다.\n"
                f"현재는 Mock 모드로, 아래는 이전 생성본 그대로입니다:\n\n"
                f"{previous_post}"
            )
        else:
            keyword_tags = f" {keywords}" if keywords else ""
            post_content = (
                f"[AI 초안 (Mock)]\n"
                f"🎉 아침을 여는 고소한 향기! **{product_name}**을 소개합니다! 🎉\n\n"
                f"{product_desc}\n\n"
                f"매일 정성스럽게 구워내어 바삭함이 가득해요. {target_audience} 고객님들이 아주 좋아하실 맛이랍니다! 😉\n"
                f"따뜻한 커피 한 잔과 함께 맛있는 하루를 시작해 보세요.\n\n"
                f"톤앤매너: {tone_and_manner}\n\n"
                f"#맛스타그램 #{product_name} #감성카페 #데일리밀{keyword_tags}"
            )

    return {
        "generated_post": post_content,
        "user_feedback": None,
        "current_agent": "카피라이터 에이전트"
    }


# Node 2: 홍보 이미지 생성
def generate_image_node(state: AgentState) -> dict:
    llm = get_llm(state)
    image_model = state.get("image_model") or "openai"
    post_content = state.get("generated_post", "")
    product_name = state.get("product_name", "")
    tone_and_manner = state.get("tone_and_manner", "")

    feedback = state.get("user_feedback")
    previous_prompt = state.get("generated_image_prompt")

    # 1. 이미지 생성 프롬프트 작성 (LLM)
    if llm:
        if feedback and previous_prompt:
            prompt_query = (
                f"기존 이미지 생성 프롬프트:\n{previous_prompt}\n\n"
                f"사용자의 수정 피드백: \"{feedback}\"\n\n"
                f"위 피드백을 반영하여 이미지 생성용 영어 프롬프트를 수정해 주세요. "
                f"출력은 오직 영어 프롬프트 텍스트만 리턴해 주세요."
            )
        else:
            prompt_query = (
                f"홍보글 내용:\n{post_content}\n\n"
                f"위 홍보글 및 상품({product_name})과 어울리는 고품질 광고 이미지 생성을 위한 "
                f"상세한 영어 프롬프트를 작성해 주세요. "
                f"브랜드의 톤앤매너({tone_and_manner})를 반영한 시각적 스타일을 묘사하고, "
                f"텍스트가 포함되지 않은 깔끔한 사진 스타일이어야 합니다. "
                f"출력은 오직 프롬프트 텍스트만 리턴해 주세요."
            )
        response = llm.invoke(prompt_query)
        image_prompt = response.content
    else:
        image_prompt = f"A professional food photography of fresh {product_name}, product focus, warm lighting, cozy cafe background, 4k resolution, no text"

    # 2. 이미지 생성
    MOCK_IMAGE_URL = "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1024&auto=format&fit=crop"
    image_url = MOCK_IMAGE_URL

    if image_model == "openai":
        openai_key = state.get("openai_api_key") or OPENAI_API_KEY
        if openai_key and not openai_key.startswith("your_openai"):
            try:
                from openai import OpenAI
                client = OpenAI(api_key=openai_key)
                resp = client.images.generate(
                    model="dall-e-3",
                    prompt=image_prompt,
                    size="1024x1024",
                    quality="standard",
                    n=1,
                )
                image_url = resp.data[0].url
            except Exception:
                image_url = MOCK_IMAGE_URL

    elif image_model == "gemini":
        gemini_key = state.get("gemini_api_key") or GEMINI_API_KEY
        if gemini_key and not gemini_key.startswith("your_gemini"):
            try:
                from google import genai as google_genai
                client = google_genai.Client(api_key=gemini_key)
                resp = client.models.generate_images(
                    model="imagen-3.0-generate-002",
                    prompt=image_prompt,
                )
                if resp.generated_images:
                    import base64
                    img_bytes = resp.generated_images[0].image.image_bytes
                    b64 = base64.b64encode(img_bytes).decode("utf-8")
                    image_url = f"data:image/png;base64,{b64}"
            except Exception:
                image_url = MOCK_IMAGE_URL

    return {
        "generated_image_prompt": image_prompt,
        "generated_image_url": image_url,
        "user_feedback": None,
        "current_agent": "디자이너 에이전트"
    }


# Node 3: 쇼츠 영상 생성 (대본)
def generate_video_node(state: AgentState) -> dict:
    llm = get_llm(state)
    post_content = state.get("generated_post", "")
    product_name = state.get("product_name", "")

    feedback = state.get("user_feedback")
    previous_script = state.get("generated_video_script")

    if llm:
        if feedback and previous_script:
            prompt = (
                f"기존 쇼츠 대본:\n{previous_script}\n\n"
                f"사용자의 수정 피드백: \"{feedback}\"\n\n"
                f"위 피드백을 반영하여 숏폼 비디오(TikTok/Reels/Shorts)용 15초 대본을 수정해 주세요."
            )
        else:
            prompt = (
                f"홍보글 내용:\n{post_content}\n\n"
                f"위 내용을 바탕으로 인스타그램 릴스 및 유튜브 쇼츠용 15초 분량의 대본을 작성해 주세요.\n"
                f"형식:\n"
                f"- [0-5초] 오프닝 및 강렬한 비주얼 묘사 + 나레이션\n"
                f"- [5-10초] 상품 특장점 소개 + 나레이션\n"
                f"- [10-15초] 콜투액션(방문 유도/구매 유도) + 나레이션"
            )
        response = llm.invoke(prompt)
        video_script = response.content
    else:
        if feedback and previous_script:
            video_script = (
                f"[쇼츠 대본 (Mock 수정본)]\n"
                f"- 0~5s: {product_name} 클로즈업 비주얼. 자막: '오늘 딱 하루, 한정 수량!'\n"
                f"- 5~10s: 제품 특징 강조. 자막: '정성스럽게 만든 {product_name}, 직접 경험해보세요!'\n"
                f"- 10~15s: 매장 위치 또는 브랜드 로고 노출. 자막: '지금 바로 프로필 링크에서 확인!'"
            )
        else:
            video_script = (
                f"[쇼츠 대본 (Mock 초안)]\n"
                f"- 0~5s: 갓 구워진 {product_name}에서 김이 모락모락 나는 비주얼. 자막: '오늘 아침, 갓 구운 {product_name}!'\n"
                f"- 5~10s: 바삭하게 씹히는 크런치 사운드와 단면 묘사. 자막: '겉은 바삭, 속은 쫄깃한 이 맛!'\n"
                f"- 10~15s: 매장 약도 혹은 브랜드 로고 노출. 자막: '행복한 하루의 시작, 지금 프로필 링크 클릭!'"
            )

    video_url = "https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-coffee-into-a-cup-42280-large.mp4"

    return {
        "generated_video_script": video_script,
        "generated_video_url": video_url,
        "user_feedback": None,
        "current_agent": "영상 편집자 에이전트"
    }


# Node 4: 배포 에이전트
def publish_node(state: AgentState) -> dict:
    import uuid
    channels = state.get("publish_channels", [])
    results = {}

    for channel in channels:
        if channel == "instagram":
            post_id = str(uuid.uuid4())[:8]
            results["instagram"] = f"https://www.instagram.com/p/Csomabi_{post_id}"
        elif channel == "kakaotalk":
            results["kakaotalk"] = "카카오 알림톡 발송 성공 (배포 코드: KAKAO_SOMA_SUCCESS)"

    return {
        "publish_results": results,
        "current_agent": "배포 에이전트"
    }
