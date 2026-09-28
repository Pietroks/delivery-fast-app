---
target: frontend/src/screens/HomeScreen.tsx
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\Pietrok\\Desktop\\delivery_fast_app\\frontend\\src\\screens\\HomeScreen.tsx"
target_fingerprint: "sha256:a99656b58a127cd504e8e82363632c012a50a31e30baa26c67320b347061c792"
target_path: "C:\\Users\\Pietrok\\Desktop\\delivery_fast_app\\frontend\\src\\screens\\HomeScreen.tsx"
timestamp: 2026-09-28T18-12-36Z
slug: frontend-src-screens-homescreen-tsx
---
# Design Critique: HomeScreen & Delivery Flow

Target: `frontend/src/screens/HomeScreen.tsx` (and `frontend/src/components/`)
Platform: React Native / Expo Mobile Application

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Resumo de rota claro (km, paradas, tempo). Falta indicador de status de sincronização offline e precisão de sinal GPS. |
| 2 | Match System / Real World | 2/4 | Botão "Ligar" (call-outline) abre WhatsApp em vez do discador telefônico (tel:). Setas cima/baixo não refletem mapa espacial. |
| 3 | User Control and Freedom | 2/4 | Sem "Desfazer" (Undo) ao concluir entrega ou remover parada. Ao dar baixa, a parada desaparece instantaneamente. |
| 4 | Consistency and Standards | 2/4 | Gatilhos duplicados para modal de comprovante (check verde à esquerda e botão comprovante embaixo). Alvos de 32px violam padrão de 48px. |
| 5 | Error Prevention | 2/4 | Ícone de lixeira (excluir) a 4px de distância da seta para baixo e editar. Endereço truncado com `numberOfLines={1}` oculta número/bloco. |
| 6 | Recognition Rather Than Recall | 3/4 | Pílulas de lote expõem claramente intervalos de paradas (1 a 10, 11 a 20). Resumo itemiza telemetria de forma visível. |
| 7 | Flexibility and Efficiency | 3/4 | Importador regex de WhatsApp e particionamento Google Maps são aceleradores excepcionais. Falta gesto de swipe para baixa rápida. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Poluição visual nos cartões: 7 botões por parada competindo em tela de pilotagem. Excesso de micro-ícones e micro-textos (10px). |
| 9 | Error Recovery | 3/4 | Diálogos de alerta claros para falha de GPS e modo offline com fallback no AsyncStorage. |
| 10 | Help and Documentation | 2/4 | Sem dicas de onboarding explicando limite de 10 paradas do Google Maps, formato da lista de importação ou otimizador TSP. |
| **Total** | | **24/40** | **Acceptable** |

### Design Specificity Verdict

**Verdict:** The application possesses strong domain-specific DNA in its business logic (TSP routing, 10-stop Google Maps batching, canvas POD signature, and WhatsApp PIX shift reconciliation), but its execution layer inside `GerenciadorRotas` suffers from desktop CRUD leakage. It treats delivery stops like database rows rather than physical waypoints in an active tactical queue.

**LLM assessment:**
- High Domain Alignment: Dark cockpit canvas (`#0b1320`), batch navigation pills (`Lote 1`, `Lote 2`), and financial WhatsApp PIX dispatch address genuine pain points of Brazilian motoboys.
- Category-Interchangeable Artifacts: Up/down arrow reordering (`chevron-up`/`chevron-down`), 7 micro-buttons per card, and address truncation belong in desktop web tables, not a motorcycle cockpit operating at 40 km/h in traffic.

**Deterministic scan:**
- `impeccable detect` scanned `HomeScreen.tsx` and all 9 components in `frontend/src/components/`.
- Findings: 0 rule violations (clean scan).
- All surfaces strictly use design tokens from `DESIGN.md`. Badges are operational batch selectors, not marketing hero chips.

### Overall Impression
A fast, mission-critical engine with high domain value for delivery couriers, but cluttered by desktop-style stop reordering and micro-buttons that are dangerous to operate in motorcycle transit. The single biggest opportunity is introducing an explicit **"Modo Pista / Cockpit"** vs. **"Modo Montagem"** or simplifying active delivery cards down to address, contact buttons, and a large POD confirmation button.

### What's Working
1. **Intelligent Google Maps Batching (`calcularLotes`):** Seamlessly overcomes the 10-waypoint restriction of native mobile navigation apps by automatically structuring routes into sequential batches (`Lote 1`, `Lote 2`), allowing 1-tap handoff to turn-by-turn voice navigation.
2. **End-to-End Shift Monetization (`FechamentoTurnoModal`):** Converts operational logistics into concrete earnings (taxa por entrega + km rodados + diária), packaging the result into a clean WhatsApp template with PIX key ready for merchant dispatch.
3. **Resilient Offline Architecture & Low-Friction Import:** Instant fallback to `AsyncStorage` when cellular signal drops in transit, combined with the regex-powered WhatsApp paste parser that eliminates manual typing of delivery addresses.

### Priority Issues

#### [P0] Micro Tap Targets (32px) & Dangerous Proximity on Reorder/Trash Controls
- **What:** The 4 utility buttons (`chevron-up`, `chevron-down`, `pencil`, `trash`) inside `GerenciadorRotas.tsx` are sized at `min-w-[32px] min-h-[32px]` with a 4px gap.
- **Why it matters:** Couriers operate devices in vibration-heavy environments with gloved or wet fingers. Placing a destructive action (Trash) 4px away from reorder controls guarantees accidental deletions during transit.
- **Fix:** Remove Up, Down, Edit, and Trash from the default card surface. Move Edit and Delete into a long-press context sheet or swipe gesture. Replace Up/Down arrows with long-press drag or an explicit "Reorganizar Paradas" mode. Ensure all interactive targets meet the strict 48x48 dp minimum.
- **Suggested Command:** `$impeccable layout` / `$impeccable harden`

