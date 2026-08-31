import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import re

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


def sanitize_agent_name(name: str) -> str:
    if not re.fullmatch(r"[a-zA-Z0-9_\-]+", name):
        raise ValueError(f"Invalid agent name: {name}")
    return name


def generate_agent(name: str, prompt: str, model: str, tools : list[str]) -> str:
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
    output_file.write_text(rendered_code)

    config_file = output_dir / "config.json"
    config_file.write_text(json.dumps({"prompt": prompt, "model": model, "tools": tools}))

    
    return str(output_file)