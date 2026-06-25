from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.agent.state import AgentState
from app.agent.nodes import generate_post_node, generate_image_node, generate_video_node

# 더미 리뷰 노드 정의 (이 노드들 직전에 interrupt가 수행됨)
def post_review_node(state: AgentState) -> dict:
    return {}

def image_review_node(state: AgentState) -> dict:
    return {}

def video_review_node(state: AgentState) -> dict:
    return {}

# 조건부 라우팅 함수들 정의
def route_post_review(state: AgentState) -> str:
    if "post" in state.get("approved_stages", []):
        return "generate_image"
    return "generate_post"

def route_image_review(state: AgentState) -> str:
    if "image" in state.get("approved_stages", []):
        return "generate_video"
    return "generate_image"

def route_video_review(state: AgentState) -> str:
    if "video" in state.get("approved_stages", []):
        # LangGraph 1.x에서 conditional edge target으로의 interrupt_before가
        # 신뢰할 수 없게 작동하므로, publish는 graph 밖 /api/publish 엔드포인트에서 처리
        return END
    return "generate_video"

# LangGraph 생성
workflow = StateGraph(AgentState)

# 노드 추가
workflow.add_node("generate_post", generate_post_node)
workflow.add_node("post_review", post_review_node)

workflow.add_node("generate_image", generate_image_node)
workflow.add_node("image_review", image_review_node)

workflow.add_node("generate_video", generate_video_node)
workflow.add_node("video_review", video_review_node)

# 엣지 연결
workflow.add_edge(START, "generate_post")
workflow.add_edge("generate_post", "post_review")

workflow.add_conditional_edges(
    "post_review",
    route_post_review,
    {
        "generate_image": "generate_image",
        "generate_post": "generate_post"
    }
)

workflow.add_edge("generate_image", "image_review")

workflow.add_conditional_edges(
    "image_review",
    route_image_review,
    {
        "generate_video": "generate_video",
        "generate_image": "generate_image"
    }
)

workflow.add_edge("generate_video", "video_review")

workflow.add_conditional_edges(
    "video_review",
    route_video_review,
    {
        END: END,
        "generate_video": "generate_video"
    }
)

# 인메모리 메모리 세이버 설정 (각 사용자 스레드별 상태 유지)
memory = MemorySaver()

# 컴파일 (review 노드들 진입 직전에 interrupt 설정)
app_graph = workflow.compile(
    checkpointer=memory,
    interrupt_before=["post_review", "image_review", "video_review"]
)
