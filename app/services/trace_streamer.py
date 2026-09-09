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

    while True:
        item = await queue.get()
        if item is None:
            break
        yield f"data: {item}\n\n"
