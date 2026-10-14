# Domínio Educação

Visão consolidada dos módulos de Educação do SYSGOV. Cada módulo tem doc própria com a referência completa de
rotas (`docs/modules/{modulo}.md`); este documento cobre a arquitetura compartilhada, o que cada módulo cobre e
os limites de escopo — não duplica as tabelas de endpoints.

## Módulos do domínio

| Módulo (alias API) | Nome no painel | Doc | Spec OpenSpec |
|---|---|---|---|
| `escola` | Cadastro Escolar | [`escola.md`](./escola.md) | `openspec/specs/escola/spec.md` |
| `pedagogico` | Gestão Pedagógica | [`pedagogico.md`](./pedagogico.md) | `openspec/specs/pedagogico/spec.md` |
| `formatura` | Formatura & Eventos | [`formatura.md`](./formatura.md) | `openspec/specs/formatura/spec.md` |
| `passeio` | Passeio | [`passeio.md`](./passeio.md) | `openspec/specs/passeio/spec.md` |
| `portfolio` | Portfólio Digital | [`portfolio.md`](./portfolio.md) | `openspec/changes/criar-modulo-portfolio/specs/portfolio/spec.md` (ainda não arquivada) |
| `multiprofissional` | Multiprofissional | — (sem doc própria ainda) | `openspec/changes/criar-modulo-multiprofissional/specs/multiprofissional/spec.md` (ainda não arquivada) |

> **Atualização 2026-10-14:** PR #57 (mergeado em `main`) renomeou o menu de Passeio de "Passeio & Transporte
> Escolar" para só "Passeio" e introduziu o módulo **Multiprofissional** (equipe de psicólogos,
> fonoaudiólogos, assistentes sociais e psicopedagogos da Secretaria de Educação) — ver seção própria abaixo.

`Cursos e Formações` (`cursos`) existe no catálogo de módulos mas é cadastro de cursos/formações continuadas do
órgão, não parte do cadastro escolar — fora deste domínio.

## Arquitetura compartilhada

### Hub e dependências

`Escola` é o módulo-base: mantém o cadastro único de escolas, turnos, turmas, matérias, trimestres, equipe
gestora e alunos do tenant. Todos os demais módulos do domínio declaram `requires: ["Admin", "Escola"]` no
`module.json` e só leem desse cadastro — nenhum duplica aluno, turma ou matéria.

```
Admin ─┬─ Escola (requires também Pessoas) ─┬─ Pedagógico
       │                                    ├─ Formatura
       │                                    ├─ Passeio
       │                                    ├─ Portfólio
       │                                    └─ Multiprofissional (requires também Pessoas)
```

### Multi-escola (um tenant, várias escolas)

Uma prefeitura (tenant) tem várias escolas, cada uma ligada a uma unidade do organograma. Todas as rotas de
`pedagogico`, `formatura`, `passeio` e `portfolio` (e a maioria de `escola`) exigem a escola de trabalho no
cabeçalho `X-Escola-ID`, resolvida pelo middleware `escola:{modulo}` (entre `tenant` e `bindings`):

- Com uma única escola ativa no tenant, o cabeçalho é opcional.
- Escola fora do acesso do usuário → `403`; escola inativa aceita só consulta (escrita → `422`).
- Todo registro pertence a uma escola (`escola_id`); registro de outra escola → `404`.
- O acesso do usuário a uma escola segue o escopo de unidades do organograma (módulo Usuários & Acessos), com
  descendentes: acesso à "Secretaria de Educação" dá acesso a todas as escolas abaixo dela.
- `GET /api/escola/escolas/minhas?modulo=` alimenta o seletor de escola de trabalho no painel, por módulo.

### Integração com Cadastro de Pessoas

Aluno com CPF é ligado à pessoa do município (`Modules\Pessoas`, vínculo `aluno`): nome, nascimento, mãe e pai
vêm da pessoa e se atualizam pelo evento `PessoaAtualizada`; correções no Cadastro de Pessoas propagam para os
alunos de todas as escolas. CPF é opcional, único por escola, guardado cifrado e devolvido só como
`cpf_mascarado`. A equipe gestora da escola também pode apontar para uma pessoa. `php artisan
escola:ressincronizar-pessoas` recopia os dados das pessoas para os alunos quando necessário.

