# Contextus - Voice Assistant com IA e RAG

Sistema completo de assistente de voz com arquitetura modular:
- **Transcrição de áudio** (Gladia AI v2)
- **Sistema RAG** (Retrieval Augmented Generation) para busca de contexto
- **Geração de resposta** (Qwen LLM via LangChain)
- **Autenticação e Assinatura** (Supabase Auth + PostgreSQL)
- **Lógica de Prioridade de Contexto** (usuário > RAG > fallback)

## 📁 Estrutura do Projeto

```
Contextus/
├── backend/              # API Python FastAPI
│   ├── main.py          # Endpoint principal
│   ├── auth.py          # Autenticação JWT e validação de assinatura
│   ├── config.py        # Configurações (Pydantic Settings)
│   ├── services/
│   │   ├── gladia_service.py   # Integração Gladia AI v2 (upload + transcription)
│   │   ├── qwen_service.py     # Integração Qwen LLM (geração)
│   │   └── rag_service.py      # Sistema RAG (busca semântica)
│   ├── requirements.txt
│   ├── .env             # Variáveis de ambiente (não commitado)
│   └── .venv/           # Ambiente virtual Python
│
├── frontend/            # App React Native (Expo)
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.ts       # Cliente Supabase
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx   # Contexto de autenticação
│   │   ├── services/
│   │   │   └── api.ts            # Cliente API
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── VoiceScreen.tsx   # Tela principal
│   │   └── navigation/
│   │       └── AppNavigator.tsx
│   ├── App.tsx
│   ├── index.ts
│   └── package.json
│
├── docs/                # Documentação detalhada
│   ├── INDEX.md
│   ├── FLUXO_DETALHADO.md
│   ├── INSTALACAO_RAPIDA.md
│   └── ...
│
└── .gitignore           # Arquivos ignorados pelo Git
```

## 🚀 Configuração e Instalação

### Backend (Python/FastAPI)

1. **Navegue até o diretório do backend:**
```bash
cd backend
```

2. **Crie um ambiente virtual:**
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# ou
.venv\Scripts\activate  # Windows
```

3. **Instale as dependências:**
```bash
pip install -r requirements.txt
```

4. **Configure as variáveis de ambiente:**

Crie um arquivo `.env` no diretório `backend/`:
```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon
SUPABASE_JWT_SECRET=seu-jwt-secret

# Gladia AI v2
GLADIA_API_KEY=sua-chave-gladia

# Qwen LLM (DashScope)
DASHSCOPE_API_KEY=sua-chave-qwen
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL_NAME=qwen-plus
```

5. **Execute o servidor:**
```bash
# Opção 1: Diretamente
python main.py

# Opção 2: Com uvicorn (recomendado para desenvolvimento)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

O backend estará disponível em:
- API: `http://localhost:8000`
- Docs interativa: `http://localhost:8000/docs`

### Frontend (React Native/Expo)

1. **Navegue até o diretório do frontend:**
```bash
cd frontend
```

2. **Instale as dependências:**
```bash
npm install
# ou
yarn install
```

3. **Configure as variáveis de ambiente:**

Crie um arquivo `.env` no diretório `frontend/`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
EXPO_PUBLIC_API_URL=http://192.168.X.X:8000
```

**Importante:**
- Use o IP da sua máquina (não `localhost`) para testar em dispositivo físico
- No Mac/Linux, obtenha o IP com: `ifconfig | grep "inet "`
- No Windows: `ipconfig`

4. **Execute o app:**
```bash
npm start
# ou para plataformas específicas:
npm run android
npm run ios
```

## 🗄️ Configuração do Supabase

### 1. Criar Projeto

Acesse [Supabase](https://supabase.com) e crie um novo projeto.

### 2. Configurar Tabelas

Execute o SQL abaixo no **SQL Editor** do Supabase Dashboard:

```sql
-- Habilitar extensão pgvector para busca semântica
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de assinaturas
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('premium', 'gratuito')) DEFAULT 'gratuito',
  credits INTEGER DEFAULT 10,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de base de conhecimento (RAG)
CREATE TABLE knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(384),  -- Para sentence-transformers all-MiniLM-L6-v2
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas sua própria assinatura
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Qualquer usuário autenticado pode ler a knowledge_base
CREATE POLICY "Authenticated users can read knowledge_base"
  ON knowledge_base FOR SELECT
  TO authenticated
  USING (true);

