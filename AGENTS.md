# SYSGOV — Diretrizes e Contratos para Agentes de IA

Este documento é a referência primária e obrigatória para qualquer Agente de Inteligência Artificial trabalhando neste repositório.

---

## 🏛️ 1. Arquitetura Geral
- **Backend (`apps/api`)**: Monólito modular em Laravel com `nwidart/laravel-modules`. Cada domínio de negócio é um módulo isolado em `Modules/{Nome}`.
- **Frontend (`apps/web`)**: React 19 + TypeScript + Tailwind CSS v4 organizado como App Shell com lazy loading.
- **Pacotes Compartilhados**: `packages/ui` (Design System) e `packages/sdk` (SDK TypeScript).
- **Persistência**: MySQL 8.4 (Transacional), Redis 7 (Cache e Filas), Storage de Objetos (Arquivos e Documentos).

---

## 🔒 2. Multi-Tenant & Segurança
1. **Isolamento Lógico Obrigatório**: Todas as tabelas de negócio possuem `tenant_id` e índices compostos `(tenant_id, ...)`.
2. **Models**: Todo model Eloquent de negócio deve usar a trait `App\Models\Concerns\TenantAware`.
3. **TenantContext**: Resolvido no backend pelo middleware `ResolveTenant`, nunca confiado do cliente.
4. **Padrão Outbox**: Chamadas externas (PNCP, bancos, Siconfi, webhooks) ocorrem via eventos na tabela `outbox_events` (via `App\Support\OutboxPublisher`), nunca síncronas em controllers.
5. **Representação Monetária**: Sempre use a classe `App\Support\Money` com centavos inteiros (`int $cents`), NUNCA `float`.
6. **Auditoria**: Toda mutação deve ser registrada via `AuditLogger` na tabela `audit_logs`.

---

## 🛠️ 3. Criação de Novos Módulos
Para gerar um novo módulo com scaffold completo e teste de isolamento:
```bash
php artisan make:module {NomeDoModulo}
```
Consulte a skill oficial em [`.claude/skills/sysgov-module-scaffolding/SKILL.md`](./.claude/skills/sysgov-module-scaffolding/SKILL.md) para o guia detalhado passo a passo.

> **Duas cópias, de propósito**: as skills deste repo existem tanto em
> `.claude/skills/` (convenção que o Claude Code escaneia e invoca de fato)
> quanto em `.agents/skills/` (convenção mais genérica, usada por outras
> ferramentas de IA que leem `AGENTS.md`/`.agents/`). São arquivos idênticos
> nos dois lugares — **ao editar uma skill, replique manualmente a mudança
> na outra cópia** (não há symlink por compatibilidade com checkouts
> Windows). Fonte de verdade em caso de divergência: `.claude/skills/`.

---

## 🎨 4. Design System & Tipografia
- Siga estritamente o [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).
- **Tipografia Técnica**: Todo dado numérico, monetário (R$), percentual (%), CPF, CNPJ, código e data DEVE usar obrigatoriamente `JetBrains Mono` (`font-mono tabular-nums`).
- **Paleta Oficial**: Dark Navy (`#0a1128`, `#101a3a`, superfícies `#152244`, bordas `#1a2a52`), Esmeralda (`#10b981`), Índigo (`#6366f1`), Ciano (`#06b6d4`), Âmbar (`#f59e0b`) e Rose (`#e11d48`).
  - Exceção documentada: `apps/web-client` usa a paleta GOV.BR azul, não a Dark Navy do admin. Cada app mapeia as variáveis semânticas do `@sysgov/ui` (ver abaixo) para sua própria paleta — nunca hard-code cor num componente compartilhado.

### 🧩 4.1 Componentes de UI — `@sysgov/ui` é OBRIGATÓRIO
Todo componente de interface (botão, card, badge, input, switch, tabela,
accordion, dialog/modal, select, e qualquer outro primitivo de UI) DEVE vir
do pacote compartilhado `@sysgov/ui` (`packages/ui`). Isso vale para
`apps/web`, `apps/web-client` e qualquer app novo do monorepo.

- **Antes de escrever um componente, verifique se ele já existe** em
  `packages/ui/src/index.ts` (lista canônica e sempre atualizada) e
  importe de lá — `import { Button, Card, Modal, ... } from '@sysgov/ui'`.
