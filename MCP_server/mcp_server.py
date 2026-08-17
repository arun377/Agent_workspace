import os
import markdown2
import re
import edge_tts   #text-to-speech library
from xhtml2pdf import pisa  #pdf generation library
from fastmcp import FastMCP
import httpx

# Initialize the MCP Server (Renamed to reflect it will hold multiple tools)
mcp = FastMCP("NetworkMCPServer")

def normalize_markdown(md_content: str) -> str:
    """Basic normalization in case the LLM outputs weird formatting."""
    return md_content.strip()

# ==========================================
# TOOL 1: PDF Generator
# ==========================================
@mcp.tool()
def generate_pdf_report(md_content: str, title: str = "", output_filename: str = "output.pdf") -> str:
    """
    Converts Markdown text into a beautifully formatted PDF file.
    
    Args:
        md_content: The markdown content to be converted into the PDF.
        title: The title of the document to display at the top.
        output_filename: The name of the file to save (e.g., 'report.pdf').
        
    Returns:
        A string containing the absolute file path where the PDF was saved.
    """
    clean_md = normalize_markdown(md_content)

    html_content = markdown2.markdown(
        clean_md, 
        extras=["tables", "fenced-code-blocks", "cuddled-lists", "break-on-newline"]
    )

    left_footer_text = "" 

    html_template = f"""
    <html>
    <head>
        <style>
            @page {{
                size: A4;
                margin: 40px 60px;
                @frame footer_frame {{
                    -pdf-frame-content: footer_content;
                    bottom: 10pt; margin-left: 60px; margin-right: 60px; height: 20pt;
                }}
            }}
            body {{ font-family: Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }}
            #footer_content {{ font-size: 8pt; color: #555; font-family: Helvetica, Arial, sans-serif; }}
            .footer-table {{ width: 100%; border: none; margin: 0; table-layout: auto; }}
            .footer-table td {{ border: none; padding: 0; vertical-align: bottom; font-size: 8pt; }}
            .footer-left {{ text-align: left; font-style: italic; width: 85%; }}
            .footer-right {{ text-align: right; width: 15%; white-space: nowrap; }}
            .doc-title {{ text-align: center; font-size: 24pt; font-weight: bold; margin-bottom: 25px; color: #003366; border-bottom: 2px solid #003366; padding-bottom: 10px; }}
            h1 {{ font-size: 18pt; margin-top: 25px; margin-bottom: 10px; color: #003366; border-bottom: 1px solid #ddd; }}
            h2 {{ font-size: 15pt; margin-top: 20px; margin-bottom: 8px; color: #005500; }}
            h3 {{ font-size: 13pt; margin-top: 15px; margin-bottom: 6px; color: #993300; }}
            h4 {{ font-size: 11pt; font-weight: bold; margin-top: 10px; margin-bottom: 4px; }}
            p {{ margin-bottom: 8px; text-align: justify; }}
            ul, ol {{ margin-top: 5px; margin-bottom: 10px; padding-left: 20px; }}
            li {{ margin-bottom: 4px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; table-layout: fixed; border: 1px solid #ddd; }}
            th {{ background-color: #f2f2f2; font-weight: bold; color: #333; border: 1px solid #bbb; padding: 6px; font-size: 10pt; }}
            td {{ border: 1px solid #bbb; padding: 6px; font-size: 10pt; vertical-align: top; word-wrap: break-word; }}
            pre {{ background-color: #f5f5f5; border: 1px solid #ccc; padding: 10px; border-radius: 4px; font-family: Consolas, monospace; font-size: 9pt; white-space: pre-wrap; word-break: break-all; }}
            code {{ font-family: Courier; background-color: #f3f4f6; padding: 2px 4px; font-size: 90%; font-weight: bold; }}
            blockquote {{ border-left: 4px solid #003366; padding-left: 10px; color: #555; font-style: italic; }}
        </style>
    </head>
    <body>
        <div id="footer_content">
            <table class="footer-table">
                <tr>
                    <td class="footer-left">{left_footer_text}</td>
                    <td class="footer-right">Page <pdf:pagenumber> of <pdf:pagecount></td>
                </tr>
            </table>
        </div>
        {f"<div class='doc-title'>{title}</div>" if title else ""}
        {html_content}
    </body>
    </html>
    """

    if not output_filename.endswith('.pdf'):
        output_filename += ".pdf"
        
    file_path = os.path.abspath(output_filename)

    with open(file_path, "wb") as f:
        pisa_status = pisa.CreatePDF(html_template, dest=f)
    
    if pisa_status.err:
        raise Exception(f"Error during PDF generation: {pisa_status.err}")

    return f"Success! The PDF has been saved locally at: {file_path}"


