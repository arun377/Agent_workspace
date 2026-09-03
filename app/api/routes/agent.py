import json
from pathlib import Path

from fastapi import HTTPException
from fastapi import APIRouter
from app.schemas.agent import AgentCreateRequest, AgentCreateResponse, AgentRunRequest, AgentRunResponse, AgentUpdateRequest
from app.services.agent_service import generate_agent
from app.services.agent_runner import run_agent
import subprocess
from evaluator.generator import generate_goldens
# Import the judge/generator model wrapper used across the evaluator
from app.services.metric_registry import get_default_judge_model # or your GeminiModel instance
from app.schemas.eval import EvalDataGenerateRequest, EvalDataGenerateResponse, EvalDataItem, EvalDataUpdateRequest
from fastapi.responses import FileResponse
from app.services.agent_exporter import create_export_bundle, package_as_zip

router = APIRouter(prefix="/agents", tags=["agents"])

@router.get("/")
def get_agents():
    from app.services.agent_service import get_all_agents
    return get_all_agents()

@router.get("/{name}")
def get_agent(name: str):
    from app.services.agent_service import get_agent_details
    try:
        return get_agent_details(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/",response_model=AgentCreateResponse)
def create_agent(request:AgentCreateRequest):
    file_path=generate_agent(
        name = request.name,
        prompt=request.prompt,
        model=request.model,
        tools=request.tools
    )
    return AgentCreateResponse(name=request.name, file_path=file_path)

@router.put("/{name}", response_model=AgentCreateResponse)
def update_agent(name: str, request: AgentUpdateRequest):
    from app.services.agent_service import get_agent_details
    try:
        get_agent_details(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    file_path = generate_agent(
        name=name,
        prompt=request.prompt,
        model=request.model,
        tools=request.tools,
        mcp_servers=request.mcp_servers,
    )
    return AgentCreateResponse(name=name, file_path=file_path)

@router.post("/{name}/run", response_model=AgentRunResponse)
def test_agent(name: str, request: AgentRunRequest):
    try:
        result = run_agent(name=name, input_text=request.input_text)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Agent execution timed out")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    output = result["result"]
    answer_text = output["answer"] if isinstance(output, dict) else output
    return AgentRunResponse(status=result["status"], result=answer_text)



@router.post("/{name}/eval-data/generate", response_model=EvalDataGenerateResponse)
def eval_generator(name: str, request: EvalDataGenerateRequest):
    agent_dir = Path("generated_agents") / name
    config_file = agent_dir / "config.json"
    eval_file = agent_dir / "eval_data.json"

    # 1. Validate agent exists & read prompt
    if not config_file.exists():
        raise HTTPException(status_code=404, detail=f"Agent '{name}' configuration not found")

    try:
        config_data = json.loads(config_file.read_text())
        agent_prompt = config_data["prompt"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load agent config: {str(e)}")

    # 2. Call generator from evaluator package
    try:
        model = get_default_judge_model()  # Your GeminiModel / generator instance
        raw_goldens = generate_goldens(
            agent_prompt=agent_prompt,
            num_cases=request.num_cases,
            model=model
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Golden generation failed: {str(e)}")

    # 3. Tag new cases with metadata
    new_entries = [
        {
            "input": case["input"],
            "expected_output": case["expected_output"],
            "source": "llm",
            "reviewed": False
        }
        for case in raw_goldens
    ]

    # 4. Merge preserving existing reviewed entries
    existing_entries = []
    if eval_file.exists():
        try:
            existing_entries = json.loads(eval_file.read_text())
        except json.JSONDecodeError:
            existing_entries = []

    # Strategy: Append new LLM suggestions to existing test set
    combined_entries = existing_entries + new_entries
    eval_file.write_text(json.dumps(combined_entries, indent=2))

    return EvalDataGenerateResponse(
        generated_count=len(new_entries),
        total_count=len(combined_entries),
        file_path=str(eval_file)
    )

   
@router.get("/{name}/eval-data", response_model=list[EvalDataItem])
def get_eval_data(name: str):
    eval_file = Path("generated_agents") / name / "eval_data.json"
    if not eval_file.exists():
        return []

    try:
        raw_data = json.loads(eval_file.read_text())
        normalized = [
            EvalDataItem(
                index=idx,
                input=item if isinstance(item, str) else item.get("input", ""),
                expected_output="" if isinstance(item, str) else item.get("expected_output", ""),
                source="human" if isinstance(item, str) else item.get("source", "human"),
                reviewed=True if isinstance(item, str) else item.get("reviewed", False),
            )
            for idx, item in enumerate(raw_data)
        ]
        return normalized
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read eval data: {str(e)}")


@router.patch("/{name}/eval-data/{index}", response_model=EvalDataItem)
def update_eval_case(name: str, index: int, request: EvalDataUpdateRequest):
    eval_file = Path("generated_agents") / name / "eval_data.json"
    if not eval_file.exists():
        raise HTTPException(status_code=404, detail=f"No eval data found for agent '{name}'")

    raw_data = json.loads(eval_file.read_text())
    if index < 0 or index >= len(raw_data):
        raise HTTPException(status_code=404, detail=f"Index {index} out of range (total items: {len(raw_data)})")

    # Normalize existing entry if it was a legacy string
    current = raw_data[index]
    if isinstance(current, str):
        current = {"input": current, "expected_output": "", "source": "human", "reviewed": True}

    # Apply updates
    if request.input is not None:
        current["input"] = request.input
    if request.expected_output is not None:
        current["expected_output"] = request.expected_output
    if request.reviewed is not None:
        current["reviewed"] = request.reviewed

    raw_data[index] = current
    eval_file.write_text(json.dumps(raw_data, indent=2))

    return EvalDataItem(index=index, **current)





@router.post("/{name}/export")
def export_agent(name: str, download: bool = False):
    try:
        bundle_dir = create_export_bundle(agent_name=name)
        zip_path = package_as_zip(bundle_dir)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

    if download:
        return FileResponse(
            path=str(zip_path),
            filename=f"{name}_bundle.zip",
            media_type="application/zip"
        )

    return {
        "status": "success",
        "agent_name": name,
        "bundle_path": str(bundle_dir.resolve()),
        "zip_path": str(zip_path.resolve()),
        "docker_build_command": f"docker build -t {name}:latest {bundle_dir}"
    }