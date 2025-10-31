# 🔧 Troubleshooting - Contextus

Soluções para problemas comuns no projeto Contextus.

---

## 📋 Índice

1. [Frontend - Erros de TypeScript](#frontend-erros-de-typescript)
2. [Frontend - Erros de Instalação](#frontend-erros-de-instalação)
3. [Backend - Erros de Autenticação](#backend-erros-de-autenticação)
4. [Backend - Erros de API](#backend-erros-de-api)
5. [Conexão Frontend-Backend](#conexão-frontend-backend)
6. [Supabase - Problemas de Banco](#supabase-problemas-de-banco)

---

## Frontend - Erros de TypeScript

### ❌ Erro: "File 'expo/tsconfig.base' not found"

**Mensagem completa:**
```json
{
  "message": "File 'expo/tsconfig.base' not found.",
  "source": "ts",
  "resource": "/frontend/tsconfig.json"
}
```

**Causa:**
O `tsconfig.json` está tentando estender de `expo/tsconfig.base`, mas o Expo não está instalado ou não tem essa base.

**Solução 1 - Usar tsconfig.json standalone (Recomendado):**

Substitua o conteúdo de `frontend/tsconfig.json` por:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["esnext"],
    "allowJs": true,
    "jsx": "react-native",
    "noEmit": true,
    "isolatedModules": true,
    "strict": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js"
  ]
}
```

**Solução 2 - Instalar dependências do Expo:**

```bash
cd frontend
npm install
```

Se ainda não funcionar:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### ❌ Erro: Module not found '@supabase/supabase-js'

**Causa:**
Dependências não instaladas.

**Solução:**

```bash
cd frontend
npm install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

---

## Frontend - Erros de Instalação

### ❌ Erro: npm cache issue

**Mensagem:**
```
npm error EEXIST: file already exists
```

**Solução:**

```bash
# Limpar cache npm
npm cache clean --force

# Remover node_modules
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

**Alternativa (se permissão negada):**
```bash
# Corrigir permissões (Mac/Linux)
sudo chown -R $USER ~/.npm

# Reinstalar
npm cache clean --force
npm install
```

---

### ❌ Erro: expo-av not found

**Solução:**

```bash
cd frontend
npx expo install expo-av expo-file-system
```

---

## Backend - Erros de Autenticação

### ❌ Erro 401: Invalid token

**Mensagem:**
```json
{
  "detail": "Invalid token: Signature verification failed"
}
```

**Causa:**
- JWT secret incorreto
- Token expirado
- Token malformado

**Solução:**

1. **Verificar SUPABASE_JWT_SECRET no backend:**

```bash
cd backend
cat .env | grep SUPABASE_JWT_SECRET
```

Deve ser o JWT Secret do Supabase (não o anon key!).

**Como obter o JWT Secret:**
1. Acesse Supabase Dashboard
2. Settings > API
3. JWT Settings > JWT Secret
4. Copie e cole no `.env`

2. **Fazer logout e login novamente no app:**

O token pode ter expirado. Faça logout e login novamente.

---

### ❌ Erro 402: Payment Required (Sem créditos)

**Mensagem:**
```json
{
  "detail": "Créditos insuficientes. Faça upgrade para premium..."
}
```

**Causa:**
Usuário do plano gratuito sem créditos.

**Solução 1 - Adicionar créditos manualmente:**

No Supabase SQL Editor:
```sql
UPDATE subscriptions
SET credits = 10
WHERE user_id = 'uuid-do-usuario';
```

**Solução 2 - Tornar premium:**
```sql
UPDATE subscriptions
SET status = 'premium'
WHERE user_id = 'uuid-do-usuario';
```

**Solução 3 - Verificar trigger automático:**
```sql
-- Verificar se o trigger de criação funciona
SELECT * FROM subscriptions WHERE user_id = 'uuid-do-usuario';

-- Se não existir, criar manualmente:
INSERT INTO subscriptions (user_id, status, credits)
VALUES ('uuid-do-usuario', 'gratuito', 10);
```

---

## Backend - Erros de API

### ❌ Erro: Gladia API key invalid

**Mensagem:**
```
Erro na API Gladia: Unauthorized
```

**Solução:**

1. Verificar chave no `.env`:
```bash
cat backend/.env | grep GLADIA_API_KEY
```

2. Obter nova chave em: https://gladia.io

3. Atualizar no `.env`:
```env
GLADIA_API_KEY=sua-nova-chave
```

4. Reiniciar backend:
```bash
python main_complete.py
```

---

### ❌ Erro: Qwen LLM connection failed

**Mensagem:**
```
Error generating response with Qwen LLM: Connection timeout
```

**Solução:**

1. Verificar credenciais:
```bash
cat backend/.env | grep QWEN
```

2. Testar conexão:
```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer $QWEN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen-turbo","messages":[{"role":"user","content":"test"}]}'
```

3. Se falhar, verificar:
   - Chave API válida
   - URL correta
   - Quota não excedida

---

## Conexão Frontend-Backend

### ❌ Erro: Network request failed

**Mensagem (Frontend):**
```
Error: Network request failed
```

**Causa:**
Frontend não consegue acessar o backend.

**Solução:**

1. **Verificar se backend está rodando:**
```bash
curl http://localhost:8000/health
# Deve retornar: {"status":"healthy"}
```

2. **Usar IP da máquina (não localhost):**

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

Atualize `frontend/.env`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
```
(Substitua pelo seu IP)

3. **Verificar mesma rede WiFi:**
   - Dispositivo e computador devem estar na mesma rede

4. **Testar no navegador:**
```
http://SEU_IP:8000/health
```

---

### ❌ Erro: CORS blocked

**Mensagem:**
```
Access to fetch has been blocked by CORS policy
```

**Solução:**

Já está configurado no `main_complete.py`, mas verifique:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Supabase - Problemas de Banco

### ❌ Erro: subscriptions table not found

**Mensagem:**
```
relation "subscriptions" does not exist
```

**Causa:**
Script SQL não foi executado.

**Solução:**

1. Acesse Supabase Dashboard
2. SQL Editor
3. Execute o script `backend/supabase_setup.sql`

Ou execute manualmente:
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('premium', 'gratuito')),
  credits INTEGER NOT NULL DEFAULT 10,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

---

### ❌ Erro: knowledge_base table not found

**Causa:**
Tabela RAG não foi criada.

**Solução:**

Execute no Supabase SQL Editor:
```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  metadata JSONB,
  embedding VECTOR(384),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### ❌ RAG não encontra contexto

**Causa:**
- Tabela `knowledge_base` vazia
- pgvector não instalado
- Embeddings não gerados

**Solução:**

1. **Inserir dados de exemplo:**
```sql
INSERT INTO knowledge_base (title, content, category) VALUES
  ('Produto xpto', 'O produto xpto custa R$ 99,90...', 'produtos'),
  ('Atendimento', 'Horário: segunda a sexta, 9h às 18h', 'suporte');
```

2. **Habilitar pgvector (opcional):**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. **Testar busca textual (fallback):**

O sistema usa busca textual se pgvector não estiver disponível.

---

## Verificação Geral do Sistema

### ✅ Checklist de Funcionamento

Execute este checklist para verificar tudo:

```bash
# 1. Backend rodando
curl http://localhost:8000/health
# Esperado: {"status":"healthy"}

# 2. Supabase conectado
# No código Python:
python -c "from supabase import create_client; print('OK')"

# 3. Frontend com dependências
cd frontend && npm list expo react-native

# 4. Variáveis de ambiente (backend)
cat backend/.env | grep -E "SUPABASE|GLADIA|QWEN"

# 5. Variáveis de ambiente (frontend)
cat frontend/.env | grep EXPO_PUBLIC

# 6. Supabase tables
# No Supabase Dashboard > Table Editor
# Verificar se existem: subscriptions, knowledge_base
```

---

## Logs Úteis

### Backend Logs

Locais importantes:
```python
# main_complete.py tem logs em:
logger.info(f"Processando áudio para user_id: {user_id}")
logger.info(f"Assinatura validada: {status}, Créditos: {credits}")
logger.info("Transcrição concluída...")
logger.info("RAG encontrou contexto...")
logger.info("Resposta gerada com sucesso")
```

Para debug detalhado, adicione:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Frontend Logs

No Expo:
```javascript
console.log('Enviando áudio para:', `${API_URL}/process-audio/`);
console.log('Resposta recebida:', data);
```

---

## Ajuda Adicional

**Se nenhuma solução funcionou:**

1. Verifique versões:
```bash
# Backend
python --version  # Deve ser 3.9+
pip list | grep -E "fastapi|langchain|supabase"

# Frontend
node --version    # Deve ser 18+
npm --version
npx expo --version
```

2. Limpe tudo e reinstale:
```bash
# Backend
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json .expo
npm install
```

3. Consulte a documentação:
   - `docs/FLUXO_DETALHADO.md` - Entender o fluxo
   - `docs/INSTALACAO_RAPIDA.md` - Setup completo
   - `docs/VERIFICACAO_COMPLETA.md` - Checklist

---

**Última atualização:** 31 de outubro de 2025
