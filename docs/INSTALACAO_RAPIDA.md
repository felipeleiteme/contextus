# 🚀 Guia de Instalação Rápida - Contextus

## Arquivos Gerados

Os seguintes arquivos completos foram criados:

### Backend
- ✅ `backend/requirements.txt` - Todas as dependências Python
- ✅ `backend/main_complete.py` - Servidor FastAPI completo
- ✅ `backend/.env.example` - Template de variáveis de ambiente

### Frontend
- ✅ `frontend/App_complete.jsx` - Componente React Native completo
- ✅ `frontend/package_complete.json` - Dependências Node.js

---

## 📋 Pré-requisitos

- Python 3.9+
- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta no [Gladia AI](https://gladia.io)
- Acesso à API do Qwen LLM

---

## 🔧 Configuração do Backend

### 1. Instalar Dependências

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret

# Gladia AI
GLADIA_API_KEY=your-gladia-key
GLADIA_API_URL=https://api.gladia.io/v2/transcription

# Qwen LLM
QWEN_API_KEY=your-qwen-key
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-turbo
```

### 3. Configurar Banco de Dados (Supabase)

Execute o script SQL no Supabase SQL Editor:

```bash
# Arquivo: backend/supabase_setup.sql
```

Este script cria:
- Tabela `subscriptions` (com campo `credits`)
- Tabela `knowledge_base` (para RAG)
- Função `match_documents()` (busca semântica)
- Triggers e policies

**IMPORTANTE:** Habilite a extensão pgvector (opcional, mas recomendado):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Executar o Backend

```bash
# Usando o arquivo completo
python main_complete.py

# Ou usando uvicorn diretamente
uvicorn main_complete:app --reload --host 0.0.0.0 --port 8000
```

O servidor estará disponível em: `http://localhost:8000`

Acesse a documentação interativa: `http://localhost:8000/docs`

---

## 📱 Configuração do Frontend

### 1. Copiar Arquivos Completos

Substitua os arquivos originais pelos completos:

```bash
cd frontend
cp App_complete.jsx App.jsx
cp package_complete.json package.json
```

### 2. Instalar Dependências

```bash
npm install
# ou
yarn install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do frontend:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
```

**IMPORTANTE:**
- Use o **IP da sua máquina** (não `localhost`)
- Para encontrar seu IP:
  - **Mac/Linux**: `ifconfig | grep inet`
  - **Windows**: `ipconfig`

### 4. Executar o App

```bash
npm start
```

Isso abrirá o Expo Dev Tools. Escaneie o QR code com:
- **Android**: App Expo Go
- **iOS**: App Expo Go

---

## 🧪 Teste Completo

### 1. Criar Usuário de Teste

No app:
1. Clique em "Cadastrar"
2. Insira email e senha
3. Verifique o email de confirmação do Supabase

### 2. Verificar Criação Automática de Assinatura

No Supabase Dashboard → Table Editor → `subscriptions`:

Deve aparecer automaticamente uma linha com:
- `user_id`: UUID do usuário
- `status`: `gratuito`
- `credits`: `10`

### 3. Testar Gravação de Áudio

1. Faça login no app
2. **(Opcional)** Cole um contexto personalizado no campo de texto:
   ```
   Você é um assistente técnico especializado em Python.
   Sempre forneça exemplos de código quando relevante.
   ```
3. Toque no botão "🎤 Gravar"
4. Fale algo (ex: "Como fazer um loop em Python?")
5. Toque em "🔴 Parar"
6. Aguarde o processamento (~15-30 segundos)

### 4. Verificar Resultados

O app deve exibir:
- **Transcrição**: "Como fazer um loop em Python?"
- **Resposta da IA**: Resposta contextualizada
- **Contexto usado**: "Personalizado (KBF)" ou "Base de Conhecimento (RAG)"
- **Créditos**: Agora deve mostrar `9` (se plano gratuito)

---

## 🔍 Verificar Logs

### Backend

```bash
# Logs aparecem no terminal onde você executou:
python main_complete.py

# Exemplo de log:
INFO: === Processando áudio para user_id: abc123-uuid ===
INFO: Assinatura validada: gratuito, Créditos: 10
INFO: Iniciando transcrição com Gladia AI...
INFO: Transcrição concluída: Como fazer um loop em Python?...
INFO: Buscando contexto no RAG...
INFO: RAG não encontrou contexto relevante
INFO: Usando contexto personalizado do usuário
INFO: Gerando resposta com Qwen LLM...
INFO: Resposta gerada com sucesso
INFO: Crédito consumido. Restam: 9
```

### Frontend

```bash
# Logs aparecem no console do Expo:
Gravação iniciada
Áudio gravado em: file:///...
Enviando com contexto personalizado
Enviando áudio para: http://192.168.1.10:8000/process-audio/
Resposta recebida: {success: true, transcription: "...", ...}
```

---

## 📊 Fluxo Completo (Recap)

```
┌─────────────────┐
│ FRONTEND        │
│ (App.jsx)       │
└────────┬────────┘
         │
         │ 1. Usuário grava áudio
         │ 2. Frontend envia POST:
         │    - audio (FormData)
         │    - custom_context (opcional)
         │    - Authorization: Bearer <JWT>
         │
         ▼
┌─────────────────────────────────────┐
│ BACKEND                             │
│ (main_complete.py)                  │
│                                     │
│ /process-audio/                     │
│   ↓                                 │
│ 1. verify_jwt()                     │
│   → Valida token                    │
│   → Extrai user_id                  │
│   ↓                                 │
│ 2. check_subscription()             │
│   → Consulta Supabase               │
│   → Verifica créditos               │
│   → 402 se sem créditos             │
│   ↓                                 │
│ 3. transcribe_audio_gladia()        │
│   → Envia para Gladia AI            │
│   → Retorna transcrição             │
│   ↓                                 │
│ 4. search_rag_context()             │
│   → Busca em knowledge_base         │
│   → Retorna db_context              │
│   ↓                                 │
│ 5. get_llm_response()               │
│   ↓                                 │
│   IF custom_context → usa custom    │
│   ELIF db_context → usa RAG         │
│   ELSE → fallback                   │
│   ↓                                 │
│   Chain: Prompt | Qwen | Parser    │
│   ↓                                 │
│ 6. consume_credit()                 │
│   → -1 crédito (se gratuito)        │
│   ↓                                 │
│ 7. Retorna JSON                     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ FRONTEND        │
│ Exibe:          │
│ - Transcrição   │
│ - Resposta      │
│ - Créditos      │
└─────────────────┘
```

---

## 🐛 Troubleshooting

### Erro 401 (Unauthorized)

**Causa:** Token JWT inválido
**Solução:**
- Faça logout e login novamente no app
- Verifique se `SUPABASE_JWT_SECRET` no backend está correto

### Erro 402 (Payment Required)

**Causa:** Sem créditos
**Solução:**
- No Supabase, atualize manualmente:
  ```sql
  UPDATE subscriptions
  SET credits = 10
  WHERE user_id = 'seu-user-id';
  ```
- Ou configure como premium:
  ```sql
  UPDATE subscriptions
  SET status = 'premium'
  WHERE user_id = 'seu-user-id';
  ```

### Frontend não conecta ao backend

**Causa:** URL incorreta ou rede diferente
**Solução:**
- Use IP da máquina, não `localhost`
- Verifique se dispositivo está na mesma rede WiFi
- Teste no navegador: `http://SEU_IP:8000/health`

### RAG não encontra contexto

**Causa:** Tabela `knowledge_base` vazia
**Solução:**
- Execute o script SQL completo (`supabase_setup.sql`)
- Ele insere 3 documentos de exemplo
- Adicione mais documentos manualmente no Supabase

---

## 📚 Próximos Passos

1. **Popular knowledge_base**: Adicione documentos relevantes para seu caso de uso
2. **Ajustar prompts**: Customize os prompts em `get_llm_response()`
3. **Configurar pgvector**: Para busca semântica avançada
4. **Deploy**: Backend no Railway/Render, Frontend com EAS Build
5. **Monitoramento**: Adicione logs e métricas

---

## 📞 Suporte

- Documentação completa: `README.md`
- Fluxo detalhado: `FLUXO_DETALHADO.md`
- Lógica da LLM: `backend/LOGICA_LLM_CHAIN.md`

---

**Pronto!** 🎉 Seu sistema Contextus está funcionando!
