from typing import List, Dict, Any
from app.tools.basic_tools import AVAILABLE_TOOLS

def get_available_tools_info() -> List[Dict[str, str]]:
    return [
        {"name": name, "description": tool.description}
        for name, tool in AVAILABLE_TOOLS.items()
    ]

def get_tools_by_names(names: List[str]) -> List[Any]:
    tools = []
    for name in names:
        if name in AVAILABLE_TOOLS:
            tools.append(AVAILABLE_TOOLS[name])
    return tools
