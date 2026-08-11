# Agent + MCP / Tool Integration Plan

> **Scope:** Backend only — `app/` folder.  
> **Goal:** Extend the existing agent factory so agents created via `POST /agents/` can use real external tools and MCP servers.  
> No files are modified by this document — this is purely the implementation plan.

---

## 1. Current Architecture (as-is)

```
POST /agents/                          POST /agents/{name}/run
      │                                        │
      ▼                                        ▼
AgentCreateRequest                     AgentRunRequest
  { name, prompt, model }                { input_text }
      │                                        │
      ▼                                        ▼
agent_service.generate_agent()         agent_runner.run_agent()
  → renders Jinja2 template               → subprocess(agent.py)
  → writes generated_agents/               → reads JSON stdout
    {name}/agent.py
      │
      ▼
agent_template.py.jinja
  tools=[]   ← THE GAP
```

**Root problem:** `agent_template.py.jinja` hardcodes `tools=[]`.  
`AgentCreateRequest` has no `tools` field — there is no way to pass tools at creation time.  
`agent_service.generate_agent()` does not accept or forward tool configuration.

---

## 2. What Will Change (File-by-File)

### 2.1 `app/schemas/agent.py` — Add tool fields to request

**Current:**
```python
class AgentCreateRequest(BaseModel):
    name: str
    prompt: str
    model: str = "gemini-3.5-flash"
```

**Change to:**
```python
from typing import Optional
from pydantic import BaseModel

class MCPServerConfig(BaseModel):
    url: str                        # e.g. "http://localhost:3001"
    transport: str = "streamable_http"

class AgentCreateRequest(BaseModel):
    name: str
    prompt: str
    model: str = "gemini/gemini-1.5-flash"
    tools: list[str] = []           # names of built-in @tool modules in app/tools/
    mcp_servers: dict[str, MCPServerConfig] = {}  # {"mermaid": {url, transport}}
    recursion_limit: int = 10       # caps ReAct loops → controls Gemini API calls
    output_dir: Optional[str] = None  # if agent produces files (e.g. PNG), where to save
```

**Why:** These fields propagate into the Jinja template via `agent_service`, allowing the template to conditionally import tools and set up MCP clients.

---

### 2.2 `app/services/agent_service.py` — Forward tools to template

**Current:**
```python
def generate_agent(name: str, prompt: str, model: str) -> str:
    rendered_code = template.render(
        agent_name=safe_name,
        prompt=prompt,
        model=model,
    )
```

**Change to:**
```python
def generate_agent(
    name: str,
    prompt: str,
    model: str,
    tools: list[str] = [],
    mcp_servers: dict = {},
    recursion_limit: int = 10,
    output_dir: str | None = None,
) -> str:
    safe_name = sanitize_agent_name(name)

    # Validate that every tool name in tools[] has a matching file in app/tools/
    tools_dir = Path(__file__).parent.parent / "tools"
    for tool_name in tools:
        tool_file = tools_dir / f"{tool_name}.py"
        if not tool_file.exists():
            raise ValueError(f"Tool '{tool_name}' not found in app/tools/")

    # Choose template: if mcp_servers present -> async template, else sync template
    template_name = "agent_template_mcp.py.jinja" if mcp_servers else "agent_template.py.jinja"
    template = env.get_template(template_name)

    rendered_code = template.render(
        agent_name=safe_name,
        prompt=prompt,
        model=model,
        tools=tools,
        mcp_servers=mcp_servers,
        recursion_limit=recursion_limit,
        output_dir=output_dir or f"generated_agents/{safe_name}/outputs",
    )

    output_dir_path = Path("generated_agents") / safe_name
    output_dir_path.mkdir(parents=True, exist_ok=True)
    (output_dir_path / "outputs").mkdir(exist_ok=True)   # for file outputs (PNG, etc.)

    output_file = output_dir_path / "agent.py"
    output_file.write_text(rendered_code, encoding="utf-8")
    return str(output_file)
```

---

### 2.3 `app/api/routes/agent.py` — Pass new fields + add output file endpoint

**Change create_agent to:**
```python
file_path = generate_agent(
    name=request.name,
    prompt=request.prompt,
    model=request.model,
    tools=request.tools,
    mcp_servers={k: v.model_dump() for k, v in request.mcp_servers.items()},
    recursion_limit=request.recursion_limit,
    output_dir=request.output_dir,
)
```

