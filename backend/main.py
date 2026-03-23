
# ------------------ AUTH IMPORTS ------------------
from backend.auth_system import router as auth_router
from backend.ai_utils import router as analyze_router
from backend.interrogation import router as interrogation_router

# ------------------ CORE IMPORTS ------------------
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI

# ------------------ APP INIT ------------------
app = FastAPI()


# ------------------ CORS ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include routers
app.include_router(auth_router)
app.include_router(analyze_router, prefix="/api")
app.include_router(interrogation_router, prefix="/api")






# ------------------ RUN ------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)