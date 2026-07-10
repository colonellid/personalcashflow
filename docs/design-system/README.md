# Design System — Referência Máxima

> **Este diretório é a fonte da verdade para todas as decisões visuais do Personal Cashflow.**
> Qualquer trabalho de UI (novo componente, refactor visual, ajuste de cor/espaçamento/tipografia) deve
> ser avaliado contra este guia antes de qualquer outra referência (screenshots antigos, gosto pessoal
> momentâneo, outros produtos vistos soltos). Em caso de conflito, **este guia vence**.

Referência de origem: sistema visual do **Dub** (dub.co) — "frosted link dashboard on rice paper".
Light theme, base quase-branca, hairline borders (não elevação/sombra), tipografia densa em
monocromático, e um único azul elétrico como acento.

## Arquivos

| Arquivo | O que é | Quando usar |
|---|---|---|
| [`DESIGN.md`](./DESIGN.md) | Documento completo: paleta com papéis semânticos, escala tipográfica, espaçamento, raios, sombras, catálogo de componentes, do's/don'ts, layout e imagery | Ler primeiro. É a explicação em prosa de *por que* cada token existe e *onde* ele deve ser aplicado |
| [`tokens.json`](./tokens.json) | Tokens em formato [W3C Design Tokens](https://design-tokens.github.io/community-group/format/) — cor, tipografia, espaçamento, raio, sombra, superfície | Fonte estruturada para gerar tokens em qualquer plataforma/ferramenta (Figma, outros frameworks) |
| [`variables.css`](./variables.css) | As mesmas variáveis como custom properties `:root` puras | Referência para uso fora de Tailwind, ou para conferir o valor exato de uma variável |
| [`theme.css`](./theme.css) | As mesmas variáveis dentro de um bloco `@theme` (Tailwind v4 CSS-first) | **Este é o formato compatível com o `app/globals.css` do projeto** — é o que efetivamente será portado quando o redesign for implementado |

## Regras de aplicação

- **Bordas, não sombras.** O sistema usa hairline borders (`--color-ash` `#e5e5e5`, 1px) como mecanismo
  primário de definir contêineres. Sombras são reservadas para os 3 casos documentados em
  "Border-First Elevation Philosophy" no `DESIGN.md` — não usar `shadow-md`/`shadow-lg` como padrão de
  card.
- **Um único acento cromático por vez.** `--color-electric-blue` (`#2563eb`) é o acento de marca;
  `--color-deep-sapphire` (`#1e40af`) é reservado para exatamente uma ação primária por tela. As cores
  de suporte (mint, tangerine, lavender) são para tags/badges pontuais, nunca para grandes superfícies.
- **Tipografia por papel, não por gosto.** Satoshi peso 500 é *display-only* (36–48px, títulos de seção/hero).
  Tudo abaixo de 30px é Inter. Geist Mono é só para dados técnicos/monoespaçados.
- **Vocabulário fechado de raios.** `9999px` (pills/tags/badges) · `16px` (cards grandes/destaque) ·
  `12px` (cards) · `8px` (botões) · `6px` (inputs). Não introduzir raios fora dessa lista.
- **Base 4px** para todo espaçamento — usar a escala de `--spacing-*`, não valores arbitrários.

## Adaptação para este projeto

O Personal Cashflow hoje roda em **Tailwind v4 CSS-first** com tokens definidos via `@theme` em
`app/globals.css` (mesmo mecanismo do `theme.css` acima) e classes utilitárias próprias (`.card`,
`.pill`, `.pill-*`). Quando este design system for implementado:

1. Os tokens de `theme.css`/`tokens.json` substituem os tokens atuais em `@theme` (cores, raios,
   sombras, tipografia) — mantendo os *nomes* de classe utilitária já usados no app (`.card`, `.pill`)
   sempre que possível, para minimizar o blast radius nos componentes existentes.
2. Os papéis semânticos financeiros do app (receita, gasto, saldo, futuro) precisam ser remapeados
   para os acentos de suporte do Dub (`vivid-green`, dub `tangerine`/vermelho equivalente, etc.) — o
   Dub não define esses papéis porque não é um app financeiro; a extrapolação fica a cargo da
   implementação, seguindo o espírito "um acento por elemento, tons suaves em fundo tintado".
3. Nenhuma implementação foi feita ainda neste commit — isto é só o registro de referência.

## Histórico

- Guia recebido do usuário em 2026-07-10 como direcional definitivo, substituindo a exploração anterior
  de tema light "inspirado no iCherry" (que não usava tokens estruturados). Este documento tem
  precedência sobre qualquer decisão visual anterior neste repositório.
