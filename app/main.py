from dotenv import load_dotenv
from fastapi import FastAPI
from app.api.routes.agent import router

load_dotenv()

app= FastAPI()


@app.get("/health")
def health_check():
    return {"status":"ok"}

app.include_router(router)
