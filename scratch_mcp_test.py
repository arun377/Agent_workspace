# scratch_mcp_test.py
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
    for t in tools:
        print(t.name, "-", t.description)

asyncio.run(main())