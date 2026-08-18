from fastapi import APIRouter
from app.tools.registry import get_available_tools_info

router = APIRouter(prefix="/tools", tags=["tools"])

import asyncio

REGISTERED_MCP_SERVERS = {"http://127.0.0.1:8081/sse"}

@router.get("/")
def list_tools():
    return get_available_tools_info()

from pydantic import BaseModel

class MCPServerAddRequest(BaseModel):
    url: str
    description: str = ""

@router.post("/mcp_servers")
def add_mcp_server(request: MCPServerAddRequest):
    import json
    from pathlib import Path
    
    config_path = Path("mcp_servers_config.json")
    servers = []
    if config_path.exists():
        try:
            content = config_path.read_text(encoding="utf-8")
            servers = json.loads(content)
        except Exception:
            pass
            
    # Check if URL already exists
    for s in servers:
        if s.get("url") == request.url:
            return {"status": "error", "message": "Server URL already exists"}
            
    servers.append({"url": request.url, "description": request.description})
    
    try:
        config_path.write_text(json.dumps(servers, indent=4), encoding="utf-8")
        return {"status": "success", "url": request.url}
    except Exception as e:
        return {"status": "error", "message": f"Failed to save config: {str(e)}"}

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
