from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.schemas.agent import AgentRunRequest
from app.services.trace_streamer import stream_agent_trace_subprocess

router = APIRouter(prefix="/agents", tags=["trace"])

@router.post("/{name}/trace")
async def run_agent_trace_endpoint(name: str, req: AgentRunRequest):
    """Single endpoint: runs the agent while streaming full parallel traceability trace & tokens."""
    return StreamingResponse(
        stream_agent_trace_subprocess(name, req.input_text, req.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
