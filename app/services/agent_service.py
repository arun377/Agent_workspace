from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import re

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


def sanitize_agent_name(name: str) -> str:
    if not re.fullmatch(r"[a-zA-Z0-9_\-]+", name):
        raise ValueError(f"Invalid agent name: {name}")
    return name


def generate_agent(name: str, prompt: str, model: str, tools: list[str] = None, mcp_servers: list[str] = None) -> str:
    if tools is None:
        tools = []
    if mcp_servers is None:
        mcp_servers = []
    
    safe_name = sanitize_agent_name(name)
    
    template = env.get_template("agent_template.py.jinja")
    rendered_code = template.render(
        agent_name=safe_name,
        prompt=prompt,
        model=model,
        tools=tools,
        mcp_servers=mcp_servers,
    )
    
    output_dir = Path("generated_agents") / safe_name
    output_dir.mkdir(parents=True, exist_ok=True)
    # TODO: create output_dir if it doesn't exist — which pathlib method does that?
    
    output_file = output_dir / "agent.py"
    output_file.write_text(rendered_code)

    # TODO: write rendered_code to output_file — what's the simplest way to write text to a file in Python?
    
    return str(output_file)

import ast

def parse_agent_file(file_path: Path) -> dict:
    if not file_path.exists():
        return None
    try:
        content = file_path.read_text(encoding="utf-8")
        parsed = ast.parse(content)
        details = {}
        for node in parsed.body:
            if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
                name = node.targets[0].id
                if name in ["AGENT_NAME", "PROMPT", "MODEL_STRING", "TOOL_NAMES", "MCP_SERVERS"]:
                    try:
                        details[name] = ast.literal_eval(node.value)
                    except Exception:
                        pass
        return details
    except Exception as e:
        return {"error": str(e)}

def get_all_agents() -> list[dict]:
    agents_dir = Path("generated_agents")
    if not agents_dir.exists():
        return []
    agents = []
    for d in agents_dir.iterdir():
        if d.is_dir():
            agent_file = d / "agent.py"
            if agent_file.exists():
                details = parse_agent_file(agent_file)
                if details:
                    agents.append(details)
    return agents

def get_agent_details(name: str) -> dict:
    safe_name = sanitize_agent_name(name)
    agent_file = Path("generated_agents") / safe_name / "agent.py"
    details = parse_agent_file(agent_file)
    if not details:
        raise ValueError(f"Agent {name} not found")
    return details