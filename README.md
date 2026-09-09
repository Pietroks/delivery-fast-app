# 🚚 Delivery Fast - Otimizador de Rotas de Entrega

Aplicação mobile completa desenvolvida para entregadores otimizarem rotas de entrega dinamicamente a partir da sua **localização atual via GPS**. O sistema combina o algoritmo de resolução do problema do caixeiro-viajante do **OSRM** para reordenação com a precisão porta-a-porta do **Google Maps** para navegação final[cite: 3, 4, 6].

---

## 🚀 Tecnologias Utilizadas

### **Mobile (Frontend)**

- **React Native** com **Expo**[cite: 1, 2]
- **TypeScript**[cite: 1, 2]
- **TailwindCSS / NativeWind** (Estilização utilitária)[cite: 1, 2]
- **Expo Location** (Captura de GPS do entregador e reverse geocoding automático da cidade)[cite: 1, 2]
- **Expo Haptics** (Feedbacks táteis para ações de ordenação, conclusão e remoção)
- **React Navigation** (Gerenciamento de fluxo de telas e pilhas de navegação)[cite: 1, 2]
- **Axios** (Cliente HTTP para API REST)[cite: 1, 2]
- **AsyncStorage** (Persistência e cache local para resiliência offline)[cite: 1, 2]
- **Jest & React Native Testing Library** (Testes unitários e de integração de componentes)

### **Backend**

- **Node.js** com **Fastify**[cite: 4]
- **TypeScript**[cite: 4]
- **Supabase** (Banco de dados relacional PostgreSQL e persistência de dados)[cite: 4]
- **OSRM (Open Source Routing Machine)** (Trip API para otimização de percurso com base no `waypoint_index`)
- **Nominatim / OpenStreetMap** (Geocodificação de endereços no momento do cadastro com suporte a CEP)[cite: 4]
- **Vitest** (Suíte completa de testes unitários e de integração de rotas e serviços)

---

## 📁 Estrutura do Projeto

O projeto é estruturado em formato **monorepo**:

```text
delivery_fast_app/
├── backend/                    # Servidor Fastify & Integrações
│   ├── src/
│   │   ├── routes/             # Rotas Fastify (CRUD de entregas, otimização e histórico)
│   │   │   └── __tests__/      # Testes de integração de endpoints
│   │   └── services/           # Supabase, OSRM Service e Geocodificação
│   │       └── __tests__/      # Testes unitários do algoritmo OSRM
│   └── package.json
├── frontend/                   # Aplicativo React Native (Expo)
│   ├── src/
│   │   ├── components/         # GerenciadorRotas, ResumoRotaCard e UI modular
│   │   ├── navigation/         # Configuração de rotas e Stacks do React Navigation
│   │   ├── screens/            # HomeScreen, NovaEntregaScreen e HistoricoScreen
│   │   │   └── __tests__/      # Testes automatizados de telas e componentes
│   │   ├── services/           # Cliente Axios e camada de Storage local
│   │   └── utils/              # Deep linking com Google Maps / Waze
│   └── package.json
├── .gitignore
└── README.md
🧠 Arquitetura de Otimização e Navegação
Geocodificação Inteligente no Cadastro (Opção 1):
   Ao cadastrar uma parada, a cidade é pré-preenchida automaticamente via GPS do celular.
   O backend geocodifica via Nominatim priorizando o CEP (se informado), evitando ambiguidades entre municípios e logradouros homônimos.
   Latitude e longitude aproximadas são salvas diretamente no Supabase junto ao texto completo do endereço.

   Otimização Instantânea (OSRM):
   O botão "Otimizar Rota" envia a localização em tempo real do entregador ($P_0$) e consome os dados já armazenados no banco sem gargalos de rede.
   A Trip API do OSRM reorganiza a sequência lógica através do mapeamento ordenado do waypoint_index.

   Navegação Porta a Porta (Google Maps):Ao clicar em "Iniciar no GPS", o aplicativo despacha o texto completo e original de cada parada (rua, número, bairro e cidade) em formato de waypoints para o Google Maps.
   O Google Maps inicia do GPS em tempo real do motoboy e localiza o número exato da residência.

⚡ Como Executar o Projeto
Pré-requisitos
   Node.js (versão 18 ou superior)Celular físico com o aplicativo Expo Go (ou simulador Android/iOS)
   Projeto criado no Supabase

1. Configurando o Backend
   Acesse a pasta do backend:
      cd backend
   Instale as dependências:
      npm install

Crie um arquivo .env configurando sua conexão do Supabase:
   PORT=3333
   SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
   SUPABASE_KEY=sua-chave-service-role-ou-anon

Execute os testes automatizados do backend (14 testes):
   npm test

Inicie o servidor Fastify:
   npm run dev

2. Configurando o FrontendEm outro terminal, acesse a pasta do frontend:cd frontend
Instale as dependências:
   npm install

Configure a baseURL no arquivo src/services/api.ts com o endereço IP local da sua máquina:
   TypeScriptexport const api = axios.create({
      baseURL: "http://SEU_IP_LOCAL:3333/api/v1",
   });

Execute os testes unitários do aplicativo (12 testes):
   npm test

Inicie o Expo:
   npx expo start

Escaneie o QR Code com o aplicativo Expo Go no celular.

📌 Principais Funcionalidades
[x] Localização Dinâmica via GPS: O trajeto sempre parte do ponto em que o entregador se encontra no momento[cite: 1, 3].

[x] Cadastro Inteligente: Detecção automática do município via GPS e suporte a CEP com máscara formatadora.

[x] Otimização Rápida com OSRM: Algoritmo do Caixeiro Viajante (TSP) com tempo de resposta em milissegundos[cite: 4, 6].

[x] Reordenação Manual: Possibilidade de subir ou descer qualquer parada manualmente através de setas no card.

[x] Navegação Multiparadas: Envio da rota completa para o aplicativo do Google Maps com texto exato para evitar erros de número de casa.

[x] Ações Rápidas de Contato: Botões integrados em cada card para realizar ligação telefônica imediata (tel:) ou abrir conversa direta no WhatsApp com mensagem de chegada pré-formatada.

[x] Histórico e Métricas: Resumo de entregas concluídas no dia, economia estimada em combustível e controle de status de conclusão individual ou em massa.

[x] Resiliência Offline: Cache automático de rotas locais via AsyncStorage caso haja perda de conexão[cite: 1].

[x] Cobertura Completa de Testes: 26 testes automatizados cobrindo integração de endpoints Fastify, regras do OSRM e componentes React Native.

📝 LicençaEste projeto está sob a licença MIT.
```
