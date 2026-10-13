# Design

## Context

- Motivação: `proposal.md`. Requisitos: `specs/*/spec.md`. APIs: `docs/modules/{escola,pedagogico,formatura,passeio}.md`.
- As telas atuais (≈ 20 mil linhas) foram escritas sobre serviços locais: `pedagogicoService` (síncrono, ~40 métodos
  chamados direto pelos componentes), `formaturaService` (já assíncrono) e `PasseioService`/`SharedEscolaService`
  (síncronos, com importação de `veiga.pro.br`). Os tipos das telas (`types/*.ts`) diferem dos contratos da API
  (maiúsculas/minúsculas, reais × centavos, `'1º Trimestre'` × `1`, nomes de campos).
- Decisões do usuário (27/09/2026): manter o visual (sem `@sysgov/ui` nesta fase), ignorar os dados do navegador e
  usar o Cadastro Escolar para turmas e alunos de Formatura e Passeio.
- `apiClient` (`@/core/api/client`) já envia token e `X-Tenant-ID`.

## Goals / Non-Goals

**Goals:** nenhuma tela dos três módulos grava dados de negócio fora da API; mínimo de mudança visual; erros da API
visíveis ao usuário.

**Non-Goals:** migrar para `@sysgov/ui` (exceção: Formatura, ver D15); importar dados do `localStorage`; pacote
`@sysgov/sdk` dos módulos (fica para a Fase 3, junto do redesenho).

## Decisions

### D1 — `api.ts` por módulo, espelhando a API
`modules/escola/api.ts`, `modules/pedagogico/api.ts`, `modules/formatura/api.ts`, `modules/passeio/api.ts` com helpers
`get/post/put/del` sobre o `apiClient`, tipos que espelham o JSON da API e `erroApi(e)` que extrai `error`, a primeira
mensagem de `errors` ou `message`. Mesmo formato do `modules/cemiterios/api.ts`.

### D2 — Adaptadores na borda, tipos das telas preservados
Um `adaptadores.ts` por módulo converte API → tipos atuais das telas e de volta (ex.: `situacao: 'transferido'` →
`status: 'Transferido'`; `valor_centavos` → reais para exibição e reais → centavos com `Math.round(valor * 100)` ao
enviar; `periodo: 1` → `'1º Trimestre'`). Assim os componentes mudam pouco. *Alternativa:* reescrever as telas sobre
os tipos da API — rejeitada nesta fase (é o escopo natural da Fase 3, junto com `@sysgov/ui`).

### D3 — Estado: serviços viram fachadas assíncronas com cache do módulo
Os serviços mantêm os nomes dos métodos. Leituras usadas de forma síncrona pelas telas (`getMaterias()`,
`getTurmas()`…) passam a ler um cache preenchido pelo módulo raiz ao abrir (`await servico.carregar()`, com tela de
carregamento); mutações passam a ser `async`, chamam a API e recarregam só o que mudou. As chamadas nos componentes
ganham `await` e tratamento de erro. É o "equivalente homologado" ao `useDados` citado no Coding Standard: um único
ponto de carga por módulo, sem ciclos extras de renderização. *Alternativa:* React Query/`useDados` em cada
componente — mudaria quase todas as telas.

### D4 — Arquivos autenticados (foto, logo, anexo)
As rotas de arquivo exigem o header de autenticação, então `<img src>` direto não funciona. Um hook
`useArquivoAutenticado(url)` baixa via `apiClient` como `blob` e devolve um `objectURL` (revogado ao desmontar).

### D5 — Corpo docente = usuários do tenant + vínculos
Lista de `GET /escola/professores` combinada com os vínculos de `GET /escola/turmas`. "Cadastrar professor" vira
atalho para Usuários e Acessos; a tela edita vínculos com `PUT /escola/turmas/{turma}/materias`.

### D6 — Cadastro Escolar como módulo de tela próprio
Os componentes de `pedagogico/components/admin` passam para `modules/escola/` (`EscolaModule.tsx` + componentes), e
a aba "Administração" do Pedagógico importa de lá. O registry gerado passa a apontar `escola` para `EscolaModule`.

