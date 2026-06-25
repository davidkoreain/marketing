# 기술 스택 제안서 (Tech Stack Proposal)

본 문서는 소상공인 대상 SNS 마케팅 자동화 서비스(**SoMaBi**)의 개발을 위한 최적의 기술 스택을 제안합니다. 이 서비스의 핵심은 **비동기 미디어 생성(글, 이미지, 영상)**과 사용자의 **단계별 피드백 수정을 위한 LangGraph 제어**입니다. 이를 위해 유연성, 개발 속도, AI 생태계 연동을 극대화할 수 있는 스택으로 구성했습니다.

---

## 1. 아키텍처 개요
서비스는 크게 세 부분으로 구성됩니다.
1. **Frontend (클라이언트)**: 소상공인 사용자가 모바일/웹에서 쉽고 빠르게 생성 단계를 확인하고 피드백을 입력할 수 있는 직관적인 UI.
2. **Backend & AI Agent (서버)**: LangGraph를 활용한 상태 관리(State Management) 및 AI 모델(LLM, 이미지/영상 API) 제어.
3. **External Services & APIs (외부 연동)**: 카카오톡 및 인스타그램 배포 API, 미디어 생성 API.

---

## 2. 권장 기술 스택 및 선정 이유

### 2.1. AI 및 워크플로우 오케스트레이션
* **기술**: **LangGraph (Python)**, **LangChain**
* **선정 이유**:
  * **Human-in-the-loop(HITL) 최적화**: LangGraph는 에이전트 실행 중 특정 노드에서 멈추어 사용자 승인을 대기(`interrupt`)하거나, 사용자의 피드백을 기반으로 상태(State)를 업데이트하여 이전 노드로 되돌아가는 흐름(Loop)을 가장 깔끔하게 정의할 수 있는 프레임워크입니다.
  * **상태 관리**: 에이전트의 대화 맥락, 생성된 텍스트, 이미지 경로, 비디오 메타데이터 등을 JSON 스키마 기반의 State로 안전하게 추적 및 관리합니다.
  * **파이썬 생태계**: AI 및 LLM 라이브러리(OpenAI, Google GenAI, Hugging Face 등)와 연동이 가장 원활합니다.

### 2.2. 백엔드 (Backend API)
* **기술**: **FastAPI (Python)**, **Uvicorn**
* **선정 이유**:
  * **파이썬 네이티브**: AI 에이전트 라이브러리인 LangGraph와 동일한 언어 환경을 공유하여 모델 로딩 및 비동기 워크플로우 호출 시 오버헤드가 없습니다.
  * **비동기(Asynchronous) 처리**: 비디오/이미지 생성과 같은 긴 I/O 작업이 진행되는 동안 차단(Blocking)되지 않고 수많은 동시 요청을 처리하기에 매우 적합합니다.
  * **실시간 통신 지원**: WebSocket을 쉽게 지원하여 AI 생성 프로세스의 진척도(예: "이미지 생성 중 50%...")를 프론트엔드에 실시간으로 브로드캐스팅할 수 있습니다.

### 2.3. 프론트엔드 (Frontend Client)
* **기술**: **Next.js (React)**, **Tailwind CSS**, **shadcn/ui**
* **선정 이유**:
  * **Next.js (App Router)**: SEO 최적화 및 뛰어난 사용자 경험(UX)을 동시에 제공하며, Server Component와 API Routes를 활용한 빠른 개발이 가능합니다.
  * **Tailwind CSS & shadcn/ui**: 반응형 웹 및 컴포넌트 디자인을 빠르게 구성할 수 있어, 모바일로 주로 접속할 소상공인 맞춤형 UI 개발 속도를 단축합니다.
  * **상태 관리 및 통신**: **TanStack Query (React Query)**를 사용하여 백엔드의 비동기 작업 상태를 실시간/주기적으로 폴링하거나, SSE/WebSocket을 연동하여 매끄러운 진행 상태를 표현합니다.

