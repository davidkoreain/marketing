import os
from pathlib import Path
from dotenv import load_dotenv

# backend/.env 경로 설정 및 로드
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
APP_ENV = os.getenv("APP_ENV", "development")
PORT = int(os.getenv("PORT", "8000"))

# 프롬프트나 다른 설정에서 기본 LLM 모델 지정
DEFAULT_LLM_MODEL = "gpt-4o"  # 또는 "gemini-1.5-flash"
