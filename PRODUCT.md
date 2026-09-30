# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

* **Usuário Primário:** Entregadores autônomos de última milha (*last-mile*) — motoboys, ciclistas e motoristas de aplicativo.
  - **Situação:** Operando no trânsito urbano com o celular frequentemente fixado em suporte de guidão ou painel, exposto a reflexos de sol, chuva leve ou luvas, precisando de decisões em 1 toque sem distrações de pilotagem.
  - **Job-to-be-Done:** Organizar a rota de paradas do dia da maneira mais rápida e curta possível, comprovar entregas de forma incontestável para não ter descontos em pedidos e fechar as contas diárias com o lojista sem fricção nem perda de comandas de papel.
* **Usuário Secundário (Consumidor de Relatórios):** Pequenos lojistas e estabelecimentos comerciais (pizzarias, restaurantes, farmácias e comércios locais) que contratam o motoboy por diária ou taxa e precisam auditar devoluções e pagar o valor exato via PIX.

## Product Purpose

O **Delivery Fast** existe para dar autonomia, economia de combustível e proteção jurídica ao entregador brasileiro, eliminando a dependência de papéis amassados e de plataformas caras com mensalidades abusivas.
* **Sucesso para o entregador:** Economizar de 25% a 35% de combustível por turno, terminar as entregas mais cedo e receber o valor diário integral no PIX imediatamente após o expediente.
* **Sucesso para o produto:** Ser a ferramenta de cabeceira do motoboy que opera 100% lisa, sem falhas de conexão, com GPS instantâneo e custo operacional zero para roteamento e geocodificação (OSRM, Nominatim, BrasilAPI), complementado por auto-sugestão de endereços via Google Places API (New) dentro da cota gratuita de 298 buscas/dia.

## Positioning

Diferente de sistemas de despacho logístico corporativos pesados (como Routeasy, Dlog ou plataformas SaaS com cobrança mensal) ou de soluções que cobram taxas por requisição da API do Google Maps Platform:
* O **Delivery Fast** combina a malha viária aberta de altíssimo desempenho (**OSRM**, **BrasilAPI** e **Nominatim com bounding box**) para roteirização e geocodificação sem custos de API, com auto-sugestão preditiva de endereços via **Google Places API (New)** (cota gratuita com circuit breaker de 298 req/dia), e despacho automático de navegação em lotes sequenciais de 10 paradas diretamente para o app nativo do Google Maps já instalado no aparelho.
* Integra comprovação física (POD: foto comprimida em Base64 e assinatura touch com trava de scroll) e fechamento financeiro imediato para o WhatsApp do lojista em um único fluxo móvel enxuto.

## Operating Context

* **Ambiente de Uso:** Ruas, avenidas, trânsito intenso, paradas rápidas na frente de prédios e casas, conexão 4G/5G oscilante.
* **Ferramentas Integradas:**
  - Câmera do smartphone para registro visual da entrega.
  - Sensor de GPS (`expo-location`) com leitura em cache (<5ms) para não travar a interface.
  - Google Maps nativo instalado no Android/iOS para navegação assistida por voz.
  - WhatsApp para compartilhamento instantâneo do fechamento de contas diário e chave PIX.
* **Ritual Diário:**
  1. Login no início do turno com detecção automática da cidade.
  2. Colagem de lista de pedidos recebida no WhatsApp ("Colar Lista") ou cadastro rápido de paradas.
  3. Otimização em 1 toque definindo o ponto atual do GPS como $P_0$.
  4. Navegação por lotes de 10 paradas.
  5. Coleta de foto, assinatura e documento na entrega.
  6. Fechamento de turno e envio do comprovante formal no WhatsApp do estabelecimento.

## Capabilities and Constraints

* **Capacidades Confirmadas:**
  - Autenticação e Multi-Tenancy com isolamento rigoroso via Supabase Auth e PostgreSQL Row Level Security (RLS).
  - Parser inteligente de texto ("Colar Lista") com sanitização de pontuações de final de linha.
  - **Auto-sugestão preditiva de endereços** via Google Places API (New) com debounce de 350ms, locationBias por GPS e circuit breaker de 298 req/dia com reset automático à meia-noite.
  - Geocodificação híbrida e tolerante a abreviações brasileiras ("R.", "Av.", "Mal.", "Pres."), com priorização de coordenadas precisas enviadas pelo frontend.
  - Otimização do Caixeiro Viajante (TSP) com fallback resiliente local Nearest-Neighbor + 2-Opt.
  - Particionamento e formatação de lotes para contornar o limite de 10 waypoints do Google Maps nativo.
  - Comprovante de entrega com foto, tela de desenho vetorial touch (`react-native-svg` + `PanResponder`), bloqueio de scroll externo e máscara de CPF.
  - Histórico auditável de comprovantes salvos.
  - Fechamento financeiro diário com taxa por entrega, km rodados, diária fixa e chave PIX persistidas em `AsyncStorage`.
