  1. Use Python 3.11

  The repo has .python-version set to 3.11.

  cd C:\Seenuvasan_WS\Agent_workspace
  python --version

  If needed, install Python 3.11 first.

  2. Install dependencies

  This project uses uv because it has pyproject.toml and uv.lock.

  uv sync

  If uv is not installed:

  pip install uv
  uv sync

  Important: the code imports two packages that are not declared cleanly in pyproject.toml:

  uv add python-dotenv langgraph

  Reason:

  - app/main.py imports dotenv
  - app/templates/agent_template.py.jinja imports langgraph.prebuilt

  3. Create .env

  Copy the example file:

  Copy-Item .env.example .env

  Then edit .env.

  For the backend as it currently works, the main required variable is:

  GEMINI_API_KEY=your_real_gemini_api_key

  Get the key from Google AI Studio:

  https://aistudio.google.com/app/apikey



  4. Run the backend

  uv run uvicorn app.main:app --reload

  Then check:

  http://127.0.0.1:8000/health

  Expected response:

  {"status":"ok"}

  5. Model value to use when creating agents

  The API schema currently defaults to:

  model: str = "gemini-3.5-flash"



  