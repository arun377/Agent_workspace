# scratch_step_efficiency_test.py
import asyncio
import os
from langchain_litellm import ChatLiteLLM
from langgraph.prebuilt import create_react_agent
from deepeval.integrations.langchain import CallbackHandler
from deepeval.metrics import StepEfficiencyMetric
from deepeval.models import GeminiModel
from deepeval.tracing.tracing import trace_manager
from langchain_core.tools import tool


@tool
def calculator(expression: str) -> str:
    """Evaluate a basic arithmetic expression."""
    return str(eval(expression))


async def main():
    model = ChatLiteLLM(model="groq/openai/gpt-oss-120b")
    agent = create_react_agent(model=model, tools=[calculator], prompt="You are a helpful assistant.")

    judge_model = GeminiModel(model="gemini-3.6-flash", api_key=os.getenv("GEMINI_API_KEY"))
    metric = StepEfficiencyMetric(threshold=0.7, model=judge_model)

    handler = CallbackHandler(metrics=[metric])
    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": "what is 84772 * 391847"}]},
        config={"callbacks": [handler]},
    )

    await asyncio.sleep(2)  # give the async evaluation a moment to complete

    traces = trace_manager.get_all_traces_dict()
    print("TRACES:", traces)


asyncio.run(main())