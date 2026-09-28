---
name: Delivery Fast
description: "Sistema visual de alto contraste cirúrgico e estética Dark Mode tática para motoboys e entregadores autônomos"
colors:
  bg-canvas: "#0b1320"
  surface-card: "#152033"
  surface-elevated: "#1e2e48"
  border-subtle: "#22334f"
  text-primary: "#ffffff"
  text-muted: "#94a3b8"
  text-dimmed: "#64748b"
  accent-emerald: "#22c55e"
  accent-emerald-tint: "rgba(34, 197, 94, 0.1)"
  accent-sky: "#38bdf8"
  accent-sky-tint: "rgba(56, 189, 248, 0.1)"
  status-amber: "#f59e0b"
  status-red: "#ef4444"
typography:
  display:
    fontSize: "24px"
    fontWeight: "700"
    lineHeight: "32px"
  headline:
    fontSize: "20px"
    fontWeight: "700"
    lineHeight: "28px"
  title:
    fontSize: "16px"
    fontWeight: "600"
    lineHeight: "24px"
  body:
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "20px"
  label:
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "16px"
  caption:
    fontSize: "10px"
    fontWeight: "500"
    lineHeight: "14px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  sheet: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-emerald}"
    textColor: "#000000"
    rounded: "{rounded.lg}"
    padding: "16px"
    height: "52px"
  button-primary-active:
    backgroundColor: "#16a34a"
    textColor: "#000000"
    rounded: "{rounded.lg}"
    padding: "16px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "14px"
    height: "48px"
  card-route:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-field:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
    height: "48px"
  badge-chip:
    backgroundColor: "{colors.accent-emerald-tint}"
    textColor: "{colors.accent-emerald}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Delivery Fast

## 1. Overview

O **Delivery Fast** adota a metáfora criativa do **"Cockpit Noturno Tático"**. A interface foi desenvolvida para atender entregadores autônomos (motoboys e ciclistas) operando em condições extremas: com o celular afixado no guidão da moto ou suporte de carro, sob luz solar direta inclemente ou na escuridão de turnos noturnos, muitas vezes utilizando luvas ou com a visão periférica ocupada pela via.

### Filosofia Estética
* **Legibilidade Sem Fricção:** Informações vitais (endereço, número da entrega, tempo e ganhos) saltam aos olhos imediatamente com contraste máximo.
* **Tátil e Confiável:** Cada botão e card possui área de contato robusta (mínimo de 48x48 dp), evitando toques acidentais ou perda de comando com trepidação veicular.
* **Economia Energética & Conforto:** Paleta prioritariamente Dark Mode com tons de azul profundo que poupam a bateria de telas AMOLED/OLED durante longas jornadas de trabalho.

### Anti-Referências Visuais
* ❌ Interfaces brancas ofuscantes ou cinzas claros desbotados que se tornam invisíveis sob o sol.
* ❌ Botões pequenos, ícones sem rótulo ou controles escondidos em menus hambúrguer labirínticos.
* ❌ Sombras difusas e degradês borrados que poluem a tela e criam sensação de lentidão.

---

## 2. Colors

A paleta de cores estrutura uma hierarquia tonal precisa e focada em status operacionais:

### Superfícies e Estrutura
* **Background Primário (`bg-canvas` - `#0b1320`):** Preto azulado noturno profundo. Atua como o horizonte visual de fundo em todas as telas, criando contraste absoluto com os elementos em primeiro plano.
* **Superfície Base (`surface-card` - `#152033`):** Azul ardósia escuro utilizado em cards de pedidos, resumo financeiro e seções principais.
* **Superfície Ativa/Elevada (`surface-elevated` - `#1e2e48`):** Azul escuro médio utilizado em campos de texto (inputs), cards de paradas ativas e itens selecionados.
* **Borda Delimitadora (`border-subtle` - `#22334f`):** Traço de 1px que contorna cartões, inputs e divisórias, conferindo precisão geométrica sem poluir visualmente.

### Acentos e Ações
* **Verde Esmeralda Tático (`accent-emerald` - `#22c55e`):** Cor de ação primária do sistema. Representa início de rota, entregas concluídas, confirmações de recebimento e métricas financeiras positivas. Utilizado com tipografia preta (`#000000`) para legibilidade cirúrgica.
* **Azul Céu de Navegação (`accent-sky` - `#38bdf8`):** Cor de suporte e geolocalização. Utilizada para ações de mapa (Google Maps), badges informativos, links de WhatsApp e chamadas telefônicas.
* **Alerta / Pendência (`status-amber` - `#f59e0b`):** Indica atenção, paradas aguardando ação e advertências operacionais.
* **Insucesso / Crítico (`status-red` - `#ef4444`):** Indica pedidos não entregues, destinatário ausente, recusas e botões de exclusão.

### Tipografia e Contraste
* **Texto Primário (`text-primary` - `#ffffff`):** Branco puro para títulos, números de paradas e dados de endereço prioritários.
* **Texto Secundário (`text-muted` - `#94a3b8`):** Cinza ardósia claro para rótulos, nomes de bairros e descrições auxiliares.
* **Texto Terciário (`text-dimmed` - `#64748b`):** Cinza médio para horários estimados, carimbos de data e legendas de baixa prioridade.

---

## 3. Typography

A tipografia utiliza as fontes nativas do sistema operacional (San Francisco no iOS, Roboto no Android) para carregamento instantâneo com zero impacto no bundle.

