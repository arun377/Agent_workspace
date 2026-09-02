# Network MCP Server

This directory contains a custom Model Context Protocol (MCP) server built with `FastMCP`. 
It exposes tools for:
- Converting Markdown to PDF (`generate_pdf_report`)
- Generating Text-to-Speech Audio (`generate_tts_audio`)
- Scraping Websites into Markdown (`scrape_website`)

To make these tools securely accessible over a network, this server:
1. **Sanitizes all filenames** using `os.path.basename` to prevent path traversal attacks.
2. **Isolates all output files** in a dedicated `outputs/` folder.
3. **Serves files via an HTTP endpoint** running on port `8082`, allowing remote clients to securely download the resulting PDF and MP3 files.

## Prerequisites & Installation

You need to install the dependencies before running the server. You can use standard `pip` or the faster `uv` package manager.

### Option 1: Using `uv` (Recommended)
If you are inside the main workspace with the `uv.lock` file, you can install everything rapidly:
```bash
uv pip install -r requirements.txt
```
*(Or simply `uv sync` if the workspace pyproject.toml is already configured for these).*

### Option 2: Using `pip`
```bash
pip install -r requirements.txt
```

## Running the Server

Start the server using Python. This will boot up both the **MCP SSE Server** (on port `8081`) and the **Background File Server** (on port `8082`).

```bash
python mcp_server.py
```

You should see output indicating both servers are running:
```
Serving outputs at http://0.0.0.0:8082
Starting MCP Server on SSE...
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8081 (Press CTRL+C to quit)
```

## Testing the Server

A test client (`test_client.py`) is provided to verify that:
1. The server can be connected to via SSE.
2. The tools are correctly listed.
3. Directory traversal attempts (e.g., `../../../malicious_attempt.mp3`) are safely sanitized.
4. The generated files are accessible via the background HTTP server.

While the server is running in one terminal, open a new terminal and run:

```bash
python test_client.py
```

### Expected Output
```text
Testing MCP Server connection...
Connected! Listing tools...
Tool found: generate_pdf_report
Tool found: generate_tts_audio
Tool found: scrape_website

Calling generate_tts_audio...

Result from tool:
Success! You can download your audio file here: http://127.0.0.1:8082/malicious_attempt.mp3

Verifying HTTP server by fetching http://127.0.0.1:8082/malicious_attempt.mp3...
HTTP Server responded with status: 200
Success! Downloaded 21168 bytes.
```
