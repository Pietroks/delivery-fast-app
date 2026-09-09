O arquivo `README.md` foi atualizado para refletir as versões exatas das dependências do `package.json` (como Fastify 5, React 19, Expo 54), a inclusão de bibliotecas de validação (Zod) e a nova cobertura de 34 testes da aplicação.

````markdown
# 🚚 Delivery Fast - Otimizador de Rotas de Entrega

Aplicação mobile completa desenvolvida para entregadores otimizarem rotas de entrega dinamicamente a partir da sua **localização atual via GPS**. O sistema combina o algoritmo de resolução do problema do caixeiro-viajante do **OSRM** para reordenação com a precisão porta-a-porta do **Google Maps** para navegação final.

---

## 🚀 Tecnologias Utilizadas

### **Mobile (Frontend)**

- **React Native (0.81.5)** com **Expo (~54.0.35)**
- **TypeScript (~5.9.2)**
- **TailwindCSS (^3.4.19) / NativeWind (^4.2.6)** (Estilização utilitária)
- **React Navigation 7** (Gerenciamento de fluxo de telas e pilhas de navegação)
- **Expo Location** (Captura de GPS do entregador e geocodificação automática)
- **Expo Haptics** (Feedbacks táteis para interações de UI)
- **Expo Linking** (Deep linking com discador, WhatsApp e Google Maps)
- **Axios** (Cliente HTTP para API REST)
- **AsyncStorage** (Persistência e cache local para resiliência offline)
- **Jest & React Native Testing Library** (Testes automatizados de componentes e fluxos)

### **Backend**

- **Node.js** com **Fastify (^5.11.2)**
- **TypeScript (^7.0.2)** com **TSX**
- **Supabase JS (^2.109.0)** (Banco de dados relacional PostgreSQL e persistência de dados)
- **Zod (^4.4.3)** (Validação de schemas e tipagem estática de payloads)
- **OSRM (Open Source Routing Machine)** (Trip API para otimização de percurso com base no `waypoint_index`)
- **Nominatim / OpenStreetMap** (Geocodificação de endereços no momento do cadastro com suporte a CEP)
- **Vitest (^4.1.11)** (Suíte completa de testes unitários e de integração de rotas e serviços)

---

## 📁 Estrutura do Projeto

O projeto é estruturado em formato **monorepo**:

```text
delivery_fast_app/
├── backend/                    # Servidor Fastify & Integrações
│   ├── src/
│   │   ├── routes/             # Rotas Fastify (CRUD, otimização e conclusão em lote)
│   │   │   └── __tests__/      # Testes de integração de endpoints
│   │   └── services/           # Supabase, OSRM Service e Geocodificação
│   │       └── __tests__/      # Testes unitários do algoritmo OSRM
│   └── package.json
├── frontend/                   # Aplicativo React Native (Expo)
│   ├── src/
│   │   ├── components/         # GerenciadorRotas, ResumoRotaCard, FinalizarRotaModal
│   │   ├── navigation/         # Configuração de rotas e Stacks do React Navigation
│   │   ├── screens/            # HomeScreen, NovaEntregaScreen e HistoricoScreen
│   │   │   └── __tests__/      # Testes automatizados de telas e componentes
│   │   ├── services/           # Cliente Axios e camada de Storage local
│   │   └── utils/              # Lógica de lotes para Google Maps e utilitários
│   └── package.json
├── .gitignore
└── README.md
```
````

## 🧠 Arquitetura de Otimização e Navegação

1. **Geocodificação Inteligente no Cadastro**:
   Ao cadastrar uma parada, a cidade é pré-preenchida automaticamente via GPS do celular. O backend geocodifica via Nominatim priorizando o formato estruturado e fazendo fallbacks automáticos. Latitude e longitude exatas são salvas diretamente no Supabase.
2. **Otimização Instantânea (OSRM)**:
   O botão "Otimizar Rota" envia a localização em tempo real do entregador e consome os dados já armazenados no banco. A Trip API do OSRM reorganiza a sequência lógica fazendo o traçado da malha viária real.
3. **Navegação Porta a Porta (Google Maps)**:
   Ao clicar em "Iniciar no GPS", o aplicativo despacha as paradas particionadas em lotes inteligentes (limite nativo de 10 paradas) para o Google Maps, iniciando sempre do GPS atual do motoboy.

---

## ⚡ Como Executar o Projeto

**Pré-requisitos:**

- Node.js (versão 18 ou superior)
- Celular físico com o aplicativo Expo Go (ou simulador Android/iOS)
- Projeto criado no Supabase

### 1. Configurando o Backend

Acesse a pasta do backend:

```bash
cd backend
npm install

```

Crie um arquivo `.env` configurando sua conexão do Supabase:

```env
PORT=3333
SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
SUPABASE_KEY=sua-chave-service-role-ou-anon

```

Execute os testes automatizados do backend (14 testes):

```bash
npm test

```

Inicie o servidor Fastify:

```bash
npm run dev

```

### 2. Configurando o Frontend

Em outro terminal, acesse a pasta do frontend:

```bash
cd frontend
npm install

```

Configure a `baseURL` no arquivo `src/services/api.ts` com o endereço IP local da sua rede:

```typescript
export const api = axios.create({
  baseURL: "http://SEU_IP_LOCAL:3333/api/v1",
});
```

Execute os testes unitários do aplicativo (20 testes):

```bash
npm test

```

Inicie o Expo limpando o cache:

```bash
npx expo start -c

```

Escaneie o QR Code com o aplicativo Expo Go no celular.

---

## 📌 Principais Funcionalidades

- **[x] Localização Dinâmica via GPS**: O trajeto base para cálculos e deslocamentos sempre parte do ponto físico em que o entregador se encontra no momento.
- **[x] Cadastro Inteligente**: Detecção automática do município via GPS e suporte a CEP com máscara formatadora.
- **[x] Otimização Rápida com OSRM**: Algoritmo do Caixeiro Viajante (TSP) reordenando e calculando distâncias precisas e tempo estimado de tráfego.
- **[x] Lotes Inteligentes de Navegação**: Envio da rota particionada para o Google Maps respeitando limites de waypoints da URL nativa.
- **[x] Fechamento Flexível de Lote**: Modal interativo de finalização de rota, permitindo desmarcar pacotes que não puderam ser entregues antes de mover o restante para o histórico fiscal.
- **[x] Ações Rápidas de Contato**: Botões integrados nos cards ativos para ligação telefônica imediata (`tel:`) ou mensagem direta no WhatsApp pré-formatada.
- **[x] Histórico e Métricas**: Resumo de entregas concluídas no dia e economia estimada em reais calculada com base no trajeto otimizado.
- **[x] Resiliência Offline**: Cache automático de rotas locais via AsyncStorage caso haja perda de conexão (áreas de sombra).
- **[x] Cobertura Completa de Testes**: **34 testes automatizados** (14 backend, 20 frontend) assegurando integrações, componentes UI, lógicas de particionamento e permissões.

---

## 📝 Licença

Este projeto está sob a licença MIT.

```

```