**Add a new GET endpoint for serving generated images:**
```python
from fastapi.responses import FileResponse

@router.get("/{name}/outputs/{filename}")
def get_output_file(name: str, filename: str):
    file_path = Path("generated_agents") / name / "outputs" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Output file not found")
    return FileResponse(str(file_path))
```

---

### 2.4 `app/templates/agent_template.py.jinja` — Sync template with tools support

Replace with this version:

```jinja
# Auto-generated agent: {{ agent_name }}
import os, sys, json
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from langchain_litellm import ChatLiteLLM
from langgraph.prebuilt import create_react_agent

AGENT_NAME = "{{ agent_name }}"
PROMPT = """{{ prompt }}"""
MODEL_STRING = "{{ model }}"
OUTPUT_DIR = Path("{{ output_dir }}")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

model = ChatLiteLLM(model=MODEL_STRING)

{% if tools %}
# Built-in tool imports
{% for tool_name in tools %}
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
from app.tools.{{ tool_name }} import {{ tool_name }}_tool
{% endfor %}
_tools = [{% for tool_name in tools %}{{ tool_name }}_tool, {% endfor %}]
{% else %}
_tools = []
{% endif %}

agent = create_react_agent(
    model=model,
    tools=_tools,
    prompt=PROMPT,
)

def run(input_text: str) -> dict:
    result = agent.invoke(
        {"messages": [{"role": "user", "content": input_text}]},
        config={"recursion_limit": {{ recursion_limit }}},
    )
    final_msg = result["messages"][-1].content
    outputs = [str(p) for p in OUTPUT_DIR.iterdir()] if OUTPUT_DIR.exists() else []
    return {"response": final_msg, "output_files": outputs}

if __name__ == "__main__":
    input_text = sys.stdin.read()
    try:
        data = run(input_text)
        print(json.dumps({"status": "success", "result": json.dumps(data)}))
    except Exception as e:
        print(json.dumps({"status": "error", "result": str(e)}))
```

---

### 2.5 `app/templates/agent_template_mcp.py.jinja` — NEW async MCP template

Created when `mcp_servers` dict is non-empty. Uses `langchain-mcp-adapters`:

```jinja
# Auto-generated MCP agent: {{ agent_name }}
import os, sys, json, asyncio
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from langchain_litellm import ChatLiteLLM
from langgraph.prebuilt import create_react_agent
from langchain_mcp_adapters.client import MultiServerMCPClient

AGENT_NAME = "{{ agent_name }}"
PROMPT = """{{ prompt }}"""
MODEL_STRING = "{{ model }}"
OUTPUT_DIR = Path("{{ output_dir }}")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

model = ChatLiteLLM(model=MODEL_STRING)

{% if tools %}
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
{% for tool_name in tools %}
from app.tools.{{ tool_name }} import {{ tool_name }}_tool
{% endfor %}
_extra_tools = [{% for tool_name in tools %}{{ tool_name }}_tool, {% endfor %}]
{% else %}
_extra_tools = []
{% endif %}

MCP_SERVERS = {
{% for server_name, cfg in mcp_servers.items() %}
    "{{ server_name }}": {"url": "{{ cfg.url }}", "transport": "{{ cfg.transport }}"},
{% endfor %}
}

async def run_async(input_text: str) -> dict:
    async with MultiServerMCPClient(MCP_SERVERS) as client:
        mcp_tools = client.get_tools()
        all_tools = mcp_tools + _extra_tools
        agent = create_react_agent(
            model=model,
            tools=all_tools,
            prompt=PROMPT,
        )
        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": input_text}]},
            config={"recursion_limit": {{ recursion_limit }}},
        )
        final_msg = result["messages"][-1].content
        outputs = [str(p) for p in OUTPUT_DIR.iterdir()] if OUTPUT_DIR.exists() else []
        return {"response": final_msg, "output_files": outputs}

def run(input_text: str) -> dict:
    return asyncio.run(run_async(input_text))

if __name__ == "__main__":
    input_text = sys.stdin.read()
    try:
        data = run(input_text)
        print(json.dumps({"status": "success", "result": json.dumps(data)}))
    except Exception as e:
        print(json.dumps({"status": "error", "result": str(e)}))
```

---

