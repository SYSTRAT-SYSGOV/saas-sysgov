# Design

## Context

- Motivação e escopo: `proposal.md`. Requisitos: `specs/inservivel/spec.md`.
- **Sistema de referência:** Laravel em `systema/inservivel-main` (cópia local, só leitura) e
  `veiga.pro.br/inservivel` (consulta).
  - Regras principais: `LoteController`, `Services/SorteioService`, `TransferenciaController`, `OngController`,
    `BemController`, `ParametroController` e `ImportacaoController`.
  - Login: dois guards (`servidor`, `ong`).
  - Perfil: `Administrador` ou não. A aprovação de transferência é só do Administrador.
  - Situação do bem: texto livre, com nomes fixos no código.
  - Termos: Blade com o Município de Araucária fixo.
  - Arquivos: servidos por `?path=`.
- **SYSGOV:**
  - Tenant = prefeitura.
  - RBAC por perfis, com permissões declaradas no `module.json` e provisionadas por seeder registrado no
    `docker-entrypoint.sh`.
  - Organograma canônico em `org_units` (tipos `secretaria`, `departamento`, `divisao`, `setor`…) e lotação em
    `org_unit_user` (`is_primary`).
  - Portal público por slug no Cemitérios (`ResolveTenantPublico` + `throttle`).
  - Cadastro de Pessoas só com pessoa física (CPF criptografado, `ResolucaoPessoaService`).
  - `dompdf` instalado.
  - Ainda não existem cadastro público de usuário externo nem envio de e-mail. Eles estão previstos na Fase 3 do
    Cursos, não implementada.

## Goals / Non-Goals

**Goals:**
- Paridade de comportamento com o PHP nas telas listadas na proposta, corrigindo as fragilidades: situação por
  papel, arquivos por objeto e nada fixo de um município.
- Entidade com conta SYSGOV comum, de perfil restrito, sem segundo sistema de login.
- Sorteio que um auditor consegue refazer a partir do que fica gravado.

**Non-Goals:**
- Migrar o banco do PHP (change futura, depois da validação do módulo).
- Envio de e-mail (o evento fica no Outbox) e verificação de e-mail da entidade.
- Texto dos termos editável, assinatura digital e QR Code no bem.
- Restringir o Servidor aos bens da própria secretaria. Como no PHP, ele vê e edita todos; só os lotes são por
  criador.

## Decisions

### D1 — Módulo `Inservivel` criado por `make:module`
Os 3 models criados à mão antes desta change e o `module.json` atual são descartados. O módulo é gerado por
`php artisan make:module Inservivel` (alias `inservivel`, `requires: ["Admin", "OrgChart", "Pessoas"]`), com o menu
"Inservível & Doações" (ícone `Recycle`) e a permissão de menu `inservivel.acesso`.

Permissões e perfis seguem a spec, em `module.json` e no `InservivelRbacSeeder`. A permissão de menu é separada de
`inservivel.view` para que a Entidade veja o item de menu sem enxergar as rotas internas.

### D2 — Situações com papel
`inservivel_situacoes` tem `papel` (nullable, único por tenant quando preenchido). A classe `PapelSituacao` (enum
PHP) define os 7 papéis. O `SituacaoService::garantirPadroes()` cria as faltantes na primeira chamada do módulo
pelo tenant, de forma idempotente, e com ele as categorias e estados padrão do PHP.

O bem guarda `situacao_id` e `estado_conservacao_id` como FKs, não texto. Com isso:
- renomear não exige atualização em massa;
- "substituir em massa" vira `UPDATE … SET situacao_id = :novo WHERE situacao_id = :atual`.

As regras consultam `situacao.papel` através de `SituacaoService::idDoPapel(PapelSituacao)`, com cache por
requisição.

### D3 — Unidades do Organograma no bem
O bem guarda `secretaria_unit_id` (obrigatório) e `setor_unit_id` (opcional), ambos FKs para `org_units`.

Validação:
- a secretaria tem `type` igual a `secretaria`, `autarquia` ou `fundacao`, ativa e do tenant;
- o setor é descendente da secretaria (`path` começa com o `path` da secretaria).

