import asyncio
import os
import sys 
from dotenv import load_dotenv
from google import genai
from google.genai import types
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Load the Gemini API key from .env
load_dotenv()

async def run_mcp_client():
    # 1. Initialize Gemini Client
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    model_id = "gemini-2.5-flash"

    # 2. Configure connection to our local MCP Server
    server_params = StdioServerParameters(
        command=sys.executable,
        args=["mcp_server.py"]
    )

    print("Starting MCP Server and establishing connection...")
    
    # 3. Connect to MCP Server via stdio
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print("Connected!\n")
            
            # 4. Ask the server what tools it has
            mcp_tools_response = await session.list_tools()
            
            # 5. Translate MCP Tools into Gemini Tool Schema
            gemini_tools = []
            for tool in mcp_tools_response.tools:
                # Clean up the schema for Gemini
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

            # 6. Start a chat with Gemini, providing it the tools
            chat = client.chats.create(
                model=model_id, 
                config=types.GenerateContentConfig(tools=gemini_tools)
            )
            
            # The prompt! We ask Gemini to generate content AND use the tool.
            prompt = """
            Please write a brief, 3-point guide on why Python is great for AI. 
            Once you write it, use the generate_pdf_report tool to turn it into a PDF 
            titled 'Python AI Guide' and save it as 'python_ai.pdf'.
            """
            print(f"Sending Prompt to Gemini:\n{prompt}\n")
            
            response = chat.send_message(prompt)
            
            # 7. Check if Gemini decided to call our tool
            if response.function_calls:
                for function_call in response.function_calls:
                    print(f"-> Gemini requested tool: {function_call.name}")
                    print(f"-> With Arguments: {function_call.args}")
                    
                    # 8. Execute the tool locally on the MCP Server
                    result = await session.call_tool(
                        function_call.name, 
                        arguments=function_call.args
                    )
                    
                    # Extract the result text (the file path we returned)
                    tool_result = result.content[0].text
                    print(f"-> Tool Execution Result: {tool_result}\n")
                    
                    # 9. Send the result back to Gemini so it can finalize its answer
                    final_response = chat.send_message(
                        [types.Part.from_function_response(
                            name=function_call.name,
                            response={"result": tool_result}
                        )]
                    )
                    print(f"Gemini Final Answer:\n{final_response.text}")
            else:
                # Gemini decided not to use a tool
                print(f"Gemini Answer:\n{response.text}")

if __name__ == "__main__":
    asyncio.run(run_mcp_client())