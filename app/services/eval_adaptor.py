from app.services.agent_runner import run_agent


def make_agent_fn(agent_name: str):
    def agent_fn(input_text: str) -> dict:
        result = run_agent(name=agent_name, input_text=input_text)
        agent_result = result["result"]
        # Extract execution trace (tool calls) for step efficiency metric
        execution_trace = agent_result.get("tool_calls", [])
        return {
            "output": agent_result["answer"],
            "execution_trace": execution_trace
        }
    return agent_fn