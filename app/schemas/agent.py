from pydantic import BaseModel

class AgentCreateRequest(BaseModel):
    name: str
    prompt: str