# scratch_inspect_tool.py
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient

async def main():
    client = MultiServerMCPClient(
        {
            "deepwiki": {
                "url": "https://mcp.deepwiki.com/mcp",
                "transport": "streamable_http",
            }
        }
    )
    tools = await client.get_tools()
    t = tools[0]
    print("name:", t.name)
    print("description:", t.description)
    print("all attrs:", [a for a in dir(t) if not a.startswith("_")])

asyncio.run(main())