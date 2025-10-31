# Fluxo Detalhado do Endpoint /process-audio/

Este documento descreve o fluxo completo de dados que ocorre no endpoint principal do sistema.

---

## 📋 Visão Geral

```
Frontend (React Native)
    ↓
[POST /process-audio/]
    ↓
Backend (FastAPI)
    ↓
[1] Validação JWT
    ↓
[2] Verificação de Assinatura/Créditos
    ↓
[3] Transcrição (Gladia AI)
    ↓
[4] Busca de Contexto (RAG)
    ↓
[5] Lógica de Prioridade de Contexto
    ↓
[6] Geração de Resposta (Qwen LLM)
    ↓
[7] Consumo de Crédito
    ↓
[8] Retorno JSON
```

---

## 🔄 Fluxo Passo a Passo

### **ENTRADA - Frontend envia:**

```http
POST /process-audio/
Headers:
  Authorization: Bearer <jwt_token_do_supabase>
  Content-Type: multipart/form-data

Body (FormData):
  - audio: arquivo de áudio (File)
  - context_text: contexto personalizado/KBF (string, opcional)
```

---

### **PASSO 1: Validação do Token JWT**

**Arquivo:** `backend/auth.py:14` - função `verify_jwt()`

1. Backend recebe o JWT do header `Authorization`
2. Decodifica o token usando `SUPABASE_JWT_SECRET`
3. Extrai `user_id` do payload
4. Se inválido → retorna **401 Unauthorized**
5. Se válido → continua com `user_id` extraído

**Código:**
```python
payload = jwt.decode(
    token,
    settings.supabase_jwt_secret,
    algorithms=["HS256"],
    audience="authenticated"
)
user_id = payload.get("sub")
```

---

### **PASSO 2: Verificação de Assinatura e Créditos**

**Arquivo:** `backend/auth.py:49` - função `check_subscription()`

1. Consulta tabela `subscriptions` no Supabase
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '<user_id>'
   ```

2. Verifica `status` da assinatura:
   - `premium`: créditos ilimitados
   - `gratuito`: verifica campo `credits`

3. **Regras:**
   - Se `is_premium = True` → passa (sem verificação de créditos)
   - Se `is_premium = False` AND `credits <= 0` → retorna **402 Payment Required**
   - Se `is_premium = False` AND `credits > 0` → passa

4. Retorna objeto:
```python
{
    "status": "premium" | "gratuito",
    "is_premium": bool,
    "credits": int,
    "expires_at": datetime | None
}
```

**Erro 402 (Sem créditos):**
```json
{
  "detail": "Créditos insuficientes. Faça upgrade para premium ou aguarde a renovação mensal."
}
```

---

### **PASSO 3: Transcrição com Gladia AI**

**Arquivo:** `backend/services/gladia_service.py:11` - função `transcribe_audio()`

1. Lê bytes do arquivo de áudio
2. Envia para API da Gladia:
   ```http
   POST https://api.gladia.io/v2/transcription
   Headers:
     x-gladia-key: <GLADIA_API_KEY>
   Body:
     audio: <arquivo>
   ```

3. Gladia retorna JSON:
   ```json
   {
     "transcription": {
       "text": "Quanto custa o produto xpto?"
     }
   }
   ```

4. Extrai o texto transcrito
5. Retorna string: `"Quanto custa o produto xpto?"`

---

### **PASSO 4: Busca de Contexto no RAG (Base de Conhecimento)**

**Arquivo:** `backend/services/rag_service.py:61` - função `search_context()`

#### **4.1 - Geração de Embedding**
1. Usa modelo `sentence-transformers/all-MiniLM-L6-v2`
2. Converte transcrição em vetor numérico (384 dimensões)

```python
query_embedding = model.encode("Quanto custa o produto xpto?")
# Resultado: [0.123, -0.456, 0.789, ...] (384 valores)
```

#### **4.2 - Busca Semântica (Opção 1 - pgvector)**
Se a extensão `pgvector` estiver instalada no Supabase:

```sql
SELECT * FROM match_documents(
  query_embedding := '<vetor>',
  match_threshold := 0.5,
  match_count := 3
)
```

Função `match_documents()` retorna documentos mais similares usando distância de cosseno.

#### **4.3 - Busca Textual (Opção 2 - Fallback)**
Se pgvector não estiver disponível, usa busca textual simples:

1. Extrai palavras-chave: `["quanto", "custa", "produto", "xpto"]`
2. Remove stopwords: `["custa", "produto", "xpto"]`
3. Busca no banco:
   ```sql
   SELECT * FROM knowledge_base
   WHERE content ILIKE '%custa%'
      OR content ILIKE '%produto%'
      OR content ILIKE '%xpto%'
   LIMIT 3
   ```

#### **4.4 - Resultado do RAG**
Retorna `db_context` agregado:

```python
db_context = """
Nosso produto xpto custa R$ 99,90 e possui garantia de 12 meses.
Ele é ideal para quem busca qualidade e preço acessível.

Você pode devolver qualquer produto em até 30 dias após a compra.
"""
```

Se nenhum documento relevante → retorna `""` (string vazia)

---

### **PASSO 5: Lógica de Prioridade de Contexto**

**Arquivo:** `backend/services/qwen_service.py:46` - função `generate_response()`

#### **Regras de Prioridade:**

```python
# PRIORITY 1: context_text (do usuário/KBF)
if context_text and context_text.strip():
    final_context = context_text
    context_source = "contexto personalizado do usuário"