-- Função para busca semântica (opcional, se usar pgvector)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
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
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3. Obter Credenciais

No Supabase Dashboard:
- **URL**: `Settings > API > Project URL`
- **Anon Key**: `Settings > API > Project API keys > anon public`
- **JWT Secret**: `Settings > API > JWT Settings > JWT Secret`

## 📡 API Endpoints

### Backend (FastAPI)

Base URL: `http://localhost:8000`
Documentação interativa: `http://localhost:8000/docs`

#### `GET /`
Status da API
```json
{
  "service": "Voice Assistant API",
  "status": "running",
  "version": "1.0.0"
}
```

#### `GET /health`
Health check
```json
{
  "status": "healthy"
}
```

#### `POST /process-audio/`
**Processa áudio com transcrição, RAG e geração de resposta**

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (FormData):**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `audio` | File | Sim | Arquivo de áudio (m4a, mp3, wav, etc.) |
| `context_text` | String | Não | Contexto personalizado (PRIORIDADE 1) |

**Response (200 OK):**
```json
{
  "success": true,
  "user_id": "uuid",
  "subscription_status": "premium",
  "transcription": "texto transcrito...",
  "response": "resposta gerada pelo LLM...",
  "context_used": "user_context"
}
```

**Erros:**
| Código | Descrição |
|--------|-----------|
| `400` | Arquivo inválido (não é áudio) |
| `401` | Token JWT inválido ou expirado |
| `403` | Assinatura inativa |
| `500` | Erro interno (Gladia, Qwen, RAG) |

## 🔒 Autenticação e Segurança

- **JWT Token**: Gerado pelo Supabase Auth
- **Validação**: Todo request ao `/process-audio/` valida o token
- **Assinatura**: Status verificado antes do processamento
- **CORS**: Configurado no backend (ajustar para produção)

## 🎯 Fluxo de Uso

### Frontend → Backend
1. **Autenticação**: Usuário faz login → Supabase Auth gera JWT
2. **Gravação**: Usuário grava áudio com expo-av
3. **Envio**: App envia `audio` + opcional `context_text` para `/process-audio/`

### Backend (main.py)
4. **Validação JWT** (`auth.py`): Extrai `user_id` do token
5. **Verificação Assinatura** (`auth.py`): Consulta Supabase `subscriptions`
6. **Transcrição** (`gladia_service.py`):
   - Upload do áudio para Gladia API v2: `POST /v2/upload`
   - Inicia transcrição: `POST /v2/pre-recorded`
   - Polling até status `done`
7. **Busca RAG** (`rag_service.py`): Busca contexto em `knowledge_base`
8. **Geração de Resposta** (`qwen_service.py`):
   - **Lógica de Prioridade**:
     - `context_text` (usuário) > `db_context` (RAG) > fallback
   - Qwen LLM gera resposta contextualizada
9. **Retorno**: JSON com transcrição + resposta

### Frontend
10. **Exibição**: App mostra transcrição e resposta ao usuário

📄 **Documentação completa:** [docs/FLUXO_DETALHADO.md](docs/FLUXO_DETALHADO.md)

## 🛠️ Stack Tecnológica

### Backend (Python)
| Tecnologia | Propósito |
|------------|-----------|
| **FastAPI** | Framework web assíncrono |
| **Pydantic Settings** | Gerenciamento de configurações |
| **Supabase Python SDK** | Cliente PostgreSQL + Auth |
| **LangChain** | Orquestração LLM (prompts, chains) |
| **Sentence Transformers** | Embeddings para RAG (all-MiniLM-L6-v2) |
| **httpx** | Cliente HTTP assíncrono |
| **python-jose** | Validação JWT |

### Frontend (React Native)
| Tecnologia | Propósito |
|------------|-----------|
| **Expo** | Framework e toolchain |
| **TypeScript** | Tipagem estática |
| **Supabase JS** | Cliente Supabase Auth |
| **expo-av** | Gravação de áudio |
| **React Navigation** | Navegação entre telas |
| **AsyncStorage** | Armazenamento local |

