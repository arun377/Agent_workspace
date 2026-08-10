from langchain_mcp_adapters.client import MultiServerMCPClient
from app.tools.mcp_servers import MCP_SERVERS
from app.tools.builtin.builtin import get_builtin_tool_metadata
from app.schemas.tool import ToolMetadata


async def get_mcp_tool_metadata():
    results = []
    for server_id, server_config in MCP_SERVERS.items():
        client = MultiServerMCPClient({server_id: server_config})
        tools = await client.get_tools()
        for tool_fn in tools:
            results.append(
                ToolMetadata(
                    id=f"{server_id}:{tool_fn.name}",
                    name=tool_fn.name,
                    description=tool_fn.description,
                    type="mcp",
                    mcp_server_id=server_id,
                )
            )
    return results


async def list_all_tools():
    builtin = list(get_builtin_tool_metadata())
    mcp = await get_mcp_tool_metadata()
    return builtin + mcp