## 3. New Directory: `app/tools/`

```
app/
└── tools/
    ├── __init__.py                (empty)
    ├── mermaid_render.py          Agent 1 tool
    ├── web_scraper.py             Agent 2 tool
    ├── plantuml_render.py         Agent 3 tool
    ├── search_and_fetch.py        Agent 4 tool
    └── code_file_reader.py        Agent 5 tool
```

Each file must export a function named `{module_name}_tool` decorated with `@tool`.

---

## 4. Agent Recipes

---

### Agent 1: Diagram Architect (Mermaid → PNG export)

**What it does:**
1. Receives natural language description of any system/process/data flow
2. Chooses the best diagram type (flowchart, sequenceDiagram, classDiagram, erDiagram, stateDiagram-v2, gantt)
3. Generates complete Mermaid syntax with subgraphs, notes, and labels
4. Renders it to a **PNG file** using the Mermaid CLI via `npx`
5. Returns the local file path + a download URL

**Tool file: `app/tools/mermaid_render.py`**

```python
import subprocess, tempfile, uuid
from pathlib import Path
from langchain_core.tools import tool

@tool
def mermaid_render_tool(mermaid_code: str, output_format: str = "png") -> str:
    """
    Takes valid Mermaid diagram code and renders it to a PNG or SVG image file.
    Returns the absolute file path of the saved image.

    Args:
        mermaid_code: Complete Mermaid diagram code (starting with graph/sequenceDiagram/etc.)
        output_format: 'png' or 'svg' (default: 'png')
    """
    import json as _json
    output_dir = Path("generated_agents/diagram-architect/outputs")
    output_dir.mkdir(parents=True, exist_ok=True)

    filename = f"diagram_{uuid.uuid4().hex[:8]}.{output_format}"
    output_path = output_dir / filename

    with tempfile.NamedTemporaryFile(suffix=".mmd", mode="w", delete=False, encoding="utf-8") as f:
        f.write(mermaid_code)
        tmp_path = f.name

    try:
        result = subprocess.run(
            ["npx", "--yes", "@mermaid-js/mermaid-cli", "-i", tmp_path, "-o", str(output_path)],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return _json.dumps({"error": result.stderr, "mermaid_code": mermaid_code})
        return _json.dumps({
            "file_path": str(output_path),
            "download_url": f"/agents/diagram-architect/outputs/{filename}",
            "format": output_format,
        })
    finally:
        Path(tmp_path).unlink(missing_ok=True)
```

**Note:** Requires Node.js installed. The first run downloads `@mermaid-js/mermaid-cli` automatically via `npx --yes`.

**MCP Variant:** Start `npx @mermaid-js/mermaid-mcp@latest --port 3001` and pass in `mcp_servers` instead of `tools`.

**Create Request:**
```json
POST /agents/
{
  "name": "diagram-architect",
  "model": "gemini/gemini-1.5-flash",
  "tools": ["mermaid_render"],
  "recursion_limit": 8,
  "prompt": "You are a senior software architect and diagram expert. When given a description of a system, process, data flow, class structure, or timeline:\n1. FIRST choose the most appropriate diagram type: flowchart (processes/flows), sequenceDiagram (API/service interactions), classDiagram (OOP/data models), erDiagram (databases), stateDiagram-v2 (state machines), gantt (timelines).\n2. Generate complete, syntactically correct Mermaid code. Use descriptive node labels. Add subgraphs for grouped components. Add notes for important context.\n3. Call mermaid_render_tool with the code and output_format='png'.\n4. Report back: the diagram type chosen, a brief explanation, and the file download URL.\nAlways call the tool — never skip rendering."
}
```

**Run Request:**
```json
POST /agents/diagram-architect/run
{
  "input_text": "Draw a complete sequence diagram for JWT-based authentication: browser sends credentials, auth service validates against user DB, checks rate limiting via Redis, generates a JWT, logs the event to an audit service, and returns the token. Also show the refresh token flow."
}
```

**Get the rendered PNG:**
```
GET /agents/diagram-architect/outputs/diagram_a3f2b1.png
```

---

### Agent 2: Deep Web Scraper & Analyst

**What it does:**
1. Given a URL or list of URLs, fetches each page fully
2. Extracts: title, meta description, all headings, main body text, all links
3. Identifies GitHub repos → extracts README, file list, languages
4. Analyses across multiple pages if given more than one URL
5. Produces a structured report: summary, key findings with source citations, entities, notable links
6. Flags contradictions across sources

