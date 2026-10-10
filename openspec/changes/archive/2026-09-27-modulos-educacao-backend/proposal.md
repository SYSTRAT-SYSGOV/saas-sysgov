# Proposta: Backend dos módulos de Educação (Escola, Pedagógico, Formatura e Passeio)

## Why

Os módulos Pedagógico, Formatura e Passeio existem apenas no frontend (`apps/web-client`) e guardam todos os
dados no `localStorage` do navegador: nada é compartilhado entre usuários, nada sobrevive à troca de computador,
não há isolamento por tenant no servidor, nem auditoria, nem controle de permissão — o que contraria o Coding
Standard SYSGOV (26/09/2026) e o `AGENTS.md`. Além disso, os três módulos mantêm cadastros divergentes do mesmo
aluno e da mesma turma, obrigando a escola a cadastrar/importar o mesmo estudante até três vezes. Com o Docker
único e o banco MySQL persistente já disponíveis, é o momento de criar o backend no padrão da plataforma.

## What Changes

- Novo módulo base **`Escola`** em `apps/api/Modules/Escola` (via `php artisan make:module`): cadastro escolar
  único do tenant — configuração da unidade (nome e logo), turnos, turmas, alunos (com contatos), matérias,
  vínculo turma × matéria × professor, trimestres letivos e categorias de ocorrência, incluindo importação de
  alunos e matérias por CSV.
- Novo módulo **`Pedagogico`** (`requires: ["Escola"]`): notas trimestrais, ocorrências, fichas de pré-conselho
  (com alunos avaliados), cronograma do pré-conselho, atas do conselho de classe e frequência diária.
- Módulo **`Formatura`** passa a ter backend (hoje só `module.json`), `requires: ["Escola"]`: configuração da
  formatura com valores em centavos, participação de cada aluno (adesão e convidados) e pagamentos/parcelas,
  com relatório financeiro calculado no servidor.
- Módulo **`Passeio`** passa a ter backend (hoje só `module.json`), `requires: ["Escola"]`: passeios, inscrição
  de alunos (vai / autorização entregue / pago), veículos e mapa de assentos.
- Cada módulo declara permissões `<modulo>.<recurso>.<acao>` e perfis padrão no `module.json`, registra
  auditoria (`AuditLogger`) e eventos (`OutboxPublisher`) em toda mutação, usa `softDeletes()` e tem testes de
  isolamento de tenant.
- **Fora do escopo desta change (Fase 2):** trocar o `localStorage` dos frontends pelas novas APIs (`api.ts`),
  e migrar dados do sistema PHP antigo. Os frontends continuam funcionando como hoje até lá.
- Nenhuma rota, tabela ou comportamento de módulos existentes é alterado (mudança aditiva). Os `module.json`
  atuais de Formatura e Passeio são substituídos pelos gerados no padrão.

## Capabilities

### New Capabilities
- `escola`: cadastro escolar compartilhado do tenant — unidade, turnos, turmas, alunos e contatos, matérias,
  vínculo turma × matéria × professor, trimestres, categorias de ocorrência e importações CSV.
- `pedagogico`: notas, ocorrências, pré-conselho, cronograma do pré-conselho, atas do conselho de classe e
  frequência diária, sobre o cadastro escolar.
- `formatura`: configuração financeira da formatura, participação dos alunos, pagamentos e relatório de
  arrecadação.
- `passeio`: passeios, inscrições e autorizações, veículos e mapa de assentos.

### Modified Capabilities
- (nenhuma)

## Impact

- **Código novo:** `apps/api/Modules/{Escola,Pedagogico}` completos; `apps/api/Modules/{Formatura,Passeio}`
  preenchidos (migrations, models, policies, requests, services, controllers, rotas, seeders RBAC, testes).
- **Banco:** ~30 tabelas novas com prefixo do módulo (`escola_*`, `pedagogico_*`, `formatura_*`, `passeio_*`),
  todas com `tenant_id` e índices compostos iniciando por ele.
- **APIs:** novos grupos `api/escola`, `api/pedagogico`, `api/formatura`, `api/passeio`, sob
  `['auth:sanctum', 'tenant', 'bindings', 'module-access:{alias}']`.
- **Catálogo/menus:** os módulos passam a ser registrados pelo `module:register` no boot do Docker;
  `moduleRegistry.generated.ts` do web-client deve ser regenerado (`npm run generate:registry`).
- **Dependências:** nenhuma biblioteca nova.
