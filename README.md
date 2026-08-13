# 🚚 Delivery Fast - Otimizador de Rotas de Entrega

Aplicação mobile completa desenvolvida para entregadores otimizarem rotas de entrega dinamicamente a partir da sua **localização atual via GPS**. O sistema calcula o trajeto mais rápido e econômico e abre a sequência direto no **Google Maps**.

---

## 🚀 Tecnologias Utilizadas

### **Mobile (Frontend)**

- **React Native** com **Expo**
- **TypeScript**
- **TailwindCSS / NativeWind** (Estilização)
- **Expo Location** (Captura de coordenadas via GPS)
- **React Navigation**
- **Axios** (Consumo da API)

### **Backend**

- **Node.js** com **Fastify**
- **TypeScript**
- **Supabase** (Banco de dados PostgreSQL e ORM)
- **OSRM (Open Source Routing Machine)** (Algoritmo de cálculo e otimização de rotas/Trip API)
- **Nominatim / OpenStreetMap** (Geocodificação de endereços)

---

## 📁 Estrutura do Projeto

O projeto é estruturado em formato **monorepo**:

```text
delivery_fast_app/
├── backend/               # Servidor Fastify & Integrações
│   ├── src/
│   │   ├── routes/        # Endpoints da API
│   │   └── services/      # Integrações (Supabase, OSRM, Geocoding)
│   └── package.json
├── frontend/              # Aplicativo React Native (Expo)
│   ├── src/
│   │   ├── components/    # Componentes modulares de UI
│   │   ├── services/      # Cliente HTTP (Axios)
│   │   └── utils/         # Navegação e deep linking (Google Maps)
│   └── package.json
├── .gitignore
└── README.md
```

⚡ Como Executar o Projeto
Pré-requisitos
Node.js (versão 18 ou superior)

Aplicativo Expo Go instalado no celular (ou simulador Android/iOS)

Conta no Supabase para banco de dados

1. Configurando o Backend
   Acesse a pasta do backend:

Bash
cd backend
Instale as dependências:

Bash
npm install
Crie um arquivo .env baseado no seu banco do Supabase:

Snippet de código
PORT=3333
SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
SUPABASE_KEY=sua-chave-anon-ou-service-role
Execute o servidor em modo de desenvolvimento:

Bash
npm run dev 2. Configurando o Frontend
Em outro terminal, acesse a pasta do frontend:

Bash
cd frontend
Instale as dependências:

Bash
npm install
Configure o arquivo src/services/api.ts com o endereço IP da sua máquina local:

TypeScript
export const api = axios.create({
baseURL: 'http://SEU_IP_LOCAL:3333/api/v1',
});
Inicie o Expo:

Bash
npx expo start
Escaneie o QR Code com a câmera do celular (iOS) ou via app Expo Go (Android).

📌 Principais Funcionalidades
[x] Cadastro e gerenciamento de entregas pendentes.

[x] Leitura do GPS do dispositivo em tempo real como ponto inicial da rota.

[x] Otimização de sequência com OSRM (Algoritmo do Caixeiro Viajante - TSP).

[x] Trajeto direto e multi-stops integrado nativamente ao Google Maps.

[x] Suporte a rotas com 1 ou múltiplas entregas.

📝 Licença
Este projeto está sob a licença MIT. Sinta-se à vontade para estudar e utilizar o código!

---
