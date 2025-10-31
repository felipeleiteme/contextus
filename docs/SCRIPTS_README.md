# 🚀 Scripts de Inicialização - Contextus

Scripts automatizados para facilitar a configuração e execução do projeto Contextus.

---

## 📋 Scripts Disponíveis

### 1. **`start.sh`** - Script Principal (Raiz do Projeto)
**Inicia backend e frontend simultaneamente**

```bash
./start.sh
```

**O que faz:**
- ✅ Verifica pré-requisitos (Python 3.9+, Node.js 18+)
- ✅ Executa setup automático se necessário
- ✅ Inicia backend FastAPI (porta 8000)
- ✅ Aguarda backend ficar pronto
- ✅ Inicia frontend Expo automaticamente
- ✅ Exibe URLs e instruções
- ✅ Gerencia processos (Ctrl+C encerra ambos)

**Saída esperada:**
```
╔════════════════════════════════════════════════════════════╗
║              ✅ CONTEXTUS INICIADO!                        ║
╚════════════════════════════════════════════════════════════╝

🔧 Backend:  http://localhost:8000
   Health:  http://localhost:8000/health
   Docs:    http://localhost:8000/docs

🎨 Frontend: Expo DevTools abrirá automaticamente
```

---

### 2. **`backend/setup_backend.sh`** - Setup do Backend
**Configura ambiente Python e instala dependências**

```bash
cd backend
./setup_backend.sh
```

**O que faz:**
1. ✅ Verifica Python 3.9+
2. ✅ Cria/valida arquivo `.env` (copia de `.env.example`)
3. ✅ Cria ambiente virtual (`venv/`)
4. ✅ Ativa ambiente virtual
5. ✅ Atualiza pip
6. ✅ Instala todas as dependências do `requirements.txt`
7. ✅ Verifica `main_complete.py`

**Depois de executar:**
```bash
# Ativar ambiente virtual manualmente
source venv/bin/activate

# Iniciar servidor
python main_complete.py

# Ou com uvicorn
uvicorn main_complete:app --reload --host 0.0.0.0 --port 8000
```

**Pré-requisitos:**
- Python 3.9+
- Arquivo `requirements.txt`
- Arquivo `.env.example` (será copiado para `.env`)

---

### 3. **`frontend/setup_frontend.sh`** - Setup do Frontend
**Configura ambiente Node.js e instala dependências**

```bash
cd frontend
./setup_frontend.sh
```

**O que faz:**
1. ✅ Verifica Node.js 18+ e npm
2. ✅ Cria/valida arquivo `.env` (copia de `.env.example`)
3. ✅ Remove `node_modules/` e cache antigos
4. ✅ Limpa cache npm (`npm cache clean --force`)
5. ✅ Copia `package_complete.json` para `package.json` se necessário
6. ✅ Instala todas as dependências (`npm install`)
7. ✅ Verifica instalação do Expo

**Depois de executar:**
```bash
# Iniciar Expo
npm start

# Ou para plataformas específicas
npm run android
npm run ios
npm run web
```

**Pré-requisitos:**
- Node.js 18+
- npm ou yarn
- Arquivo `package.json` ou `package_complete.json`
- Arquivo `.env.example` (será copiado para `.env`)

---

## 🎯 Fluxo de Uso Recomendado

### Primeira Vez (Setup Completo):

```bash
# 1. Clone o repositório
git clone <repo-url>
cd Contextus

# 2. Configure backend
cd backend
./setup_backend.sh

# Edite backend/.env com suas credenciais:
# - SUPABASE_URL
# - SUPABASE_KEY
# - SUPABASE_JWT_SECRET
# - GLADIA_API_KEY
# - QWEN_API_KEY

# 3. Configure frontend
cd ../frontend
./setup_frontend.sh

# Edite frontend/.env com suas credenciais:
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
# - EXPO_PUBLIC_API_URL (use IP da máquina, não localhost)

# 4. Execute SQL no Supabase
# Acesse Supabase Dashboard > SQL Editor
# Execute o arquivo: backend/supabase_setup.sql

# 5. Inicie tudo
cd ..
./start.sh
```

### Uso Diário (Já Configurado):

```bash
# Apenas execute o script principal
./start.sh
```

---

## 🔧 Configurações Necessárias

### Backend `.env`:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon
SUPABASE_JWT_SECRET=seu-jwt-secret

# Gladia AI
GLADIA_API_KEY=sua-chave-gladia

# Qwen LLM
QWEN_API_KEY=sua-chave-qwen
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-turbo
```

**Onde obter:**
- **Supabase**: Dashboard > Settings > API
- **Gladia AI**: https://gladia.io (API Keys)
- **Qwen**: https://dashscope.aliyun.com (Console > API Keys)

---

### Frontend `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
```

**⚠️ Importante:**
- Use o **IP da sua máquina** no `EXPO_PUBLIC_API_URL`, **NÃO use `localhost`**
- Encontre seu IP:
  - **Mac/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
  - **Windows**: `ipconfig`
- Dispositivo/emulador deve estar na **mesma rede WiFi**

---

## 📊 Estrutura de Arquivos

```
Contextus/
├── start.sh                    ← Script principal (inicia tudo)
├── SCRIPTS_README.md           ← Este arquivo
│
├── backend/
│   ├── setup_backend.sh        ← Setup do backend
│   ├── .env.example            ← Template de configuração
│   ├── .env                    ← Suas credenciais (criar)
│   ├── requirements.txt        ← Dependências Python
│   ├── main_complete.py        ← Servidor FastAPI
│   └── supabase_setup.sql      ← Script SQL
│
└── frontend/
    ├── setup_frontend.sh       ← Setup do frontend
    ├── .env.example            ← Template de configuração
    ├── .env                    ← Suas credenciais (criar)
    ├── package.json            ← Dependências Node.js
    └── App_complete.jsx        ← App React Native