A secretaria do usuário vem da lotação: o `org_unit_user` primário e vigente, subindo pelo `path` até o ancestral
de tipo secretaria. Isso fica em `LotacaoService::secretariaDoUsuario(User): ?OrgUnit`. A importação casa pelo
nome ou pela sigla, normalizados (sem acento, minúsculo, sem espaços repetidos).

### D4 — Dinheiro em centavos
Valores em `*_cents` (`unsignedBigInteger`), convertidos por `App\Support\Money`. A API recebe e devolve centavos e
o front formata. A importação converte "1.500,46", "1,500.46" e "72,46" com a mesma lógica do `parseMoney` do PHP,
mas para centavos inteiros, sem float.

O valor do lote é calculado na consulta: soma de `CASE WHEN valor_avaliado_cents > 0 THEN valor_avaliado_cents ELSE
valor_contabil_cents END`. Não é gravado.

### D5 — Lotes e posse
`inservivel_lotes` guarda `criado_por` (user_id). A `LotePolicy`:
- com `lotes.gestao`: libera tudo;
- com `lotes.manage`: só se `criado_por = user.id`.

A listagem aplica o mesmo filtro na query. As transições ficam em `LoteService::alterarStatus` com uma tabela de
transições permitidas, e Sorteado é bloqueado fora do sorteio.

Ao passar a Entregue, os bens vão para `doado`, e ao passar a Baixado, para `baixado`. Esta regra foi pedida pelo
usuário; o PHP só mudava os bens no Baixado.

Toda movimentação de bens entre situações acontece dentro de `DB::transaction` com `lockForUpdate` nos bens. Isso
evita que dois lotes peguem o mesmo bem.

A exclusão confere a senha com `Hash::check` contra o usuário logado. Como o projeto usa autenticação por token,
não existe sessão para "confirmar senha".

### D6 — Entidade com conta SYSGOV
O `CadastroEntidadeService` (usado pelo cadastro público e pelo Gestor ao cadastrar uma entidade pela tela interna)
roda numa transação:
1. cria o `User` com e-mail e senha;
2. liga o usuário ao tenant e atribui só o perfil Entidade (Inservível), pelo caminho que o `UserService` e o
   `ModuleRoleProvisioner` já usam para perfis por módulo;
3. resolve o representante no Cadastro de Pessoas pelo CPF e liga a pessoa ao usuário, como os demais usuários;
4. cria `inservivel_entidades` com `user_id`;
5. cria os documentos.

Se o e-mail já tiver usuário no SYSGOV, o cadastro é recusado com a mesma mensagem genérica de "e-mail ou CNPJ já
cadastrado". O cadastro não reaproveita contas existentes nem revela qual dos dois já existe.

Quando o Gestor cadastra a entidade pela tela interna, a conta é criada do mesmo jeito e a senha inicial é informada
pelo Gestor (redefinível depois).

### D7 — Portal da entidade e rotas públicas
- **Público:** `api/public/inservivel/{tenantSlug}`, com `throttle:inservivel-publico` (10/min por IP no POST,
  60/min no GET) e o middleware `ResolveTenantPublicoInservivel`, no mesmo desenho do Cemitérios: tenant ativo com
  o módulo habilitado; o slug só seleciona o tenant. As rotas são `GET /formulario` (documentos exigidos e
  identidade do órgão) e `POST /entidades`.
- **Portal:** `api/inservivel/portal/*`, com `auth:sanctum`, `resolve.tenant` e `permission:inservivel.portal`. O
  `EntidadeAtual` resolve a entidade por `user_id` do usuário logado (404 se não houver). Nenhuma rota do portal
  recebe id de entidade.
- O controller público só depende do `CadastroEntidadeService`. Um teste de arquitetura impede que esses
  controllers consultem models do módulo sem o tenant definido (como na Campanha).
- No front, a rota pública fica fora do shell autenticado: `/inservivel/entidades/:tenantSlug/cadastro`. Depois do
  cadastro, a página leva ao `/login`.

