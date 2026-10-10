# Módulo Formatura (`api/formatura`)

Arrecadação da formatura dos alunos do cadastro escolar (`requires: ["Admin", "Escola"]`).
Spec: `openspec/changes/modulos-educacao-backend/specs/formatura/spec.md`.

- **Middlewares:** `auth:sanctum`, `tenant`, `escola:formatura`, `bindings`, `module-access:formatura`.
- **Escola de trabalho:** a prefeitura (tenant) tem várias escolas. Toda rota exige a escola no cabeçalho
  `X-Escola-ID` (middleware `escola:{modulo}`, entre `tenant` e `bindings`); com uma única escola no tenant o
  cabeçalho é opcional. Escola fora do acesso do usuário → 403; escola inativa aceita só consulta (escrita → 422).
  Todo registro pertence a uma escola (`escola_id`); registro de outra escola → 404 / erro de validação.
- **Permissões:** `formatura.view`, `formatura.config.manage`, `formatura.formandos.manage`, `formatura.pagamentos.manage`.
- **Perfis:** Comissão de Formatura (`formatura_comissao`, todas) e Tesouraria (`formatura_tesouraria`: view + pagamentos).
- **Dinheiro:** todo valor é **inteiro em centavos** (`*_centavos`). `150.5` é rejeitado com 422.
- **Ano letivo:** `?ano_letivo=` (ou no corpo); padrão = ano atual; uma configuração por **escola** e ano. Sem configuração do ano → 422 "Configure a formatura de {ano}".
- **Formandos:** alunos do cadastro Escola nas **turmas formandas** da configuração do ano (`turmas_ids`). Sem turmas formandas = nenhum formando. Aluno fora delas → 422 em participação e pagamento. Sem participação registrada = não participa (devido 0).
- **Telefone:** cada formando traz `telefone` = contato principal do aluno no Escola; a Formatura pode alterá-lo (grava no Escola, preserva os demais contatos, auditoria `escola` / `aluno.telefone_atualizado`).
- **Valor devido** (calculado no servidor):
  - `por_pessoa` = valor base (por pessoa) × (1 + convidados)
  - `fixo_mais_convidados` = valor base (fixo, só o formando) + convidados × valor por convidado; convidados = `convidados_incluidos + convidados_extras` (D16: a tela usa só `convidados`)
- **Situação:** `quitado` (pago ≥ devido > 0), `parcial` (0 < pago < devido), `pendente` (nada pago).
- **Auditoria/outbox:** `formatura.configuracao.*`, `formatura.participacao.*`, `formatura.pagamento.registrado|estornado`.

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/formatura/configuracao` | view | Configuração do ano (ou `null`) |
| PUT | `/api/formatura/configuracao` | config.manage | Cria/atualiza: `{ano_letivo, titulo, tipo_calculo, valor_base_centavos, valor_pessoa_extra_centavos?, convidados_incluidos_padrao? (0–20), max_parcelas (1–24), chaves_pix?[], formas_pagamento[]: pix\|dinheiro\|cartao_credito\|cartao_debito\|boleto, turmas_ids?[] (turmas do tenant e do mesmo ano letivo)}` |
| GET | `/api/formatura/formandos` | view | `?ano_letivo&turma_id&busca` → por aluno: participa, convidados, `valor_devido_centavos`, `total_pago_centavos`, `saldo_devedor_centavos`, `situacao`, `telefone` (contato principal no Escola) |
| PUT | `/api/formatura/formandos/{aluno}` | formandos.manage | `{ano_letivo, participa, convidados? (número único; grava em convidados_extras), observacoes?, telefone?}` — aluno de outro tenant → 404; fora das turmas formandas → 422; `telefone` grava o contato principal no Escola (vazio remove) |
| PUT | `/api/formatura/formandos/participacao-em-lote` | formandos.manage | `{ano_letivo, turma_id, participa}` — turma formanda inteira numa transação; marcar só atinge alunos ativos. Devolve os formandos da turma |
| GET | `/api/formatura/formandos/{aluno}/pagamentos` | view | Pagamentos do formando no ano |
| GET | `/api/formatura/pagamentos` | view | `?ano_letivo&data_inicio&data_fim` → pagamentos ativos do ano com `aluno_id`, `aluno_nome`, `turma` (mais recentes primeiro); `data_fim` < `data_inicio` → 422 |
| POST | `/api/formatura/pagamentos` | pagamentos.manage | `{ano_letivo, aluno_id, numero_parcela (≤ max_parcelas), data_pagamento (≤ hoje), valor_centavos (> 0), forma_pagamento (aceita na configuração), chave_pix (obrigatória se pix), observacao?}` — exige participação ativa |
| DELETE | `/api/formatura/pagamentos/{pagamento}` | pagamentos.manage | Estorno (exclusão lógica; sai dos totais) |
| GET | `/api/formatura/relatorio` | view | `?ano_letivo&data_inicio&data_fim` — o período afeta só `formas_pagamento` e `resumo.recebido_periodo_centavos` (presente só com período); devido, pago, saldo e situação são do ano inteiro. `resumo` (a receber, recebido, pendente, %, formandos, convidados, quantidades por situação), `formas_pagamento` (total, quantidade, %) e `turmas` (mesmo resumo + alunos) |

**Situação do aluno:** aluno `transferido` não pode participar nem pagar (422 em `aluno_id`), mas pode ser retirado (`participa: false`); o lote "marcar todos" ignora transferidos. Aluno `remanejado` participa normalmente na turma em que está (destino). A linha do formando traz `situacao_aluno`.
