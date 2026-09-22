import os
import time
import datetime
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

def is_langsmith_enabled() -> bool:
    tracing = os.environ.get("LANGCHAIN_TRACING_V2", "").lower() in ("true", "1")
    api_key = os.environ.get("LANGCHAIN_API_KEY", "").strip()
    enabled = tracing and bool(api_key)
    if not enabled:
        logger.warning(
            f"[TRACE_SERVICE] LangSmith tracing disabled: LANGCHAIN_TRACING_V2={tracing}, "
            f"has_api_key={bool(api_key)}"
        )
    return enabled

def _format_tokens(run: Any) -> Dict[str, int]:
    tokens = {}
    if getattr(run, "prompt_tokens", None) is not None:
        tokens["prompt_tokens"] = run.prompt_tokens
    if getattr(run, "completion_tokens", None) is not None:
        tokens["completion_tokens"] = run.completion_tokens
    if getattr(run, "total_tokens", None) is not None:
        tokens["total_tokens"] = run.total_tokens
    
    # Fallback to extra if direct attributes are not populated
    if not tokens and hasattr(run, "extra") and isinstance(run.extra, dict):
        metadata = run.extra.get("metadata", {})
        if isinstance(metadata, dict):
            usage = metadata.get("token_usage") or metadata.get("usage_metadata")
            if isinstance(usage, dict):
                tokens["prompt_tokens"] = usage.get("prompt_tokens") or usage.get("input_tokens", 0)
                tokens["completion_tokens"] = usage.get("completion_tokens") or usage.get("output_tokens", 0)
                tokens["total_tokens"] = usage.get("total_tokens", 0)
    return tokens

def _format_cost(run: Any) -> Dict[str, Optional[float]]:
    cost: Dict[str, Optional[float]] = {}
    for attr in ("total_cost", "prompt_cost", "completion_cost"):
        val = getattr(run, attr, None)
        if val is not None:
            try:
                cost[attr] = float(val)
            except (ValueError, TypeError):
                pass
    return cost

def _format_metadata(run: Any) -> Dict[str, Any]:
    meta = {}
    if hasattr(run, "extra") and isinstance(run.extra, dict):
        for k, v in run.extra.items():
            if k in ("metadata", "invocation_params", "runtime"):
                meta[k] = v
            elif isinstance(v, (str, int, float, bool, list, dict)):
                meta[k] = v
    return meta

def _build_tree_recursive(node_map: Dict[str, Dict[str, Any]], parent_children_map: Dict[Optional[str], List[str]], current_id: str) -> Dict[str, Any]:
    node = dict(node_map[current_id])
    child_ids = parent_children_map.get(current_id, [])
    # Sort children by start_time
    child_nodes = []
    for cid in child_ids:
        if cid in node_map:
            child_nodes.append(_build_tree_recursive(node_map, parent_children_map, cid))
    child_nodes.sort(key=lambda x: x.get("start_time") or "")
    node["children"] = child_nodes
    return node

def fetch_langsmith_trace_tree(
    agent_name: str, 
    start_time: datetime.datetime, 
    max_retries: int = 10, 
    retry_delay: float = 2.0,
    initial_wait: float = 2.0,
) -> Optional[Dict[str, Any]]:
    """
    Fetches the hierarchical run tree from LangSmith for the agent execution that started at start_time.
    Retries up to max_retries to handle LangSmith ingestion latency.
    """
    if not is_langsmith_enabled():
        logger.warning("[TRACE_SERVICE] Cannot fetch trace: LangSmith is disabled or missing credentials.")
        return None

    try:
        from langsmith import Client
        client = Client()
    except Exception as e:
        logger.error(f"[TRACE_SERVICE] Failed to initialize LangSmith Client: {e}")
        return None

    project_name = os.environ.get("LANGCHAIN_PROJECT", "default")
    filter_start = start_time - datetime.timedelta(seconds=5)
    logger.info(
        f"[TRACE_SERVICE] Fetching trace tree for agent='{agent_name}', "
        f"project='{project_name}', start_time={start_time.isoformat()} (filter_start={filter_start.isoformat()})"
    )

    if initial_wait > 0:
        time.sleep(initial_wait)

    root_run = None
    for attempt in range(max_retries):
        try:
            # Query candidate root runs in the project
            runs = list(client.list_runs(
                project_name=project_name,
                is_root=True,
                start_time=filter_start,
                limit=10
            ))
            logger.info(
                f"[TRACE_SERVICE] Attempt {attempt + 1}/{max_retries}: Found {len(runs)} candidate root run(s)"
            )
            if runs:
                # Find runs matching agent name or LangGraph
                matching_runs = [
                    r for r in runs 
                    if getattr(r, "name", "") in (agent_name, "LangGraph") 
                    or (r.extra and r.extra.get("metadata", {}).get("agent_name") == agent_name)
                ]
                candidates = matching_runs if matching_runs else runs
                candidates.sort(key=lambda r: r.start_time or datetime.datetime.min, reverse=True)
                root_run = candidates[0]
                logger.info(
                    f"[TRACE_SERVICE] Matched root run id='{root_run.id}', name='{root_run.name}', "
                    f"run_type='{root_run.run_type}', start_time={root_run.start_time}"
                )
                break
        except Exception as err:
            logger.warning(f"[TRACE_SERVICE] LangSmith list_runs attempt {attempt + 1} failed: {err}")
        
        if attempt < max_retries - 1:
            time.sleep(retry_delay)

    # Fallback: check latest root runs in case start_time filter had clock skew
    if not root_run:
        try:
            fallback_runs = list(client.list_runs(project_name=project_name, is_root=True, limit=5))
            recent_candidates = [
                r for r in fallback_runs
                if (not r.start_time or r.start_time >= filter_start - datetime.timedelta(seconds=15))
                and getattr(r, "name", "") in (agent_name, "LangGraph")
            ]
            if recent_candidates:
                recent_candidates.sort(key=lambda r: r.start_time or datetime.datetime.min, reverse=True)
                root_run = recent_candidates[0]
                logger.info(
                    f"[TRACE_SERVICE] Matched root run via fallback: id='{root_run.id}', "
                    f"name='{root_run.name}', start_time={root_run.start_time}"
                )
        except Exception as e:
            logger.warning(f"[TRACE_SERVICE] Fallback query failed: {e}")

    if not root_run:
        logger.warning(f"[TRACE_SERVICE] No LangSmith root run found for {agent_name} after {max_retries} attempts.")
        return None

    # Fetch all child runs belonging to this trace
    trace_id = str(root_run.trace_id or root_run.id)
    all_runs = []
    for attempt in range(max_retries):
        try:
            all_runs = list(client.list_runs(trace_id=trace_id))
            if len(all_runs) > 0:
                logger.info(f"[TRACE_SERVICE] Retrieved {len(all_runs)} span(s) for trace_id={trace_id}")
                break
        except Exception as e:
            logger.warning(f"[TRACE_SERVICE] LangSmith trace_id query attempt {attempt + 1} failed: {e}")
        if attempt < max_retries - 1:
            time.sleep(retry_delay)

    if not all_runs:
        all_runs = [root_run]

    tree = _build_tree_from_runs(all_runs, root_run, agent_name)
    if tree:
        logger.info(
            f"[TRACE_SERVICE] Successfully constructed trace tree for '{agent_name}' with root '{tree.get('name')}'"
        )
    else:
        logger.warning(f"[TRACE_SERVICE] Failed to construct trace tree for root_id='{root_run.id}'")
    return tree

