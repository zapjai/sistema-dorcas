# 🪵 Aplicativo Dorcas — Gestão Solidária & Triagem

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.x-blue.svg)](https://expressjs.com/)
[![WCAG](https://img.shields.io/badge/Accessibility-WCAG%20AA-success.svg)](#acessibilidade-e-interface)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

O **Aplicativo Dorcas** é um sistema web desenvolvido para a gestão de triagem social, doações de cestas básicas, vestuário e acompanhamento espiritual no âmbito da **IASD Bairro Amambaí**.
A aplicação integra rotinas de estoque inteligente, controle logístico *FEFO* (First Expired, First Out) e emissão automática de recibos para famílias assistidas.
---
## 📋 Sumário
- [Funcionalidades](#-funcionalidades)
- [Arquitetura e Tecnologias](#-arquitetura-e-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração de Variáveis de Ambiente](#-configuração-de-variáveis-de-ambiente)
- [Como Executar](#-como-executar)
- [Acessibilidade e Interface](#-acessibilidade-e-interface)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Licença](#-licença)

---

## ✨ Funcionalidades

- 🔒 **Autenticação Segura**: Controle de acesso por JWT (JSON Web Token), criptografia de senhas com `bcryptjs` e fluxo de redefinição via e-mail (`nodemailer`).
- 🧺 **Gestão Logística FEFO**: Baixa automática de cestas básicas priorizando lotes de alimentos com datas de validade mais próximas do vencimento.
- 🧮 **Cálculo Automático de Estoque**: Monitoramento do saldo de alimentos/higiene e geração de relatórios de déficit/faltantes para equiparação de cestas básicas.
- 👕 **Carrinho de Roupas**: Seleção customizada por tipo, gênero e tamanho de vestuário para atendimento familiar.
- 🩵 **Atendimento Espiritual**: Registro e histórico de visitas pastorais, estudos bíblicos e acompanhamento oracional das famílias.
- 🖨️ **Impressão e Recibos**: Geração instantânea de recibos numerados e layout CSS otimizado para impressão/relatórios em PDF (`@media print`).

---

## 🛠️ Arquitetura e Tecnologias

- **Backend**: Node.js, Express.js.
- **Segurança**: JSON Web Token (`jsonwebtoken`), `bcryptjs`.
- **E-mail / Notificações**: Nodemailer.
- **Frontend**: Single Page Application (SPA) em HTML5 Semântico, CSS3 Flexbox/Grid e JavaScript Puro (ES6+).
- **Ícones**: FontAwesome v6.
- **Persistência**: Armazenamento estruturado em arquivo JSON (`dados.json`) com orientação a objetos em backend.

---

## 🚀 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:

- [Node.js](https://nodejs.org/) (Versão 18.x ou superior)
- [npm](https://www.npmjs.com/) (Gerenciador de pacotes padrão do Node)

---

## 💻 Instalação

1. **Clone o repositório:**
  git clone [https://github.com/seu-usuario/aplicativo-dorcas.git](https://github.com/seu-usuario/aplicativo-dorcas.git)

  cd aplicativo-dorcas

Instale as dependências: npm install
   
⚙️ Configuração de Variáveis de Ambiente

Para manter a segurança das chaves secretas e credenciais de e-mail, configure as variáveis no seu ambiente de execução:

|Variável  |Descrição  |Exemplo
| :--- | :--- | :---|
|PORT  |Porta onde o servidor Express irá rodar (Padrão: 3000) |3000
|SECRET_KEY |Chave secreta de assinatura dos tokens JWT         |sua_chave_secreta_jwt
|SMTP_USER  |E-mail remetente para envio de senhas temporárias  |seu-email@gmail.com
|SMTP_PASS  |Senha de aplicativo / token SMTP                   |xxxx xxxx xxxx xxxx

💡 Nota: Opcionalmente, crie um arquivo key.env na raiz do projeto contendo apenas a senha de aplicativo SMTP.

🎬 Como Executar
Defina a chave secreta (Opcional no terminal) e inicie o servidor:

Linux / macOS: export SECRET_KEY="sua_chave_ultra_secreta"

node server.js

Windows (PowerShell): $env:SECRET_KEY="sua_chave_ultra_secreta"

node server.js

Windows (CMD): set SECRET_KEY=sua_chave_ultra_secreta

node server.js

Acesse a aplicação no seu navegador:http://localhost:3000

♿ Acessibilidade e InterfaceA interface do Aplicativo Dorcas foi desenhada seguindo as diretrizes WCAG AA (Web Content Accessibility Guidelines):
- **Navegação Semântica**: Estruturação via &lt;main&gt;, &lt;header&gt;, &lt;nav&gt;, &lt;section&gt; e &lt;article&gt;.
- **Atributos WAI-ARIA**: Suporte completo a leitores de tela (como NVDA e VoiceOver) com role="tablist", role="tabpanel", aria-selected e aria-live.
- **Foco e Contraste**: Razão de contraste mínima aprovada para visibilidade e estados de foco destacados (:focus-visible) para navegação por teclado (Tab).

📂 Estrutura do Projeto

```text
aplicativo-dorcas/
├── public/
│   ├── css/
│   │   └── style.css       # Estilização responsiva e regras de impressão
│   ├── js/
│   │   └── app.js          # Consumo da API e controle de interface SPA
│   └── index.html          # Interface principal e modais de acesso
├── dados.json              # Persistência local dos dados
├── key.env                 # (Opcional) Chave/Senha SMTP
├── server.js               # Servidor Express, rotas da API e regras de negócio
├── package.json            # Dependências e scripts do projeto
└── README.md               # Documentação do projeto
```

📜 Licença

Este projeto é disponibilizado sob a licença MIT.
