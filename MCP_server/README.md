# MCP Server

This directory contains the MCP (Model Context Protocol) server and client implementations.

## Installation

You can install the dependencies using either `uv` (recommended for speed) or the standard `pip`.

### Using `uv` (Recommended)

```bash
# Install dependencies using uv pip
uv pip install -r requirements.txt
```

### Using `pip`

```bash
# Install dependencies using standard pip
pip install -r requirements.txt
```

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Update the `.env` file with your specific API keys and configuration values.

## Running the Server

To start the MCP server, run:
```bash
fastmcp run mcp_server.py
```
*(Or use `python mcp_server.py` depending on how the server script is configured to launch)*







Based on a deep analysis of your `mcp_server.py` file, here is the report on how an AI agent will interact with it and what potential issues exist when running it over a network.

### 1. Can the AI Agent Figure Out the Right Tools?
**Yes, perfectly.** 
`FastMCP` automatically translates your Python code into a JSON Schema that the AI understands by looking at your function definitions. Your code follows all the best practices for this:
- **Descriptive Names:** Names like `generate_tts_audio` and `scrape_website` are self-explanatory.
- **Type Hints:** You strictly defined inputs and outputs (e.g., `text: str`, `-> str`), which prevents the AI from passing the wrong data types.
- **Rich Docstrings:** You provided highly detailed docstrings for every tool, explicitly outlining what the tool does and exactly what each argument expects (e.g., listing the exact voice names the AI can choose from). 

Because of this, an LLM (like Gemini or Claude) will have no trouble deciding when to use these tools and exactly how to format the arguments.

---

### 2. What is Missing / Architectural Flaws (Network Context)
While the AI will know *how* to use the tools, running this specific code over a network (using `host="0.0.0.0"`) exposes a major architectural flaw:

**A. Files are trapped on the Server**
- **The Issue:** `generate_pdf_report` and `generate_tts_audio` save their outputs directly to the server's local hard drive using `os.path.abspath(output_filename)`. 
- **The Result:** If an AI agent running on a *different machine* calls this server, the server will successfully generate the PDF/MP3 and save it on the server's disk. The AI agent will tell the user, *"I have successfully created the file at C:\..."*, but the remote user will not be able to access or download it.
- **The Fix:** To fix this for a network server, you either need a tool that returns the actual file bytes (e.g., base64 encoding the file and sending it back to the client), or you need to add an HTTP endpoint (like a simple FastAPI route) that serves the generated files so the client can download them via a URL.

**B. Path Traversal Security Risk**
- **The Issue:** You allow the LLM to specify the `output_filename` (e.g., `output_filename: str = "output.pdf"`). 
- **The Result:** Because you are hosting this on the network (`0.0.0.0`), a malicious client or a hallucinating AI could pass a filename like `../../../../Windows/System32/config/sam.pdf`. The script will blindly use `os.path.abspath()` and potentially overwrite critical system files or write to unauthorized directories on the server.
- **The Fix:** You need to sanitize the `output_filename` to ensure it only saves to a specific, sandboxed `outputs/` directory and ignores any `../` path traversal attempts.

**C. No Authentication**
- **The Issue:** Binding to `0.0.0.0:8081` with no authentication means anyone who can ping your IP address can trigger web scraping, run TTS (which uses Microsoft Edge servers), and write files to your disk. 
- **The Fix:** If this leaves your local WiFi network, it should sit behind a reverse proxy (like Nginx) that requires an API key or authentication token.