### APIs Externas
| Serviço | Função |
|---------|--------|
| **Supabase** | Autenticação + PostgreSQL (pgvector) |
| **Gladia AI v2** | Transcrição de áudio (upload → pre-recorded) |
| **Qwen LLM** | Geração de resposta (via DashScope API) |

## 🧠 Sistema RAG (Retrieval Augmented Generation)

O sistema utiliza RAG para buscar contexto relevante na base de conhecimento:

### Como Funciona

1. **Embedding**: Transcrição é convertida em vetor numérico (384 dimensões)
2. **Busca Semântica**: Compara com documentos na tabela `knowledge_base`
3. **Ranking**: Retorna top 3 documentos mais similares
4. **Agregação**: Combina conteúdo dos documentos em `db_context`

### Métodos de Busca

**Opção 1 - Busca Vetorial (pgvector):**
- Requer extensão `pgvector` no Supabase
- Usa função `match_documents()` com similaridade de cosseno
- Mais precisa e eficiente

**Opção 2 - Busca Textual (Fallback):**
- Não requer pgvector
- Extrai palavras-chave da transcrição
- Busca com `ILIKE` no PostgreSQL

### Lógica de Prioridade de Contexto

```
┌─────────────────────────────────────┐
│ context_text enviado pelo usuário?  │
└────────────┬────────────────────────┘
             │
          Sim│  Não
             │
             ▼
    ┌─────────────────┐
    │ Usa context_text│ ◄─── PRIORIDADE 1 (Usuário/KBF)
    └─────────────────┘
             │
          Não│
             ▼
    ┌─────────────────┐
    │ db_context do   │ ◄─── PRIORIDADE 2 (RAG)
    │ RAG disponível? │
    └────────┬────────┘
             │
          Sim│  Não
             │
             ▼
    ┌─────────────────┐
    │ Usa db_context  │
    └─────────────────┘
             │
          Não│
             ▼
    ┌─────────────────┐
    │ Sem contexto    │ ◄─── BASE (apenas instruções)
    └─────────────────┘
```

## 📊 Sistema de Assinaturas

O projeto está preparado para gerenciar planos, mas atualmente funciona apenas com validação de JWT.

### Estrutura (Supabase)
```sql
subscriptions
├── user_id (FK → auth.users)
├── status ('premium' | 'gratuito')
├── credits (para planos gratuitos)
└── expires_at
```

### Implementação Futura
- Plano Gratuito: X transcrições/mês
- Plano Premium: Ilimitado
- Integração com Stripe/Payment Gateway

## 🧪 Testando o Projeto

### Checklist
- [ ] Backend rodando em `http://localhost:8000`
- [ ] Frontend conectado ao IP correto (não `localhost`)
- [ ] Supabase configurado (tabelas + RLS)
- [ ] Variáveis `.env` configuradas (backend + frontend)
- [ ] Usuário criado no Supabase Auth
- [ ] Permissões de microfone concedidas no app

### Problemas Comuns

| Problema | Solução |
|----------|---------|
| **Backend não conecta ao Supabase** | Verifique credenciais no `.env` |
| **Gladia retorna 400** | ✅ Corrigido! Agora usa fluxo upload → transcription |
| **Frontend não envia áudio** | Use IP da máquina, não `localhost` |
| **Erro de CORS** | Configure `allow_origins` no `main.py` |
| **Token JWT inválido** | Verifique `SUPABASE_JWT_SECRET` no backend |

## 📚 Documentação Adicional

- **[INDEX.md](docs/INDEX.md)** - Índice completo da documentação
- **[FLUXO_DETALHADO.md](docs/FLUXO_DETALHADO.md)** - Fluxo detalhado de funcionamento
- **[INSTALACAO_RAPIDA.md](docs/INSTALACAO_RAPIDA.md)** - Guia de instalação rápida
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Resolução de problemas

## 🚀 Roadmap

- [ ] Implementar sistema de créditos/planos
- [ ] Adicionar Text-to-Speech para respostas
- [ ] Histórico de conversas
- [ ] Cache de transcrições
- [ ] Rate limiting por usuário
- [ ] Testes automatizados (pytest + jest)
- [ ] CI/CD pipeline
- [ ] Deploy: Backend (Railway) + Frontend (EAS Build)

## 📄 Licença

Este é um projeto privado. Todos os direitos reservados.

---

**Desenvolvido com ❤️ usando FastAPI, React Native e IA**
