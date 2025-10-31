#!/bin/bash

###############################################################################
# Script de Inicialização do Frontend - Contextus
# Instala dependências Node.js e configura ambiente React Native/Expo
###############################################################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🎨 CONTEXTUS - Setup Frontend (React Native/Expo)       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}[1/6]${NC} Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Por favor, instale Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} encontrado${NC}"
echo ""

# Check npm
echo -e "${BLUE}[2/6]${NC} Verificando npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não encontrado!${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm ${NPM_VERSION} encontrado${NC}"
echo ""

# Check if .env exists
echo -e "${BLUE}[3/6]${NC} Verificando arquivo .env..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Criando a partir de .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Arquivo .env criado. Configure suas credenciais antes de continuar!${NC}"
        echo -e "${YELLOW}📝 Edite o arquivo .env e adicione:${NC}"
        echo "   - EXPO_PUBLIC_SUPABASE_URL"
        echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY"
        echo "   - EXPO_PUBLIC_API_URL (use o IP da sua máquina, não localhost)"
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

# Clean cache and node_modules
echo -e "${BLUE}[4/6]${NC} Limpando cache e node_modules..."
echo -e "${YELLOW}⚠️  Removendo node_modules antigos...${NC}"
rm -rf node_modules package-lock.json .expo

echo -e "${YELLOW}⚠️  Limpando cache npm...${NC}"
npm cache clean --force

echo -e "${GREEN}✅ Cache limpo${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}[5/6]${NC} Instalando dependências Node.js..."

# Check if we should use package_complete.json or package.json
if [ -f package_complete.json ]; then
    echo -e "${YELLOW}⚠️  Usando package_complete.json...${NC}"
    cp package_complete.json package.json
fi

if [ ! -f package.json ]; then
    echo -e "${RED}❌ package.json não encontrado!${NC}"
    exit 1
fi

npm install

echo -e "${GREEN}✅ Dependências instaladas com sucesso${NC}"
echo ""

# Verify Expo
echo -e "${BLUE}[6/6]${NC} Verificando Expo..."
EXPO_VERSION=$(npx expo --version 2>/dev/null || echo "não instalado")
echo -e "${GREEN}✅ Expo ${EXPO_VERSION}${NC}"
echo ""

# Success message
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✅ FRONTEND CONFIGURADO COM SUCESSO!                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}📦 Node.js:${NC} ${NODE_VERSION}"
echo -e "${GREEN}📦 npm:${NC} ${NPM_VERSION}"
echo -e "${GREEN}📦 Expo:${NC} ${EXPO_VERSION}"
echo -e "${GREEN}📄 Dependências:${NC} Instaladas"
echo ""
echo -e "${BLUE}🚀 Para iniciar o app:${NC}"
echo "   npm start"
echo ""
echo -e "${BLUE}🔧 Ou para plataformas específicas:${NC}"
echo "   npm run android    # Android"
echo "   npm run ios        # iOS"
echo "   npm run web        # Web"
echo ""
echo -e "${YELLOW}📝 Lembre-se de:${NC}"
echo "   1. Configurar o arquivo .env com suas credenciais"
echo "   2. Usar o IP da sua máquina no EXPO_PUBLIC_API_URL (não localhost)"
echo "   3. Verificar se backend está rodando (http://SEU_IP:8000/health)"
echo "   4. Dispositivo/emulador deve estar na mesma rede WiFi"
echo ""
echo -e "${GREEN}✨ Pronto para uso!${NC}"
echo ""