def clean_text_for_speech(text: str) -> str:
    """Removes common markdown formatting so the TTS engine reads naturally."""
    # Remove code blocks entirely (they sound terrible read out loud)
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    # Remove inline code backticks
    text = re.sub(r'`', '', text)
    # Remove bold/italic markdown symbols
    text = re.sub(r'[*_]{1,3}', '', text)
    # Remove markdown headers (#)
    text = re.sub(r'#+\s', '', text)
    # Convert markdown links [Text](URL) into just "Text"
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    return text.strip()

# ==========================================
# TOOL 2: Text-To-Speech (TTS) Audio Generator
# ==========================================
@mcp.tool()
async def generate_tts_audio(
    text: str, 
    voice: str = "en-US-AriaNeural", 
    output_filename: str = "speech.mp3"
) -> str:
    """
    Converts text or markdown into high-quality, natural-sounding speech audio (.mp3).
    
    Args:
        text: The text to convert to speech.
        voice: The neural voice to use. Popular options include:
               - 'en-US-AriaNeural' (US Female - Default)
               - 'en-US-GuyNeural' (US Male)
               - 'en-GB-SoniaNeural' (UK Female)
               - 'en-GB-RyanNeural' (UK Male)
               - 'en-AU-NatashaNeural' (Australian Female)
        output_filename: The name of the file to save (must end in .mp3).
        
    Returns:
        A string containing the absolute file path where the audio was saved.
    """
    # Enforce .mp3 extension (edge-tts generates mp3 natively)
    if not output_filename.endswith('.mp3'):
        output_filename += ".mp3"
        
    file_path = os.path.abspath(output_filename)
    
    # Strip markdown artifacts so the voice reads cleanly
    clean_text = clean_text_for_speech(text)
    
    if not clean_text:
        return "Error: No readable text provided after cleaning."

    # edge_tts operates asynchronously, which FastMCP natively supports!
    communicate = edge_tts.Communicate(clean_text, voice)
    await communicate.save(file_path)
    
    return f"Success! The audio file has been saved locally at: {file_path}"

# ==========================================
# TOOL 3: Website Scraper (via Firecrawl)
# ==========================================
@mcp.tool()
async def scrape_website(url: str) -> str:
    """
    Scrapes any website and converts its contents into clean Markdown using Firecrawl.
    Great for reading documentation, articles, or extracting data from a URL.
    
    Args:
        url: The full URL of the website to scrape (e.g., 'https://en.wikipedia.org/wiki/Python_(programming_language)').
        
    Returns:
        A string containing the markdown content of the scraped webpage.
    """
    # Firecrawl's keyless V2 Scrape endpoint (No API key required)
    api_url = "https://api.firecrawl.dev/v2/scrape"
    payload = {
        "url": url,
        "formats": ["markdown"] # We only request markdown to save bandwidth
    }
    
    # We use a 30-second timeout because some heavy Javascript pages take time to render
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("success"):
                # Extract and return the markdown from the JSON response
                markdown_content = data["data"].get("markdown", "")
                if not markdown_content:
                    return f"Successfully scraped {url}, but no markdown content was returned."
                return markdown_content
            else:
                return f"Firecrawl failed to scrape the page: {data.get('error', 'Unknown error')}"
                
        except httpx.HTTPStatusError as e:
            return f"HTTP Error: {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"An error occurred while connecting to Firecrawl: {str(e)}"

# ==========================================
# PLACEHOLDER: Future Tools
# ==========================================
# Just add the @mcp.tool() decorator to any new function!

# @mcp.tool()
# def fetch_web_data(url: str) -> str:
#     """Fetches data from a given URL."""
#     return "Data from URL"

# @mcp.tool()
# def process_images(image_path: str) -> str:
#     """Processes an image and returns results."""
#     return "Image processed"


if __name__ == "__main__":
    # Start the server using SSE (Server-Sent Events)
    # host="0.0.0.0" allows external devices on your network to connect
    # port=8000 is the HTTP port they will connect to
    print("Starting MCP Server on SSE...")
    mcp.run(transport="sse", host="0.0.0.0", port=8000)