| Nível | Tamanho | Peso | Line Height | Aplicação no App |
| :--- | :---: | :---: | :---: | :--- |
| **Display** | `24px` | Bold (700) | `32px` | Título da tela principal, saldo financeiro consolidado |
| **Headline** | `20px` | Bold (700) | `28px` | Títulos de modais (Comprovante, Fechamento de Turno) |
| **Title** | `16px` | SemiBold (600) | `24px` | Nome de ruas, destinatários, títulos de cards |
| **Body** | `14px` | Regular (400) | `20px` | Endereços complementares, dados de contato, notas |
| **Label** | `12px` | Medium (500) | `16px` | Rótulos de formulário, botões secundários, métricas secundárias |
| **Caption** | `10px` | Medium (500) | `14px` | Badges de status, carimbos de hora, ordem da parada (`text-[10px]`) |

---

## 4. Layout

* **Container Padrão:** Envelopado por `SafeAreaView` com cor de fundo `#0b1320` e preenchimento horizontal consistente de `16px` (`px-4` ou `px-6`).
* **Ritmo Vertical:**
  - Espaçamento entre cartões: `12px` (`mb-3` ou `gap-3`).
  - Espaçamento entre seções principais: `16px` a `24px` (`gap-4` a `gap-6`).
* **Seletor de Lotes Horizontal:** Barra horizontal com rolagem suave (`horizontal={true}`) para alternar entre blocos de até 10 paradas do Google Maps sem trocar de tela.
* **Barra Flutuante de Ação:** O botão de maior prioridade operacional (ex: *"Navegar no Maps"* ou *"Iniciar Rota"*) fica fixado na base da visualização ou em destaque imediato no cabeçalho operacional.

---

## 5. Elevation & Depth

O Delivery Fast rejeita sombras difusas em favor de **camadas tonais escuras**:
* **Nível 0 (Chão de Tela):** `#0b1320` (fundo estático da aplicação).
* **Nível 1 (Superfície Primária):** `#152033` com borda `1px solid #22334f`. Aplicado a todos os cartões de lista e blocos de informação.
* **Nível 2 (Superfície Elevada/Interativa):** `#1e2e48` com borda `1px solid #22334f`. Aplicado a inputs de texto, estados pressionados e cards de destaque.
* **Nível 3 (Camada Suspensa / Modais):** `#152033` com fundo escurecido semitransparente no backdrop (`bg-black/75`), bordas superiores arredondadas em `rounded-t-3xl` (24px) e traço superior delimitador.

---

## 6. Shapes

* **Cantos de Cards e Botões (`rounded-xl` - 12px):** O padrão universal do aplicativo. Proporciona equilíbrio entre modernidade e conforto visual.
* **Cantos de Modais e Bottom Sheets (`rounded-t-3xl` - 24px):** Curvatura pronunciada na parte superior de gavetas e modais de fechamento/comprovante.
* **Pills e Badges (`rounded-full` - 9999px):** Utilizado em indicadores de status (ex: chip "Entregue", seletor de lotes "Lote 1") e no botão flutuante de câmera.
* **Inputs de Formulário (`rounded-xl` - 12px):** Altura fixa de `48px` a `52px` para facilitar a digitação em movimento.

---

## 7. Components

### Botão Primário de Ação (`button-primary`)
* Fundo verde esmeralda (`#22c55e`), texto preto em negrito (`font-bold text-black`), altura de `52px` e cantos `rounded-xl`.
* Feedback ao toque: escurece para `#16a34a` mantendo alto contraste.

### Botão Secundário / Utilitário (`button-secondary`)
* Fundo `#1e2e48`, borda de 1px `#22334f`, texto branco (`text-white font-semibold`), altura de `48px`.

### Card de Parada de Entrega (`card-route`)
* Fundo `#152033`, borda `#22334f`, padding interno de `16px`.
* Estrutura interna:
  - Canto esquerdo: Indicador circular da ordem (`1`, `2`, `3...`) em verde esmeralda ou azul céu.
  - Centro: Logradouro principal em branco (`text-base font-semibold`), bairro e horário estimado em cinza ardósia (`text-xs text-[#94a3b8]`).
  - Canto direito: Botões de ação rápida para chamada telefônica (`tel:`), WhatsApp e abertura do modal de comprovante de entrega.

### Canvas de Assinatura Digital Touch
* Superfície escura dedicada com bloqueio de scroll concorrente (`scrollEnabled={!desenhando}`).
* Traço vetorial nítido em branco contrastando sobre fundo preto/azul profundo, com botão de limpar e botão de confirmação verde esmeralda.

---

## 8. Do's and Don'ts

### ✅ O que FAZER (Do's)
* **Manter Alto Contraste Sempre:** Textos secundários devem usar no mínimo `#94a3b8`; nunca use cinzas escuros quase pretos em fundos escuros.
* **Áreas de Toque Generosas:** Qualquer elemento interativo deve possuir no mínimo `48x48 dp` de área clicável.
* **Feedbacks Visuais Claros:** Alterações de status devem refletir imediatamente em cores canônicas (Verde para sucesso, Vermelho para devolução/recusa, Âmbar para pendência).
* **Sanitização de Dados:** Mascarar telefones e CPFs automaticamente para poupar digitação do motoboy.

### ❌ O que NÃO FAZER (Don'ts)
* **Nunca Inserir Fundos Claros/Brancos:** Não misture telas ou modais com fundo branco, pois quebram a adaptação visual do entregador em ambientes escuros e ofuscam a visão.
* **Não Usar Modais Bloqueantes sem Opção Fácil de Fechar:** Todo modal deve possuir botão explícito de cancelamento e fechamento ao tocar no backdrop ou no topo.
* **Não Depender de Sombras para Diferenciar Elementos:** Use a elevação por variação tonal (`#0b1320` -> `#152033` -> `#1e2e48`) e bordas `#22334f`.
* **Não Poluir o Card de Parada com Informações Desnecessárias:** Mostre apenas Rua, Número, Bairro, Destinatário e Ações Rápidas. Detalhes secundários ficam no modal de edição.
