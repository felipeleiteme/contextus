#!/bin/bash

###############################################################################
# Script Principal de Inicialização - Contextus
# Inicia backend e frontend simultaneamente
###############################################################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🚀 CONTEXTUS - Voice Assistant com IA              ║"
echo "║            Iniciando Backend + Frontend                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

# Check if setup scripts exist
if [ ! -f "${BACKEND_DIR}/setup_backend.sh" ]; then
    echo -e "${RED}❌ Script de setup do backend não encontrado!${NC}"
    exit 1
fi

if [ ! -f "${FRONTEND_DIR}/setup_frontend.sh" ]; then
    echo -e "${RED}❌ Script de setup do frontend não encontrado!${NC}"
    exit 1
fi

# Function to check if backend is already running
check_backend() {
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start backend
start_backend() {
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}🔧 BACKEND (FastAPI)${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""

    cd "${BACKEND_DIR}"

    # Check if venv exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}⚠️  Ambiente virtual não encontrado. Executando setup...${NC}"
        ./setup_backend.sh
    fi

    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${RED}❌ Backend .env não encontrado!${NC}"
        echo -e "${YELLOW}Execute: cd backend && ./setup_backend.sh${NC}"
        exit 1
    fi

    # Activate venv and start
    echo -e "${GREEN}✅ Iniciando servidor FastAPI...${NC}"
    source venv/bin/activate
    python main_complete.py &
    BACKEND_PID=$!

    # Wait for backend to be ready
    echo -e "${YELLOW}⏳ Aguardando backend inicializar...${NC}"
    for i in {1..30}; do
        if check_backend; then
            echo -e "${GREEN}✅ Backend rodando em http://localhost:8000${NC}"
            echo ""
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Backend não iniciou após 30s${NC}"
            exit 1
        fi
    done
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}🎨 FRONTEND (React Native/Expo)${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""

    cd "${FRONTEND_DIR}"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules não encontrado. Executando setup...${NC}"
        ./setup_frontend.sh
    fi

    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${RED}❌ Frontend .env não encontrado!${NC}"
        echo -e "${YELLOW}Execute: cd frontend && ./setup_frontend.sh${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Iniciando Expo...${NC}"
    npm start &
    FRONTEND_PID=$!

    echo -e "${GREEN}✅ Frontend iniciando...${NC}"
    echo ""
}

# Trap to kill processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Encerrando serviços...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Serviços encerrados${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
echo -e "${CYAN}📋 Verificando pré-requisitos...${NC}"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 não encontrado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python $(python3 --version | cut -d' ' -f2)${NC}"

# Check Node
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

echo ""
echo -e "${CYAN}🚀 Iniciando serviços...${NC}"
echo ""

# Start services
start_backend
sleep 2
start_frontend

# Success message
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ CONTEXTUS INICIADO!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🔧 Backend:${NC}  http://localhost:8000"
echo -e "${GREEN}   Health:${NC}  http://localhost:8000/health"
echo -e "${GREEN}   Docs:${NC}    http://localhost:8000/docs"
echo ""
echo -e "${GREEN}🎨 Frontend:${NC} Expo DevTools abrirá automaticamente"
echo ""
echo -e "${YELLOW}📱 Para testar no dispositivo:${NC}"
echo "   1. Instale o app Expo Go no celular"
echo "   2. Escaneie o QR code exibido"
echo "   3. Verifique se está na mesma rede WiFi"
echo ""
echo -e "${YELLOW}🛑 Para encerrar:${NC} Pressione Ctrl+C"
echo ""
echo -e "${CYAN}📊 Logs:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Wait for processes
wait
