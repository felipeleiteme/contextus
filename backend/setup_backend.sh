#!/bin/bash

###############################################################################
# Script de Inicialização do Backend - Contextus
# Configura ambiente virtual Python, instala dependências e inicia servidor
###############################################################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🚀 CONTEXTUS - Setup Backend (Python/FastAPI)           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Python version
echo -e "${BLUE}[1/6]${NC} Verificando Python..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 não encontrado. Por favor, instale Python 3.9+${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✅ Python ${PYTHON_VERSION} encontrado${NC}"
echo ""

# Check if .env exists
echo -e "${BLUE}[2/6]${NC} Verificando arquivo .env..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Criando a partir de .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Arquivo .env criado. Configure suas credenciais antes de continuar!${NC}"
        echo -e "${YELLOW}📝 Edite o arquivo .env e adicione:${NC}"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_KEY"
        echo "   - SUPABASE_JWT_SECRET"
        echo "   - GLADIA_API_KEY"
        echo "   - QWEN_API_KEY"
        echo ""
        read -p "Pressione ENTER depois de configurar o .env..."
    else
        echo -e "${RED}❌ .env.example não encontrado!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
fi
echo ""

# Create virtual environment
echo -e "${BLUE}[3/6]${NC} Configurando ambiente virtual Python..."
if [ -d "venv" ]; then
    echo -e "${YELLOW}⚠️  venv já existe. Removendo...${NC}"
    rm -rf venv
fi

python3 -m venv venv
echo -e "${GREEN}✅ Ambiente virtual criado${NC}"
echo ""

# Activate virtual environment
echo -e "${BLUE}[4/6]${NC} Ativando ambiente virtual..."
source venv/bin/activate
echo -e "${GREEN}✅ Ambiente virtual ativado${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}[5/6]${NC} Instalando dependências Python..."
if [ ! -f requirements.txt ]; then
    echo -e "${RED}❌ requirements.txt não encontrado!${NC}"
    exit 1
fi

pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✅ Dependências instaladas com sucesso${NC}"
echo ""

# Check main file
echo -e "${BLUE}[6/6]${NC} Verificando arquivo principal..."
if [ ! -f main_complete.py ]; then
    echo -e "${RED}❌ main_complete.py não encontrado!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ main_complete.py encontrado${NC}"
echo ""

# Success message
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✅ BACKEND CONFIGURADO COM SUCESSO!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}📦 Ambiente virtual:${NC} venv/"
echo -e "${GREEN}🐍 Python:${NC} ${PYTHON_VERSION}"
echo -e "${GREEN}📄 Dependências:${NC} Instaladas"
echo ""
echo -e "${BLUE}🚀 Para iniciar o servidor:${NC}"
echo "   python main_complete.py"
echo ""
echo -e "${BLUE}🔧 Ou usando uvicorn diretamente:${NC}"
echo "   uvicorn main_complete:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo -e "${YELLOW}📝 Lembre-se de:${NC}"
echo "   1. Configurar o arquivo .env com suas credenciais"
echo "   2. Executar o script SQL no Supabase (supabase_setup.sql)"
echo "   3. Ativar o ambiente virtual: source venv/bin/activate"
echo ""
echo -e "${GREEN}✨ Pronto para uso!${NC}"
echo ""
