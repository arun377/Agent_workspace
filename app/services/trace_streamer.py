import asyncio
import subprocess
import sys
import json
from pathlib import Path
from typing import AsyncGenerator

async def stream_agent_trace_subprocess(
    name: str, 
    input_text: str, 
    session_id: str | None = None
) -> AsyncGenerator[str, None]:
    """Streams full parallel traceability events from the agent subprocess."""
    agent_dir = Path("generated_agents") / name
    agent_script = agent_dir / "agent.py"

    if not agent_script.exists():
        yield f"data: {json.dumps({'type': 'error', 'summary': f'Agent {name} not found.'})}\n\n"
        return

    payload = json.dumps({
        "input_text": input_text,
        "session_id": session_id or "default_session"
    })

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    def run_worker():
        try:
            # -u forces unbuffered stdout so prints flush immediately
            proc = subprocess.Popen(
                [sys.executable, "-u", str(agent_script)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,  # Line buffered
            )

            proc.stdin.write(payload)
            proc.stdin.close()

            for line in iter(proc.stdout.readline, ""):
                clean = line.strip()
                if clean:
                    loop.call_soon_threadsafe(queue.put_nowait, clean)

            proc.wait()
            if proc.returncode != 0:
                err = proc.stderr.read().strip()
                err_payload = json.dumps({
                    "type": "trace_error",
                    "summary": f"Process exited with code {proc.returncode}",
                    "data": {"stderr": err}
                })
                loop.call_soon_threadsafe(queue.put_nowait, err_payload)

        except Exception as exc:
            loop.call_soon_threadsafe(
                queue.put_nowait,
                json.dumps({"type": "trace_error", "summary": str(exc)})
            )
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    asyncio.create_task(asyncio.to_thread(run_worker))

    final_result = {
        "input": input_text,
        "actual_output": None,
        "steps": [],
        "errors": []
    }
    
    active_tools = {}
    active_llms = {}

    while True:
        item = await queue.get()
        if item is None:
            break
        
        try:
            event = json.loads(item)
            event_type = event.get("type")
            data = event.get("data", {})
            summary = event.get("summary", "")

            if event_type == "chain_start":
                step_name = summary.replace("Starting chain ", "").replace("`", "")
                if step_name not in ["RunnableSequence", "Prompt", "should_continue", "tools", "call_model", "LangGraph", "agent"]:
                    final_result["steps"].append({
                        "step_type": "agent_plan_start",
                        "name": step_name,
                        "input": data.get("input")
                    })
            elif event_type == "chain_end":
                step_name = summary.replace("Finished chain ", "").replace("`", "")
                if step_name not in ["RunnableSequence", "Prompt", "should_continue", "tools", "call_model", "LangGraph", "agent"]:
                    final_result["steps"].append({
                        "step_type": "agent_plan_end",
                        "name": step_name,
                        "output": data.get("output")
                    })
            elif event_type == "llm_call_start":
                active_llms["llm"] = {
                    "step_type": "llm_call",
                    "name": "ChatLiteLLM",
                    "input": data.get("input")
                }
            elif event_type == "llm_call_end":
                if "llm" in active_llms:
                    active_llms["llm"]["content"] = data.get("content")
                    active_llms["llm"]["tool_calls"] = data.get("tool_calls")
                    active_llms["llm"]["token_usage"] = data.get("token_usage")
                    final_result["steps"].append(active_llms["llm"])
                    del active_llms["llm"]
            elif event_type == "tool_call":
                tool_name = data.get("tool")
                if tool_name:
                    active_tools[tool_name] = {
                        "step_type": "tool_call",
                        "name": tool_name,
                        "input": data.get("input")
                    }
            elif event_type == "tool_result":
                tool_name = data.get("tool")
                if tool_name in active_tools:
                    active_tools[tool_name]["output"] = data.get("output")
                    active_tools[tool_name]["error"] = None
                    final_result["steps"].append(active_tools[tool_name])
                    del active_tools[tool_name]
            elif event_type == "tool_error":
                tool_name = data.get("tool")
                if tool_name in active_tools:
                    active_tools[tool_name]["output"] = None
                    active_tools[tool_name]["error"] = data.get("error")
                    final_result["steps"].append(active_tools[tool_name])
                    del active_tools[tool_name]
            elif event_type in ["chain_error", "trace_error", "error"]:
                err_text = data.get("error") or data.get("stderr") or summary
                if err_text:
                    final_result["errors"].append(err_text)
            elif event_type == "completed":
                final_result["actual_output"] = data.get("final_answer")
        except:
            pass

    yield f"data: {json.dumps(final_result)}\n\n"