**Tool file: `app/tools/web_scraper.py`**

```python
import httpx, re, json
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from langchain_core.tools import tool

class _HTMLExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts, self.headings, self.links, self.meta = [], [], [], {}
        self._tag = None
        self._skip = {"script","style","noscript","nav","footer","header","aside"}

    def handle_starttag(self, tag, attrs):
        self._tag = tag
        d = dict(attrs)
        if tag == "a" and "href" in d:
            self.links.append(d["href"])
        if tag == "meta":
            n = d.get("name", d.get("property",""))
            c = d.get("content","")
            if n and c: self.meta[n] = c

    def handle_data(self, data):
        if self._tag in self._skip: return
        s = data.strip()
        if s:
            if self._tag in ("h1","h2","h3","h4"):
                self.headings.append(f"[{self._tag.upper()}] {s}")
            else:
                self.text_parts.append(s)

@tool
def web_scraper_tool(url: str, extract_links: bool = True, max_chars: int = 6000) -> str:
    """
    Fetches a URL and returns structured extracted content including title, description,
    all headings (h1-h4), main body text, and optionally all hyperlinks.
    Use this to deeply read any webpage for research or analysis.

    Args:
        url: Full URL to fetch (must start with http:// or https://)
        extract_links: Whether to include all hyperlinks found (default True)
        max_chars: Max characters of body text (default 6000)

    Returns:
        JSON string with: url, status_code, title, description, headings, body_text, links
    """
    headers = {"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"}
    try:
        with httpx.Client(follow_redirects=True, timeout=15) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()

        parser = _HTMLExtractor()
        parser.feed(resp.text)

        body = " ".join(parser.text_parts)
        body = re.sub(r"\s+", " ", body)[:max_chars]

        base = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        abs_links = []
        if extract_links:
            seen = set()
            for lnk in parser.links:
                abs_lnk = urljoin(base, lnk) if not lnk.startswith("http") else lnk
                if abs_lnk not in seen and abs_lnk.startswith("http"):
                    seen.add(abs_lnk); abs_links.append(abs_lnk)

        return json.dumps({
            "url": url, "status_code": resp.status_code,
            "title": parser.meta.get("title",""),
            "description": parser.meta.get("description",""),
            "headings": parser.headings[:25],
            "body_text": body,
            "links": abs_links[:60],
        })
    except Exception as e:
        return json.dumps({"url": url, "error": str(e)})
```

**Create Request:**
```json
POST /agents/
{
  "name": "web-scraper-analyst",
  "model": "gemini/gemini-1.5-flash",
  "tools": ["web_scraper"],
  "recursion_limit": 12,
  "prompt": "You are an expert web research analyst with read access to any public webpage.\n\nFor every research task:\n1. Call web_scraper_tool on EACH URL provided. Never skip fetching — real data first, then analysis.\n2. If multiple URLs: fetch all, then compare.\n3. For GitHub repos: extract what the project does, install steps, key dependencies from body text.\n4. Structure your final answer exactly as:\n\n## Executive Summary\n## Key Findings\n- [Finding]: [Evidence] — Source: [URL]\n## Notable Links Discovered\n## Entities Mentioned (people / companies / technologies)\n## Contradictions Found (if any)\n\nOnly report facts found in fetched content. Include direct quotes. Never hallucinate."
}
```

**Run Request:**
```json
POST /agents/web-scraper-analyst/run
{
  "input_text": "Fetch and analyze both of these pages and compare their approaches: https://python.langchain.com/docs/introduction and https://langchain-ai.github.io/langgraph/ — what are the key architectural differences, and which important sub-pages should I visit to learn more?"
}
```

---

### Agent 3: PlantUML Architect (PNG via free public API)

**What it does:**
1. Receives architecture/class/workflow description
2. Produces PlantUML syntax for the appropriate diagram type (supports C4, class, component, sequence, state, activity)
3. Encodes it with the PlantUML deflate+base64 encoding (pure Python, no Java)
4. Calls the free PlantUML public server
5. Downloads the PNG and saves it locally
6. Returns local file path + public URL
7. Can produce multiple diagrams for complex systems

**Tool file: `app/tools/plantuml_render.py`**

