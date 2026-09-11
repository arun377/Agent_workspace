import os
import sys
import threading
import http.server
import socketserver
# pyrefly: ignore [missing-import]
from fastmcp import FastMCP

try:
    # pyrefly: ignore [missing-import]
    from tools_service import (
        generate_pdf_report_impl,
        generate_tts_audio_impl,
        scrape_website_impl,
        generate_gitdiagram_impl,
    )
except ImportError:
    from MCP_server.tools_service import (
        generate_pdf_report_impl,
        generate_tts_audio_impl,
        scrape_website_impl,
        generate_gitdiagram_impl,
    )

# ==========================================
# OUTPUT DIRECTORY & STATIC HTTP SERVER
# ==========================================
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
HTTP_PORT = 8082


def start_http_server():
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=OUTPUT_DIR, **kwargs)

    # SO_REUSEADDR ensures the port is freed immediately upon server restarts
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", HTTP_PORT), Handler) as httpd:
        print(f"Serving outputs at http://0.0.0.0:{HTTP_PORT}")
        httpd.serve_forever()


# Start the file server in a background daemon thread
threading.Thread(target=start_http_server, daemon=True).start()


def get_output_file_info(filename: str):
    """Sanitizes filename and returns absolute local path and public URL."""
    safe_filename = os.path.basename(filename)
    local_path = os.path.join(OUTPUT_DIR, safe_filename)
    public_url = f"http://127.0.0.1:{HTTP_PORT}/{safe_filename}"
    return safe_filename, local_path, public_url


# ==========================================
# FASTMCP SERVER INITIALIZATION
# ==========================================
mcp = FastMCP("NetworkMCPServer")


# ==========================================
# TOOL 1: PDF Generator
# ==========================================
@mcp.tool()
def generate_pdf_report(
    md_content: str, 
    title: str = "Document Report", 
    output_filename: str = "report.pdf"
) -> str:
    """Converts Markdown text into a beautifully styled, publication-ready PDF document.

    Use this tool whenever the user requests a PDF, report, summary document, or formatted printable export.
    Supports full Markdown including headers (#, ##), tables, bold/italic styling, ordered/unordered lists, and code blocks.

    Args:
        md_content: The Markdown formatted body text to render into the PDF.
        title: The main document title displayed in the top header. Defaults to 'Document Report'.
        output_filename: The target filename for the generated PDF (e.g., 'analysis_report.pdf'). Defaults to 'report.pdf'.

    Returns:
        A direct download URL where the generated PDF document is hosted and can be viewed or downloaded.
    """
    if not output_filename.endswith(".pdf"):
        output_filename += ".pdf"

    safe_filename, file_path, public_url = get_output_file_info(output_filename)
    return generate_pdf_report_impl(md_content, title, file_path, public_url)


# ==========================================
# TOOL 2: Text-To-Speech (TTS) Audio Generator
# ==========================================
@mcp.tool()
async def generate_tts_audio(
    text: str, 
    voice: str = "en-US-ChristopherNeural", 
    output_filename: str = "speech.mp3"
) -> str:
    """Converts text or markdown into high-clarity, natural-sounding spoken audio (.mp3).

    Uses Microsoft Edge neural text-to-speech with a crystal-clear, professional male voice by default.
    Markdown syntax, URLs, and code blocks are automatically cleaned for smooth, natural narration.

    Args:
        text: The text or markdown narrative to speak aloud.
        voice: Neural voice identifier. Defaults to 'en-US-ChristopherNeural' (clear, professional US male voice).
               Alternative options:
               - 'en-US-GuyNeural' (passionate US male)
               - 'en-US-BrianNeural' (conversational US male)
               - 'en-GB-RyanNeural' (clear British male)
               - 'en-US-AriaNeural' (clear US female)
        output_filename: The target filename for the MP3 file (e.g., 'podcast.mp3'). Defaults to 'speech.mp3'.

    Returns:
        A direct download URL where the generated MP3 audio file is hosted and can be played or downloaded.
    """
    if not output_filename.endswith(".mp3"):
        output_filename += ".mp3"

    safe_filename, file_path, public_url = get_output_file_info(output_filename)
    return await generate_tts_audio_impl(text, voice, file_path, public_url)


# ==========================================
# TOOL 3: Website Scraper (via Firecrawl)
# ==========================================
@mcp.tool()
async def scrape_website(url: str) -> str:
    """Scrapes a public webpage and extracts its core content as clean, structured Markdown.

    Ideal for reading articles, technical documentation, blog posts, and websites without ads or HTML clutter.

    Args:
        url: The complete HTTP/HTTPS web address to scrape (e.g., 'https://docs.python.org/3/').

    Returns:
        Clean, structured Markdown text extracted from the webpage.
    """
    return await scrape_website_impl(url)


# ==========================================
# TOOL 4: GitDiagram Visualizer
# ==========================================
@mcp.tool()
async def generate_gitdiagram(username: str, repo: str) -> str:
    """Generates an architectural diagram and comprehensive technical explanation for a GitHub repository.

    Automatically checks a local cache first to ensure instantaneous response and avoid rate limits.
    Compiles an interactive Mermaid diagram saved as an HTML page and provides an architectural breakdown.

    Args:
        username: The GitHub organization or username owning the repository (e.g., 'facebook', 'fastapi').
        repo: The GitHub repository name (e.g., 'react', 'fastapi').

    Returns:
        A technical architecture analysis paired with a local URL to view the interactive diagram in a web browser.
    """
    return await generate_gitdiagram_impl(username, repo, OUTPUT_DIR, get_output_file_info)


# ==========================================
# SERVER ENTRY POINT
# ==========================================
if __name__ == "__main__":
    print("Starting MCP Server on SSE...")
    mcp.run(transport="sse", host="0.0.0.0", port=8081)