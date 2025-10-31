# Guia de Configuração Passo a Passo

Este guia irá ajudá-lo a configurar todo o sistema do zero.

## Pré-requisitos

- Python 3.9+ instalado
- Node.js 18+ e npm instalado
- Expo CLI (`npm install -g expo-cli`)
- Conta no [Supabase](https://supabase.com)
- Conta no [Gladia AI](https://gladia.io)
- Acesso à API do Qwen LLM

## Parte 1: Configuração do Supabase

### 1.1 Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em "New Project"
3. Preencha as informações:
   - Nome do projeto
   - Password do banco de dados (GUARDE ISSO!)
   - Região (escolha a mais próxima)
4. Aguarde a criação (2-3 minutos)

### 1.2 Configurar o Banco de Dados

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em "New query"
3. Copie o conteúdo do arquivo `backend/supabase_setup.sql`
4. Cole no editor e clique em "Run"
5. Verifique se não há erros

### 1.3 Obter Credenciais

Vá em **Settings > API** e anote:

- **Project URL**: `https://xxxxx.supabase.co`
- **anon public key**: Chave longa começando com `eyJ...`

Vá em **Settings > API > JWT Settings**:

- **JWT Secret**: String longa usada para validar tokens

## Parte 2: Configuração do Backend

### 2.1 Ambiente Virtual Python

```bash
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar (Linux/Mac)
source venv/bin/activate

# Ativar (Windows)
venv\Scripts\activate
```

### 2.2 Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2.3 Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Supabase (obtido no passo 1.3)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...  # anon public key
SUPABASE_JWT_SECRET=sua-jwt-secret-aqui

# Gladia AI
GLADIA_API_KEY=sua-chave-gladia
GLADIA_API_URL=https://api.gladia.io/v2/transcription

# Qwen LLM
QWEN_API_KEY=sua-chave-qwen
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-turbo

# Server
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
```

### 2.4 Testar o Backend

```bash
python main.py
```

Acesse: http://localhost:8000 - deve retornar JSON com status

Acesse: http://localhost:8000/docs - Swagger UI da API

## Parte 3: Configuração do Frontend

### 3.1 Instalar Dependências

```bash
cd frontend
npm install
```

Se houver erros no npm cache:
```bash
npm cache clean --force
npm install --legacy-peer-deps
```

### 3.2 Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # mesma do backend
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000  # IP da sua máquina
```

**IMPORTANTE**:
- Para testar no dispositivo físico, use o **IP da sua máquina**, não `localhost`
- Para encontrar seu IP:
  - **Mac/Linux**: `ifconfig | grep inet`
  - **Windows**: `ipconfig`
  - Procure por algo como `192.168.x.x` ou `10.0.x.x`

### 3.3 Executar o App

```bash
npm start
```

Isso abrirá o Expo Dev Tools no navegador.

**Para testar:**
- **Android**: Instale o app "Expo Go" e escaneie o QR code
- **iOS**: Instale o app "Expo Go" e escaneie o QR code
- **Emulador**: Pressione 'a' para Android ou 'i' para iOS

## Parte 4: Teste Completo do Sistema

### 4.1 Criar Usuário de Teste

1. Abra o app no dispositivo/emulador
2. Clique em "Cadastre-se"
3. Insira email e senha (ex: `test@example.com` / `123456`)
4. Clique em "Cadastrar"

**Verificar no Supabase:**
- Vá em **Authentication > Users** - deve aparecer o usuário
- Vá em **Table Editor > subscriptions** - deve ter criado automaticamente com status "gratuito"

### 4.2 Fazer Login

1. Volte para tela de login
2. Insira as credenciais
3. Deve redirecionar para tela principal

### 4.3 Testar Gravação de Áudio

1. Na tela principal, clique em "🎤 Iniciar Gravação"
2. Permita acesso ao microfone quando solicitado
3. Fale algo (ex: "Olá, como você está?")
4. Clique em "🔴 Parar Gravação"
5. Aguarde o processamento (15-30 segundos)
6. Deve aparecer:
   - **Transcrição**: O que você falou
   - **Resposta**: Resposta gerada pelo LLM

### 4.4 Testar Contexto Personalizado

1. No campo "Contexto Personalizado", adicione:
   ```
   Você é um assistente técnico especializado em Python.
   Responda sempre com exemplos de código quando relevante.
   ```
2. Grave um áudio perguntando sobre Python
3. A resposta deve seguir o contexto definido

## Parte 5: Solução de Problemas

### Backend não inicia

**Erro: `ModuleNotFoundError`**
```bash
pip install -r requirements.txt --force-reinstall
```

**Erro: `Supabase connection failed`**
- Verifique se o `.env` está configurado corretamente
- Teste a URL do Supabase no navegador

### Frontend não conecta ao backend

**Erro: `Network request failed`**
- Certifique-se de que:
  1. Backend está rodando (`python main.py`)
  2. URL no `.env` usa **IP da máquina**, não `localhost`
  3. Dispositivo e computador estão na **mesma rede WiFi**

**Erro: `401 Unauthorized`**
- Token JWT inválido ou expirado
- Faça logout e login novamente

### Áudio não grava

**Permissão negada:**
- Android: Vá em Configurações > Apps > Expo Go > Permissões > Microfone
- iOS: Configurações > Expo Go > Microfone

### Transcrição falha

**Erro 401 da Gladia:**
- Verifique `GLADIA_API_KEY` no `.env`

**Erro 429 (Rate limit):**
- Aguarde alguns minutos entre requests

## Parte 6: Próximos Passos

### Atualizar Status de Assinatura

No Supabase, vá em **Table Editor > subscriptions** e atualize manualmente:

```sql
UPDATE subscriptions
SET status = 'premium', expires_at = NOW() + INTERVAL '30 days'
WHERE user_id = 'uuid-do-usuario';
```

### Adicionar Novos Usuários via Código

O sistema já está configurado para criar automaticamente uma assinatura "gratuito" quando um usuário se cadastra.

### Deploy em Produção

**Backend:**
- Railway, Render, ou AWS Lambda
- Configure `.env` com credenciais de produção
- Habilite HTTPS

**Frontend:**
- Build com EAS: `eas build --platform android`
- Publicar na Play Store / App Store

## Contato e Suporte

Para dúvidas ou problemas:
1. Verifique os logs do backend
2. Use o Expo Dev Tools para ver logs do frontend
3. Consulte a documentação das APIs (Gladia, Qwen, Supabase)
