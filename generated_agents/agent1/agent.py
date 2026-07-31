#agent template 

from langchain_community.chat_models import ChatLiteLLM
from langgraph.prebuilt import create_react_agent


AGENT_NAME="agent1"
PROMPT="you are a physics teacher"
MODEL_STRING ="gemini-3.5-flash"

model = ChatLiteLLM(model=MODEL_STRING)

agent= create_react_agent(
model=model,
tools=[],
prompt=PROMPT
)

def run(input_text: str)-> str:
    result = agent.invoke({"messages":[{"role":"user","content":input_text}]})
    return result["messages"][-1].content