```

---

## ❓ Solução de Problemas

### Erro: "Permission denied"

```bash
chmod +x start.sh
chmod +x backend/setup_backend.sh
chmod +x frontend/setup_frontend.sh
```

---

### Erro: "python3 não encontrado"

**Mac:**
```bash
brew install python@3.11
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

---

### Erro: "node não encontrado"

**Mac:**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Windows:**
- Download: https://nodejs.org/

---

### Erro: "Backend não inicia"

1. **Verifique `.env`:**
```bash
cat backend/.env
```

2. **Teste credenciais Supabase:**
- Acesse: https://seu-projeto.supabase.co
- Verifique se o projeto está ativo

3. **Verifique logs:**
```bash
cd backend
source venv/bin/activate
python main_complete.py
```

---

### Erro: "Network request failed" (Frontend)

1. **Verifique se backend está rodando:**
```bash
curl http://localhost:8000/health
# Deve retornar: {"status":"healthy"}
```

2. **Use IP da máquina (não localhost):**
```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Atualize frontend/.env:
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
```

3. **Verifique mesma rede WiFi:**
- Dispositivo e computador devem estar na mesma rede

---

### Erro: "npm cache issue"

```bash
cd frontend
rm -rf node_modules package-lock.json .expo
npm cache clean --force
npm install
```

---

### Erro: "File 'expo/tsconfig.base' not found"

✅ Já corrigido! O `tsconfig.json` já está configurado standalone.

Se ainda aparecer, execute:
```bash
cd frontend
rm -rf node_modules
npm install
```

---

## 🔍 Testes de Verificação

### 1. Verificar Backend:

```bash
# Health check
curl http://localhost:8000/health

# Documentação interativa
open http://localhost:8000/docs
```

**Resposta esperada:**
```json
{"status":"healthy"}
```

---

### 2. Verificar Frontend:

```bash
# Abrir no navegador
open http://localhost:19006

# Ou escanear QR code com Expo Go no celular
```

---

### 3. Teste Completo (E2E):

1. ✅ Backend rodando: `http://localhost:8000/health`
2. ✅ Frontend rodando: App Expo abre
3. ✅ Cadastro de usuário funciona
4. ✅ Login funciona e retorna JWT
5. ✅ Gravação de áudio funciona
6. ✅ Envio de áudio retorna transcrição + resposta
7. ✅ Créditos são consumidos (plano gratuito)

---

## 📚 Documentação Adicional

Para mais informações, consulte:

- **[docs/INDEX.md](docs/INDEX.md)** - Índice completo da documentação
- **[docs/INSTALACAO_RAPIDA.md](docs/INSTALACAO_RAPIDA.md)** - Guia de instalação passo a passo
- **[docs/FLUXO_DETALHADO.md](docs/FLUXO_DETALHADO.md)** - Fluxo de dados detalhado
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Soluções para problemas comuns

---

## 🎓 Recursos

### Comandos Úteis:

```bash
# Backend
cd backend
source venv/bin/activate          # Ativar venv
python main_complete.py           # Iniciar servidor
pip list                          # Listar dependências
deactivate                        # Desativar venv

# Frontend
cd frontend
npm start                         # Iniciar Expo
npm run android                   # Rodar no Android
npm run ios                       # Rodar no iOS
npm list                          # Listar dependências
npx expo doctor                   # Verificar problemas

# Logs
tail -f backend/logs/app.log      # Ver logs do backend (se configurado)
```

---

### URLs Importantes:

- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs
- **Frontend Web**: http://localhost:19006
- **Supabase Dashboard**: https://app.supabase.com
- **Gladia Docs**: https://docs.gladia.io
- **Qwen Docs**: https://help.aliyun.com/zh/dashscope

---

## ✨ Dicas de Produtividade

### Alias (Mac/Linux):

Adicione ao `~/.zshrc` ou `~/.bashrc`:

```bash
# Contextus shortcuts
alias ctx="cd /caminho/para/Contextus"
alias ctx-start="cd /caminho/para/Contextus && ./start.sh"
alias ctx-backend="cd /caminho/para/Contextus/backend && source venv/bin/activate && python main_complete.py"
alias ctx-frontend="cd /caminho/para/Contextus/frontend && npm start"
```

Depois:
```bash
source ~/.zshrc  # ou ~/.bashrc
ctx-start        # Iniciar tudo
```

---

### VS Code Tasks:

Crie `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Contextus",
      "type": "shell",
      "command": "./start.sh",
      "problemMatcher": []
    }
  ]
}
```

Execute: `Cmd+Shift+P` > `Tasks: Run Task` > `Start Contextus`

---

## 🛠️ Personalização

### Mudar Porta do Backend:

Edite `backend/main_complete.py`:

```python
# Linha ~475
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)  # Era 8000
```

E atualize `frontend/.env`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:9000
```

---

### Usar Outro Modelo LLM:

Edite `backend/.env`:

```env
QWEN_MODEL=qwen-max  # Modelo mais avançado (pago)
```

Modelos disponíveis:
- `qwen-turbo` (rápido, barato)
- `qwen-plus` (balanceado)
- `qwen-max` (melhor qualidade)

---

## 📞 Suporte

Se encontrar problemas:

1. ✅ Verifique [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. ✅ Execute `./start.sh` novamente
3. ✅ Limpe tudo e reinstale:
   ```bash
   cd backend && rm -rf venv && ./setup_backend.sh
   cd ../frontend && rm -rf node_modules && ./setup_frontend.sh
   ```

---

**Última atualização:** 31 de outubro de 2025

**Versão:** 1.0.0

**Status:** ✅ Completo e Funcional