def _build_tree_from_runs(
    all_runs: List[Any], 
    root_run: Any, 
    agent_name: str
) -> Optional[Dict[str, Any]]:
    # Convert runs to tree node dicts
    node_map: Dict[str, Dict[str, Any]] = {}
    parent_children_map: Dict[Optional[str], List[str]] = {}

    for run in all_runs:
        run_id = str(run.id)
        parent_id = str(run.parent_run_id) if getattr(run, "parent_run_id", None) else None

        latency_ms = None
        if run.start_time and run.end_time:
            latency_ms = int((run.end_time - run.start_time).total_seconds() * 1000)

        status = "error" if getattr(run, "error", None) else ("success" if getattr(run, "end_time", None) else "running")

        cost_data = _format_cost(run)
        node_data = {
            "id": run_id,
            "name": getattr(run, "name", agent_name),
            "run_type": getattr(run, "run_type", "chain"),
            "status": status,
            "start_time": run.start_time.isoformat() if run.start_time else None,
            "end_time": run.end_time.isoformat() if run.end_time else None,
            "latency_ms": latency_ms,
            "tokens": _format_tokens(run),
            "cost": cost_data,
            "total_cost": cost_data.get("total_cost"),
            "inputs": getattr(run, "inputs", None),
            "outputs": getattr(run, "outputs", None),
            "error": getattr(run, "error", None),
            "metadata": _format_metadata(run),
            "children": []
        }
        node_map[run_id] = node_data
        parent_children_map.setdefault(parent_id, []).append(run_id)

    root_id = str(root_run.id)
    if root_id not in node_map:
        return None

    # Construct the recursive tree starting from root_id
    tree = _build_tree_recursive(node_map, parent_children_map, root_id)
    tool_nodes = [n["name"] for n in node_map.values() if n["run_type"] == "tool"]
    logger.info(
        f"[TRACE_SERVICE] Tree built: total_nodes={len(node_map)}, tool_calls={tool_nodes}"
    )
    return tree

def get_latest_agent_trace(agent_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetches the most recent execution trace tree for an agent directly from LangSmith.
    """
    if not is_langsmith_enabled():
        return None

    try:
        from langsmith import Client
        client = Client()
        project_name = os.environ.get("LANGCHAIN_PROJECT", "default")
        runs = list(client.list_runs(
            project_name=project_name,
            is_root=True,
            limit=10
        ))
        if not runs:
            return None

        # Sort runs by start_time descending
        runs.sort(key=lambda r: r.start_time or datetime.datetime.min, reverse=True)
        
        # Look for run with matching agent_name or LangGraph
        target_run = None
        for r in runs:
            r_name = getattr(r, "name", "")
            if r_name == agent_name or r_name == "LangGraph":
                target_run = r
                break
        if not target_run:
            target_run = runs[0]

        trace_id = str(target_run.trace_id or target_run.id)
        all_runs = list(client.list_runs(trace_id=trace_id)) or [target_run]
        return _build_tree_from_runs(all_runs, target_run, agent_name)
    except Exception as e:
        logger.warning(f"Failed to fetch latest agent trace: {e}")
        return None

