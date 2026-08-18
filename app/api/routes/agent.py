from fastapi import HTTPException
from fastapi import APIRouter
from app.schemas.agent import AgentCreateRequest, AgentCreateResponse,AgentRunRequest, AgentRunResponse
from app.services.agent_service import generate_agent
from app.services.agent_runner import run_agent
import subprocess


router = APIRouter(prefix="/agents", tags=["agents"])

@router.post("/",response_model=AgentCreateResponse)
def create_agent(request:AgentCreateRequest):
    file_path=generate_agent(
        name = request.name,
        prompt=request.prompt,
        model=request.model,
        tools=request.tools,
        mcp_servers=request.mcp_servers,
    )
    return AgentCreateResponse(name=request.name, file_path=file_path)





@router.post("/{name}/run", response_model=AgentRunResponse)
def test_agent(name: str, request: AgentRunRequest):
    try:
        result = run_agent(name=name, input_text=request.input_text)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Agent execution timed out")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return AgentRunResponse(**result)