### D7 — Ata e ocorrência (ampliação aditiva do backend)
Migration aditiva em `pedagogico_atas` (`texto_introducao`, `texto_conclusao` longText, `assinaturas` JSON
`{papel: dataURL}`) e em `pedagogico_ocorrencias` (`responsavel` varchar 200). Assinaturas validadas como
`data:image/png;base64,` de até 300 KB cada (máx. 30). O rascunho do `ConselhoClasseManager` sai do `localStorage` e
passa a ser a ata `rascunho` da API. O "Relatório Individual" da ficha do aluno usa a categoria "Relatório
Individual" se existir no cadastro; senão "Outros".

### D8 — Perfis e habilitação
Os seeders de perfis de Pedagógico, Formatura e Passeio passam a incluir `escola.view` (spec). O módulo Escola é
habilitado, pela API de administração, nos tenants que já têm os módulos de educação (hoje: SYSTRAT e RicardoPrefeito),
o que também provisiona os perfis do Escola.

### D9 — Frequência por período e médias no servidor (ampliação aditiva do backend)
A tela de frequência mostra o mês inteiro, a quantidade de aulas do dia (o "multiplicador" de faltas) e o total de
faltas por aluno, e o painel precisa da média de cada aluno para o "Alerta Acadêmico". Para não fazer dezenas de
chamadas por tela: migration aditiva `aulas` (1–10, padrão 1) em `pedagogico_frequencias`; `GET /frequencias` aceita
`data_inicio`/`data_fim` (até um ano); `GET /frequencias/totais` devolve, por aluno, `faltas` (soma das aulas dos dias
com falta) e `justificadas` (dias com falta justificada, fora do total); `GET /notas/medias?ano_letivo` devolve a
média anual por aluno (maior entre nota e recuperação, truncada em uma casa, como na tela de notas). As consultas
de totais e médias respeitam o escopo do professor. *Alternativa:* consultar dia a dia e turma × matéria pelo
navegador — rejeitada pelo volume de requisições; guardar as aulas na observação — rejeitada por ser improviso.

### D10 — Turmas formandas na configuração (ampliação aditiva do backend)
Hoje "formando" é todo aluno de qualquer turma do ano letivo, o que traria a escola inteira para a Formatura. Coluna
aditiva `turmas_ids` (JSON, anulável) em `formatura_configuracoes`; `PUT /configuracao` aceita `turmas_ids[]`
validando que cada turma é do tenant e do mesmo `ano_letivo` (senão 422). Formandos, pagamentos e relatório passam a
considerar só alunos dessas turmas; lista vazia/nula = nenhum formando. `PUT /formandos/{aluno}` e `POST /pagamentos`
de aluno fora das turmas formandas → 422. Participação antiga de aluno que deixou de estar em turma formanda sai das
listas, mas os registros permanecem (auditados). Aluno sem participação continua "não participa".
*Alternativas:* filtro "só participantes" na tela — rejeitada (lista poluída); convenção pelo nome da turma — frágil.

### D11 — Participação em lote
`PUT /formandos/participacao-em-lote` `{ano_letivo, turma_id, participa}` (`formatura.formandos.manage`), numa
transação sobre os alunos da turma formanda, com auditoria por participação criada/alterada; devolve os formandos da
turma. Evita dezenas de `PUT` seguidos pela tela, que deixariam o estado pela metade numa falha.

### D12 — Listagem de pagamentos do ano
`GET /pagamentos?ano_letivo&data_inicio&data_fim` (`formatura.view`) devolve os pagamentos ativos do ano com
`aluno_id`, `aluno_nome` e `turma`, do mais recente para o mais antigo. *Alternativa:* uma chamada por formando —
rejeitada pelo volume de requisições.

