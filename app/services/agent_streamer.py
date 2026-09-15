import asyncio
import os
import subprocess
import sys
import json
from pathlib import Path
from typing import AsyncGenerator

async def stream_agent_subprocess(
    name: str, 
    input_text: str, 
    session_id: str | None = None
) -> AsyncGenerator[str, None]:
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
            import threading
            from dotenv import load_dotenv
            load_dotenv(override=True)

            env = dict(os.environ)
            env["PYTHONIOENCODING"] = "utf-8"

            import datetime
            start_time = datetime.datetime.now(datetime.timezone.utc)

            # -u forces unbuffered stdout so prints flush immediately
            proc = subprocess.Popen(
                [sys.executable, "-u", str(agent_script)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                bufsize=1,  # Line buffered
                env=env,
            )

            stderr_lines = []

            def drain_stderr():
                try:
                    for err_line in proc.stderr:
                        stderr_lines.append(err_line)
                except Exception:
                    pass

            err_thread = threading.Thread(target=drain_stderr, daemon=True)
            err_thread.start()

            # Send payload into the agent subprocess
            proc.stdin.write(payload)
            proc.stdin.close()

            # Push lines onto the async queue as soon as they arrive
            for line in iter(proc.stdout.readline, ""):
                clean = line.strip()
                if clean:
                    loop.call_soon_threadsafe(queue.put_nowait, clean)

            proc.wait()
            err_thread.join(timeout=1.0)
            if proc.returncode != 0:
                err = "".join(stderr_lines).strip()
                err_payload = json.dumps({
                    "type": "error",
                    "summary": f"Process exited with code {proc.returncode}",
                    "data": {"stderr": err}
                })
                loop.call_soon_threadsafe(queue.put_nowait, err_payload)

            # Attempt LangSmith trace retrieval if enabled
            try:
                from app.services.trace_service import fetch_langsmith_trace_tree, is_langsmith_enabled
                if is_langsmith_enabled():
                    trace_tree = fetch_langsmith_trace_tree(agent_name=name, start_time=start_time)
                    if trace_tree:
                        trace_payload = json.dumps({
                            "type": "trace_tree",
                            "summary": "LangSmith execution trace tree",
                            "data": trace_tree
                        })
                        loop.call_soon_threadsafe(queue.put_nowait, trace_payload)
            except Exception:
                pass

        except Exception as exc:
            loop.call_soon_threadsafe(
                queue.put_nowait,
                json.dumps({"type": "error", "summary": str(exc)})
            )
        finally:
            # Sentinel value to signal stream completion
            loop.call_soon_threadsafe(queue.put_nowait, None)

    # Spawn thread reader in background
    asyncio.create_task(asyncio.to_thread(run_worker))

    # Stream lines over SSE in real time
    while True:
        item = await queue.get()
        if item is None:
            break
        yield f"data: {item}\n\n"