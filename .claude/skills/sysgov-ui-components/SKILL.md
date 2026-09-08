---
name: sysgov-ui-components
description: Use sempre que for criar ou modificar qualquer tela, módulo ou componente de UI em apps/web, apps/web-client, ou qualquer app novo do monorepo SYSGOV — antes de escrever um <button>, card, badge, input, modal, select, switch, tabela ou accordion à mão. Garante que o componente venha de @sysgov/ui em vez de ser reimplementado localmente.
---

# Componentes de UI SYSGOV — sempre via `@sysgov/ui`

Este repo tem um pacote de design system compartilhado, `@sysgov/ui`
(`packages/ui`), consumido por todos os apps. Antes da unificação (2026-09),
cada app reimplementava os mesmos componentes à mão, com drift visual e
bugs (ex.: modal do cliente não abria por causa disso). **Essa skill existe
para não deixar isso acontecer de novo.**

Regra fonte da verdade: `AGENTS.md` § 4.1 e `packages/ui/README.md`. Esta
skill resume o fluxo de decisão prático.

## Fluxo obrigatório ao tocar em UI

1. **Antes de escrever qualquer elemento de interface** (botão, card, badge,
   input, switch, tabela, accordion, dialog/modal, select, skeleton),
   verifique o que já existe:
   ```bash
   cat packages/ui/src/index.ts
   ```
   Essa é a lista canônica exportada — se o componente aparece lá, ele
   existe e deve ser importado:
   ```tsx
   import { Button, Card, Modal, Badge, StatusChip, ... } from '@sysgov/ui';
   ```

2. **NUNCA** escreva `<div className="bg-white dark:bg-slate-900 rounded-xl border ...">`
   como substituto de `<Card>`, nem `<button className="...">` como
   substituto de `<Button>`, nem `window.prompt`/`window.confirm`/um
   `<div className="fixed inset-0 z-50 ...">` feito à mão como substituto
   de `<Modal>` — mesmo que pareça mais rápido para uma tela "simples".
   Esse foi exatamente o padrão que gerou a dívida técnica que já foi
   removida uma vez; não a reintroduza.

3. **Se o componente não existe em `@sysgov/ui`**: crie-o em
   `packages/ui/src/components/`, nunca dentro do app. Siga o processo
   documentado em `packages/ui/README.md` (seção "Como estender"):
   CLI `npx shadcn@latest add <componente>` a partir de `apps/web-client`
   → corrigir imports de `cn` e adicionar `class-variance-authority` →
   `git mv` para `packages/ui/src/components/` → resolver colisão de case
   (`*-primitive.tsx`) → preservar a API antiga num wrapper se já havia
   call-sites → exportar em `packages/ui/src/index.ts` → confirmar que o
   `@source "../../../packages/ui/src";` já existe no `index.css` do app
   consumidor (normalmente já está lá; só falta se for um app novo) →
   `npm install` dentro do container Docker do(s) app(s) afetado(s).

4. **Cor vem de variáveis semânticas, nunca hard-coded**: um componente em
   `@sysgov/ui` usa `bg-card`, `text-foreground`, `border-border`, etc. —
   nunca uma cor Tailwind fixa tipo `bg-slate-900`. Isso é o que permite o
   mesmo componente render certo tanto na paleta Dark Navy/Esmeralda do
   admin (`apps/web`) quanto na paleta GOV.BR azul do painel do cliente
   (`apps/web-client`). Não convirja as paletas — cada app mantém a sua.

5. **Exceção legítima** (rara): uma peça de UI 100% específica de uma única
   tela, sem chance real de reuso (ex.: um form de 15 campos muito
   particular de um módulo). Mesmo assim, ela deve ser **composta** a
   partir dos primitivos de `@sysgov/ui` (`<Card><Input/><Button/></Card>`),
   nunca reimplementar esses primitivos.

## Antes de considerar a tarefa concluída

- `tsc --noEmit` limpo no(s) app(s) tocado(s).
- `vitest run` verde.
- Teste visual real no Chrome (via `mcp__claude-in-chrome__*`) do componente
  novo ou modificado — não basta compilar, precisa abrir na tela.
- Se criou componente novo em `packages/ui`, confirme que ele foi exportado
  em `packages/ui/src/index.ts` — um componente com arquivo mas sem export
  não existe do ponto de vista de quem for reutilizá-lo depois.