```python
import zlib, base64, uuid, httpx, json
from pathlib import Path
from langchain_core.tools import tool

_STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
_PUML = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
_TABLE = str.maketrans(_STD, _PUML)

def _encode(text: str) -> str:
    compressed = zlib.compress(text.encode("utf-8"))[2:-4]
    return base64.b64encode(compressed).decode("ascii").translate(_TABLE)

@tool
def plantuml_render_tool(plantuml_code: str, agent_name: str = "plantuml-architect", output_format: str = "png") -> str:
    """
    Renders a PlantUML diagram to PNG or SVG using the free PlantUML public server.
    No Java installation needed — uses the official plantuml.com API.
    Downloads the image and saves it locally.

    Args:
        plantuml_code: Complete PlantUML code including @startuml and @enduml tags
        agent_name: The name of the agent (used to determine output folder)
        output_format: 'png' or 'svg' (default: 'png')

    Returns:
        JSON with: local_path, public_url, download_url, size_bytes
    """
    encoded = _encode(plantuml_code)
    public_url = f"https://www.plantuml.com/plantuml/{output_format}/{encoded}"

    output_dir = Path(f"generated_agents/{agent_name}/outputs")
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"diagram_{uuid.uuid4().hex[:8]}.{output_format}"
    local_path = output_dir / filename

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.get(public_url)
            resp.raise_for_status()
            local_path.write_bytes(resp.content)

        return json.dumps({
            "local_path": str(local_path),
            "public_url": public_url,
            "download_url": f"/agents/{agent_name}/outputs/{filename}",
            "format": output_format,
            "size_bytes": len(resp.content),
        })
    except Exception as e:
        return json.dumps({"error": str(e), "public_url": public_url})
```

**Create Request:**
```json
POST /agents/
{
  "name": "plantuml-architect",
  "model": "gemini/gemini-1.5-flash",
  "tools": ["plantuml_render"],
  "recursion_limit": 10,
  "prompt": "You are a principal software architect specializing in visual documentation using PlantUML.\n\nYou support ALL PlantUML types:\n- Class diagrams: inheritance, interfaces, associations with multiplicities, abstract classes\n- Component diagrams: packages, interfaces, dependency arrows\n- Sequence diagrams: alt/opt/loop blocks, activation bars, notes\n- State machine: guards, internal transitions, composite states\n- Activity: forks, joins, swim lanes, decision diamonds\n- C4 Context/Container/Component: using !include <C4Context>, Person(), System(), Container() macros\n\nFor each request:\n1. Identify the best diagram type(s). Complex systems may need 2-3 diagrams.\n2. Generate complete PlantUML with skinparam styling (use colors, shadowing, non-monochrome).\n3. Call plantuml_render_tool with agent_name='plantuml-architect' and format='png' for EACH diagram.\n4. Report: type chosen, design decisions, the public_url (for browser preview), and download_url (to fetch via API).\n\nAlways add design notes as PlantUML 'note' elements explaining key decisions."
}
```

**Run Request:**
```json
POST /agents/plantuml-architect/run
{
  "input_text": "Design the architecture for a food delivery platform. I need: (1) a C4 context diagram with actors (Customer, Restaurant, Delivery Driver) and main systems, (2) a component diagram showing internal microservices (Order, Payment, Delivery Tracking, Notification, User Management) with their connections, and (3) a sequence diagram showing the full order placement flow from customer click to restaurant confirmation including payment validation."
}
```

---

### Agent 4: Research Synthesizer (Search + Fetch + Cross-Reference)

**What it does:**
1. Runs 2-3 DuckDuckGo search query variations on the topic
2. Identifies the 3 most authoritative result URLs
3. Fetches and deeply reads each one
4. Cross-references facts across all sources, flags contradictions
5. Produces a structured research report with citations, confidence ratings, and follow-up questions

**Tool file: `app/tools/search_and_fetch.py`**

```python
import json
from langchain_core.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper

_ddg = DuckDuckGoSearchRun(
    api_wrapper=DuckDuckGoSearchAPIWrapper(max_results=8)
)

@tool
def search_and_fetch_tool(query: str) -> str:
    """
    Searches the web using DuckDuckGo and returns titles, snippets, and URLs
    for the top results. Use this FIRST to discover relevant pages, then use
    web_scraper_tool to fetch the most promising URLs for full content.

    Args:
        query: Search query string — be specific for better results

    Returns:
        JSON string with: query, results_text (titles + snippets + URLs)
    """
    try:
        raw = _ddg.run(query)
        return json.dumps({"query": query, "results_text": raw})
    except Exception as e:
        return json.dumps({"query": query, "error": str(e)})
```

