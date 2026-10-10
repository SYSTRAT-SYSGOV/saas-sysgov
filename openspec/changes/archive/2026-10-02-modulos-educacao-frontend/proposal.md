# Proposta: Telas dos módulos de Educação ligadas ao backend (Fase 2)

## Why

A Fase 1 (`modulos-educacao-backend`, arquivada em 27/09/2026) entregou as APIs de Escola, Pedagógico, Formatura e
Passeio, mas as telas do `apps/web-client` continuam gravando tudo no `localStorage` do navegador (e o Passeio ainda
consulta um servidor externo, `veiga.pro.br`). Enquanto isso não mudar, o que um usuário cadastra não aparece para os
colegas, some ao trocar de computador e não passa por permissões, isolamento de tenant nem auditoria.

## What Changes

- Camada de acesso à API por módulo (`api.ts`), no padrão do Coding Standard (helpers tipados sobre o `apiClient`,
  normalização de erros), com adaptadores que convertem os contratos da API para os tipos que as telas já usam.
- **Pedagógico:** todas as abas (painel, frequência, pré-conselho, conselho e atas, notas, ocorrências, alunos,
  corpo docente e Painel Administrativo) passam a ler e gravar via API. O Painel Administrativo grava no módulo Escola.
- **Formatura** e **Passeio:** telas ligadas às APIs; as telas próprias de turmas e alunos viram consulta ao
  Cadastro Escolar, com atalho para ele. Some a importação a partir do servidor externo `veiga.pro.br`.
- **Cadastro Escolar:** o item de menu `/escola` passa a abrir o Painel Administrativo (hoje placeholder).
- **Corpo Docente:** deixa de cadastrar professores no navegador; professores são usuários do órgão (gestão em
  Usuários e Acessos) e a tela mostra/edita os vínculos turma × matéria.
- **Backend (aditivo):** atas ganham texto de introdução, texto de conclusão e assinaturas; ocorrências ganham o campo
  "responsável" (texto livre exibido na ficha); perfis de Pedagógico, Formatura e Passeio passam a incluir
  `escola.view` (as telas precisam ler turmas e alunos).
- Dados que hoje estão no `localStorage` são **ignorados** (dados de teste — decisão do usuário).
- **Visual:** Formatura (D15) e Passeio (D19) são reescritos com `@sysgov/ui`; o Pedagógico fica para a Fase 3.
- **Passeio (backend aditivo):** aluno transferido não se inscreve; inscrição em lote por turma (marcar/desmarcar
  "vai"); lista de inscrições com telefone e situação do aluno lidos do Escola (D18).

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `escola`: perfis dos módulos dependentes incluem leitura do cadastro escolar.
- `pedagogico`: atas com textos e assinaturas; ocorrência com responsável; telas persistem no servidor.
- `formatura`: telas persistem no servidor e usam o cadastro escolar.
- `passeio`: telas persistem no servidor e usam o cadastro escolar.

## Impact

- `apps/web-client/src/modules/{pedagogico,formatura,passeio}` (serviços, módulo raiz e componentes que chamam os
  serviços), novo `apps/web-client/src/modules/escola` (reaproveita o Painel Administrativo).
- `apps/api/Modules/Pedagogico` (migration aditiva em atas e ocorrências) e seeders de perfis.
- Habilitar o módulo Escola nos tenants que já usam Pedagógico, Formatura ou Passeio.
