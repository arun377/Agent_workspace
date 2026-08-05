from pydantic import BaseModel

class AgentCreateRequest(BaseModel):
    name: str
    prompt: str
    model:str = "gemini-3.5-flash"

class AgentCreateResponse(BaseModel):
    name:str
    file_path:str

class AgentRunRequest(BaseModel):
    input_text:str
    
class AgentRunResponse(BaseModel):
    status:str
    result:str