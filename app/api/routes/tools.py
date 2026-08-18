from fastapi import APIRouter
from app.tools.registry import get_available_tools_info

router = APIRouter(prefix="/tools", tags=["tools"])

@router.get("/")
def list_tools():
    return get_available_tools_info()
