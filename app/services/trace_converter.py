"""
Converts a LangSmith trace tree (from trace_service.fetch_langsmith_trace_tree)
into the nested dict format expected by DeepEval's _trace_dict private attribute.

LangSmith tree node fields (from trace_service.py):
  - name: str
  - run_type: str  ("chain", "llm", "tool", "retriever")
  - inputs: dict or None
  - outputs: dict or None
  - children: list of child nodes
  - status: str
  - latency_ms: int

DeepEval _trace_dict expected fields (from llm_test_case.py):
  - name: str
  - type: str  ("agent", "llm", "tool", "retriever")
  - input: dict or None
  - output: str or dict or None
  - children: list
"""
from typing import Optional, Dict, Any


# Map LangSmith run_type values to DeepEval type values
_RUN_TYPE_MAP = {
    "chain": "agent",   # LangGraph chain = agent in DeepEval
    "llm": "llm",
    "tool": "tool",
    "retriever": "retriever",
}


def convert_langsmith_tree_to_trace_dict(
    node: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Recursively converts one LangSmith tree node and its children
    into DeepEval _trace_dict format.

    Args:
        node: A dict as returned by fetch_langsmith_trace_tree().
              Contains: name, run_type, inputs, outputs, children, status, etc.

    Returns:
        A dict with keys: name, type, input, output, children
        ready to assign to test_case._trace_dict
    """
    run_type = node.get("run_type", "chain")
    deepeval_type = _RUN_TYPE_MAP.get(run_type, "agent")

    # Extract output as clean string or dict
    outputs = node.get("outputs")
    if isinstance(outputs, dict):
        # LangSmith wraps outputs — unwrap common single-key wrappers if simple
        if "output" in outputs and len(outputs) == 1:
            output_val = outputs["output"]
        elif "answer" in outputs and len(outputs) == 1:
            output_val = outputs["answer"]
        else:
            output_val = outputs
    else:
        output_val = outputs

    converted: Dict[str, Any] = {
        "name": node.get("name", "unknown"),
        "type": deepeval_type,
        "input": node.get("inputs"),
        "output": output_val,
        "children": [
            convert_langsmith_tree_to_trace_dict(child)
            for child in (node.get("children") or [])
        ],
    }

    # Keep structure clean
    return {k: v for k, v in converted.items() if v is not None or k == "children"}
