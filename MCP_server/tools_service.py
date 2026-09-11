import os
import sys
import json
import uuid
import time
import re
import httpx
# pyrefly: ignore [missing-import]
import markdown2
# pyrefly: ignore [missing-import]
import edge_tts
# pyrefly: ignore [missing-import]
from xhtml2pdf import pisa


# ==========================================
# BUSINESS LOGIC: PDF Generation
# ==========================================

def normalize_markdown(md_content: str) -> str:
    """Basic normalization in case the LLM outputs weird formatting."""
    return md_content.strip()


def generate_pdf_report_impl(
    md_content: str, 
    title: str, 
    file_path: str, 
    public_url: str
) -> str:
    """Converts Markdown text into a beautifully styled PDF document."""
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

    with open(file_path, "wb") as f:
        pisa_status = pisa.CreatePDF(html_template, dest=f)
    
    if getattr(pisa_status, "err", None):
        raise Exception(f"Error during PDF generation: {getattr(pisa_status, 'err', 'Unknown error')}")

    return f"Success! You can download the PDF here: {public_url}"


# ==========================================
# BUSINESS LOGIC: Text-To-Speech (TTS)
# ==========================================

def clean_text_for_speech(text: str) -> str:
    """Removes common markdown formatting so the TTS engine reads naturally."""
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    text = re.sub(r'`', '', text)
    text = re.sub(r'[*_]{1,3}', '', text)
    text = re.sub(r'#+\s', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    return text.strip()


async def generate_tts_audio_impl(
    text: str, 
    voice: str = "en-US-ChristopherNeural", 
    file_path: str = "", 
    public_url: str = ""
) -> str:
    """Converts clean text into high-quality neural speech audio."""
    clean_text = clean_text_for_speech(text)
    
    if not clean_text:
        return "Error: No readable text provided after cleaning."

    chosen_voice = voice or "en-US-ChristopherNeural"
    communicate = edge_tts.Communicate(clean_text, chosen_voice)
    await communicate.save(file_path)
    
    return f"Success! You can download your audio file here: {public_url}"


# ==========================================
# BUSINESS LOGIC: Website Scraper (Firecrawl)
# ==========================================

async def scrape_website_impl(url: str) -> str:
    """Scrapes any website and converts its contents into clean Markdown using Firecrawl."""
    api_url = "https://api.firecrawl.dev/v2/scrape"
    payload = {
        "url": url,
        "formats": ["markdown"]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("success"):
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
# BUSINESS LOGIC: GitDiagram Visualizer
# ==========================================

def create_diagram_html(username: str, repo: str, clean_diagram: str) -> str:
    """Generates an HTML page embedding Mermaid.js to render the diagram."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Diagram: {username}/{repo}</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({{ startOnLoad: true, theme: 'default' }});
    </script>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background-color: #f9f9f9; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; text-align: center; }}
        .mermaid {{ display: flex; justify-content: center; overflow-x: auto; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{username}/{repo} - Architecture</h1>
        <div class="mermaid">
{clean_diagram}
        </div>
    </div>
</body>
</html>
"""


def compile_mermaid_from_graph(graph: dict, username: str, repo: str) -> str:
    """Compiles a raw graph object from gitdiagram stream into Mermaid flowchart syntax."""
    lines = ["flowchart TD"]
    groups = {g.get("id"): g for g in graph.get("groups", []) if isinstance(g, dict) and g.get("id")}
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    nodes_by_group = {}
    ungrouped = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        gid = node.get("groupId")
        if gid and gid in groups:
            nodes_by_group.setdefault(gid, []).append(node)
        else:
            ungrouped.append(node)

    for gid, gnodes in nodes_by_group.items():
        glabel = groups[gid].get("label") or gid
        clean_glabel = re.sub(r'[<>"&]', '', str(glabel))
        lines.append(f'\nsubgraph group_{gid}["{clean_glabel}"]')
        for n in gnodes:
            nid = re.sub(r'[^a-zA-Z0-9_]', '_', str(n.get("id", "")))
            nlabel = re.sub(r'[<>"&]', '', str(n.get("label") or nid))
            ntype = re.sub(r'[<>"&]', '', str(n.get("type", "")))
            label_text = f"{nlabel}<br/>{ntype}" if ntype else nlabel
            lines.append(f'  node_{nid}["{label_text}"]')
        lines.append("end")

    for n in ungrouped:
        nid = re.sub(r'[^a-zA-Z0-9_]', '_', str(n.get("id", "")))
        nlabel = re.sub(r'[<>"&]', '', str(n.get("label") or nid))
        lines.append(f'node_{nid}["{nlabel}"]')

    lines.append("")
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        from_id = re.sub(r'[^a-zA-Z0-9_]', '_', str(edge.get("from", "")))
        to_id = re.sub(r'[^a-zA-Z0-9_]', '_', str(edge.get("to", "")))
        elabel = edge.get("label")
        if from_id and to_id:
            if elabel:
                clean_elabel = re.sub(r'[<>"&]', '', str(elabel))
                lines.append(f'node_{from_id} -->|"{clean_elabel}"| node_{to_id}')
            else:
                lines.append(f'node_{from_id} --> node_{to_id}')

    return "\n".join(lines)


def fallback_diagram_from_explanation(username: str, repo: str, explanation: str) -> str:
    """Creates a basic architectural flowchart when only textual explanation is available."""
    lines = ["flowchart TD", f'  root["{username}/{repo}"]']
    sections = re.findall(r"^##\s+(.+)$", explanation, re.MULTILINE)
    if not sections:
        sections = re.findall(r"^###?\s+(.+)$", explanation, re.MULTILINE)

    for i, sec in enumerate(sections[:8]):
        clean_sec = re.sub(r'[<>"&]', '', sec).strip()
        sec_id = f"comp_{i}"
        lines.append(f'  {sec_id}["{clean_sec}"]')
        lines.append(f'  root --> {sec_id}')
    return "\n".join(lines)


async def generate_gitdiagram_impl(
    username: str, 
    repo: str, 
    output_dir: str, 
    get_file_info_fn
) -> str:
    """Business logic for generating or retrieving cached GitDiagram architecture views."""
    GITDIAGRAM_STREAM_URL = "https://gitdiagram.com/api/generate/stream"

    # Sanitize and normalize username and repo
    username = (username or "").strip().lstrip("@").strip("/")
    repo = (repo or "").strip().strip("/")

    # Handle cases where full URL was passed in username or repo
    if "github.com/" in username:
        parts = username.split("github.com/")[-1].strip("/").split("/")
        if len(parts) >= 2:
            username, repo = parts[0], parts[1]
        elif len(parts) == 1:
            username = parts[0]

    if "github.com/" in repo:
        parts = repo.split("github.com/")[-1].strip("/").split("/")
        if len(parts) >= 2:
            username, repo = parts[0], parts[1]
        elif len(parts) == 1:
            repo = parts[0]

    # Handle "owner/repo" in repo field
    if "/" in repo:
        parts = repo.split("/")
        if len(parts) == 2:
            username, repo = parts[0], parts[1]

    # Remove trailing .git
    if repo.endswith(".git"):
        repo = repo[:-4]

    cache_file = os.path.join(output_dir, f"cache_{username}_{repo}.json")

    # 1. FIRST CHECK CACHE: If already present, return cached result without hitting API
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as cf:
                cdata = json.load(cf)

            cached_explanation = cdata.get("final_explanation", "")
            cached_url = cdata.get("public_url", "")
            local_path = cdata.get("local_path", "")
            clean_diag = cdata.get("clean_diagram", "")

            # Ensure the HTML file actually exists on disk; regenerate if missing
            if (not os.path.exists(local_path) or os.path.getsize(local_path) == 0) and clean_diag:
                html_content = create_diagram_html(username, repo, clean_diag)
                output_filename = f"diagram_{username}_{repo}_{uuid.uuid4().hex[:6]}.html"
                safe_filename, local_path, cached_url = get_file_info_fn(output_filename)
                with open(local_path, "w", encoding="utf-8") as f:
                    f.write(html_content)
                cdata["local_path"] = local_path
                cdata["public_url"] = cached_url
                with open(cache_file, "w", encoding="utf-8") as cf:
                    json.dump(cdata, cf, indent=2)

            if cached_explanation and cached_url:
                return (
                    f"### Architecture Explanation\n"
                    f"{cached_explanation}\n\n"
                    f"### Visual Diagram\n"
                    f"The Mermaid diagram has been successfully generated and rendered.\n"
                    f"**View the Diagram here:** {cached_url}"
                )
        except Exception:
            pass

    # No custom API keys: strictly use username and repo
    payload = {
        "username": username,
        "repo": repo,
    }

    explanation_chunks = []
    diagram = None
    latest_graph = None
    final_explanation = ""

    # Using httpx for async streaming so we don't block the FastMCP event loop
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            async with client.stream("POST", GITDIAGRAM_STREAM_URL, json=payload) as response:
                if response.status_code == 429:
                    return (
                        f"GitDiagram API returned HTTP 429 (Rate Limit): Too many free generations from this network. "
                        f"Please try again in about 15-20 minutes."
                    )

                if response.status_code >= 400:
                    error_bytes = await response.aread()
                    error_text = error_bytes.decode("utf-8", errors="replace")
                    try:
                        err_json = json.loads(error_text)
                        detail = err_json.get("error") or err_json.get("message") or err_json.get("detail") or error_text
                    except Exception:
                        detail = error_text
                    return f"GitDiagram API returned HTTP {response.status_code} for {username}/{repo}: {detail}"

                async for line in response.aiter_lines():
                    if not line:
                        continue

                    # The API sends a ': connected <uuid>' preamble (SSE comment line). Skip it.
                    if line.startswith(":"):
                        continue

                    if not line.startswith("data:"):
                        continue

                    try:
                        event = json.loads(line[5:].strip())
                    except json.JSONDecodeError:
                        continue

                    # Capture diagram or graph whenever present in any event
                    if event.get("diagram"):
                        diagram = event.get("diagram")
                    if event.get("graph"):
                        latest_graph = event.get("graph")

                    status = event.get("status")

                    # Informational / progress events — skip and continue
                    if status in ("started", "graph_sent", "diagram_compiling", "explanation_sent"):
                        continue

                    # Hard error from the API (e.g. repo too large, not found)
                    elif status == "error":
                        error_msg = event.get("error", "Unknown error from gitdiagram API")
                        error_code = event.get("error_code", "")
                        code_hint = f" [error_code: {error_code}]" if error_code else ""
                        return f"GitDiagram API error for {username}/{repo}: {error_msg}{code_hint}"

                    elif status == "explanation_chunk":
                        explanation_chunks.append(event.get("chunk", ""))

                    elif status == "complete":
                        explanation = event.get("explanation", "")
                        if event.get("diagram"):
                            diagram = event.get("diagram")
                        final_explanation = explanation if explanation else "".join(explanation_chunks)
                        break
                else:
                    # Stream ended without a 'complete' event — use whatever chunks arrived
                    final_explanation = "".join(explanation_chunks)

        except Exception as e:
            return f"Failed to generate GitDiagram. Error: {str(e)}"

    # Clean explanation formatting
    final_explanation = final_explanation.strip()
    final_explanation = re.sub(r"^<explanation>\s*", "", final_explanation)
    final_explanation = re.sub(r"\s*</explanation>$", "", final_explanation)

    # 1. If diagram is missing, check if explanation contains a mermaid code block
    if not diagram and "```mermaid" in final_explanation:
        m = re.search(r"```mermaid\s*(.*?)\s*```", final_explanation, re.DOTALL)
        if m:
            diagram = m.group(1)

    # 2. If still no diagram, compile from graph object received during SSE
    if not diagram and latest_graph:
        diagram = compile_mermaid_from_graph(latest_graph, username, repo)

    # 3. Fallback: synthesize architecture diagram from explanation sections
    if not diagram:
        diagram = fallback_diagram_from_explanation(username, repo, final_explanation)

    # Clean the Mermaid code
    clean_diagram = diagram.strip()
    if clean_diagram.startswith("```mermaid"):
        clean_diagram = clean_diagram.replace("```mermaid", "", 1)
    if clean_diagram.endswith("```"):
        clean_diagram = clean_diagram[:-3]
    clean_diagram = clean_diagram.strip()

    # Always generate and save HTML file
    html_content = create_diagram_html(username, repo, clean_diagram)
    output_filename = f"diagram_{username}_{repo}_{uuid.uuid4().hex[:6]}.html"
    safe_filename, local_path, public_url = get_file_info_fn(output_filename)

    with open(local_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    # Save to disk cache for future immediate reuse
    try:
        cache_data = {
            "username": username,
            "repo": repo,
            "final_explanation": final_explanation,
            "clean_diagram": clean_diagram,
            "local_path": local_path,
            "public_url": public_url,
            "timestamp": time.time()
        }
        with open(cache_file, "w", encoding="utf-8") as cf:
            json.dump(cache_data, cf, indent=2)
    except Exception:
        pass

    return (
        f"### Architecture Explanation\n"
        f"{final_explanation}\n\n"
        f"### Visual Diagram\n"
        f"The Mermaid diagram has been successfully generated and rendered.\n"
        f"**View the Diagram here:** {public_url}"
    )
