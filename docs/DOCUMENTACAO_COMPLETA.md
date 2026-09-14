# 🚚 Delivery Fast - Documentação Completa do Aplicativo

> Sistema completo de roteirização dinâmica, gestão de entregas porta a porta e fechamento financeiro de turno desenvolvido para entregadores autônomos e pequenos comércios.

---

## 1. 📌 Visão Geral do Produto

O **Delivery Fast** é um aplicativo mobile de alta performance projetado para resolver as principais dores logísticas de entregadores (motoboys, motoristas de aplicativo e ciclistas) e pequenos comércios locais (pizzarias, farmácias, distribuidoras, restaurantes e e-commerces).

Diferente de sistemas complexos e caros do mercado que cobram mensalidades abusivas e dependem de APIs pagas do Google Maps Platform, o **Delivery Fast** foi arquitetado com tecnologias de código aberto e serviços gratuitos de altíssima confiabilidade (**BrasilAPI**, **OpenStreetMap / Nominatim**, **OSRM** e **Supabase**), entregando:

1. **Roteirização Inteligente**: Algoritmo do Caixeiro Viajante (TSP) que reordena todas as paradas com base na malha viária real, partindo sempre da localização física atual do entregador ($P_0$ dinâmico).
2. **Navegação Contínua sem Custos**: Despacho automático de rotas particionadas em lotes sequenciais de até 10 paradas diretamente para o app nativo do Google Maps.
3. **Comprovação Digital Segura (POD - Proof of Delivery)**: Captura de foto da encomenda entregue e coleta de assinatura na tela do celular, com nome e documento do recebedor.
4. **Fechamento de Turno & Prestação de Contas**: Geração de resumo diário consolidado com total de paradas, devoluções justificadas, km rodados e ganhos calculados (taxa por entrega, diária e valor por km), com envio formatado em 1 clique para o WhatsApp do lojista.

---

## 2. 💼 Modelo Comercial e Proposta de Valor

### Para o Entregador Autônomo
* **Economia de Combustível e Tempo**: Redução média de 25% a 35% na distância percorrida e até 1h30 economizada por turno.
* **Profissionalismo no Acerto**: Fim do caderninho de papel e de comandas perdidas. O fechamento diário é enviado no WhatsApp com detalhamento de taxas e chave PIX para pagamento instantâneo.
* **Segurança Jurídica**: Fotos e assinaturas registradas digitalmente no celular protegem contra reclamações de "não recebi meu pedido".

### Para o Pequeno Lojista
* **Transparência Total**: Recebe o relatório com paradas realizadas, conferência imediata de devoluções e motivo de insucesso.
* **Zero Investimento em Infraestrutura**: Não exige computadores caros ou servidores locais; o entregador opera tudo pelo próprio smartphone.

---

## 3. 📱 Funcionalidades do Aplicativo

### 3.1. Autenticação e Multi-Tenancy
* Cadastro e Login seguros via **Supabase Auth**.
* Políticas de **Row Level Security (RLS)** no PostgreSQL: cada entregador tem seus dados, rotas, comprovantes e históricos 100% isolados.

### 3.2. Importação em Massa de Pedidos ("Colar Lista")
* Permite colar listas brutas de pedidos recebidas via WhatsApp, e-mail ou bloco de notas.
* **Parser Inteligente**: Identifica automaticamente rua, número, bairro, nome do destinatário e telefone de contato, sanitizando pontuações trailing e vírgulas.
* **Cidade de Referência com GPS**: Preenche automaticamente a cidade a partir da localização do entregador, garantindo geocodificação precisa mesmo para listas que não trazem a cidade digitada em cada linha.

### 3.3. Geocodificação Híbrida de Alta Precisão (Zero Custo)
* **BrasilAPI (Prioritária para CEP)**: Quando o CEP é informado, consulta a base oficial brasileira dos Correios e obtém coordenadas instantâneas.
* **Nominatim Estruturado com Viewbox Delimitador**: Se não houver CEP, realiza busca estruturada (`street`, `city`, `state`, `country`) restrita a um *bounding box* viário (~45 km de raio ao redor das coordenadas do motorista). Ruas ou bairros com nomes comuns em outros estados nunca são selecionados por engano.