### D8 — Sorteio reproduzível
O `SorteioService::sortear(Lote)` roda em transação, com `lockForUpdate` no lote (o que impede dois sorteios
simultâneos) e nas entidades inscritas. Passos:
1. **Inscritas:** ordenadas por `inservivel_interesses.id`.
2. **Regras:** `unica_inscrita` → `menos_lotes` → `sorteio_semente`.
3. **Semente:** `bin2hex(random_bytes(16))`. O índice é `mt_srand(crc32($semente)); mt_rand(0, $n - 1)`, que é
   determinístico no PHP 8.4 com o Mt19937 padrão.
4. **Gravação:** retrato JSON das inscritas (id, razão social, CNPJ e lotes ganhos), a lista das empatadas na ordem
   usada, a regra e o `hash = sha256(lote_id|semente|ids_empatadas|vencedora_id)`.
5. **Efeitos:** incrementa `lotes_ganhos`, muda o lote para Sorteado, gera o PDF do relatório em
   `inservivel/lotes/{id}/relatorio-sorteio.pdf` e o registra como documento do lote, audita e publica no Outbox.

Se a geração do PDF falhar, a transação é desfeita. Isso evita um sorteio sem relatório, ao contrário do PHP, que só
registrava log. O relatório explica os três passos com o texto do PHP adaptado.

### D9 — PDFs com dompdf e configurações do tenant
`TermoService` gera o relatório do sorteio, os termos de conferência, entrega e doação e o termo de transferência,
a partir de views Blade do módulo (`Resources/views/pdf/*.blade.php`).

As views usam:
- o `ConfiguracaoService::vigente()`: doador, legislação, cidade, UF, foro e responsável;
- o logotipo e o nome do tenant (white-label).

Nenhum texto de município fica fixo. Os termos são gerados sob demanda, e só o relatório do sorteio é guardado
(documento de auditoria). Os textos jurídicos partem dos modelos de `inservivel-main/documentos` e das Blades do
PHP, sem os dados de Araucária.

### D10 — Configurações
`inservivel_configuracoes` tem uma linha por tenant, com colunas para o doador e JSON para `legislacao` (lista de
textos) e `documentos_exigidos` (lista de `{chave, nome, obrigatorio}`). Ela é criada com os padrões na primeira
leitura. A chave de um documento exigido não muda depois de criada; mudam só o nome e a obrigatoriedade. Assim os
documentos já enviados continuam casados.

### D11 — Transferências
`inservivel_transferencias` guarda:
- `bem_id`, `secretaria_origem_unit_id` e `secretaria_destino_unit_id`;
- `status` (`anunciado`, `solicitado`, `aceito`, `recusado`, `cancelado`);
- `situacao_anterior_id`, para devolver o bem na recusa definitiva ou no cancelamento;
- `anunciado_por`, `solicitado_por` e `decidido_por`, com as datas;
- `motivo_recusa`.

Na recusa, o registro fica Recusado (histórico) e um novo anúncio é criado automaticamente para o mesmo bem. Assim
cada solicitação tem o seu registro e a vitrine volta a exibir o bem. Só pode haver uma transferência aberta
(`anunciado` ou `solicitado`) por bem, garantido no serviço com lock.

### D12 — Arquivos privados
Os arquivos ficam no disco `local` (privado), em `inservivel/{tenant_id}/...`, com nome gerado (`Str::uuid()` mais a
extensão validada pelo MIME real). Eles são servidos por rotas como `GET /bens/{bem}/fotos/{foto}`,
`GET /lotes/{lote}/documentos/{doc}` e `GET /entidades/{entidade}/documentos/{doc}` (e as equivalentes do portal),
que passam pela policy do objeto pai e devolvem `response()->file()` com o `Content-Type` gravado.

As fotos aparecem no front por `blob:` obtido com o token, o mesmo padrão de outros módulos com arquivo privado.

### D13 — Importação
O `ImportacaoBensService` lê o CSV em streaming (`SplFileObject`):
- detecta o separador pela primeira linha;
- converte cada célula para UTF-8 quando não for UTF-8 válido (`mb_check_encoding`);
- mapeia as colunas por apelido normalizado, com os mesmos apelidos do PHP.

A importação roda síncrona, em transação por bloco de 200 linhas. As planilhas reais da SMAD têm até cerca de 5 mil
linhas, e com até 10 MB isso cabe numa requisição. Ela devolve `{criados, atualizados, pendencias: [{linha,
patrimonio, motivo}]}`. Se a pressão aumentar, passa para job na fila, o que é uma mudança interna sem efeito no
contrato.

