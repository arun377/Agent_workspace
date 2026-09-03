import shutil
import zipfile
from pathlib import Path
import json

def create_export_bundle(agent_name: str, export_root: Path = Path("exported_agents")) -> Path:
    agent_dir = Path("generated_agents") / agent_name
    if not agent_dir.exists():
        raise FileNotFoundError(f"Agent '{agent_name}' does not exist on disk.")

    bundle_dir = export_root / agent_name
    bundle_dir.mkdir(parents=True, exist_ok=True)

    # 1. Inline Tools: Copy tools folder to make the bundle independent of app/
    tools_dir = bundle_dir / "tools"
    tools_dir.mkdir(exist_ok=True)
    shutil.copy("app/tools/builtin/builtin.py", tools_dir / "builtin.py")
    shutil.copy("app/tools/mcp_servers.py", tools_dir / "mcp_servers.py")

    # 2. Rewrite agent.py imports to use local tools package
    agent_code = (agent_dir / "agent.py").read_text()
    standalone_agent_code = agent_code.replace(
        "from app.tools.builtin.builtin import BUILTIN_TOOLS",
        "from tools.builtin import BUILTIN_TOOLS"
    ).replace(
        "from app.tools.mcp_servers import MCP_SERVERS",
        "from tools.mcp_servers import MCP_SERVERS"
    )
    (bundle_dir / "agent.py").write_text(standalone_agent_code)

    # 3. Copy config.json
    if (agent_dir / "config.json").exists():
        shutil.copy(agent_dir / "config.json", bundle_dir / "config.json")

    # 4. Generate standalone HTTP server wrapper (server.py)
    server_py = """import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from agent import run

app = FastAPI(title="Exported Agent Service - {agent_name}")

class QueryRequest(BaseModel):
    input_text: str

class QueryResponse(BaseModel):
    answer: str
    tool_calls: list

@app.get("/health")
def health_check():
    return {"status": "ok", "agent": "{agent_name}"}

@app.post("/run", response_model=QueryResponse)
async def execute(req: QueryRequest):
    try:
        result = await run(req.input_text)
        return QueryResponse(
            answer=result.get("answer", ""),
            tool_calls=result.get("tool_calls", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
""".replace("{agent_name}", agent_name)
    (bundle_dir / "server.py").write_text(server_py)

    # 5. Generate pinned requirements.txt
    requirements = """fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
langchain-litellm>=0.1.0
langgraph>=0.1.0
langchain-mcp-adapters>=0.1.0
python-dotenv>=1.0.0
"""
    (bundle_dir / "requirements.txt").write_text(requirements)

    # 6. Generate Dockerfile
    dockerfile = """FROM python:3.11-slim

WORKDIR /app

# Prevent Python from buffering stdout/stderr
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
"""
    (bundle_dir / "Dockerfile").write_text(dockerfile)

    # 7. Generate Kubernetes Deployment & Service manifest
    k8s_manifest = f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-{agent_name}
  labels:
    app: agent-{agent_name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: agent-{agent_name}
  template:
    metadata:
      labels:
        app: agent-{agent_name}
    spec:
      containers:
      - name: agent
        image: {agent_name}:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8000
        env:
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-secrets
              key: gemini-api-key
---
apiVersion: v1
kind: Service
metadata:
  name: agent-{agent_name}-svc
spec:
  type: ClusterIP
  selector:
    app: agent-{agent_name}
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
"""
    (bundle_dir / "deployment.yaml").write_text(k8s_manifest)

    return bundle_dir


def package_as_zip(bundle_dir: Path) -> Path:
    zip_path = bundle_dir.with_suffix(".zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for file in bundle_dir.rglob("*"):
            if file.is_file():
                zipf.write(file, arcname=file.relative_to(bundle_dir))
    return zip_path