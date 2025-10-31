-- Script SQL para configuração inicial do Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Habilitar extensões necessárias (execute apenas uma vez)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar tabela de assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('premium', 'gratuito')),
  credits INTEGER NOT NULL DEFAULT 10,  -- Créditos mensais (10 para gratuito, ilimitado para premium)
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ler sua própria assinatura
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Apenas admins podem inserir/atualizar assinaturas
-- (você pode ajustar isso conforme sua necessidade)
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar assinatura gratuita automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION create_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, credits)
  VALUES (NEW.id, 'gratuito', 10);  -- 10 créditos iniciais
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar assinatura automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription();

-- Inserir dados de exemplo (opcional - remova se não quiser)
-- Substitua 'user-uuid' pelo UUID de um usuário de teste
-- INSERT INTO subscriptions (user_id, status, expires_at)
-- VALUES
--   ('seu-user-uuid-aqui', 'premium', NOW() + INTERVAL '30 days'),
--   ('outro-user-uuid', 'gratuito', NULL);

COMMENT ON TABLE subscriptions IS 'Armazena o status de assinatura dos usuários';
COMMENT ON COLUMN subscriptions.status IS 'Status da assinatura: premium ou gratuito';
COMMENT ON COLUMN subscriptions.credits IS 'Créditos disponíveis (10/mês para gratuito, ilimitado para premium)';
COMMENT ON COLUMN subscriptions.expires_at IS 'Data de expiração para assinaturas premium (NULL para gratuito)';

-- ============================================================
-- TABELA KNOWLEDGE_BASE - Para o sistema RAG
-- ============================================================

-- Criar tabela de base de conhecimento para RAG
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  metadata JSONB,  -- Informações adicionais (tags, fonte, etc.)
  embedding VECTOR(384),  -- Vetores para busca semântica (requer extensão pgvector)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice de texto completo para busca rápida
CREATE INDEX IF NOT EXISTS idx_knowledge_base_content_search ON knowledge_base USING GIN (to_tsvector('portuguese', content));

-- Criar índice para categoria
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);

-- Habilitar Row Level Security (RLS)
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler a base de conhecimento
DROP POLICY IF EXISTS "Public read access to knowledge base" ON knowledge_base;
CREATE POLICY "Public read access to knowledge base"
  ON knowledge_base FOR SELECT
  USING (true);  -- Todos podem ler

-- Policy: Apenas service role pode inserir/atualizar
DROP POLICY IF EXISTS "Service role can manage knowledge base" ON knowledge_base;
CREATE POLICY "Service role can manage knowledge base"
  ON knowledge_base FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE knowledge_base IS 'Base de conhecimento para o sistema RAG (Retrieval Augmented Generation)';
COMMENT ON COLUMN knowledge_base.content IS 'Conteúdo do documento/conhecimento';
COMMENT ON COLUMN knowledge_base.embedding IS 'Vetor de embeddings para busca semântica (requer pgvector)';

-- ============================================================
-- FUNÇÃO PARA BUSCA SEMÂNTICA (Requer extensão pgvector)
-- ============================================================
-- IMPORTANTE: Para usar busca vetorial, execute primeiro:
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Função de busca por similaridade vetorial
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(384),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    knowledge_base.category,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE knowledge_base.embedding IS NOT NULL
    AND 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_documents IS 'Busca documentos similares usando embeddings vetoriais (requer pgvector)';

-- ============================================================
-- DADOS DE EXEMPLO PARA KNOWLEDGE_BASE (Opcional)
-- ============================================================
-- Insira alguns documentos de exemplo na base de conhecimento
-- Remova ou ajuste conforme sua necessidade

INSERT INTO knowledge_base (title, content, category) VALUES
  (
    'Informações sobre Produtos',
    'Nosso produto xpto custa R$ 99,90 e possui garantia de 12 meses. Ele é ideal para quem busca qualidade e preço acessível.',
    'produtos'
  ),
  (
    'Política de Devolução',
    'Você pode devolver qualquer produto em até 30 dias após a compra, sem necessidade de justificativa. O reembolso é processado em até 7 dias úteis.',
    'politicas'
  ),
  (
    'Horário de Atendimento',
    'Nosso atendimento funciona de segunda a sexta, das 9h às 18h. Fora desse horário, deixe uma mensagem que retornaremos assim que possível.',
    'atendimento'
  )
ON CONFLICT DO NOTHING;
