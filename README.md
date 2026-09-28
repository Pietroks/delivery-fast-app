# 🚚 Delivery Fast - Otimizador de Rotas e Gestão de Entregas

[![Testes Automatizados](https://img.shields.io/badge/Testes-87%20Aprovados%20(100%25)-22c55e?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com/Pietroks/delivery-fast-app)
[![Impeccable Critique](https://img.shields.io/badge/Impeccable%20Critique-40%2F40%20(Excelente)-22c55e?style=for-the-badge&logo=shield&logoColor=white)](https://github.com/Pietroks/delivery-fast-app)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native 0.83](https://img.shields.io/badge/React%20Native-0.83-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![Fastify 5](https://img.shields.io/badge/Fastify-5.11-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://fastify.io)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

Aplicativo mobile completo desenvolvido para entregadores e pequenos comércios otimizarem rotas de entrega dinamicamente a partir do **GPS em tempo real**. Combina o algoritmo do Caixeiro Viajante do **OSRM** com a navegação porta a porta do **Google Maps**, além de comprovação digital de entregas (**foto e assinatura na tela**) e **relatório financeiro de fechamento de turno** com envio direto no WhatsApp do lojista.

---

## 🌟 Principais Funcionalidades

- **[x] Autenticação e Multi-Tenancy**: Login e cadastro com isolamento rigoroso de entregadores via Supabase Auth e Row Level Security (RLS).
- **[x] Importação em Massa ("Colar Lista")**: Parser inteligente com sanitização de pontuações finais (`pippi.` -> `pippi`) que aceita listas coladas do WhatsApp ou e-mail.
- **[x] Geocodificação Local Precisa**: Integração com BrasilAPI para CEPs e Nominatim com *bounding box* viário (~45 km de raio ao redor do GPS do entregador), impedindo que ruas homônimas em outros estados sejam selecionadas.
- **[x] Otimização Inteligente ($P_0$ via GPS)**: Otimiza o trajeto viário pelo algoritmo do Caixeiro Viajante do OSRM partindo sempre da localização física real do entregador.
- **[x] Navegação Multi-Lotes para Google Maps**: Contorna a limitação de paradas do Google Maps particionando automaticamente rotas longas em lotes sequenciais de até 10 paradas.
- **[x] Comprovante de Entrega Digital (POD)**: Registro fotográfico da encomenda entregue via câmera nativa (`expo-image-picker`) e assinatura digital com toque suave na tela (`PanResponder`), com nome e documento do recebedor.
- **[x] Visualizador de Comprovantes no Histórico**: Modal para consultar a qualquer momento as fotos em alta resolução e assinaturas vetoriais das entregas concluídas.
- **[x] Relatório de Fechamento de Turno & Envio no WhatsApp**:
  - Resumo financeiro diário com taxa por entrega configurável, diária fixa, valor por km e chave PIX salvas no aparelho (`AsyncStorage`).
  - Métricas operacionais consolidadas: entregas concluídas, devoluções com motivo, quilômetros rodados e tempo total em rota.
  - Envio instantâneo formatado com 1 clique para o WhatsApp do lojista/restaurante.
- **[x] Cockpit Tático de Pilotagem**: Interface escura de alto contraste para motos com alvos de toque $\ge 48\text{dp}$, endereço em 2 linhas sem truncamento, discador telefônico nativo integrado e menu seguro de paradas protegido contra toques acidentais.
- **[x] Controle & Reversão Rápida ("Desfazer" de 5s)**: Toast tático flutuante que permite desfazer baixas ou remoções acidentais em 1 toque antes da confirmação definitiva.
- **[x] Resiliência Offline & Indicador de GPS**: Monitoramento ativo de conectividade no painel com banner explicativo e garantia de persistência local das baixas no aparelho.
- **[x] Hero Onboarding & Orientação de Lotes**: Experiência guiada no primeiro uso com Hero Card de importação direta do WhatsApp e modal educativo sobre o particionamento em lotes de 10 do Google Maps.
- **[x] 87 Testes Automatizados**: 100% de sucesso em testes de frontend (60 no Jest em 10 suítes) e backend (27 no Vitest em 3 suítes).

---

## 🛠️ Tecnologias Utilizadas

### **Mobile (Frontend)**
- **React Native (`0.83.0`)** com **React 19 (`19.1.0`)**
- **Expo SDK (`~57.0.0`)**
- **TypeScript (`~5.9.2`)**
- **NativeWind (`^4.2.6`) / TailwindCSS (`^3.4.19`)** (Dark mode nativo)
- **React Navigation 7** (Bottom Tabs e Native Stack)
- **Expo Location (`~19.0.0`)** (Leitura rápida de GPS e geocodificação reversa)
- **Expo Image Picker (`~17.0.0`)** (Captura de fotos de comprovante)
- **AsyncStorage (`2.2.0`)** (Persistência local de cache e taxas)
- **Jest (`^29.7.0`) & React Native Testing Library** (60 testes automatizados em 10 suítes)

### **Backend (API REST)**
- **Node.js** com **Fastify (`^5.11.2`)**
- **TypeScript (`^7.0.2`)** com **TSX**
- **Supabase JS (`^2.109.0`)** (PostgreSQL com RLS e script DDL oficial em `schema.sql`)
- **Zod (`^4.4.3`)** (Validação rigorosa de contratos e payloads)
- **OSRM (Open Source Routing Machine)** (Trip API para otimização de percurso com fallback local)
- **BrasilAPI & Nominatim** (Geocodificação estruturada sem custos de APIs pagas)
- **Vitest (`^4.1.11`)** (27 testes automatizados em 3 suítes)

---

## 📁 Estrutura do Projeto

```text
delivery-fast-app/
├── backend/                    # Servidor Fastify & Integrações
│   ├── schema.sql              # Script DDL oficial para o Supabase (Tabelas, RLS e Índices)
│   ├── src/
│   │   ├── middlewares/        # Autenticação JWT Supabase (auth.middleware.ts)
│   │   ├── routes/             # Rotas Fastify (CRUD, Otimização, Fechamento de Turno)
│   │   │   └── __tests__/      # Testes de integração de endpoints
│   │   ├── schemas/            # Validações Zod (rotas.schema.ts)
│   │   └── services/           # Supabase Client, OSRM Service e Geocodificação
│   └── package.json
├── frontend/                   # Aplicativo Mobile React Native (Expo)
│   ├── jest.setup.js           # Setup global de testes (mocks de storage e ícones)
│   ├── patches/                # Patches de dependências via patch-package
│   ├── src/
│   │   ├── components/         # FechamentoTurnoModal, ComprovanteEntregaModal, GerenciadorRotas, etc.
│   │   │   └── __tests__/      # Testes unitários de componentes
│   │   ├── screens/            # HomeScreen, NovaEntregaScreen, HistoricoScreen, Login, Cadastro
│   │   │   └── __tests__/      # Testes completos de telas e fluxos
│   │   ├── services/           # Axios API, Cache de Storage e Serviço Rápido de Location
│   │   └── utils/              # Particionamento de lotes do Google Maps e geocodificação
│   └── package.json
├── docs/                       # Documentação técnica e comercial completa
│   └── DOCUMENTACAO_COMPLETA.md
└── README.md
```

---

## ⚡ Como Executar o Projeto

### Pré-requisitos
- **Node.js** (v18 ou v20 recomendados)
- **Git**
- Conta no **Supabase** (PostgreSQL gratuito)
- Celular físico com o aplicativo **Expo Go** (Android ou iOS)

### 1. Banco de Dados (Supabase)
Execute o script [`backend/schema.sql`](backend/schema.sql) no **SQL Editor** do seu painel Supabase. Ele criará automaticamente a tabela `entregas`, ativará o **Row Level Security (RLS)** para isolar os dados de cada entregador e criará os índices de performance para consultas por data e status.

---

### 2. Iniciar o Servidor Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` baseado no `.env.example`:
```env
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-service-role-ou-anon
```

Execute os testes automatizados do backend:
```bash
npm test
```
*(Resultado esperado: 27 testes aprovados no Vitest em 3 suítes)*

Inicie o servidor:
```bash
npm run dev
```

---

### 3. Iniciar o Aplicativo Mobile (Frontend)

Em outro terminal:
```bash
cd frontend
npm install
```

Crie o arquivo `.env` baseado no `.env.example`:
```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-do-supabase
```

Execute os testes automatizados do frontend:
```bash
npm test
```
*(Resultado esperado: 56 testes em 10 suítes aprovados no Jest)*

Inicie o Expo limpando o cache:
```bash
npx expo start -c
```

Abra o aplicativo **Expo Go** no celular e escaneie o QR Code exibido no terminal.

---

## 📄 Documentação Completa

Para detalhes aprofundados sobre arquitetura, modelo comercial de vendas, documentação de todos os endpoints e guia operacional do entregador, consulte:
👉 [**Documentação Completa do Delivery Fast (`docs/DOCUMENTACAO_COMPLETA.md`)**](docs/DOCUMENTACAO_COMPLETA.md)

---

## 📝 Licença

Este projeto está sob a licença MIT.
