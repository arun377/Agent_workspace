from fastapi import APIRouter
from app.schemas.agent import AgentCreateRequest, AgentCreateResponse
from app.services.agent_service import generate_agent


router = APIRouter(prefix="/agents", tags=["agents"])

@router.post("/",response_model=AgentCreateResponse)
def create_agent(request:AgentCreateRequest):
    file_path=generate_agent(
        name = request.name,
        prompt=request.prompt,
        model=request.model
    )
    return AgentCreateResponse(name=request.name, file_path=file_path)