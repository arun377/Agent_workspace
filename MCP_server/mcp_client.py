import asyncio
import os
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
from mcp import ClientSession
from mcp.client.sse import sse_client

# Mute noisy "Unknown SSE event: ping" warnings from the MCP SDK
logging.getLogger("mcp").setLevel(logging.ERROR)

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
LOCAL_MCP_URL = os.environ.get("LOCAL_MCP_URL", "http://127.0.0.1:8000/sse")

async def run_mcp_client():
    client = genai.Client(api_key=GEMINI_API_KEY)
    model_id = "gemini-2.5-flash"

    print(f"Connecting to unified MCP Server at {LOCAL_MCP_URL}...")
    
    # 1. Connect to the single MCP Server containing all your tools
    async with sse_client(LOCAL_MCP_URL, timeout=60.0) as (read, write):
        async with ClientSession(read, write) as session:
            
            # Initialize session
            await session.initialize()
            print("Connected successfully!\n")
            
            # 2. Fetch tools from the server
            tools_response = await session.list_tools()
            
            gemini_tools = []
            print("Discovered Tools:")
            
            for tool in tools_response.tools:
                print(f" - {tool.name}")
                
                # Clean up the schema for Gemini compatibility
                schema = tool.inputSchema.copy() if tool.inputSchema else {}
                schema.pop("additionalProperties", None)
                schema.pop("$schema", None)

                gemini_tools.append(
                    types.Tool(
                        function_declarations=[
                            types.FunctionDeclaration(
                                name=tool.name,
                                description=tool.description,
                                parameters=schema
                            )
                        ]
                    )
                )

            # 3. Start a chat with Gemini
            chat = client.chats.create(
                model=model_id, 
                config=types.GenerateContentConfig(tools=gemini_tools)
            )
            
            # 4. Multi-step Prompt testing the Firecrawl -> Audio -> PDF pipeline
            prompt = """
            1. Use the scrape_website tool to read: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418'
            2. Summarize what that specific HTTP status code means in one short paragraph.
            3. Turn your summary into an audio file named 'teapot.mp3' using the TTS tool.
            4. Generate a PDF report named 'teapot.pdf' titled 'HTTP 418 Summary' with your findings.
            """
            print(f"\nSending Prompt to Gemini:\n{prompt}\n")
            
            response = chat.send_message(prompt)
            
            # 5. Handle Tool Calls dynamically
            while response.function_calls:
                function_responses = []
                for function_call in response.function_calls:
                    print(f"-> Gemini requested tool: {function_call.name}")
                    print(f"   With arguments: {function_call.args}")
                    
                    try:
                        print(f"   Executing remotely. Please wait...")
                        result = await session.call_tool(
                            function_call.name, 
                            arguments=function_call.args
                        )
                        tool_result = result.content[0].text
                        
                        # Preview large responses (like full webpage scrapes) to keep terminal clean
                        preview = (tool_result[:150] + "...") if len(tool_result) > 150 else tool_result
                        print(f"-> Execution Result: {preview} [Total length: {len(tool_result)} chars]\n")
                        
                    except Exception as e:
                        tool_result = f"Error: {str(e)}"
                        print(f"-> Execution Error: {tool_result}\n")
                    
                    function_responses.append(
                        types.Part.from_function_response(
                            name=function_call.name,
                            response={"result": tool_result}
                        )
                    )
                
                print("Sending tool results back to Gemini (waiting for next step)...")
                response = chat.send_message(function_responses)
                
            # 6. Final Output
            print(f"\nGemini Final Answer:\n{response.text}")

if __name__ == "__main__":
    asyncio.run(run_mcp_client())