### D14 — Frontend
O módulo fica em `apps/web-client/src/modules/inservivel`, com o componente principal `ModuloInservivelMain` e abas
por permissão: Dashboard, Bens, Lotes e Sorteio, Entidades, Transferência Interna, Solicitações, Parâmetros e
Configurações. Se o usuário só tem `inservivel.portal`, o módulo renderiza o **Portal da Entidade** no lugar das
abas.

Tudo é feito com primitivos de `@sysgov/ui` (`Tabs`, `Card`, `KpiCard`, `Table`, `Modal`, `Badge`, `Button`,
`Input`, `Select`), com `font-mono tabular-nums` em nº patrimonial, R$, CNPJ e datas. O contrato fica no `api.ts` do próprio módulo, como
na Campanha. O registry é regenerado offline, e o gerador passa a usar a permissão de menu do `module.json`
(`inservivel.acesso`): com `{alias}.view` fixo, a rota barraria a Entidade, que não tem `inservivel.view`.

### D15 — Validade dos documentos e alertas
`inservivel_entidade_documentos.validade` (date, nullable). A regra fica num só lugar, o
`ValidadeDocumentoService`:
- `bloqueios(Entidade): Collection` devolve os documentos obrigatórios (pelas chaves de `documentos_exigidos`) com
  `validade < hoje`, considerando só o documento mais recente de cada chave;
- `alertas(): Collection` devolve, para o dashboard, as entidades com documento obrigatório vencido ou vencendo em
  até 30 dias.

O bloqueio é calculado na consulta e não é um status gravado. Assim ele não fica desatualizado e não precisa de
agendamento: basta o dia virar para a entidade ficar bloqueada.

Pontos de uso:
- a inscrição no portal (422);
- o `SorteioService`, que filtra as aptas e grava as excluídas no retrato com o motivo `documento_vencido`;
- os alertas do dashboard e do portal;
- os marcadores na ficha da entidade e nas inscritas do lote.

Um único `now()` é usado por sorteio, o que torna o resultado coerente com o retrato. Os testes congelam o tempo
(`Carbon::setTestNow`).

## Risks / Trade-offs

- **Conta da entidade no mesmo login dos servidores** → o perfil Entidade só tem `acesso` e `portal`, e um teste
  cobre que cada rota interna responde 403 para ele. O `module.json` não dá à Entidade nenhuma permissão de outros
  módulos.
- **Cadastro público sem verificação de e-mail** → limite por IP, campo isca e a entidade fica Pendente até a
  análise humana; sem estar Habilitada ela não faz nada além de ver o próprio cadastro. A verificação entra quando
  existir o envio de e-mail (Fase 3 do Cursos).
- **`mt_rand` como fonte do sorteio** → não é criptográfico, mas a imprevisibilidade vem da semente (`random_bytes`),
  e o objetivo é a reprodutibilidade auditável que o PHP já oferecia. O algoritmo fica documentado no relatório.
- **Casamento de centro de custo por nome** → nomes divergentes viram pendência, não unidade nova. A prefeitura
  ajusta o Organograma ou a planilha e importa de novo (a importação é idempotente pelo nº patrimonial).
- **Termos com texto jurídico genérico** → os dados variáveis vêm da configuração. O texto fixo é revisável numa
  change futura (texto editável).

## Migration Plan

Sem migração de dados. Passos:
1. Migrations novas e seeder de RBAC no `docker-entrypoint.sh`.
2. `module:register Inservivel`.
3. Habilitar o módulo para o tenant pelo painel SYSTRAT.
4. Configurar o doador e os documentos exigidos.
5. Importar a planilha.

Rollback: desabilitar o módulo para o tenant. As tabelas `inservivel_*` não são usadas por outros módulos.

## Open Questions

Nenhuma pendente. As duas perguntas da primeira versão foram respondidas pelo usuário em 2026-10-06 e viraram
regras: lote Entregue leva os bens a `doado` (D5), e documento vencido bloqueia a entidade e abre alerta (D15).