* **Restrições Técnicas:**
  - Aplicação 100% adaptativa desenvolvida em React Native 0.86.3 sob Expo SDK 57.0.26 (suporte equânime a Android e iOS).
  - Backend modular em Fastify 5 + TypeScript + Vitest.
  - Arquitetura de qualidade com 122 testes automatizados (100% aprovados).
  - Roteamento e geocodificação via serviços públicos (OSRM, BrasilAPI, Nominatim) — custo zero. Auto-sugestão de endereços via Google Places API (New) dentro da cota gratuita (circuit breaker em 298 req/dia garante R$ 0 de custo).

## Brand Commitments

* **Nome:** Delivery Fast
* **Voz e Tom:** Direto, objetivo, confiável, parceiro do trabalhador autônomo, sem jargões corporativos complicados.
* **Identidade Visual Atual:**
  - Tema escuro nativo (Dark Mode: fundo `#0b1320`, superfícies em azul petróleo escuro e contrastes em verde esmeralda / azul vibrante).
  - Foco absoluto em alto contraste e legibilidade sob sol forte ou luz noturna.

## Evidence on Hand

* **Código-Fonte Completo e Validado:**
  - Backend: [`backend/src/routes/rotas.routes.ts`](file:///c:/Users/Pietrok/Desktop/delivery_fast_app/backend/src/routes/rotas.routes.ts), [`backend/schema.sql`](file:///c:/Users/Pietrok/Desktop/delivery_fast_app/backend/schema.sql)
  - Frontend: [`frontend/src/screens/HomeScreen.tsx`](file:///c:/Users/Pietrok/Desktop/delivery_fast_app/frontend/src/screens/HomeScreen.tsx), [`frontend/src/components/FechamentoTurnoModal.tsx`](file:///c:/Users/Pietrok/Desktop/delivery_fast_app/frontend/src/components/FechamentoTurnoModal.tsx)
* **Documentação Técnica e Comercial Exaustiva:**
  - [`docs/DOCUMENTACAO_COMPLETA.md`](file:///c:/Users/Pietrok/Desktop/delivery_fast_app/docs/DOCUMENTACAO_COMPLETA.md)
  - [`README.md`](file:///c:/Users/Pietrok/Desktop/delivery_fast_app/README.md)
* **Métricas de Qualidade:**
  - 122 testes automatizados passando (33 backend Vitest + 89 frontend Jest).

## Product Principles

1. **Velocidade em Campo Acima de Tudo:** Nenhum fluxo operacional primário do entregador (iniciar rota, abrir parada, dar baixa) pode exigir mais de dois toques ou travar aguardando rede.
2. **Custo Operacional Zero em APIs:** Toda a inteligência geográfica deve se manter apoiada em serviços públicos e abertos (OSRM, BrasilAPI, Nominatim) com fallbacks locais robustos.
3. **Segurança e Transparência Jurídica:** Provas de entrega digitais (fotos e assinaturas) devem ser fiéis, leves e permanentes para resguardar o motorista contra fraudes.
4. **Fechamento Financeiro Incontestável:** Números de diárias, taxas e km devem ser claros, transparentes e fáceis de conferir para garantir recebimentos rápidos via PIX.
5. **Robustez Offline & Resiliência:** O aplicativo deve responder instantaneamente por meio de caches locais, garantindo navegação contínua mesmo com oscilações de sinal de celular.

## Accessibility & Inclusion

* Tamanhos de toque (*touch targets*) generosos (mínimo de 48x48 dp) para permitir toque fácil em suportes veiculares ou com dedos enluvados.
* Contraste tipográfico acentuado para visualização em telas sob incidência direta de luz solar.
* Máscara automática em campos de documento e teclado numérico automático para agilizar entradas de dados.
