from fastapi import APIRouter
from app.services.tool_registry import list_all_tools
from app.schemas.tool import ToolMetadata

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/", response_model=list[ToolMetadata])
async def get_tools():
    return await list_all_tools()