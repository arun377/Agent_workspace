from fastapi import APIRouter
from app.tools.registry import get_available_tools_info

router = APIRouter(prefix="/tools", tags=["tools"])

import asyncio

REGISTERED_MCP_SERVERS = {"http://127.0.0.1:8081/sse"}

@router.get("/")
def list_tools():
    return get_available_tools_info()

@router.get("/mcp_servers")
def list_mcp_servers():
    import json
    from pathlib import Path
    
    config_path = Path("mcp_servers_config.json")
    if not config_path.exists():
        return []
        
    try:
        content = config_path.read_text(encoding="utf-8")
        return json.loads(content)
    except Exception as e:
        return {"error": f"Failed to read config file: {str(e)}"}