### D13 — Relatório por período
`GET /relatorio` aceita `data_inicio`/`data_fim`. O período restringe apenas os pagamentos considerados em
`formas_pagamento` e no novo `resumo.recebido_periodo_centavos` (presente só quando há período); valor devido, total
pago, saldo e situação continuam sobre o ano inteiro, para ninguém "virar pendente" por causa do filtro. O filtro por
turma é feito na tela (o relatório já vem agrupado por turma).

### D14 — Telefone do formando gravado no Escola
A linha do formando traz `telefone` = contato principal do aluno (menor `ordem` em `escola_aluno_contatos`).
`PUT /formandos/{aluno}` aceita `telefone` (opcional, até 30; vazio remove o principal). Quem grava é o Escola:
`AlunoService::definirTelefonePrincipal(Aluno, ?string)` atualiza o contato principal (ou cria, com descrição
"Principal"), preserva os demais e audita no módulo `escola`; a Formatura o chama na mesma transação da participação.
Basta `formatura.formandos.manage` (Tesouraria → 403); os perfis da Formatura **não** recebem
`escola.alunos.manage` — a Formatura altera só o telefone, por essa porta estreita.

### D15 — Formatura migra para `@sysgov/ui`
Por decisão do usuário (29/09/2026), as telas da Formatura são reescritas com os primitivos de `@sysgov/ui`
(`Card`, `Button`, `Badge`/`StatusChip`, `Input`, `Select`, `Switch`, `Table`, `Modal`, `KpiCard`, `AlertCard`),
paleta GOV.BR do web-client e `font-mono tabular-nums` para valores, datas e percentuais, sem `alert()`/`confirm()`
nativos. O primitivo de abas não existe: `Tabs` é adicionado a `packages/ui` (Radix + CVA, conforme o README do
pacote). A seleção de turmas formandas usa `Switch`. O Pedagógico continua no visual atual nesta fase; o Passeio migra no D19.
Os botões de escrita são ocultados por `useCan` (conveniência; a regra é do servidor).

### D16 — Um só número de convidados e telas de participação da Formatura
Decisão do usuário (29/09/2026): cada formando tem um único **número de convidados**. `por_pessoa` = (1 + convidados) ×
valor base; `fixo_mais_convidados` = valor base (fixo, só o formando) + convidados × valor por convidado, com
convidados = `convidados_incluidos` + `convidados_extras` (colunas mantidas; a tela grava tudo em
`convidados_extras` e `convidados_incluidos = 0`). Migration de dados: `extras += incluidos`, `incluidos = 0`,
`convidados_incluidos_padrao = 0` — em formaturas `fixo_mais_convidados` o devido de quem tinha incluídos aumenta
(intencional). Telas: a Configuração mostra os campos de valor conforme o tipo; "Somente participantes" começa
ligado; marcar "Participa" (Formandos ou Relação de Alunos) abre a ficha; a ficha mostra a prévia do valor devido
(mesma fórmula, confirmada pelo servidor ao salvar) e simula parcelas de 1 ao máximo configurado sobre o **saldo**
(centavos que sobram vão para a última parcela); Relação de Alunos ganha seletor de turma; Turmas expande os
participantes de cada turma.

### D17 — Equipe gestora cadastrada por nome (substitui o uso de perfis na ata)
Decisão do usuário (29/09/2026): diretor (um), diretores auxiliares (vários), secretaria e pedagogas são cadastrados
**por nome**, sem exigir login. Tabela `escola_equipe` (`tenant_id`, `nome` 200, `cargo` ∈ `diretor`,
`diretor_auxiliar`, `secretaria`, `pedagoga`, `ordem`, soft delete), com `GET /escola/equipe` (`escola.view`) e
`POST`/`PUT`/`DELETE` (`escola.estrutura.manage`), auditoria e isolamento por tenant; um segundo `diretor` → 422.
Aba "Equipe" no Cadastro Escolar (diretor, auxiliares, secretaria); pedagogas na aba Corpo Docente do Pedagógico.
Na ata: a abertura cita diretor e auxiliares; o campo Pedagoga é um seletor das pedagogas cadastradas; diretor e
secretaria vêm preenchidos do cadastro. Os perfis de Usuários e Acessos deixam de ser usados para esses papéis;
o corpo docente da turma continua vindo dos vínculos de professor.

