from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import re

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


def sanitize_agent_name(name: str) -> str:
    if not re.fullmatch(r"[a-zA-Z0-9_\-]+", name):
        raise ValueError(f"Invalid agent name: {name}")
    return name


def generate_agent(name: str, prompt: str, model: str) -> str:
    safe_name = sanitize_agent_name(name)
    
    template = env.get_template("agent_template.py.jinja")
    rendered_code = template.render(
        agent_name=safe_name,
        prompt=prompt,
        model=model,
    )
    
    output_dir = Path("generated_agents") / safe_name
    output_dir.mkdir(parents=True, exist_ok=True)
    # TODO: create output_dir if it doesn't exist — which pathlib method does that?
    
    output_file = output_dir / "agent.py"
    output_file.write_text(rendered_code)

    # TODO: write rendered_code to output_file — what's the simplest way to write text to a file in Python?
    
    return str(output_file)