### Convenções comuns a todos os módulos

- **Erros:** validação → `422 {"message","errors"}`; regra de negócio → `422 {"error"}`; registro de outro
  tenant/escola → `404`.
- **Auditoria/outbox:** toda escrita grava em `audit_logs` e publica um evento `<modulo>.<recurso>.<acao>`
  (ex.: `escola.aluno.atualizado`, `pedagogico.nota.lancada`, `formatura.pagamento.registrado`,
  `passeio.inscricao.lote_marcado`, `portfolio.trabalho.criado`).
- **Dinheiro:** Formatura e Passeio guardam valores em centavos (`*_centavos`, inteiro) — nunca `float`.
  `150.5` é rejeitado com `422`.
- **Situação do aluno** (`ativo`, `transferido`, `remanejado`) é lida do cadastro Escola e tratada de forma
  consistente nos módulos consumidores: aluno `transferido` não participa de formatura/passeio/portfólio novos
  (mas pode ser retirado/estornado); `remanejado` passa a valer pela turma de destino.
- **Permissões** seguem o padrão `<modulo>.view` (leitura) + `<modulo>.<recurso>.manage` (escrita por recurso),
  com um perfil de gestão (todas as permissões) e um ou mais perfis restritos (ex. professor, tesouraria,
  apoio) provisionados por seeder RBAC e clonáveis pelo `ModuleRoleProvisioner`.
- **Escopo do professor** (Pedagógico e Portfólio): usuário só com a permissão `*.professor` (sem nenhuma
  `*.manage`) vê e opera somente nas turmas × matérias em que está vinculado como professor em
  `escola_turmas_materias.professor_user_id` — fora disso, `403`/`404`.
- Arquivos (fotos, logos, anexos, imagens de trabalho) ficam em disco privado por tenant/escola, servidos só
  pelas rotas `GET` dedicadas, nunca por URL pública direta.

## Resumo por módulo

### Escola — Cadastro Escolar

Cadastro único do tenant: escolas (vínculo com o organograma), unidade de trabalho (nome/logo para relatórios),
turnos, turmas (com pedagoga e vínculo turma×matéria×professor), alunos (com contatos, foto, importação CSV),
matérias (com importação/exportação CSV) e trimestres letivos (`agendado`/`em_andamento`/`encerrado`/`arquivo`).
Também mantém categorias de ocorrência (usadas pelo Pedagógico) e a equipe gestora da escola (diretor, diretor
auxiliar, secretaria, pedagoga). Permissões: `escola.view`, `escola.alunos.manage`, `escola.estrutura.manage`
(+ `escola.escolas.manage`, sem perfil padrão — só admin geral do tenant).

### Pedagógico — Gestão Pedagógica

Vida pedagógica do aluno sobre o cadastro Escola: notas por trimestre (0–10, uma casa, com recuperação e
importação CSV), médias do ano, ocorrências disciplinares (com severidade e anexo), pré-conselho de classe por
turma×matéria×período (desempenho, engajamento, alunos em atenção), cronograma do pré-conselho (informativo),
atas do conselho de classe (`rascunho → finalizada → arquivada`, só editável em rascunho) e frequência diária
(presença/falta/falta justificada por dia, com total de aulas do dia). Permissões:
`pedagogico.view/.notas.manage/.ocorrencias.manage/.conselho.manage/.frequencia.manage/.professor`.

### Formatura — Formatura & Eventos

Arrecadação financeira da formatura, uma configuração por escola e ano letivo (turmas formandas, valor base,
forma de cálculo `por_pessoa` ou `fixo_mais_convidados`, parcelas, chaves PIX, formas de pagamento aceitas).
Acompanha formandos (participação, convidados, telefone sincronizado com o Escola), pagamentos (com estorno) e
situação calculada (`quitado`/`parcial`/`pendente`), com relatório por período/turma/forma de pagamento.
Permissões: `formatura.view/.config.manage/.formandos.manage/.pagamentos.manage`.

