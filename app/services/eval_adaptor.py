from app.services.agent_runner import run_agent


def make_agent_fn(agent_name: str):
    def agent_fn(input_text: str) -> dict:
        result = run_agent(name=agent_name, input_text=input_text)
        
        # 1. Raise explicit error if the agent script threw an exception
        if result.get("status") == "error":
            raise RuntimeError(f"Agent execution failed: {result.get('result')}")

        agent_result = result.get("result", "")

        # 2. Defensively handle both dict (new template) and string (legacy/fallback)
        if isinstance(agent_result, dict):
            output_text = agent_result.get("answer", str(agent_result))
            execution_trace = agent_result.get("tool_calls", [])
        else:
            output_text = str(agent_result)
            execution_trace = []

        return {
            "output": output_text,
            "execution_trace": execution_trace,
        }

    return agent_fn