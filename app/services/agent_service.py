import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import re
import ast

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


def sanitize_agent_name(name: str) -> str:
    if not re.fullmatch(r"[a-zA-Z0-9_\-]+", name):
        raise ValueError(f"Invalid agent name: '{name}'. Only alphanumeric characters, dashes, and underscores are allowed.")
    return name


def generate_agent(name: str, prompt: str, model: str, tools: list[str]) -> str:
    safe_name = sanitize_agent_name(name)
    
    template = env.get_template("agent_template.py.jinja")
    rendered_code = template.render(
        agent_name=safe_name,
        prompt=prompt,
        model=model,
        tools=tools
    )
    
    output_dir = Path("generated_agents") / safe_name
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / "agent.py"
    output_file.write_text(rendered_code, encoding="utf-8")

    config_file = output_dir / "config.json"
    config_file.write_text(json.dumps({"prompt": prompt, "model": model, "tools": tools}, indent=2), encoding="utf-8")

    return str(output_file)


def parse_agent_file(file_path: Path) -> dict:
    if not file_path.exists():
        return {}
    try:
        content = file_path.read_text(encoding="utf-8")
        parsed = ast.parse(content)
        details = {}
        for node in parsed.body:
            if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
                target_name = node.targets[0].id
                if target_name in ["AGENT_NAME", "PROMPT", "MODEL_STRING", "SELECTED_TOOL_IDS"]:
                    try:
                        details[target_name] = ast.literal_eval(node.value)
                    except Exception:
                        pass
        return details
    except Exception as e:
        return {"error": str(e)}


def get_agent_details(name: str) -> dict:
    safe_name = sanitize_agent_name(name)
    agent_dir = Path("generated_agents") / safe_name
    if not agent_dir.exists() or not agent_dir.is_dir():
        raise ValueError(f"Agent '{name}' not found")

    agent_file = agent_dir / "agent.py"
    config_file = agent_dir / "config.json"

    prompt = ""
    model = "gemini/gemini-2.5-pro"
    tools: list[str] = []

    if config_file.exists():
        try:
            cfg = json.loads(config_file.read_text(encoding="utf-8"))
            prompt = cfg.get("prompt", "")
            model = cfg.get("model", model)
            tools = cfg.get("tools", [])
        except Exception:
            pass

    if not prompt and agent_file.exists():
        parsed = parse_agent_file(agent_file)
        prompt = parsed.get("PROMPT", prompt)
        model = parsed.get("MODEL_STRING", model)
        tools = parsed.get("SELECTED_TOOL_IDS", tools)

    return {
        "name": safe_name,
        "prompt": prompt,
        "model": model,
        "tools": tools,
        "file_path": str(agent_file) if agent_file.exists() else None,
    }


def get_all_agents() -> list[dict]:
    agents_dir = Path("generated_agents")
    if not agents_dir.exists():
        return []
    agents = []
    for d in sorted(agents_dir.iterdir()):
        if d.is_dir():
            agent_file = d / "agent.py"
            config_file = d / "config.json"
            if agent_file.exists() or config_file.exists():
                try:
                    details = get_agent_details(d.name)
                    agents.append(details)
                except Exception:
                    pass
    return agents


def update_agent_service(
    name: str,
    prompt: str | None = None,
    model: str | None = None,
    tools: list[str] | None = None,
    new_name: str | None = None
) -> dict:
    safe_name = sanitize_agent_name(name)
    agent_dir = Path("generated_agents") / safe_name
    if not agent_dir.exists() or not agent_dir.is_dir():
        raise ValueError(f"Agent '{name}' not found")

    # Read current configuration
    current = get_agent_details(safe_name)

    updated_prompt = prompt if prompt is not None else current.get("prompt", "")
    updated_model = model if model is not None else current.get("model", "gemini/gemini-2.5-pro")
    updated_tools = tools if tools is not None else current.get("tools", [])

    target_name = safe_name
    if new_name and new_name.strip():
        safe_new_name = sanitize_agent_name(new_name.strip())
        if safe_new_name != safe_name:
            target_dir = Path("generated_agents") / safe_new_name
            if target_dir.exists():
                raise FileExistsError(f"Agent with name '{safe_new_name}' already exists")
            agent_dir.rename(target_dir)
            target_name = safe_new_name

    file_path = generate_agent(
        name=target_name,
        prompt=updated_prompt,
        model=updated_model,
        tools=updated_tools
    )

    return {
        "name": target_name,
        "prompt": updated_prompt,
        "model": updated_model,
        "tools": updated_tools,
        "file_path": file_path,
    }
