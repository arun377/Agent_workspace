# Agent Traceability Implementation Instructions for Future LLMs

This workspace requires that all generated agents provide **full parallel traceability** of their execution. When generating or modifying an agent's code (typically `agent.py`), you must ensure that all LangGraph `astream_events` are properly caught and emitted as line-delimited JSON.

## Required `astream_events` Handling

When implementing the LangGraph execution loop (`async for event in agent.astream_events(..., version="v2"):`), you must include the following event handlers to capture the full trace. Do not omit any of these tracing blocks.

### The Trace Event Loop

```python
    async for event in agent.astream_events(input_payload, version="v2"):
        kind = event["event"]

        # 1. Tool Invocations
        if kind == "on_tool_start":
            emit_event("tool_call", f"Calling `{event['name']}`", {
                "tool": event["name"],
                "input": str(event["data"].get("input"))
            })

        # 2. Tool Results
        elif kind == "on_tool_end":
            emit_event("tool_result", f"Finished `{event['name']}`", {
                "tool": event["name"],
                "output": str(event["data"].get("output"))
            })
            
        # 3. Tool Errors
        elif kind == "on_tool_error":
            emit_event("tool_error", f"Error in `{event['name']}`", {
                "tool": event["name"],
                "error": str(event["data"].get("error"))
            })

        # 4. Token Streaming (Defensive text extraction)
        elif kind == "on_chat_model_stream":
            chunk = event["data"].get("chunk")
            content = getattr(chunk, "content", "")
            
            text_piece = ""
            if isinstance(content, str):
                text_piece = content
            elif isinstance(content, list):
                text_piece = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])

            if text_piece:
                full_answer_chunks.append(text_piece)
                emit_event("token", "Generating response...", {"token": text_piece})

        # 5. LLM Call Tracing (Start & End)
        elif kind == "on_chat_model_start":
            emit_event("llm_call_start", f"Starting LLM call for `{event['name']}`", {
                "input": str(event["data"].get("input"))
            })
            
        elif kind == "on_chat_model_end":
            emit_event("llm_call_end", f"Finished LLM call for `{event['name']}`", {
                "output": str(event["data"].get("output"))
            })
            
        # 6. Chain / Plan Level Tracing
        elif kind == "on_chain_start":
            emit_event("chain_start", f"Starting chain `{event['name']}`", {
                "input": str(event["data"].get("input"))
            })

        # 7. Fallback & Chain End
        elif kind == "on_chain_end":
            emit_event("chain_end", f"Finished chain `{event['name']}`", {
                "output": str(event["data"].get("output"))
            })
            if event["name"] == "LangGraph":
                output = event["data"].get("output")
                if isinstance(output, dict) and "messages" in output:
                    last_msg = output["messages"][-1]
                    final_fallback_answer = getattr(last_msg, "content", "")
                    
        # 8. Chain Errors
        elif kind == "on_chain_error":
            emit_event("chain_error", f"Error in chain `{event['name']}`", {
                "error": str(event["data"].get("error"))
            })
```

## Summary of Traced Fields
By using the loop above, the agent will reliably emit the following fields via `emit_event` (which internally does `print(json.dumps(...))`):
- **`tool_call`**: Name and inputs to tools and MCP servers.
- **`tool_result` / `tool_error`**: Output strings and exception traces from tool execution.
- **`token`**: Raw stream tokens from the generation step.
- **`llm_call_start` / `llm_call_end`**: Exact payload sent to the LLM and the exact response block.
- **`chain_start` / `chain_end` / `chain_error`**: Top-level LangGraph agent chain execution steps, capturing the overall plan flow, failures, and retries.

Please strictly enforce this template for all new agent implementations.
