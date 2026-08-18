import subprocess
import json, sys
from pathlib import Path


def run_agent(name: str, input_text: str) -> dict:
    agent_path = Path("generated_agents") / name / "agent.py"

    if not agent_path.exists():
        raise FileNotFoundError(f"Agent '{name}' not found")

    process = subprocess.run(
        [sys.executable, str(agent_path)],
        input=input_text,
        capture_output=True,
        text=True,
        timeout=100,
    )


    if process.returncode != 0:
        raise RuntimeError(f"Agent process failed: {process.stderr}")
    
    print("RAW STDOUT:", repr(process.stdout))  # temporary debug line
    print("RAW STDERR:", repr(process.stderr)) 

    lines = process.stdout.strip().splitlines()
    last_line = lines[-1] if lines else ""
    return json.loads(last_line)