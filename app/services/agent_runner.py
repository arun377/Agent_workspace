import subprocess
import json,sys
from pathlib import Path


def run_agent(name:str,input_text:str)->dict:
    agent_path=Path("generated_agents") /name / "agent.py"
    
    
    if not agent_path.exists():
        return FileNotFoundError(f"Agent '{name}' not  found")
    
    process = subprocess.run(
        [sys.executable,str(agent_path)],
        input=input_text,
        capture_output=True,
        text=True,
        timeout=30,
    )
    
    if process.returncode != 0:
        raise RuntimeError(f"Agent process failed: {process.stderr}")
    