### D18 — Inscrições do Passeio respeitam a situação do aluno e aceitam lote por turma (ampliação aditiva do backend)
Decisão do usuário (02/10/2026): as regras escolares da Formatura valem no Passeio. Aluno **transferido** não se
inscreve: a inscrição individual responde 422 e a inscrição da turma o ignora. Aluno **remanejado** é inscrito pela
turma de destino (`turma_id`), como qualquer aluno dela. Nova rota `PUT /passeio/passeios/{passeio}/inscricoes/lote`
(`turma_id`, `vai`), com `passeio.passeios.manage`, numa transação com auditoria: marcar inscreve quem da turma ainda
não está inscrito (sem transferidos) e põe `vai = true` nos demais; desmarcar põe `vai = false` em todos da turma e
libera os assentos deles. A turma tem de ser do tenant e da escola ativa (senão 404/422). `GET .../inscricoes` passa
a trazer, por aluno, `situacao` e `telefone` (o telefone principal do Escola, só leitura — a edição continua no
Cadastro Escolar).

### D19 — Passeio migra para `@sysgov/ui`
Mesmo padrão da Formatura (D15): `api.ts` com os tipos da API; hook de carga do módulo (`usePasseio`) com o
**passeio ativo** escolhido num seletor e lembrado na URL; abas em `Tabs` — **Painel** (indicadores do passeio e
gerais em `KpiCard`, progresso de termos e ocupação da frota), **Passeios** (lista com busca e status, criar/editar em
`Modal`, excluir com confirmação), **Inscrições e Termos** (alunos do passeio ativo com `Switch` para vai, termo e pago,
filtros por turma/situação e busca, inscrição de aluno ou turma), **Turmas** (consulta às turmas do ano letivo do
passeio com inscritos por turma, marcar/desmarcar a turma inteira — D18 — e atalho "Abrir Cadastro Escolar"),
**Ônibus e Assentos** (veículos em `Modal`, mapa de assentos clicável para ocupar/liberar) e **Relatórios** (D20).
Valores em centavos na API e em reais na tela (`font-mono tabular-nums`). Sem `alert()`/`confirm()` nativos; botões de
escrita ocultos por `useCan` para o perfil Apoio (a regra é do servidor). Saem `SharedEscolaService`, o
`passeioService` em `localStorage`, os tipos antigos, o cadastro de alunos e turmas, a importação CSV de alunos e o
"limpar base".

### D20 — Impressões do Passeio a partir da API
As impressões são montadas no navegador (`window.print` sobre um bloco de impressão) só com dados da API — nenhum
dado fictício: **termo de autorização** (um por aluno inscrito: dados do passeio, nome e turma do aluno; nome do
responsável, RG e assinatura em branco para preencher à mão), **manifesto de embarque** por ônibus ou de todos
(assento, aluno, turma, telefone, termo entregue e coluna de visto) e **demonstrativo de arrecadação** (valor por
aluno, pagos, pendentes, total arrecadado e a receber, por turma).

## Risks / Trade-offs

- [Volume de telas grande, regressões visuais silenciosas] → typecheck + teste manual no navegador por aba, com
  checklist nas tarefas; commit por módulo.
- [Cache do módulo desatualizado entre usuários] → recarga ao entrar no módulo e após cada mutação; sem polling.
- [Campos das telas sem equivalente na API (ex.: "nível de atenção")] → calculados no frontend a partir das fichas
  de pré-conselho carregadas; quando não houver dado, a tela mostra "—". A "média geral" vem do servidor (D9).
- [Assinaturas grandes] → limite de 300 KB por imagem e 30 por ata na validação.

## Migration Plan

Migrations aditivas (colunas anuláveis, incluindo `formatura_configuracoes.turmas_ids`); sem migração de dados —
configurações existentes ficam sem turmas formandas até a comissão marcá-las. Reverter = voltar o commit do frontend (os serviços
locais continuam no histórico) e `migrate:rollback` da migration nova.
