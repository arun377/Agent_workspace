from typing import Optional
from pydantic import BaseModel, Field


class AgentCreateRequest(BaseModel):
    name: str
    prompt: str
    model: str = "gemini/gemini-3.5-flash"
    tools: list[str] = []


class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    model: Optional[str] = None
    tools: Optional[list[str]] = None


class AgentCreateResponse(BaseModel):
    name: str
    file_path: str


class AgentDetailResponse(BaseModel):
    name: str
    prompt: str = ""
    model: str = ""
    tools: list[str] = []
    file_path: Optional[str] = None


class AgentRunRequest(BaseModel):
    input_text: str
    session_id: Optional[str] = Field(default="default_session")