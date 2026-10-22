# Proposal

## Why

A Secretaria de Educação mantém uma equipe multiprofissional (psicólogos, fonoaudiólogos, assistentes sociais, psicopedagogos etc.) que atende estudantes com deficiência, transtornos ou necessidades educacionais específicas nas escolas da rede. Hoje isso roda num sistema PHP isolado (referência: pasta `Multiprofissional/`, Adianti), com cadastro próprio de pessoas, escolas e usuários — duplicando o que o SYSGOV já tem no Cadastro de Pessoas e no módulo Escola — e sem controle de sigilo nem auditoria sobre dados de saúde (CID e laudos), que são dados pessoais sensíveis (LGPD, art. 11).

## What Changes

- **Novo módulo Laravel `Multiprofissional`** (`apps/api/Modules/Multiprofissional`, alias `multiprofissional`, tabelas `multi_*`): cargos, condições (CID), tipos de atendimento, profissionais, equipes, estudantes acompanhados (condições, profissionais de referência, laudos) e atendimentos.
- **Reaproveita o que já existe**: escola = `escola_escolas`, estudante = `escola_alunos` (com responsáveis/contatos), profissional = pessoa do Cadastro de Pessoas resolvida pelo CPF. As tabelas `pessoa`, `endereco`, `responsavel`, `local` e `turma` do legado não são recriadas.
- **Frontend** em `apps/web-client/src/modules/multiprofissional` com `@sysgov/ui`: painel, atendimentos, acompanhados, equipes, profissionais, cadastros e auditoria.
- **Permissões RBAC** `multiprofissional.*` e perfis Coordenação, Profissional e Consulta.

## Capabilities

### New Capabilities

- `multiprofissional/cadastros`: cargos, condições (descrição + CID) e tipos de atendimento, com carga dos itens padrão.
- `multiprofissional/profissionais`: profissional ligado a uma pessoa (CPF obrigatório) e, opcionalmente, a um usuário do sistema.
- `multiprofissional/equipes`: equipes por turno com seus profissionais e as escolas que atendem.
- `multiprofissional/acompanhados`: estudante acompanhado, condições, profissionais de referência e laudos (arquivo privado).
- `multiprofissional/atendimentos`: registro de atendimento (data, turno, escola, equipe, tipos, profissionais, estudantes, relato) com sigilo.
- `multiprofissional/auditoria`: toda mutação e todo download de laudo no `audit_logs`.

## Impact

- **Backend**: novo módulo (migrations, models, services, policy, controllers, rotas, seeder RBAC, testes). Depende de `Admin`, `Pessoas` e `Escola`.
- **Integração**: `bootstrap/app.php`, `docker-entrypoint.sh` (seeder RBAC) e registry do web-client.
- **Sem migração de dados do legado nesta change** — o dump do sistema antigo não traz dados, só a estrutura.
