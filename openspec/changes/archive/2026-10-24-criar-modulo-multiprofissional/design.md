# Design — Módulo Multiprofissional

## Contexto

O legado (`Multiprofissional/Multiprofissional.sql` + `Model/*.php`, Adianti) tem: `pessoa`/`endereco`/`responsavel` (estudante), `local` (escola, com `codigo_sere`), `turma`, `especial` (estudante com necessidade especial) + `especial_tipos` (descrição + CID) + `documento` (laudo por condição), `cargo`, `profissional` (usuário do sistema + cargo), `profissional_especial` (profissional responsável pelo estudante, com tipo), `equipe` (+ profissionais e locais), `tipo_atendimento` e `atendimento` (+ pessoas, profissionais, tipos, equipes; campo `sigilo`).

## Decisões

**D1 — Nível do tenant, não da escola.** A equipe multiprofissional é da Secretaria e atende várias escolas; por isso os models usam `TenantAware`, mas não `EscolaAware`. A escola entra como referência (`escola_id`) no atendimento e na equipe.

**D2 — Sem cadastro paralelo de pessoas.** `local` → `escola_escolas`; `pessoa`/`endereco`/`responsavel`/`turma` → `escola_alunos` (nome, CGM, nascimento, turma, contatos). O profissional é resolvido no Cadastro de Pessoas pelo CPF (`ResolucaoPessoaService`, origem `multiprofissional`), seguindo a regra de que equipe/usuário nascem de Pessoas.

**D3 — Profissional ↔ usuário opcional.** `user_id` liga o profissional a um usuário do tenant; é o que permite ao profissional ver os atendimentos sigilosos dos quais participa. Profissional sem usuário pode ser registrado em atendimentos por outros.

**D4 — Estudante acompanhado.** `multi_acompanhados` (um por aluno no tenant) substitui `especial`. Condições em `multi_acompanhado_condicoes` (n:n com `multi_condicoes`, com data do diagnóstico); profissionais de referência em `multi_acompanhado_profissionais` (com papel); laudos em `multi_laudos` (arquivo em disco privado, condição opcional, data de emissão, emitente).

**D5 — Atendimento com uma equipe.** O legado tinha `equipe_id` e a tabela `atendimento_equipe` ao mesmo tempo; fica só `equipe_id` (opcional). Estudantes, profissionais e tipos são n:n. O sigilo é por atendimento (o `sigiloso` por pessoa do legado é unificado).

**D6 — Sigilo.** Atendimento sigiloso: o relato só é devolvido ao autor, aos profissionais do atendimento que têm usuário e a quem tem `multiprofissional.manage`. Os demais veem o atendimento na lista com o relato mascarado ("Registro sigiloso"). Regra no servidor (Policy).

**D7 — Dados sensíveis.** Condições (CID) e laudos só aparecem para `multiprofissional.acompanhar` ou `multiprofissional.manage`. Quem tem só `view` vê que o estudante é acompanhado e quem são os profissionais de referência. Download de laudo é auditado.

**D8 — Permissões.**
- `multiprofissional.view` — consultar equipes, profissionais, acompanhados (sem dados clínicos) e atendimentos.
- `multiprofissional.atender` — registrar e editar os próprios atendimentos.
- `multiprofissional.acompanhar` — gerir acompanhados, condições e laudos.
- `multiprofissional.manage` — cadastros, profissionais, equipes, todos os atendimentos (inclusive sigilosos).
- `multiprofissional.audit` — consultar a auditoria.
Perfis: Coordenação Multiprofissional (todas), Profissional Multiprofissional (view, atender, acompanhar), Consulta Multiprofissional (view).

**D9 — Edição de atendimento.** Autor edita/exclui o próprio atendimento; `manage` edita/exclui qualquer um. Exclusão é lógica (soft delete) e auditada.

**D10 — Itens padrão.** Botão "Carregar itens padrão" cria cargos e tipos de atendimento usuais (idempotente). Condições não têm carga padrão — o tenant cadastra as que usa.

## Fora do escopo

Migração de dados do legado (o dump não tem dados), relatórios em PDF, agenda de atendimentos e anexos/foto do atendimento.
