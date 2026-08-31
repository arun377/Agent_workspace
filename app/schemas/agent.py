from pydantic import BaseModel

class AgentCreateRequest(BaseModel):
    name: str
    prompt: str
    model:str = "gemini/gemini-3.5-flash"
    tools: list[str] = []

class AgentUpdateRequest(BaseModel):
    prompt: str
    model:str = "gemini/gemini-3.5-flash"
    tools: list[str] = []
    mcp_servers: list[str] = []

class AgentCreateResponse(BaseModel):
    name:str
    file_path:str

class AgentRunRequest(BaseModel):
    input_text:str
    
class AgentRunResponse(BaseModel):
    status:str
    result:str