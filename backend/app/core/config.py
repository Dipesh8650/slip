from __future__ import annotations
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "slip"
    postgres_password: str = "slip"
    postgres_db: str = "slip"
    cors_origins: list[str] = ["*"]
    @property
    def database_url(self) -> str:
        return URL.create(
            drivername="postgresql+psycopg2",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        ).render_as_string(hide_password=False)
_settings: Settings | None = None
def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
