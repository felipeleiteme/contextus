# Lógica Interna da LLM Chain - Função get_llm_response()

Este documento descreve em detalhes a implementação da função `get_llm_response()` que gera respostas usando Qwen LLM via LangChain.

---

## 📋 Assinatura da Função

```python
async def get_llm_response(text: str, custom_context: str, db_context: str) -> str
```

**Parâmetros:**
- `text`: Texto transcrito do áudio (input do usuário)
- `custom_context`: Contexto personalizado do usuário/KBF (PRIORIDADE 1)
- `db_context`: Contexto do RAG - base de conhecimento (PRIORIDADE 2)

**Retorno:**
- String contendo a resposta gerada pelo LLM

---

## 🔄 PASSO 1: Lógica de Prioridade de Contexto

### Regra de Seleção do `final_context`

A função implementa uma lógica **if/elif/else** para determinar qual contexto será usado:

```python
if custom_context and custom_context.strip():
    # PRIORIDADE 1: Contexto do usuário/KBF
    final_context = custom_context.strip()
    context_source = "Contexto Personalizado do Usuário"

elif db_context and db_context.strip():
    # PRIORIDADE 2: Contexto do RAG (base de conhecimento)
    final_context = db_context.strip()
    context_source = "Base de Conhecimento Interna (RAG)"

else:
    # FALLBACK: Nenhum contexto disponível
    final_context = "Nenhuma informação adicional disponível."
    context_source = "Sem Contexto Específico"
```

### Fluxograma da Lógica

```
┌─────────────────────────────────────────┐
│ Recebe: custom_context e db_context    │
└────────────────┬────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ custom_context     │
        │ não está vazio?    │
        └────┬───────────┬───┘
             │           │
          SIM│           │NÃO
             │           │
             ▼           ▼
    ┌─────────────┐  ┌────────────────┐
    │final_context│  │  db_context    │
    │= custom_    │  │ não está vazio?│
    │  context    │  └────┬───────┬───┘
    │             │       │       │
    │PRIORIDADE 1 │    SIM│       │NÃO
    └─────────────┘       │       │
                          ▼       ▼
                 ┌─────────────┐ ┌─────────────────┐
                 │final_context│ │  final_context  │
                 │= db_context │ │= "Nenhuma       │
                 │             │ │  informação     │
                 │PRIORIDADE 2 │ │  adicional..."  │
                 └─────────────┘ │                 │
                                 │  FALLBACK       │
                                 └─────────────────┘
```

### Exemplos de Execução

| custom_context | db_context | final_context | context_source |
|---------------|------------|---------------|----------------|
| "Você é técnico Python" | "Produto custa R$99" | "Você é técnico Python" | Contexto Personalizado do Usuário |
| "" (vazio) | "Produto custa R$99" | "Produto custa R$99" | Base de Conhecimento Interna (RAG) |
| "" (vazio) | "" (vazio) | "Nenhuma informação adicional disponível." | Sem Contexto Específico |
| "   " (espaços) | "Produto custa R$99" | "Produto custa R$99" | Base de Conhecimento Interna (RAG) |

**Nota:** O método `.strip()` garante que strings com apenas espaços sejam tratadas como vazias.

---

## 🏗️ PASSO 2: Construção do ChatPromptTemplate

O template é composto por **3 PARTES DISTINTAS**:

### **PARTE 1: SystemPrompt - Instrução de Comportamento**

Define a **persona** e **comportamento** da IA.

```python
system_behavior_prompt = SystemMessagePromptTemplate.from_template(
    """Você é um assistente de voz inteligente da Empresa XPTO, especializado em fornecer respostas precisas e úteis.

INSTRUÇÕES DE COMPORTAMENTO:
- Seja sempre educado, prestativo e profissional
- Responda de forma clara, concisa e objetiva
- Use linguagem natural e acessível
- Mantenha um tom amigável mas profissional
- Se não souber algo, seja honesto e não invente informações"""
)
```

**Características:**
- ✅ Define quem é a IA ("assistente da Empresa XPTO")
- ✅ Estabelece o tom de comunicação (educado, profissional)
- ✅ Instrui sobre como responder (claro, conciso, honesto)
- ✅ Sem variáveis - conteúdo fixo

---

### **PARTE 2: SystemPrompt - Contexto do RAG/Usuário**

Insere o **contexto final** selecionado pela lógica de prioridade.

```python
system_context_prompt = SystemMessagePromptTemplate.from_template(
    """CONTEXTO ADICIONAL (Fonte: {context_source}):
{context}

COMO USAR O CONTEXTO:
- Se a pergunta do usuário estiver relacionada ao contexto acima, use essas informações para fundamentar sua resposta
- Se a pergunta NÃO estiver relacionada ao contexto, responda com base em seu conhecimento geral
- Priorize sempre a precisão e relevância da informação"""
)
```

**Variáveis do Template:**
- `{context}` → Preenchida com `final_context` (selecionado no PASSO 1)
- `{context_source}` → Preenchida com `context_source` (indicador de origem)

**Exemplo de Preenchimento:**