**Create Request:**
```json
POST /agents/
{
  "name": "research-synthesizer",
  "model": "gemini/gemini-1.5-flash",
  "tools": ["search_and_fetch", "web_scraper"],
  "recursion_limit": 16,
  "prompt": "You are a rigorous research analyst. For any research topic:\n\n**Phase 1 — Discovery (always do this first):**\n1. Call search_and_fetch_tool with 2-3 different query variations.\n2. From results, identify the 3 most authoritative/relevant URLs.\n\n**Phase 2 — Deep Reading:**\n3. Call web_scraper_tool on each of the 3 URLs.\n4. Extract: key facts, direct quotes, dates, people, companies, technologies mentioned.\n\n**Phase 3 — Synthesis:**\n5. Cross-reference facts. Note contradictions or uncertainties.\n6. Produce this exact report format:\n\n---\n## Executive Summary\n(3 sentences max)\n\n## Detailed Findings\n- **[Finding]**: [supporting quote] — Source: [URL]\n\n## Contradictions / Conflicting Information\n\n## Source Quality Assessment\n(which sources were most authoritative and why)\n\n## Recommended Follow-up Questions\n---\n\nOnly report facts from fetched content. Always include source URLs. Never guess."
}
```

**Run Request:**
```json
POST /agents/research-synthesizer/run
{
  "input_text": "Research the current adoption of Model Context Protocol (MCP): which major AI companies support it, what open-source MCP servers exist, and how does it compare to LangChain tool calling for building AI agents. I need citations and source links."
}
```

---

### Agent 5: Code Analyst + Auto Diagram Generator

**What it does:**
1. Reads files from a sandboxed `./sandbox/` directory (safe, no escape)
2. Actions: `list` (recursive tree), `read` (file content), `search` (grep-like), `stats` (file count by extension)
3. Identifies tech stack, entry points, dependencies, and module relationships
4. Maps imports between modules and identifies external service calls
5. Generates a PlantUML component diagram of the whole architecture
6. Produces a comprehensive written analysis with code quality observations

**Tool file: `app/tools/code_file_reader.py`**

```python
import json
from pathlib import Path
from langchain_core.tools import tool

SANDBOX = Path("sandbox")
MAX_CHARS = 8000

def _guard(rel: str) -> Path:
    p = (SANDBOX / rel).resolve()
    if not str(p).startswith(str(SANDBOX.resolve())):
        raise PermissionError("Access outside sandbox denied")
    return p

@tool
def code_file_reader_tool(action: str, path: str = ".", pattern: str = "") -> str:
    """
    Read-only access to the ./sandbox directory for safe code analysis.

    Actions:
    - 'list'   : Recursively list all files and dirs under path
    - 'read'   : Read full content of a file (capped at 8000 chars)
    - 'search' : Search for a text pattern in all files under path
    - 'stats'  : Count files and total size, broken down by file extension

    Args:
        action : One of 'list', 'read', 'search', 'stats'
        path   : Relative path inside sandbox (default: '.' for root)
        pattern: Text to find — required for 'search' action

    Returns:
        JSON string with results
    """
    SANDBOX.mkdir(exist_ok=True)
    try:
        target = _guard(path)

        if action == "list":
            if target.is_file():
                return json.dumps({"path": path, "type": "file", "size": target.stat().st_size})
            items = []
            for p in sorted(target.rglob("*")):
                rel = str(p.relative_to(SANDBOX))
                items.append({"path": rel, "type": "dir" if p.is_dir() else "file",
                               "size": p.stat().st_size if p.is_file() else None})
            return json.dumps({"path": path, "items": items[:120]})

        elif action == "read":
            if not target.is_file():
                return json.dumps({"error": f"Not a file: {path}"})
            content = target.read_text(encoding="utf-8", errors="replace")
            truncated = len(content) > MAX_CHARS
            return json.dumps({
                "path": path, "lines": content.count("\n"),
                "content": content[:MAX_CHARS] + ("\n...[truncated]" if truncated else ""),
                "truncated": truncated,
            })

        elif action == "search":
            if not pattern:
                return json.dumps({"error": "pattern required for search action"})
            matches = []
            for p in sorted(target.rglob("*")):
                if p.is_file():
                    try:
                        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
                        for i, line in enumerate(lines, 1):
                            if pattern.lower() in line.lower():
                                rel = str(p.relative_to(SANDBOX))
                                matches.append({"file": rel, "line": i, "content": line.strip()})
                    except Exception:
                        pass
            return json.dumps({"pattern": pattern, "total_matches": len(matches), "matches": matches[:60]})

        elif action == "stats":
            ext_count, total_size, fc = {}, 0, 0
            for p in target.rglob("*"):
                if p.is_file():
                    fc += 1; total_size += p.stat().st_size
                    ext = p.suffix or "(no ext)"
                    ext_count[ext] = ext_count.get(ext, 0) + 1
            return json.dumps({"path": path, "file_count": fc,
                                "total_size_bytes": total_size, "by_extension": ext_count})

        return json.dumps({"error": f"Unknown action '{action}'. Use: list/read/search/stats"})
    except PermissionError as e:
        return json.dumps({"error": str(e)})
    except Exception as e:
        return json.dumps({"error": str(e)})
```