### 3.4. Otimização Dinâmica de Rotas ($P_0$ via GPS)
* Reordenação instantânea pela API de Viagem (*Trip API*) do **OSRM**.
* O algoritmo define a posição atual de GPS do motoboy como Ponto 0 ($P_0$), calculando o menor trajeto viário possível entre todas as entregas ativas.
* Exibição de resumo com distância total em km, tempo estimado e estimativa de economia em reais.

### 3.5. Navegação em Lotes Inteligentes
* O Google Maps impõe limite de paradas por URL. O Delivery Fast particiona rotas com mais de 10 entregas em lotes sequenciais navegáveis (Lote 1: paradas 1 a 10; Lote 2: paradas 10 a 20...).
* Seletor horizontal visual na tela principal para o entregador alternar entre lotes com 1 toque.

### 3.6. Comprovante de Entrega Digital (Foto & Assinatura)
* **Foto da Encomenda**: Captura em alta resolução via câmera (`expo-image-picker`) comprimida e convertida em URI Base64 persistente.
* **Assinatura na Tela**: Canvas vetorial interativo com captura de traços suaves (`PanResponder`), permitindo ao cliente assinar com a ponta do dedo.
* **Dados do Recebedor**: Registro do nome e documento (RG ou CPF).
* **Conclusão Rápida**: Opção de baixa em 1 toque para entregas rápidas onde o comprovante físico não é exigido.

### 3.7. Histórico e Visualizador de Comprovantes
* Listagem de todas as entregas concluídas no dia.
* Modal interativo que exibe a foto capturada do pacote entregue, o desenho vetorial da assinatura, nome, documento e data/hora da conclusão.

### 3.8. Relatório de Fechamento de Turno & WhatsApp
* **Painel Financeiro**: Configuração personalizada de taxa por entrega (ex: `R$ 8,00`), diária fixa (ex: `R$ 50,00`), adicional por km e chave PIX, salvas no `AsyncStorage` local.
* **Métricas do Turno**:
  * Total de entregas realizadas vs total de paradas.
  * Km viários rodados acumulados no dia.
  * Horário de início, término e duração total do turno.
  * Média de tempo por parada (ritmo da operação).
* **Conferência de Devoluções**: Destaque para pedidos com insucesso (`ausente`, `nao_localizado`, `recusado`) com endereço e justificativa.
* **Disparo no WhatsApp**: Geração automática de texto profissional com emojis e formatação limpa, abrindo o WhatsApp do lojista com 1 toque ou compartilhando via seletor nativo do sistema.

---

## 4. 🛠️ Arquitetura Técnica

### 4.1. Tecnologias do Frontend (Mobile)
| Tecnologia | Versão | Função |
| :--- | :--- | :--- |
| **React Native** | `0.83.0` | Framework base mobile |
| **React** | `19.1.0` | Biblioteca de UI com Hooks e useFocusEffect |
| **Expo SDK** | `~57.0.0` | Ecossistema de desenvolvimento e runtime mobile |
| **TypeScript** | `~5.9.2` | Tipagem estática rigorosa em todo o código |
| **NativeWind / TailwindCSS** | `^4.2.6` / `^3.4.19` | Estilização utilitária moderna com dark mode nativo |
| **React Navigation** | `^7.x` | Navegação por Bottom Tabs e Native Stack |
| **Expo Location** | `~19.0.0` | GPS de alta precisão com fallback em cache (<5ms) |
| **Expo Image Picker** | `~17.0.0` | Acesso à câmera nativa para fotos de comprovantes |
| **AsyncStorage** | `2.2.0` | Cache de rotas offline e configurações de taxas |
| **Jest & Testing Library** | `~29.7.0` | Suíte com 50 testes de unidade e componentes |