#### [P1] Critical Address Truncation Hiding Delivery Details
- **What:** `item.rua` uses `numberOfLines={1}` in `GerenciadorRotas.tsx`.
- **Why it matters:** Brazilian street addresses frequently include critical destination tokens at the end of the string (e.g., `", 1020 - Bloco B Apto 402"`). Truncating this to one line forces the courier to stop and open the edit modal just to read the apartment number.
- **Fix:** Allow `numberOfLines={2}` for the address block, ensuring house number and apartment/complement are always visible with high-contrast text (`text-sm font-semibold text-white`).
- **Suggested Command:** `$impeccable typeset` / `$impeccable clarify`

#### [P1] Broken "Ligar" Affordance & Redundant Comprovante Triggers
- **What:**
  1. `ligarParaCliente` in `GerenciadorRotas.tsx` calls `whatsapp://send` instead of initiating a cellular call via `tel:`.
  2. The green checkmark button on the left of each card and the "Comprovante" button on the bottom of the card execute the exact same modal trigger (`handleAbrirComprovante`).
- **Why it matters:** Violates basic mental models. A courier needing to call an elderly resident without WhatsApp cannot make a standard phone call. Duplicate comprovante buttons waste horizontal space and confuse user expectations.
- **Fix:** Fix `ligarParaCliente` to invoke `Linking.openURL("tel:" + numeroLimpo)`. Consolidate the card actions: make the left checkmark trigger a streamlined 1-tap confirmation or distinct action, while the camera button specifically handles photo POD.
- **Suggested Command:** `$impeccable polish` / `$impeccable clarify`

#### [P2] In-Flight Card Clutter & Missing "Undo" State
- **What:** Each card exposes 7 separate action targets. When an order is completed, it vanishes instantly with no undo toast/snackbar.
- **Why it matters:** Extreme visual noise increases cognitive burden while driving. An accidental tap on a bumpy road permanently deletes or marks an order without immediate recovery.
- **Fix:** Distill the active delivery card down to 3 essential elements: (1) Order badge & Full Address, (2) Contact bar (Phone + WhatsApp), (3) Primary "Concluir / Comprovante" action. Introduce a 5-second "Desfazer" toast for marked deliveries.
- **Suggested Command:** `$impeccable distill`

#### [P2] Bottom Action Hierarchy Collision & Weak Empty State
- **What:** The floating action button (FAB) inside `GerenciadorRotas` sits directly above the bottom action bar (`Iniciar no GPS` / `Finalizar Rota`), creating a cramped double-action zone. When no routes exist, the empty state displays only a passive map pin without a prominent CTA to import or add.
- **Why it matters:** Clutters the thumb zone at the bottom of the screen. New or returning couriers staring at an empty list are not nudged to import their WhatsApp list.
- **Fix:** Move "Adicionar Parada" into the top subheader next to "Importar", removing the floating FAB. Turn the empty state into a high-visibility hero card: *"Nenhuma entrega ativa. Toque em 'Importar' para colar sua lista do WhatsApp."*
- **Suggested Command:** `$impeccable adapt` / `$impeccable onboard`

### Persona Red Flags

**Alex (Power User - 45 entregas/dia):** Reorganizar as paradas 8 a 12 exige apertar as micro-setas de 32px dezenas de vezes. A ausência de reordenação em lote ou arrasto causa frustração extrema e atrasa a saída para a rota.

**Jordan (First-Timer):** Ao abrir o app vazio, vê "Nenhuma rota pendente" e o botão de destaque no rodapé é "Fechamento do Turno de Hoje", levando a crer que deve encerrar o expediente antes mesmo de começar. O botão "Importar" não tem onboarding contextual.

**Casey (Distracted Mobile User):** Parado em sinal de 30 segundos, tenta ler o complemento do endereço, mas ele está cortado por `numberOfLines={1}`. Clica em "Ligar" esperando ligar para o interfone, mas o app abre o WhatsApp, perdendo tempo no semáforo.

**Marcos (Motoboy Veterano na Chuva):** Com luvas molhadas e moto vibrando, tenta tocar no cartão e a gota de água aciona o ícone de lixeira colado na seta para baixo. Ao dar baixa na entrega certa, o item some sem opção de "Desfazer" caso tenha tocado por engano.

### Minor Observations
- O cumprimento `"Olá, {nomeUsuario}! Pronto para otimizar suas entregas?"` consome 48dp no topo sem valor tático. Poderia mostrar `"Turno Ativo • 14 Entregas Restantes"`.
- A tipografia de telemetria em `ResumoRotaCard` (16px) é pequena para leitura rápida sob luz solar forte.
- Haptics são disparados em quase todas as ações, sem distinção tática entre um toque simples e uma baixa crítica de entrega.

### Questions to Consider
- O aplicativo deveria ter um seletor explícito de **"Modo Montagem"** (importar, editar, reordenar paradas) vs. **"Modo Pista / Cockpit"** (apenas endereço completo, ligar, WhatsApp e grande botão de baixa)?
- Se a comunicação de entrega é 95% WhatsApp, a ação de telefone deveria ser claramente um botão secundário discador (`tel:`) ou o botão "Ligar" atual deve ser corrigido para não abrir WhatsApp duas vezes?
- Por que forçar o entregador a clicar em setas para cima/baixo se o motor TSP pode oferecer um botão único de *"Reotimizar rota a partir de onde estou"*?