- **Nunca reimplemente localmente** (dentro de `apps/web/src/components/...`
  ou `apps/web-client/src/components/...`) um componente que já existe em
  `@sysgov/ui`, ou que é genérico o suficiente para merecer existir lá.
  Isso inclui não só criar do zero, mas também copiar/colar uma versão
  "hand-rolled" com `<div className="...">` reimplementando um Card, Badge,
  Modal, etc.
- **Se o componente não existir ainda**, crie-o em
  `packages/ui/src/components/`, não no app — siga exatamente o processo e
  os padrões descritos em [`packages/ui/README.md`](./packages/ui/README.md)
  (shadcn/ui real via CLI + Radix primitives + `class-variance-authority`
  para variantes + `cn()` para merge de classes, com wrapper preservando a
  API que os call-sites já esperam quando aplicável). Só depois consuma-o
  no app.
- Um componente 100% específico de uma única tela, sem chance real de
  reaproveitamento, pode continuar local — mas deve ser **composto** a
  partir dos primitivos de `@sysgov/ui` (`<Card><Button>...`), nunca
  reimplementar esses primitivos.
- Essa regra é obrigatória tanto para agentes de IA quanto para
  desenvolvedores humanos, sem exceção por "é só uma tela simples".

---

## 🔄 5. Colaboração Multi-Desenvolvedor & Git Workflow
Como múltiplos desenvolvedores trabalham simultaneamente no repositório:
1. **Consultar sempre o remoto no início**: Antes de iniciar qualquer tarefa ou alteração de código, o agente DEVE consultar atualizações remotas (`git fetch origin`) e verificar se há novos commits (`git status`, `git log main..origin/main`).
2. **Sincronização prévia**: Havendo atualizações no remoto, integrar antes de desenvolver para prevenir conflitos e divergências (`git pull --ff-only` ou rebase seguro).
3. **Qualidade antes do push**: Garantir testes verdes (`npm test` e `composer test`) antes de comitar e enviar (`git push origin <branch>`), sempre utilizando *Conventional Commits*.

---

## 📊 6. Módulo CAPD — Avaliação de Desempenho (SAPDS)
Ao implementar ou manter funcionalidades no módulo CAPD (`Modules/Capd` e `web-client/src/modules/capd`):
1. **Metodologia Canônica**: Utilizar exclusivamente a **Escala Gráfica para Avaliação de Desempenho (Chiavenato, Graus 1 a 5)** combinada com a **Técnica do Incidente Crítico (CIT)** (Diário de Bordo).
2. **Restrição Terminológica Estrita**: **NUNCA** utilizar os termos BARS, "escala ancorada", "ancoragem comportamental" ou "âncoras comportamentais".
3. **Trava Anti-Leniência**: Atribuir notas extremas (Grau 1 ou Grau 5) exige obrigatoriamente lançamento de apontamento prévio no Diário de Bordo (`DiarioBordo`), validado pelo `PerguntaService`.
4. **Cadência de 12 Meses**: A avaliação de estágio probatório segue a cadência de 3 avaliações em 3 anos (interstício mínimo de 12 meses entre ciclos), com roll-over automático $N \to N+1$ via `CicloService::abrirProximoCicloAutomatico()`.
5. **Parametrização Dinâmica**: Os instrumentos são versionados nas tabelas `capd_modelos_formulario` e `capd_perguntas` com validação de soma de pesos dos grupos em 100%.
6. **Interface e Modais**: Usar exclusivamente componentes de `@sysgov/ui` (`Modal`, `Button`, `Badge`, `KpiCard`). Nunca usar `alert()` ou `window.confirm()` nativos do navegador.

---

## 🌐 7. OpenSpec — Documentação e Artefatos em Português do Brasil (pt-BR)
Todos os documentos gerados, mantidos ou atualizados através do OpenSpec (`openspec/changes/*`, `openspec/specs/*`, `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `archive`, etc.) **DEVEM ser redigidos obrigatoriamente em Português do Brasil (pt-BR)**.
1. **Conteúdo e Descrições**: Títulos de requisitos, cenários, descrições funcionais, passos de tarefas, justificativas e notas técnicas DEVEM ser redigidos sempre em pt-BR.
2. **Palavras-chave Estruturais**: Manter as palavras-chave necessárias para o parser da CLI do OpenSpec (`## ADDED Requirements`, `### Requirement: ...`, `#### Scenario: ...`, `- **WHEN**`, `- **THEN**`, etc.), porém todo o conteúdo descritivo e semântico DEVE ser em Português do Brasil.
3. **NUNCA** redigir propostas, especificações, decisões de arquitetura ou tarefas em inglês.