### 2.4. 데이터베이스 및 큐 (Database & Task Queue)
* **기술**: **PostgreSQL**, **Redis**, **Celery** (또는 FastAPI Background Tasks)
* **선정 이유**:
  * **PostgreSQL**: 서비스 사용자 정보, 배포 이력, 최종 마케팅 결과물 메타데이터를 저장하기 위한 강력한 RDBMS입니다. LangGraph의 체크포인터(Sqlite/Postgres)를 연동해 에이전트의 이력(History) 및 상태를 지속적으로 백업(Persistence)하는 데 적합합니다.
  * **Redis**: 세션 관리, LangGraph 상태 캐싱 및 비동기 작업 큐의 브로커 역할을 수행합니다.
  * **Celery**: 비디오 렌더링, 고화질 이미지 생성과 같이 수 분이 걸리는 헤비한 작업을 백그라운드 태스크로 분리하여 서버 부하를 분산시킵니다.

### 2.5. AI 모델 및 미디어 엔진 (AI Models & Media Engines)
* **텍스트 및 대본 생성**: **GPT-4o** 또는 **Gemini 1.5 Pro/Flash** (API)
  * 다국어 및 한국어 로컬 톤앤매너 구현에 매우 우수하며, 프롬프트를 통해 구조화된 JSON 데이터(예: 쇼츠 씬 구성 리스트)를 안정적으로 출력합니다.
* **이미지 생성**: **DALL-E 3** 또는 **Stable Diffusion XL (API via Replicate/RunPod)**
  * 프롬프트를 바탕으로 소상공인 제품에 어울리는 고품질 배너/홍보 이미지 생성.
* **TTS (음성 합성)**: **OpenAI TTS API** or **ElevenLabs**
  * 자연스러운 인공지능 성우 나레이션을 생성하여 쇼츠 비디오에 입힙니다.
* **쇼츠 영상 합성 엔진**: **Remotion (React 기반)** 또는 **FFmpeg (Python wrapper)**
  * **Remotion**: React 코드로 타임라인, 자막 애니메이션, 이미지 전환 효과를 코딩하고 서버사이드(Node.js)에서 MP4로 렌더링할 수 있어, 정밀한 숏폼 템플릿 제어에 매우 유리합니다.
  * **FFmpeg**: 리소스 제약이 있을 경우, 파이썬 백엔드에서 직접 TTS 음원 파일과 슬라이드 이미지를 오버레이하여 영상을 인코딩합니다.

### 2.6. 외부 배포 API (Publishing APIs)
* **인스타그램**: **Instagram Graph API (Content Publishing API)**
  * 페이스북 프로페셔널 계정과 연동하여 피드 이미지 및 비디오(릴스)를 직접 업로드할 수 있는 공식 API 제공.
* **카카오톡**: **카카오 비즈니스 채널 API** (또는 비즈메시지 대행사 API)
  * 소상공인이 고객 대상 알림톡/친구톡을 발송할 수 있도록 템플릿 관리 및 발송 연동.

---

## 3. 전체 시스템 데이터 흐름 (Data Flow)

```
[클라이언트(Next.js)] 
       │ 1. 상품 입력 정보 전송
       ▼
[백엔드 API(FastAPI)] ── 2. LangGraph 호출 (State 생성)
       │
       ├─► [Node 1: LLM] ── 홍보글 생성 (Prompt Engineering)
       │         ▲
       │         └─ (Interrupt: 사용자 수정/피드백 반영)
       │
       ├─► [Node 2: Image API] ── 홍보 이미지 생성 (DALL-E 3)
       │         ▲
       │         └─ (Interrupt: 사용자 이미지 재생성/변경)
       │
       ├─► [Node 3: Remotion/FFmpeg] ── 쇼츠 영상 렌더링 (대본 + TTS + 이미지)
       │         ▲
       │         └─ (Interrupt: 사용자 예약 및 배포 승인)
       │
       ▼
[SNS Publishing API] ── 3. 최종 배포 (인스타/카카오톡)
```

---

## 4. 인프라 및 배포 (Infrastructure & DevOps)
* **컨테이너화**: **Docker** 및 **Docker Compose**를 통해 프론트엔드, 백엔드, DB, Redis 환경 일치.
* **클라우드 서비스**: **AWS** (ECS/Fargate) 또는 **GCP** (Cloud Run)를 활용하여 서버리스 백엔드 운영.
* **동영상 렌더링 서버**: Remotion 또는 FFmpeg을 위해 GPU 인스턴스 또는 Node.js 실행 환경이 튜닝된 람다(Lambda/Cloud Run) 분리 운영.
