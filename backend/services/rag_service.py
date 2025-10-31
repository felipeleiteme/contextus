"""
RAG Service - Retrieval Augmented Generation
Busca contexto relevante no banco de dados com base na transcrição
"""
from typing import List
from supabase import Client
import logging

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        # Modelo de embeddings (opcional - desativado por padrão para compatibilidade)
        self.model = None
        logger.info(
            "RAGService iniciado no modo fallback textual (sentence-transformers indisponível)."
        )

    def get_embedding(self, text: str) -> List[float]:
        """
        Gera embedding vetorial do texto usando sentence-transformers
        """
        if not self.model:
            raise RuntimeError("Modelo de embeddings indisponível")

        embedding = self.model.encode(text)
        return embedding.tolist()

    async def search_context(self, transcription: str, top_k: int = 3) -> str:
        """
        Busca contexto relevante no banco de dados baseado na transcrição

        Fluxo:
        1. Gera embedding da transcrição
        2. Busca no banco os documentos mais similares (usando pgvector ou busca textual)
        3. Retorna o contexto agregado dos documentos mais relevantes

        Args:
            transcription: Texto transcrito do áudio
            top_k: Número de documentos mais relevantes a buscar

        Returns:
            String contendo o contexto agregado do RAG
        """
        try:
            if self.model:
                logger.debug("Busca vetorial habilitada, mas não suportada nesta build.")

            # Opção 2: Busca textual simples (fallback)
            # Extrai palavras-chave da transcrição
            keywords = self._extract_keywords(transcription)

            if not keywords:
                logger.info("Nenhuma palavra-chave extraída, retornando contexto vazio")
                return ""

            # Busca documentos que contenham as palavras-chave
            result = self.supabase.table("knowledge_base").select("*").or_(
                ",".join([f"content.ilike.%{kw}%" for kw in keywords[:5]])  # Limita a 5 keywords
            ).limit(top_k).execute()

            if result.data and len(result.data) > 0:
                contexts = [doc['content'] for doc in result.data]
                db_context = "\n\n".join(contexts)
                logger.info(f"RAG encontrou {len(result.data)} documentos relevantes")
                return db_context

            logger.info("Nenhum contexto relevante encontrado no RAG")
            return ""

        except Exception as e:
            logger.error(f"Erro ao buscar contexto no RAG: {e}")
            # Em caso de erro, retorna string vazia (não bloqueia a requisição)
            return ""

    def _extract_keywords(self, text: str, min_length: int = 3) -> List[str]:
        """
        Extrai palavras-chave simples do texto (método básico)
        Para produção, considere usar spaCy ou outras bibliotecas NLP
        """
        # Remove pontuação e converte para minúsculas
        import re
        text_clean = re.sub(r'[^\w\s]', ' ', text.lower())

        # Remove stopwords comuns em português
        stopwords = {
            'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
            'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem',
            'e', 'ou', 'mas', 'que', 'se', 'como', 'é', 'são', 'foi', 'ser'
        }

        words = text_clean.split()
        keywords = [
            word for word in words
            if len(word) >= min_length and word not in stopwords
        ]

        return keywords[:10]  # Limita a 10 keywords


async def get_rag_context(supabase_client: Client, transcription: str) -> str:
    """
    Função helper para buscar contexto do RAG
    """
    rag_service = RAGService(supabase_client)
    return await rag_service.search_context(transcription)
