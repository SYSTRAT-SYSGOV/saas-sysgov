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
4. **Padrão Outbox**: Chamadas externas (PNCP, bancos, Siconfi) ocorrem via eventos na tabela `outbox_messages`, nunca síncronas em controllers.
5. **Representação Monetária**: Sempre use a classe `App\Support\Money` com centavos inteiros (`int $cents`), NUNCA `float`.
6. **Auditoria**: Toda mutação deve ser registrada via `AuditLogger` na tabela `audit_logs`.

---

## 🛠️ 3. Criação de Novos Módulos
Para gerar um novo módulo com scaffold completo e teste de isolamento:
```bash
php artisan make:module {NomeDoModulo}
```
Consulte a skill oficial em [`.agents/skills/sysgov-module-scaffolding/SKILL.md`](file:///c:/laragon/www/saas-sysgov/.agents/skills/sysgov-module-scaffolding/SKILL.md) para o guia detalhado passo a passo.

---

## 🎨 4. Design System & Tipografia
- Siga estritamente o [`DESIGN_SYSTEM.md`](file:///c:/laragon/www/saas-sysgov/DESIGN_SYSTEM.md).
- **Tipografia Técnica**: Todo dado numérico, monetário (R$), percentual (%), CPF, CNPJ, código e data DEVE usar obrigatoriamente `JetBrains Mono` (`font-mono tabular-nums`).
- **Paleta Oficial**: Dark Navy (`#0a1128`, `#101a3a`, superfícies `#152244`, bordas `#1a2a52`), Esmeralda (`#10b981`), Índigo (`#6366f1`), Ciano (`#06b6d4`), Âmbar (`#f59e0b`) e Rose (`#e11d48`).

---

## 🔄 5. Colaboração Multi-Desenvolvedor & Git Workflow
Como múltiplos desenvolvedores trabalham simultaneamente no repositório:
1. **Consultar sempre o remoto no início**: Antes de iniciar qualquer tarefa ou alteração de código, o agente DEVE consultar atualizações remotas (`git fetch origin`) e verificar se há novos commits (`git status`, `git log main..origin/main`).
2. **Sincronização prévia**: Havendo atualizações no remoto, integrar antes de desenvolver para prevenir conflitos e divergências (`git pull --ff-only` ou rebase seguro).
3. **Qualidade antes do push**: Garantir testes verdes (`npm run test`) antes de comitar e enviar (`git push origin <branch>`), sempre utilizando *Conventional Commits*.

