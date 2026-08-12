from langchain_core.tools import tool


@tool
def calculator(expression: str) -> str:
    """Evaluate a basic arithmetic expression, e.g. '2 + 2'."""
    print("calcualtor called")
    return str(eval(expression))


BUILTIN_TOOLS = {
    "calculator": calculator,
}


def get_builtin_tool_metadata():
    from app.schemas.tool import ToolMetadata

    for tool_id, tool_fn in BUILTIN_TOOLS.items():
        yield ToolMetadata(
            id=tool_id,
            name=tool_fn.name,
            description=tool_fn.description,
            type="builtin",
        )