from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging
from auth import verify_jwt, check_subscription, supabase
from services.gladia_service import transcribe_audio
from services.qwen_service import generate_response
from services.rag_service import get_rag_context
from config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="Voice Assistant API",
    description="Backend API for Voice Assistant with Gladia AI and Qwen LLM",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your React Native app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "Voice Assistant API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/process-audio/")
async def process_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe and process"),
    context_text: Optional[str] = Form(None, description="Custom context/prompt from user (KBF) - PRIORITY 1"),
    user_data: dict = Depends(verify_jwt)
):
    """
    Main endpoint: Process audio file with RAG and context priority logic

    FLUXO COMPLETO:
    1. Valida Token JWT → extrai user_id
    2. Verifica assinatura (status do plano)
    3. Transcreve áudio com Gladia AI
    4. Busca contexto no RAG (db_context)
    5. Aplica lógica de prioridade:
       - Se context_text (usuário) não vazio → usa context_text
       - Senão → usa db_context (RAG)
    6. Gera resposta com Qwen LLM (transcrição + contexto final)
    7. Retorna JSON com transcrição e resposta
    """
    try:
        # ========== PASSO 1: VALIDAÇÃO JWT ==========
        # (já feito pelo Depends(verify_jwt))
        user_id = user_data["user_id"]
        logger.info(f"Processando áudio para user_id: {user_id}")

        # ========== PASSO 2: VERIFICAÇÃO DE ASSINATURA ==========
        subscription = await check_subscription(user_id)
        logger.info(f"Assinatura: {subscription['status']}")

        # ========== VALIDAÇÃO DO ARQUIVO ==========
        if not audio.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Must be an audio file."
            )

        # ========== PASSO 3: TRANSCRIÇÃO COM GLADIA AI ==========
        logger.info("Iniciando transcrição com Gladia AI...")
        transcription = await transcribe_audio(audio)
        logger.info(f"Transcrição concluída: {transcription[:100]}...")

        # ========== PASSO 4: BUSCA DE CONTEXTO NO RAG ==========
        logger.info("Buscando contexto no RAG...")
        db_context = await get_rag_context(supabase, transcription)

        if db_context:
            logger.info(f"RAG encontrou contexto: {len(db_context)} caracteres")
        else:
            logger.info("RAG não encontrou contexto relevante")

        # ========== PASSO 5 + 6: LÓGICA DE PRIORIDADE + GERAÇÃO DE RESPOSTA ==========
        logger.info("Gerando resposta com Qwen LLM...")

        # A lógica de prioridade está implementada dentro de generate_response:
        # 1º: context_text (do usuário/KBF)
        # 2º: db_context (do RAG)
        response_text = await generate_response(
            transcription=transcription,
            context_text=context_text,
            db_context=db_context
        )

        logger.info("Resposta gerada com sucesso")

        # ========== PASSO 7: RETORNO DO RESULTADO ==========
        return {
            "success": True,
            "user_id": user_id,
            "subscription_status": subscription["status"],
            "transcription": transcription,
            "response": response_text,
            "context_used": "user_context" if (context_text and context_text.strip()) else ("rag_context" if db_context else "no_context")
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no processamento: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.environment == "development"
    )