**Entrada:**
```python
final_context = "Nosso produto xpto custa R$ 99,90 e tem garantia de 12 meses."
context_source = "Base de Conhecimento Interna (RAG)"
```

**Resultado após preenchimento:**
```
CONTEXTO ADICIONAL (Fonte: Base de Conhecimento Interna (RAG)):
Nosso produto xpto custa R$ 99,90 e tem garantia de 12 meses.

COMO USAR O CONTEXTO:
- Se a pergunta do usuário estiver relacionada ao contexto acima, use essas informações para fundamentar sua resposta
- Se a pergunta NÃO estiver relacionada ao contexto, responda com base em seu conhecimento geral
- Priorize sempre a precisão e relevância da informação
```

---

### **PARTE 3: HumanPrompt - Input do Usuário**

A pergunta/fala do usuário transcrita.

```python
human_prompt = HumanMessagePromptTemplate.from_template(
    "{user_input}"
)
```

**Variável do Template:**
- `{user_input}` → Preenchida com `text` (transcrição do áudio)

**Exemplo de Preenchimento:**

**Entrada:**
```python
text = "Quanto custa o produto xpto?"
```

**Resultado após preenchimento:**
```
Quanto custa o produto xpto?
```

---

### **COMBINAÇÃO: ChatPromptTemplate Completo**

```python
chat_prompt = ChatPromptTemplate.from_messages([
    system_behavior_prompt,   # PARTE 1: Persona
    system_context_prompt,    # PARTE 2: Contexto (variável)
    human_prompt              # PARTE 3: Pergunta do usuário
])
```

**Ordem das mensagens no chat:**
1. **System Message 1**: Comportamento da IA
2. **System Message 2**: Contexto adicional
3. **Human Message**: Pergunta do usuário

---

## 🤖 PASSO 3: Inicialização do Modelo (ChatQwen)

```python
llm = get_qwen_llm()
```

A função `get_qwen_llm()` retorna uma instância de `ChatOpenAI` configurada para o modelo Qwen:

```python
ChatOpenAI(
    model=settings.qwen_model,           # Ex: "qwen-turbo"
    openai_api_key=settings.qwen_api_key,
    openai_api_base=settings.qwen_api_url,
    temperature=0.7,
    max_tokens=2000
)
```

**Parâmetros:**
- `model`: Nome do modelo Qwen
- `temperature`: 0.7 (equilíbrio entre criatividade e determinismo)
- `max_tokens`: Limite de 2000 tokens na resposta

---

## 📤 PASSO 4: Criação do Parser de Saída

```python
output_parser = StrOutputParser()
```

O `StrOutputParser` converte a resposta bruta do LLM em uma **string limpa**.

**Sem parser:**
```python
AIMessage(content="O produto xpto custa R$ 99,90.", additional_kwargs={...})
```

**Com parser:**
```python
"O produto xpto custa R$ 99,90."
```

---

## ⛓️ PASSO 5: Montagem da Chain (LangChain Expression Language)

```python
chain = chat_prompt | llm | output_parser
```

**Estrutura da Chain:**
```
┌─────────────────┐     ┌──────────┐     ┌──────────────┐
│ ChatPrompt      │ --> │ ChatQwen │ --> │ StrOutput    │
│ Template        │     │   LLM    │     │   Parser     │
└─────────────────┘     └──────────┘     └──────────────┘
      ↓                       ↓                   ↓
  Formata msgs         Gera resposta        Extrai texto
```

**Operador `|` (pipe):**
- Conecta componentes em sequência
- Saída de um componente vira entrada do próximo
- Suporta execução assíncrona

---

## 🚀 PASSO 6: Execução da Chain

```python
response = await chain.ainvoke({
    "context": final_context,
    "context_source": context_source,
    "user_input": text
})
```

### Preenchimento das Variáveis

O dicionário passado para `ainvoke()` preenche as variáveis nos templates:

| Variável no Template | Valor Recebido | Origem |
|---------------------|----------------|--------|
| `{context}` | `final_context` | Selecionado pela lógica de prioridade (PASSO 1) |
| `{context_source}` | `context_source` | Indicador de origem do contexto |
| `{user_input}` | `text` | Transcrição do áudio |

### Exemplo Completo de Execução

**Entrada da Função:**
```python
await get_llm_response(
    text="Quanto custa o produto xpto?",
    custom_context="",
    db_context="Nosso produto xpto custa R$ 99,90 com garantia de 12 meses."
)
```

**Passo 1 - Seleção de Contexto:**
```python
custom_context = ""  # vazio
db_context = "Nosso produto xpto custa R$ 99,90 com garantia de 12 meses."

# ELIF executado (PRIORIDADE 2)
final_context = "Nosso produto xpto custa R$ 99,90 com garantia de 12 meses."
context_source = "Base de Conhecimento Interna (RAG)"
```

**Passo 2 - Template Preenchido:**

