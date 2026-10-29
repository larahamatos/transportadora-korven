# 🚚 Korven — Logística em movimento

A **Korven** é um projeto de plataforma web para uma transportadora, desenvolvido com o objetivo de apresentar serviços logísticos, facilitar solicitações de cotação e oferecer uma interface para rastreamento de cargas.

O projeto está em desenvolvimento. Atualmente, conta com uma interface web inicial, identidade visual própria e funcionalidades demonstrativas que serão evoluídas para trabalhar com dados reais.

## 📌 Estado atual do projeto

### Implementado

- Página inicial com identidade visual da Korven.
- Layout responsivo para diferentes tamanhos de tela.
- Seção de apresentação dos serviços de transporte.
- Representação visual de rotas e movimentação de cargas.
- Interface para consulta de rastreamento.
- Formulário para solicitação de cotação.
- Animações, indicadores visuais e elementos interativos.
- Organização inicial dos arquivos do projeto.

### Em desenvolvimento / próximas etapas

- Integração do sistema com o banco de dados Supabase.
- Persistência das solicitações de cotação.
- Desenvolvimento e integração das funcionalidades da API.
- Estruturação do sistema de gerenciamento de cargas e pedidos.
- Validação dos formulários e tratamento de erros.
- Implementação de autenticação e controle de acesso, conforme as necessidades do sistema.

> **Importante:** o rastreamento e o envio de cotações ainda são demonstrativos na interface atual. A conexão com dados reais e a persistência no banco de dados fazem parte das próximas etapas.

## 🛠️ Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| HTML5 | Estrutura das páginas e formulários. |
| CSS3 | Estilização, layout responsivo, animações e identidade visual. |
| JavaScript | Interatividade, validação básica de entradas e comportamentos da interface. |
| SVG | Representação visual de rotas e elementos gráficos animados. |
| Git e GitHub | Versionamento e armazenamento do código-fonte. |
| Supabase — planejado | Banco de dados PostgreSQL na nuvem e serviços de backend para a aplicação. |

### Banco de dados — Supabase

O **Supabase** será utilizado como solução de banco de dados do projeto, com PostgreSQL como mecanismo relacional.

A estrutura definitiva das tabelas, os relacionamentos e as políticas de segurança serão definidos durante a implementação da integração.

## 📂 Estrutura do repositório

A organização atual do repositório inclui os seguintes elementos:

```text
transportadora-korven/
├── api/                              # Área destinada à API
├── docs/                             # Documentação do projeto
├── sistema/                          # Área do sistema
├── Korven — Logística em movimento.html
├── style.css                         # Estilos da interface
├── script.js                         # Interações e funcionalidades
├── Logotipo K com Estrada Neon (2).png
└── README.md                         # Documentação principal
```

A estrutura interna das pastas `api/`, `docs/` e `sistema/` poderá evoluir conforme a arquitetura da aplicação for definida.

## 🚀 Como executar o projeto

Como a interface atual utiliza tecnologias web nativas, é possível visualizar a página localmente.

1. Clone o repositório:

   ```bash
   git clone https://github.com/larahamatos/transportadora-korven.git
   ```

2. Entre na pasta do projeto:

   ```bash
   cd transportadora-korven
   ```

3. Para ver a pág inicial abra o arquivo `Korven — Logística em movimento.html` utilizando a extensão Live Server no Visual Studio Code. Para abrir páginas internas entre em `sistema/` e use `python3 -m http.server 8080`

Não é necessário configurar o Supabase para visualizar a interface atual. A conexão com o banco será necessária quando as funcionalidades que dependem de dados persistentes forem implementadas.

## 🔐 Configuração do Supabase

Quando a integração for implementada, as credenciais e configurações do projeto deverão ser mantidas em variáveis de ambiente ou na configuração apropriada para a arquitetura escolhida.

Para aplicações frontend, a chave publicável do Supabase pode ser utilizada com as políticas de segurança adequadas. **A chave `service_role` ou qualquer segredo administrativo nunca deve ser exposto no navegador ou versionado no GitHub.**

O acesso às tabelas deverá ser protegido com políticas de Row Level Security (RLS), de acordo com as permissões de cada operação.

## 🎯 Objetivo do projeto

Evoluir a interface atual para uma plataforma de transporte e logística capaz de centralizar solicitações de cotação, gerenciamento de cargas e acompanhamento de entregas, utilizando uma arquitetura organizada e um banco de dados confiável.

## 📍 Situação atual

**Status:** Em desenvolvimento.

A interface visual inicial está construída. As próximas etapas concentram-se na implementação das funcionalidades de negócio, na integração com o Supabase e na transformação dos recursos demonstrativos em operações reais.

---

Desenvolvido para o projeto **Korven — Logística em movimento**.