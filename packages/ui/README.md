# @sysgov/ui — Design System Compartilhado

Pacote único de componentes de UI consumido por **todos** os apps do monorepo
(`apps/web`, `apps/web-client`, e qualquer app novo). Existe para que a
interface do SYSGOV pare de ser reconstruída do zero em cada tela — antes da
unificação (2026-09), cada módulo tinha sua própria versão hand-rolled de
Button/Card/Badge/Dialog/Select, com drift visual e de comportamento entre
elas. Ver `AGENTS.md` seção 4 para o contrato geral; este README é a
referência prática de como usar e estender este pacote.

## Regra obrigatória

> **Todo componente de UI novo, em qualquer app do monorepo, DEVE primeiro
> checar se já existe aqui. Se existir, importe de `@sysgov/ui` — nunca
> reimplemente localmente. Se não existir, crie-o aqui (não no app), seguindo
> o padrão descrito abaixo, e só depois consuma-o no app.**

Isso vale para agentes de IA e para desenvolvedores humanos. Um componente
"hand-rolled" dentro de `apps/web/src/components/...` ou
`apps/web-client/src/components/...` que duplique algo que `@sysgov/ui` já
oferece (ou deveria oferecer) é considerado dívida técnica, não uma opção
válida de atalho.

## O que já existe

Componentes base — implementação **real** do shadcn/ui (Radix primitives +
`class-variance-authority` para variantes), não recriados à mão:

| Componente | Export | Observação |
|---|---|---|
| Button | `Button`, `buttonVariants` | variantes shadcn (`default/destructive/outline/secondary/ghost/link`) + domínio (`primary`, `success`); `isLoading`, `leftIcon`, `rightIcon` |
| Card | `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent` | |
| Badge | `Badge`, `badgeVariants` | + 9 variantes de domínio (primary/gold/indigo/cyan/neutral/success/warning/danger/info) |
| Input | `Input` (wrapper com label/helperText/error/ícones), `InputPrimitive` (cru) | |
| Switch | `Switch` | Radix Switch; `size="md"` mapeia para `"default"` |
| Table | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` | |
| Accordion | `Accordion` | API antiga (`items[]`) preservada sobre Radix Accordion |
| Skeleton | `Skeleton` | |
| Dialog/Modal | `Dialog` (= `Modal`) | API monolítica `open/onClose/title/icon/footer/size` sobre Radix Dialog |
| Select | `Select` | API flat `value/onChange/options[]` sobre Radix Select |

Componentes de domínio SYSGOV (sem equivalente shadcn):
`AlertCard`, `KpiCard`, `StatusChip`, `SystratBrand`, `OrgTypeBadge`,
`OrgTreeNodeCard`, `OrgScopeIndicator`.

A lista canônica e sempre atualizada é o `export` de
[`src/index.ts`](./src/index.ts) — se um componente não está lá, ele não
existe no pacote público, mesmo que o arquivo exista em `src/components/`.

## Paleta e tema

Este pacote **não** fixa paleta de cores — os componentes usam variáveis CSS
semânticas (`--background`, `--primary`, `--card`, `--border`, etc., via
Tailwind v4 `@theme`). Cada app mapeia essas variáveis para sua própria
identidade visual em `src/index.css`:

- `apps/web` (admin): paleta **Dark Navy/Esmeralda** (`#0a1128`, `#10b981`, …)
  — decisão explícita do produto, não migrar para GOV.BR azul.
- `apps/web-client` (painel do cliente): paleta **GOV.BR azul**
  (`#1351b4`, …).

Um componente novo em `@sysgov/ui` deve **sempre** usar essas variáveis
semânticas (`bg-card`, `text-foreground`, `border-border`, …), nunca cores
hard-coded — é isso que permite o mesmo componente renderizar certo nas duas
paletas.

## Como estender: criando um componente novo

Siga esta ordem, ela é a que efetivamente funcionou nas Fases 2–4 da
unificação:

1. **Gere via CLI shadcn** (mais rápido que escrever à mão): a partir de
   `apps/web-client` (é onde `components.json` está configurado hoje —
   histórico da Fase 2, funciona bem como scratch):
   ```bash
   cd apps/web-client && npx shadcn@latest add <componente>
   ```
   Isso cria `apps/web-client/src/components/ui/<componente>.tsx`.

2. **Corrija os dois problemas que o CLI sempre introduz**:
   - Reintroduz o pacote npm `cn` como dependência e importa dele —
     troque para `import { cn } from '../lib/utils'` (ou `'./utils'`
     conforme a profundidade) e remova `cn` do `package.json`.
   - Não adiciona `class-variance-authority` ao `package.json` mesmo quando
     o componente usa `cva()` — adicione manualmente.

3. **Mova o arquivo para `packages/ui/src/components/`** (`git mv`, não copy+
   delete — evita split de diff):
   ```bash
   git mv apps/web-client/src/components/ui/<componente>.tsx \
          packages/ui/src/components/<componente>.tsx
   ```

4. **Resolva colisão de case-insensitividade** (`TS1149`): se já existir um
   arquivo com o mesmo nome em case diferente (ex.: já existe `Dialog.tsx` e
   o novo primitivo cru também se chamaria `dialog.tsx`), renomeie o
   primitivo cru para `<componente>-primitive.tsx`. Esse arquivo não é
   exportado publicamente — só o wrapper de domínio (ver passo 5) sai no
   `index.ts`.

5. **Se o app já tinha uma versão hand-rolled do mesmo componente com uma
   API diferente da do shadcn** (ex.: `Dialog` monolítico `open/onClose`
   vs. o compound API do Radix `open/onOpenChange` + subcomponentes),
   **preserve a API antiga** num wrapper por cima do primitivo real — não
   quebre os call-sites existentes. Exemplos: `Dialog.tsx` (wrapper) sobre
   `dialog-primitive.tsx` (Radix cru), `Select.tsx` sobre
   `select-primitive.tsx`, `Accordion.tsx` sobre `accordion-primitive.tsx`.

6. **Exporte no `src/index.ts`** — só o wrapper de domínio e seus tipos,
   nunca o primitivo cru.

7. **Adicione ao `@source` do Tailwind em CADA app consumidor** — já feito
   uma vez (`@source "../../../packages/ui/src";` em
   `apps/web/src/index.css` e `apps/web-client/src/index.css`), não precisa
   repetir por componente, mas é o motivo pelo qual um componente novo aqui
   "funciona" no JS mas renderiza sem estilo se esse `@source` for removido
   — o scanner de conteúdo do Tailwind v4 não cobre workspaces separados
   por padrão.

8. **`npm install` dentro dos containers Docker** (`web` e `web-client`) após
   mexer em qualquer `package.json` — `node_modules` é volume anônimo, não
   atualiza sozinho no rebuild da imagem.

9. Rode `tsc --noEmit`, `vitest run`, e valide visualmente (idealmente nos
   dois apps, nas duas paletas) antes de considerar o componente pronto.

## Quando NÃO usar este pacote

Componente 100% específico de um único módulo de negócio, sem qualquer
chance de reaproveitamento (ex.: um formulário de provisionamento de tenant
com 15 campos muito particulares) pode continuar local ao app — mas ele deve
ser **composto** a partir dos componentes de `@sysgov/ui` (`Card`, `Input`,
`Button`, `Modal`, …), nunca reimplementar esses primitivos de novo.