### 4.2. Tecnologias do Backend (API REST)
| Tecnologia | Versão | Função |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.x` | Ambiente de execução |
| **Fastify** | `^5.11.2` | Framework HTTP leve e de altíssimo throughput |
| **Supabase JS** | `^2.109.0` | Conexão PostgreSQL gerenciada com RLS |
| **Zod** | `^4.4.3` | Validação de schemas e contratos de API |
| **OSRM Trip API** | Pública / REST | Otimização de trajeto viário (TSP) |
| **BrasilAPI & Nominatim** | REST | Geocodificação de CEP e logradouros |
| **Vitest** | `^4.1.11` | Suíte de 26 testes de integração e controllers |

---

## 5. 🔌 Endpoints da API

Todas as rotas exigem cabeçalho de autenticação:
`Authorization: Bearer <token_supabase>`

### Entregas
* `POST /api/v1/entregas`: Cria uma entrega individual com geocodificação automática e ordem sequencial.
* `POST /api/v1/entregas/lote`: Importa lista de entregas com suporte a coordenadas do motorista e cidade padrão.
* `GET /api/v1/rotas/atual`: Retorna as paradas pendentes ordenadas e o resumo de distância/tempo.
* `POST /api/v1/rotas/otimizar`: Otimiza a rota partindo das coordenadas de GPS do entregador.
* `PUT /api/v1/rotas/reordenar`: Atualiza a ordem manual das paradas.
* `PUT /api/v1/entregas/:id`: Edita endereço de uma entrega.
* `DELETE /api/v1/entregas/:id`: Exclui uma parada da rota ativa.
* `PUT /api/v1/entregas/:id/status`: Dá baixa na entrega com status, recebedor, documento, foto e assinatura.
* `PUT /api/v1/rotas/concluir-todas`: Conclui um lote de entregas com lista de IDs.
* `GET /api/v1/entregas/historico-hoje`: Lista todas as entregas concluídas no dia.
* `GET /api/v1/relatorios/fechamento`: Gera o relatório diário consolidado com paradas, km, devoluções e ganhos calculados.

---

## 6. 🧪 Qualidade de Código e Testes

O projeto conta com uma rigorosa suíte de **76 testes automatizados**:

* **Backend (Vitest): 26 testes aprovados (100% de sucesso)**
  * Cadastro individual de entregas e geocodificação Nominatim/BrasilAPI
  * Importação em lote com ordem sequencial
  * Otimização de rotas com Ponto 0 dinâmico
  * Baixa com fotos, assinaturas e devoluções
  * Cálculo completo do relatório de fechamento de turno
* **Frontend (Jest & Testing Library): 50 testes em 10 suítes aprovados (100% de sucesso)**
  * `HomeScreen.test.tsx` (exibição de rotas, disparo no GPS, conclusão de lote)
  * `FechamentoTurnoModal.test.tsx` (ganhos, métricas, envio WhatsApp e AsyncStorage)
  * `ComprovanteEntregaModal.test.tsx` (foto, assinatura na tela e baixa rápida)
  * `HistoricoScreen.test.tsx` (renderização e decodificação de comprovantes)
  * `ImportarLoteModal.test.tsx` (parser de linhas com pontuações trailing)
  * `GerenciadorRotas.test.tsx` (drag & drop, reordenação e exclusão)
  * `LoginScreen.test.tsx` e `CadastroScreen.test.tsx` (autenticação e validação)
  * `navigation.test.ts` (particionamento em lotes de 10 paradas para o Google Maps)

---

## 7. 🚀 Como Rodar o Projeto Localmente

### Pré-requisitos
* Node.js v18 ou v20+
* Git
* Aplicativo **Expo Go** instalado no celular Android ou iOS

### 1. Iniciar o Backend
```bash
cd backend
npm install
npm test      # Executa os 26 testes no Vitest
npm run dev   # Inicia a API Fastify em http://localhost:3000
```

### 2. Iniciar o Frontend
```bash
cd frontend
npm install
npm test      # Executa os 50 testes no Jest
npx expo start -c
```
Escaneie o QR Code gerado no terminal com a câmera do celular (iOS) ou com o aplicativo Expo Go (Android).
