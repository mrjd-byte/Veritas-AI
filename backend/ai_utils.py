from openai import OpenAI
import os
import json
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# 🔥 LOAD ENV
load_dotenv()

# 🔥 IMPORT AUTH + DB
from backend.auth_system import get_current_user, get_db, save_analysis

# ------------------ ROUTER ------------------
router = APIRouter(
    prefix="/analyze",
    tags=["analyze"]
)

# ------------------ OPENROUTER ------------------
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

# ------------------ PROMPT ------------------
ANALYZER_PROMPT = """You are an AI assistant designed to structure trauma-related testimonies.

Return ONLY valid JSON.

OUTPUT FORMAT:
{
  "summary": "",
  "timeline": [
    {"event": "", "approx_time": "", "certainty": ""}
  ],
  "people_involved": [
    {"description": "", "role": "", "identified": true}
  ],
  "locations": [
    {"place": "", "certainty": ""}
  ],
  "key_events": [
  "List 3-6 important events from the incident"
],
  "missing_information": [],
  "uncertainty_flags": [],
  "confidence_score": 0
}

Rules:
- Do NOT hallucinate
- Preserve uncertainty
- Keep it factual
- key_events MUST NOT be empty
- Extract clear actions like approach, conflict, reaction, exit
"""

# ------------------ REQUEST MODEL ------------------
class AnalyzeRequest(BaseModel):
    text: str


# ------------------ MAIN API ------------------
@router.post("/")
async def analyze_testimony(
    request: AnalyzeRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        # 🔥 AI CALL
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Return ONLY valid JSON"},
                {"role": "user", "content": ANALYZER_PROMPT + "\n\nINPUT:\n" + request.text}
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Testimony Analyzer"
            }
        )

        result = response.choices[0].message.content
        structured_data = json.loads(result)

        # ------------------ DEFAULTS ------------------
        defaults = {
            "summary": "",
            "timeline": [],
            "people_involved": [],
            "locations": [],
            "key_events": [],
            "missing_information": [],
            "uncertainty_flags": [],
            "confidence_score": 0
        }

        for key in defaults:
            if key not in structured_data:
                structured_data[key] = defaults[key]

        # ------------------ CONFIDENCE ------------------
                # ------------------ CONFIDENCE ------------------
        # Start at a realistic baseline of 40 for any unverified statement
        score = 40
        
        text_length = len(request.text.split())
        
        # Word count bumps (up to +20)
        if text_length > 50: score += 10
        if text_length > 150: score += 10
        
        # Detail bumps (up to +40)
        if len(structured_data.get("timeline", [])) >= 3: score += 15
        if len(structured_data.get("people_involved", [])) >= 1: score += 10
        if len(structured_data.get("locations", [])) >= 1: score += 15

        # Heavy penalties for missing/uncertain facts
        score -= len(structured_data.get("missing_information", [])) * 15
        score -= len(structured_data.get("uncertainty_flags", [])) * 10
        
        # Extreme short testimony penalty (prevents <40 words from scoring high)
        if text_length < 20: score -= 30
        elif text_length < 40: score -= 20

        # Enforce bounds
        score = max(5, min(score, 95))

        structured_data["confidence_score"] = score

        # 🔥 SAVE TO DB
        save_analysis(db, user_id, request.text, structured_data)

        return structured_data

    except Exception as e:
        print("ERROR:", e)  # 🔥 debug log

        return {
            "summary": "System error occurred",
            "timeline": [],
            "people_involved": [],
            "locations": [],
            "key_events": [],
            "missing_information": [str(e)],
            "uncertainty_flags": [],
            "confidence_score": 10
        }


@router.post("/questions")
async def generate_questions(
    request: AnalyzeRequest,
    user_id: int = Depends(get_current_user)
):
    try:
        prompt = f"""
You are a detective analyzing a witness statement.

Based on the statement below, generate 8-10 sharp follow-up questions.

Goals:
- Identify missing information
- Clarify timeline
- Identify people
- Resolve inconsistencies

Rules:
- Ask short, precise questions
- No explanations
- No numbering text like "Question 1"
- Just return a JSON array of questions

STATEMENT:
{request.text}
"""

        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Return ONLY JSON array"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            response_format={"type": "json_object"}
        )

        result = response.choices[0].message.content
        questions = json.loads(result)

        return questions

    except Exception as e:
        return {"error": str(e)}        