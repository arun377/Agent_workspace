from pydantic import BaseModel
from typing import Literal
class ToolMetadata(BaseModel):
    id: str
    name: str
    description: str
    type: Literal["builtin", "mcp"]
    mcp_server_id: str | None = None