### Passeio

Passeios pedagógicos: cadastro do passeio (data, horários, destino, valor, prazo de autorização), inscrições
por aluno ou turma inteira (com marcação em lote de "vai"/termo entregue/pago), frota de veículos com mapa de
assentos (ocupar/liberar, distribuição automática mantendo turmas juntas) e relatórios (termo de autorização,
lista de embarque por veículo, demonstrativo de arrecadação). Permissões:
`passeio.view/.passeios.manage/.frota.manage`.

### Multiprofissional — Equipe Multiprofissional

Atendimento da equipe multiprofissional da Secretaria de Educação (psicólogos, fonoaudiólogos, assistentes
sociais, psicopedagogos etc.) a estudantes com deficiência, transtornos ou necessidades educacionais
específicas. Reaproveita o estudante do cadastro Escola (`escola_alunos`) e resolve o profissional como pessoa
do Cadastro de Pessoas pelo CPF — não duplica cadastro de aluno, escola ou usuário. Mantém cargos, condições
(CID) e tipos de atendimento como parametrização própria; equipes agrupam profissionais e escolas; o estudante
acompanhado guarda condições, profissional de referência e laudos (dado sensível, LGPD art. 11 — acesso restrito
e download auditado); atendimentos têm relato com sigilo opcional. Permissões:
`multiprofissional.view/.atender/.acompanhar/.manage/.audit`, perfis Coordenação, Profissional e Consulta.

### Portfólio — Portfólio Digital

Portfólio do aluno independente do boletim: trabalhos avaliados (0–10, uma casa, turma e matéria "congeladas"
no momento do registro) com até 6 imagens cada (reduzidas e guardadas como JPEG), linha do tempo por aluno,
desempenho por matéria/trimestre calculado no servidor e relatório PDF (resumo + miniaturas, limitado a 60
imagens por período). Escopo do professor restrito às turmas×matérias vinculadas. Permissões:
`portfolio.view/.professor/.manage`.

## Fora do escopo atual (limites documentados nas propostas de cada módulo)

- **Sem polo administrativo próprio de pessoa jurídica/gestão de frota real** — veículos de Passeio são
  cadastro simples do módulo, sem integração com um módulo de frota (que não existe no monorepo).
- **Portfólio:** sem acesso de pais/responsáveis, sem alinhamento a BNCC, sem integração com Google Classroom,
  sem relatório consolidado por turma nem exportação CSV (avaliado e cortado explicitamente na proposta).
- **Pedagógico:** pré-conselho e cronograma são informativos — não bloqueiam o lançamento de notas/frequência.
- **Formatura/Passeio:** cálculo de valores é sempre "sugerido"/determinístico a partir de configuração; não há
  parcelamento automático de inadimplência nem cobrança integrada (PIX é só identificação de chave, sem
  gateway de pagamento).
- Nenhum módulo do domínio cobre **merenda escolar, transporte escolar diário (só passeios avulsos), censo
  escolar (INEP) ou diário de classe digital completo (plano de aula, BNCC)** — caso algum desses entre em
  escopo, nasce como módulo novo dependente de `Escola`, seguindo o mesmo padrão de escola de trabalho,
  permissões e auditoria descrito acima.

## Onde continuar

- Referência completa de rotas/regras: docs por módulo listadas na tabela acima.
- Requisitos formais (Requirement/Scenario, usados para validar mudanças futuras): `openspec/specs/{escola,
  pedagogico,formatura,passeio}/spec.md`. Portfólio ainda não foi arquivado em `openspec/specs/` — arquivar
  com `openspec archive criar-modulo-portfolio` é o próximo passo de higiene, se for retomado.
- Para propor uma mudança em qualquer módulo do domínio, seguir o fluxo já estabelecido no repo: `openspec/
  changes/<nome>/{proposal.md,design.md,tasks.md,specs/**/*.md}` em pt-BR, depois implementação incremental
  por fase/commit.
