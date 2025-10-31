from typing import Optional, List, Dict, Any
import httpx
from config import get_settings

settings = get_settings()


async def get_llm_response(text: str, custom_context: str, db_context: str) -> str:
    """
    Gera resposta usando Qwen LLM via API OpenAI-compatible.

    LÓGICA DE PRIORIDADE DE CONTEXTO:
    - IF custom_context não vazio → final_context = custom_context (PRIORIDADE 1)
    - ELIF db_context não vazio → final_context = db_context (PRIORIDADE 2)
    - ELSE → final_context = "Nenhuma informação adicional" (FALLBACK)

    Args:
        text: Texto transcrito do áudio (input do usuário)
        custom_context: Contexto personalizado do usuário/KBF (PRIORITY 1)
        db_context: Contexto do RAG (base de conhecimento) (PRIORITY 2)

    Returns:
        Resposta gerada pelo LLM como string
    """
    try:
        # Aplica regra de prioridade para selecionar o contexto final

        if custom_context and custom_context.strip():
            # PRIORIDADE 1: Contexto do usuário/KBF
            final_context = custom_context.strip()
            context_source = "Contexto Personalizado do Usuário"

        elif db_context and db_context.strip():
            # PRIORIDADE 2: Contexto do RAG (base de conhecimento)
            final_context = db_context.strip()
            context_source = "Base de Conhecimento Interna (RAG)"

        else:
            # FALLBACK: Nenhum contexto disponível
            final_context = "Nenhuma informação adicional disponível."
            context_source = "Sem Contexto Específico"

        messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    "Você é um assistente de voz inteligente da Empresa XPTO, "
                    "especializado em fornecer respostas precisas e úteis.\n\n"
                    "INSTRUÇÕES DE COMPORTAMENTO:\n"
                    "- Seja sempre educado, prestativo e profissional\n"
                    "- Responda de forma clara, concisa e objetiva\n"
                    "- Use linguagem natural e acessível\n"
                    "- Mantenha um tom amigável mas profissional\n"
                    "- Se não souber algo, seja honesto e não invente informações"
                ),
            },
            {
                "role": "system",
                "content": (
                    f"CONTEXTO ADICIONAL (Fonte: {context_source}):\n"
                    f"{final_context}\n\n"
                    "COMO USAR O CONTEXTO:\n"
                    "- Se a pergunta do usuário estiver relacionada ao contexto acima, "
                    "use essas informações para fundamentar sua resposta\n"
                    "- Se a pergunta NÃO estiver relacionada ao contexto, responda "
                    "com base em seu conhecimento geral\n"
                    "- Priorize sempre a precisão e relevância da informação"
                ),
            },
            {"role": "user", "content": text},
        ]

        payload: Dict[str, Any] = {
            "model": settings.qwen_model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2000,
        }

        headers = {
            "Authorization": f"Bearer {settings.qwen_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.qwen_api_url}/chat/completions",
                json=payload,
                headers=headers,
            )

        response.raise_for_status()
        result = response.json()

        try:
            return result["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:  # pragma: no cover - defensive
            raise ValueError(f"Formato inesperado da resposta do Qwen: {result}") from exc

    except Exception as e:  # pragma: no cover - log amigável
        raise Exception(f"Erro ao gerar resposta com Qwen LLM: {str(e)}")


# ============================================================
# FUNÇÃO WRAPPER PARA COMPATIBILIDADE (Opcional)
# ============================================================
async def generate_response(
    transcription: str,
    context_text: Optional[str] = None,
    db_context: Optional[str] = None
) -> str:
    """
    Wrapper function para manter compatibilidade com código existente.
    Chama get_llm_response internamente.
    """
    # Converte None para string vazia para evitar erros
    custom_ctx = context_text if context_text else ""
    db_ctx = db_context if db_context else ""

    return await get_llm_response(
        text=transcription,
        custom_context=custom_ctx,
        db_context=db_ctx
    )