# PRIORITY 2: db_context (do RAG)
elif db_context and db_context.strip():
    final_context = db_context
    context_source = "base de conhecimento interna"

# SEM CONTEXTO
else:
    final_context = None
    context_source = None
```

**Exemplos:**

| context_text | db_context | Contexto Usado | Fonte |
|--------------|------------|----------------|-------|
| "Você é assistente técnico" | "Produto xpto custa R$ 99" | context_text | usuário |
| "" (vazio) | "Produto xpto custa R$ 99" | db_context | RAG |
| "Você é assistente técnico" | "" (vazio) | context_text | usuário |
| "" (vazio) | "" (vazio) | None | - |

---

### **PASSO 6: Geração de Resposta com Qwen LLM**

**Arquivo:** `backend/services/qwen_service.py:60` - construção do prompt

#### **6.1 - Construção do Prompt do Sistema**

**COM contexto:**
```python
system_content = f"""Você é um assistente de voz inteligente e prestativo.

CONTEXTO RELEVANTE (fonte: {context_source}):
{final_context}

INSTRUÇÕES:
- Responda de forma natural, concisa e útil
- Use o contexto acima para fornecer respostas mais precisas
- Se a pergunta estiver relacionada ao contexto, use essas informações
- Seja direto e objetivo nas respostas"""
```

**SEM contexto:**
```python
system_content = """Você é um assistente de voz inteligente e prestativo.

INSTRUÇÕES:
- Responda de forma natural, concisa e útil
- Seja direto e objetivo nas respostas
- Use seu conhecimento geral para ajudar o usuário"""
```

#### **6.2 - Chamada ao Qwen LLM**

```python
messages = [
    SystemMessage(content=system_content),
    HumanMessage(content="Quanto custa o produto xpto?")
]

response = await llm.agenerate([messages])
```

#### **6.3 - Resposta Gerada**

Exemplo de resposta do LLM:
```
"O produto xpto custa R$ 99,90 e possui garantia de 12 meses.
É uma ótima opção para quem busca qualidade e preço acessível."
```

---

### **PASSO 7: Consumo de Crédito**

**Arquivo:** `backend/auth.py:109` - função `consume_credit()`

1. Busca assinatura do usuário
2. **Se premium:** não desconta (créditos ilimitados)
3. **Se gratuito:** desconta 1 crédito

```sql
UPDATE subscriptions
SET credits = credits - 1
WHERE user_id = '<user_id>'
  AND status = 'gratuito'
