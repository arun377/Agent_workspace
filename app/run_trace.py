import asyncio
import json
import argparse
from app.services.trace_streamer import stream_agent_trace_subprocess

async def main():
    parser = argparse.ArgumentParser(description="Execute an agent and capture full parallel trace.")
    parser.add_argument("--name", default="Smart_Assistant", help="Name of the agent to run")
    parser.add_argument("--input", default="Hello", help="Input text for the agent")
    args = parser.parse_args()

    print(f"Running agent '{args.name}' with input: '{args.input}'")
    print("Capturing parallel trace events...\n")

    async for event_str in stream_agent_trace_subprocess(args.name, args.input):
        # event_str comes as 'data: {...}\n\n'
        clean = event_str.replace("data: ", "").strip()
        if clean:
            try:
                data = json.loads(clean)
                print(json.dumps(data, indent=2))
            except:
                print(clean)

if __name__ == "__main__":
    asyncio.run(main())
