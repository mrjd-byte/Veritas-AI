import os
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from sqlalchemy.orm import Session
from backend.auth_system import get_current_user, get_db, save_analysis

# Enable environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize the APIRouter for the interrogation feature
router = APIRouter(
    prefix="/interrogation",
    tags=["interrogation"]
)

# Setup OpenAI client for OpenRouter
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

# ----------------- MODELS -----------------
class QuestionRequest(BaseModel):
    text: str

class QAPair(BaseModel):
    question: str
    answer: str

class ReportRequest(BaseModel):
    original_text: str
    qa_pairs: list[QAPair]

# ----------------- ENDPOINTS -----------------

@router.post("/questions")
async def generate_questions(
    request: QuestionRequest,
    user_id: int = Depends(get_current_user)
):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Testimony text cannot be empty.")
        
    prompt = "You are a trauma-informed specialist. Generate 10-12 gentle, non-triggering follow-up questions to help the survivor safely recall missing legal details (who, what, when, where) without causing re-traumatization. Return ONLY a JSON array of questions."
    
    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Testimony:\n{request.text}"}
            ],
            temperature=0.3
        )
        
        reply = response.choices[0].message.content.strip()
        
        if reply.startswith("```"):
            lines = reply.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            reply = "\n".join(lines).strip()
            
        questions = json.loads(reply)
        
        if not isinstance(questions, list):
            if isinstance(questions, dict):
                for val in questions.values():
                    if isinstance(val, list):
                        return val
            raise ValueError("Response was not an array")
            
        return questions
        
    except Exception as e:
        print(f"Error in interrogation generating questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate questions. Please try again.")


@router.post("/report")
async def generate_final_report(
    request: ReportRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    qa_text = "\n\n".join([f"Q: {pair.question}\nA: {pair.answer}" for pair in request.qa_pairs])
    
    prompt = """You are an AI assistant generating a final comprehensive incident report.
You are given the original witness testimony and a set of follow-up questions with the witness's compiled answers.
Synthesize all this information into a cohesive, structured report.

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
- Synthesize both the original text and the new answers to form a complete picture.
- If a question was explicitly answered "Skipped", note the missing info under missing_information if critical.
- Ensure key_events is not empty.
- Write with a clinical, structured, and trauma-informed tone. Avoid judgmental language.
"""

    user_content = f"ORIGINAL TESTIMONY:\n{request.original_text}\n\nQ&A LOG:\n{qa_text}"

    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        result_text = response.choices[0].message.content
        structured_data = json.loads(result_text)
        
        # Calculate actual user word count (ignore the AI's question text)
        user_words = len(request.original_text.split())
        for pair in request.qa_pairs:
            if pair.answer.strip().lower() != "skipped":
                user_words += len(pair.answer.split())

        # ------------------ DETERMINISTIC CONFIDENCE ------------------
        score = 40
        
        # Word count bumps
        if user_words > 50: score += 10
        if user_words > 150: score += 10
        
        # Detail bumps
        if len(structured_data.get("timeline", [])) >= 3: score += 15
        if len(structured_data.get("people_involved", [])) >= 1: score += 10
        if len(structured_data.get("locations", [])) >= 1: score += 15

        # Penalties
        score -= len(structured_data.get("missing_information", [])) * 15
        score -= len(structured_data.get("uncertainty_flags", [])) * 10
        
        if user_words < 20: score -= 30
        elif user_words < 40: score -= 20

        # Enforce bounds
        score = max(5, min(score, 95))
        
        structured_data["confidence_score"] = score
        
        # Save to DB history
        save_analysis(db, user_id, f"[Interrogation Synthesis] {request.original_text[:100]}...", structured_data)
        
        return structured_data

    except Exception as e:
        print("Error compiling report:", e)
        raise HTTPException(status_code=500, detail=str(e))