```
[SYSTEM MESSAGE 1 - Comportamento]
Você é um assistente de voz inteligente da Empresa XPTO...
(instruções de comportamento)

[SYSTEM MESSAGE 2 - Contexto]
CONTEXTO ADICIONAL (Fonte: Base de Conhecimento Interna (RAG)):
Nosso produto xpto custa R$ 99,90 com garantia de 12 meses.

COMO USAR O CONTEXTO:
- Se a pergunta do usuário estiver relacionada ao contexto acima, use essas informações...

[HUMAN MESSAGE - Pergunta]
Quanto custa o produto xpto?
```

**Passo 3-5 - Chain Executada:**
```
Template formatado → Qwen LLM → Parser
```

**Passo 6 - Resposta Final:**
```python
response = "O produto xpto custa R$ 99,90 e possui garantia de 12 meses, oferecendo qualidade e segurança para sua compra."
```

---

## 📊 Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────┐
│ get_llm_response(text, custom_context, db_context)     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PASSO 1: Lógica de         │
        │ Prioridade de Contexto     │
        │                            │
        │ IF custom_context?         │
        │   → final_context = custom │
        │ ELIF db_context?           │
        │   → final_context = db     │
        │ ELSE                       │
        │   → final_context = fallback│
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PASSO 2: Construir         │
        │ ChatPromptTemplate         │
        │                            │
        │ PARTE 1: Comportamento     │
        │ PARTE 2: {context}         │
        │ PARTE 3: {user_input}      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PASSO 3: Inicializar       │
        │ ChatQwen (LLM)             │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PASSO 4: Criar             │
        │ StrOutputParser            │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PASSO 5: Montar Chain      │
        │ prompt | llm | parser      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PASSO 6: Executar Chain    │
        │ ainvoke({                  │
        │   context: final_context,  │◄── Inserido aqui!
        │   user_input: text         │
        │ })                         │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ RETORNA: response (string) │
        └────────────────────────────┘
```

---

## 🎯 Resumo da Inserção do Contexto Final

### Como o `final_context` é inserido na variável `{context}`

1. **Seleção (PASSO 1):**
   ```python
   final_context = custom_context OR db_context OR "Nenhuma informação..."
   ```

2. **Definição no Template (PASSO 2):**
   ```python
   system_context_prompt = SystemMessagePromptTemplate.from_template(
       "CONTEXTO ADICIONAL: {context}"
   )
   ```

3. **Preenchimento na Execução (PASSO 6):**
   ```python
   chain.ainvoke({
       "context": final_context,  # ← AQUI acontece o preenchimento
       "user_input": text
   })
   ```

4. **Resultado:**
   - A string `{context}` no template é **substituída** pelo valor de `final_context`
   - O LLM recebe a mensagem completa com o contexto já inserido
   - A resposta gerada já considera esse contexto

---

## 🔍 Exemplo Prático: Fluxo Completo

### Cenário 1: Usuário Define Contexto Personalizado

**Input:**
```python
get_llm_response(
    text="Como faço para instalar o sistema?",
    custom_context="Você é um técnico especializado em Linux. Sempre forneça comandos bash.",
    db_context="O sistema é compatível com Windows e Mac."
)
```

**PASSO 1:** `final_context = "Você é um técnico especializado em Linux..."`
**PASSO 6:** Template preenchido com contexto do usuário
**Resposta:** "Para instalar no Linux, execute: `sudo apt install sistema`..."

---

### Cenário 2: Sem Contexto do Usuário, Usa RAG

**Input:**
```python
get_llm_response(
    text="Qual o horário de atendimento?",
    custom_context="",
    db_context="Atendimento de segunda a sexta, 9h às 18h."
)
```

**PASSO 1:** `final_context = "Atendimento de segunda a sexta..."`
**PASSO 6:** Template preenchido com contexto do RAG
**Resposta:** "Nosso atendimento funciona de segunda a sexta-feira, das 9h às 18h."

---

### Cenário 3: Sem Nenhum Contexto

**Input:**
```python
get_llm_response(
    text="Quanto é 2+2?",
    custom_context="",
    db_context=""
)
```

**PASSO 1:** `final_context = "Nenhuma informação adicional disponível."`
**PASSO 6:** Template preenchido com fallback
**Resposta:** "2 + 2 é igual a 4."

---

## 📚 Componentes do LangChain Utilizados

| Componente | Tipo | Função |
|-----------|------|--------|
| `ChatPromptTemplate` | Prompt | Estrutura de mensagens para chat |
| `SystemMessagePromptTemplate` | Prompt | Define mensagens de sistema (comportamento + contexto) |
| `HumanMessagePromptTemplate` | Prompt | Define mensagem do usuário |
| `ChatOpenAI` | Model | Interface para Qwen LLM (compatível OpenAI API) |
| `StrOutputParser` | Parser | Converte AIMessage em string |
| `chain.ainvoke()` | Execution | Executa chain assíncrona com inputs |

---

## ⚙️ Arquivo de Implementação

**Localização:** `backend/services/qwen_service.py`

**Função Principal:** `get_llm_response()` (linhas 23-148)

**Função Wrapper:** `generate_response()` (linhas 154-171) - Para compatibilidade com código existente
