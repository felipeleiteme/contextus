from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_jwt_secret: str

    # Gladia AI
    gladia_api_key: str
    gladia_upload_url: str = "https://api.gladia.io/v2/upload"
    gladia_transcription_url: str = "https://api.gladia.io/v2/pre-recorded"

    # Qwen LLM
    qwen_api_key: str = Field(
        validation_alias=AliasChoices("QWEN_API_KEY", "DASHSCOPE_API_KEY")
    )
    qwen_api_url: str = Field(
        default="https://dashscope.aliyuncs.com/compatible-mode/v1",
        validation_alias=AliasChoices("QWEN_API_URL", "QWEN_BASE_URL"),
    )
    qwen_model: str = Field(
        default="qwen-turbo",
        validation_alias=AliasChoices("QWEN_MODEL", "QWEN_MODEL_NAME"),
    )

    # Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    environment: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