```

4. Não bloqueia a requisição em caso de erro (apenas registra log)

---

### **PASSO 8: Retorno do Resultado**

**Arquivo:** `backend/main.py:120` - resposta final

```json
{
  "success": true,
  "user_id": "abc123-uuid",
  "subscription_status": "gratuito",
  "credits_remaining": 9,
  "transcription": "Quanto custa o produto xpto?",
  "response": "O produto xpto custa R$ 99,90 e possui garantia de 12 meses.",
  "context_used": "rag_context"
}
```

**Campos:**
- `success`: sempre `true` (se chegou aqui)
- `user_id`: UUID do usuário autenticado
- `subscription_status`: `"premium"` ou `"gratuito"`
- `credits_remaining`: créditos após o consumo
- `transcription`: texto transcrito do áudio
- `response`: resposta gerada pelo LLM
- `context_used`: qual contexto foi usado:
  - `"user_context"`: context_text do usuário
  - `"rag_context"`: db_context do RAG
  - `"no_context"`: sem contexto

---

## 🚨 Tratamento de Erros

| Código | Erro | Causa |
|--------|------|-------|
| 400 | Bad Request | Arquivo não é áudio |
| 401 | Unauthorized | Token JWT inválido/expirado |
| 402 | Payment Required | Sem créditos (plano gratuito) |
| 403 | Forbidden | Assinatura inativa |
| 500 | Internal Server Error | Erro no processamento (Gladia, Qwen, RAG) |

---

## 📊 Diagrama de Sequência

```
Frontend                Backend                Supabase DB            Gladia AI           Qwen LLM
   |                       |                        |                       |                  |
   |--POST /process-audio->|                        |                       |                  |
   |  (audio + context)    |                        |                       |                  |
   |                       |                        |                       |                  |
   |                       |--verify JWT----------->|                       |                  |
   |                       |<-user_id---------------|                       |                  |
   |                       |                        |                       |                  |
   |                       |--check subscription--->|                       |                  |
   |                       |<-status + credits------|                       |                  |
   |                       |  (402 se sem créditos) |                       |                  |
   |                       |                        |                       |                  |
   |                       |--send audio------------------------>|          |                  |
   |                       |<-transcription--------------------|           |                  |
   |                       |                        |                       |                  |
   |                       |--search RAG----------->|                       |                  |
   |                       |<-db_context------------|                       |                  |
   |                       |                        |                       |                  |
   |                       | [aplica prioridade]    |                       |                  |
   |                       |  context_text > db_context                     |                  |
   |                       |                        |                       |                  |
   |                       |--generate response-------------------------------->|              |
   |                       |  (transcription + final_context)                   |              |
   |                       |<-response------------------------------------------------|          |
   |                       |                        |                       |                  |
   |                       |--consume credit------->|                       |                  |
   |                       |                        |                       |                  |
   |<-JSON response--------|                        |                       |                  |
   |  (transcription +     |                        |                       |                  |
   |   response)           |                        |                       |                  |
```

---

## 🔍 Logs de Exemplo

```
INFO: Processando áudio para user_id: abc123-uuid
INFO: Assinatura: gratuito, Créditos: 10
INFO: Iniciando transcrição com Gladia AI...
INFO: Transcrição concluída: Quanto custa o produto xpto?...
INFO: Buscando contexto no RAG...
INFO: RAG encontrou contexto: 156 caracteres
INFO: Gerando resposta com Qwen LLM...
INFO: Resposta gerada com sucesso
INFO: Crédito consumido (se plano gratuito)
```

---

## 📝 Notas Importantes

1. **Prioridade de Contexto**: `context_text` (usuário) **sempre** tem prioridade sobre `db_context` (RAG)

2. **Créditos Ilimitados**: Usuários premium não têm créditos descontados

3. **Busca RAG**: Funciona mesmo sem pgvector (usa fallback textual)

4. **Segurança**: JWT validado em **toda** requisição

5. **Desempenho**: RAG usa cache de embeddings quando possível

6. **Escalabilidade**: Backend stateless, pode rodar múltiplas instâncias