**Create Request:**
```json
POST /agents/
{
  "name": "code-analyst",
  "model": "gemini/gemini-1.5-flash",
  "tools": ["code_file_reader", "plantuml_render"],
  "recursion_limit": 20,
  "prompt": "You are a senior software engineer conducting a thorough code review and architecture analysis. You have read-only access to a sandboxed project directory.\n\n**Phase 1 — Discovery:**\n1. Call code_file_reader_tool with action='stats' — understand scale.\n2. action='list' — see the full file tree.\n3. Read entry points: main.py, app.py, index.ts, package.json, pyproject.toml, requirements.txt, any README.\n\n**Phase 2 — Deep Analysis:**\n4. Read key source files (prioritize files imported by many others).\n5. action='search' for: 'import', 'require', 'from', 'class', 'def', 'async', 'await', 'db', 'api'.\n6. Identify: design patterns, error handling strategy, authentication approach, external APIs used.\n\n**Phase 3 — Architecture Diagram:**\n7. Generate PlantUML component diagram showing all modules, their dependencies, and external services.\n8. Call plantuml_render_tool with agent_name='code-analyst' and format='png'.\n\n**Phase 4 — Written Report:**\n## Project Overview\n## Tech Stack Detected\n## Module Structure\n## Key Design Patterns\n## Potential Issues / Code Smells (with file + line references)\n## Improvement Recommendations\n## Architecture Diagram: [download_url]"
}
```

**Run Request:**
```json
POST /agents/code-analyst/run
{
  "input_text": "Analyze everything in the sandbox directory. Produce the full architecture report and generate a PNG component diagram."
}
```

---

## 5. New pip Packages

```bash
uv add langchain-mcp-adapters duckduckgo-search langgraph
```

Add to `pyproject.toml`:
```toml
"langchain-mcp-adapters>=0.1.0",
"duckduckgo-search>=6.0.0",
"langgraph>=0.2.0",
```

---

## 6. Updated `.env.example`

```env
# LLM — prefix model with "gemini/" when calling LiteLLM
GEMINI_API_KEY=your_gemini_api_key_here

# DB (optional, not active yet)
DATABASE_URL=postgresql://user:password@localhost:5432/agentdb

# Agent subprocess timeout (increase for complex agents)
AGENT_TIMEOUT=60

# Sandbox path for code-analyst agent
FILESYSTEM_SANDBOX_PATH=./sandbox

# MCP server URL (only needed for MCP variant agents)
MCP_MERMAID_URL=http://localhost:3001
```

---

## 7. Implementation Order

