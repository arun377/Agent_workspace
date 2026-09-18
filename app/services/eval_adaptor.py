# app/services/eval_adaptor.py
import datetime
from datetime import timezone
from app.services.agent_runner import run_agent


def make_agent_fn(agent_name: str):
    def agent_fn(input_text: str) -> dict:
        # Record start time BEFORE running agent — used to find the LangSmith trace
        start_time = datetime.datetime.now(timezone.utc)

        result = run_agent(name=agent_name, input_text=input_text)
        
        # 1. Raise explicit error if the agent script threw an exception
        if result.get("status") == "error" or result.get("type") == "error":
            err_msg = (
                result.get("summary")
                or (result.get("data", {}).get("stderr") if isinstance(result.get("data"), dict) else None)
                or result.get("result")
                or str(result)
            )
            raise RuntimeError(f"Agent execution failed: {err_msg}")

        # Extract answer defensively across different agent template formats
        agent_result = result.get("result")
        if agent_result is None and result.get("type") == "completed":
            data = result.get("data", {})
            agent_result = data.get("final_answer") or data.get("answer") or data

        # 2. Defensively handle dict and string
        if isinstance(agent_result, dict):
            output_text = agent_result.get("answer") or agent_result.get("final_answer") or str(agent_result)
            execution_trace = agent_result.get("tool_calls", [])
            context = agent_result.get("context", [])
        else:
            output_text = str(agent_result) if agent_result is not None else ""
            execution_trace = result.get("data", {}).get("tool_calls", []) if isinstance(result.get("data"), dict) else []
            context = result.get("data", {}).get("context", []) if isinstance(result.get("data"), dict) else []

        return {
            "output": output_text,
            "execution_trace": execution_trace,
            "tool_calls": execution_trace,
            "context": context,  # Now guaranteed to be defined as a list
            "start_time": start_time,
            "agent_name": agent_name,
        }

    return agent_fn