```
Step 1  Modify app/schemas/agent.py
        Add: MCPServerConfig, tools, mcp_servers, recursion_limit, output_dir to AgentCreateRequest
        Test: POST /agents/ with empty tools=[] — must still work (backward compatible)

Step 2  Modify app/services/agent_service.py
        Accept new params, validate tool files exist, choose correct template, pass vars to render
        Test: POST with tools=["nonexistent"] → should raise ValueError 422

Step 3  Modify app/api/routes/agent.py
        Forward new fields; add GET /agents/{name}/outputs/{filename} endpoint

Step 4  Modify app/services/agent_runner.py
        Read AGENT_TIMEOUT from env (currently hardcoded 30s)

Step 5  Modify app/templates/agent_template.py.jinja
        Add Jinja2 blocks for: tool imports, output_dir, recursion_limit
        Test: create agent with tools=[], verify backward compat

Step 6  Create app/tools/__init__.py  (empty)

Step 7  Create app/tools/plantuml_render.py
        Simplest first — no Node.js needed, uses public API
        Test: POST /agents/ with name="plantuml-architect", tools=["plantuml_render"]
              POST /agents/plantuml-architect/run with a class diagram request
              Verify: GET /agents/plantuml-architect/outputs/{file}.png returns image

Step 8  Create app/tools/web_scraper.py
        Test: create web-scraper-analyst, run with a simple URL (httpbin.org/html)
        Verify: headings and body_text extracted correctly

Step 9  uv add duckduckgo-search
        Create app/tools/search_and_fetch.py
        Test: create research-synthesizer, run with a topic
        Monitor Gemini API usage — most expensive agent

Step 10 Create app/tools/mermaid_render.py
        Prerequisites: Node.js must be installed
        Verify first: npx --yes @mermaid-js/mermaid-cli --version
        Test: create diagram-architect, run with a sequence diagram request
              Verify PNG saved in outputs/ and GET endpoint returns it

Step 11 Create app/tools/code_file_reader.py
        Create ./sandbox/ dir, put sample files in it
        Test: create code-analyst agent with both code_file_reader + plantuml_render tools
              Run: analyze sandbox directory
              Verify: written report + PNG diagram both returned

Step 12 Create app/templates/agent_template_mcp.py.jinja
        uv add langchain-mcp-adapters
        Optional: npx @mermaid-js/mermaid-mcp@latest --port 3001
        Test: create diagram-architect-mcp with mcp_servers instead of tools
```

---

## 8. MCP Server Quick-Start (Optional Upgrade)

| Agent | MCP Server | Start Command | Port |
|---|---|---|---|
| diagram-architect MCP variant | mermaid-mcp | `npx @mermaid-js/mermaid-mcp@latest --port 3001` | 3001 |

MCP variant create request:
```json
{
  "name": "diagram-architect-mcp",
  "model": "gemini/gemini-1.5-flash",
  "tools": [],
  "mcp_servers": {
    "mermaid": { "url": "http://localhost:3001", "transport": "streamable_http" }
  },
  "recursion_limit": 8,
  "prompt": "..."
}
```

---

## 9. Gemini API Rate Limit Safeguards

| Safeguard | Value |
|---|---|
| Model | Always `gemini/gemini-1.5-flash` (not Pro) |
| recursion_limit | 8-12 per agent, never higher |
| Tools per agent | Max 2-3 |
| research-synthesizer | Limit to 3 URL fetches per run |
| AGENT_TIMEOUT | 60s (env var) |

The `recursion_limit` in `AgentCreateRequest` maps directly to LangGraph's `config={"recursion_limit": N}` — this is the primary knob to control how many LLM calls an agent makes per run.

---

## 10. Final Directory Structure

```
app/
├── api/routes/agent.py           MODIFY (tools, outputs endpoint)
├── core/config.py                MODIFY (read env vars)
├── schemas/agent.py              MODIFY (MCPServerConfig, tools, mcp_servers)
├── services/
│   ├── agent_service.py          MODIFY (validate tools, choose template)
│   └── agent_runner.py           MODIFY (env-based timeout)
├── templates/
│   ├── agent_template.py.jinja          MODIFY (tool imports, output_dir)
│   └── agent_template_mcp.py.jinja      NEW (async MCP variant)
└── tools/                               NEW directory
    ├── __init__.py
    ├── mermaid_render.py          Agent 1
    ├── web_scraper.py             Agent 2
    ├── plantuml_render.py         Agent 3
    ├── search_and_fetch.py        Agent 4
    └── code_file_reader.py        Agent 5

generated_agents/                  runtime (gitignored)
└── {agent_name}/
    ├── agent.py
    └── outputs/
        ├── diagram_abc123.png
        └── diagram_def456.png

sandbox/                           code-analyst reads here
```
