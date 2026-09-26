# Proposal: Evolução completa da aba Concessões (Cemitérios)

## Why

A aba "Concessões" do módulo de Cemitérios (`apps/web-client/src/modules/cemiterios/views/ConcessoesView.tsx`)
hoje lista concessões em uma tabela simples, com apenas uma busca textual genérica (`searchable`) e sem
nenhum painel de filtros avançados — diferente da aba "Inventário", que já conta com `InventarioFiltros`
(filtro por necrópole, setor, situação da concessão, situação financeira, ocupação, alertas regulatórios).
Isso obriga o operador a rolar manualmente centenas de concessões para localizar as que estão vencendo, com
pendência de regularização ou com débito em aberto — um problema real em municípios com milhares de
concessões (a migração do acervo histórico já trouxe mais de 15.500 registros).

Além disso, a modelagem já prevê o estado `extinta` para uma concessão (`concessions.situacao`), mas hoje
ele só é alcançado pelo fluxo de abandono (`AbandonoService`, após vistoria e edital). Não existe uma forma
de o próprio concessionário devolver voluntariamente o jazigo ao poder público (renúncia), uma hipótese
comum na legislação municipal de cemitérios e distinta juridicamente do abandono (que pressupõe omissão) e
da expiração por decurso de prazo (que é automática). Sem essa formalização, extinções desse tipo acabam
sendo feitas por edição manual de banco, fora de qualquer trilha de auditoria — o que viola o requisito do
projeto de que toda mutação de dado seja registrada via `AuditLogger`.

## What Changes

- **Filtros avançados na aba Concessões**: novo componente `ConcessoesFiltros` (mesmo padrão visual e de
  código de `InventarioFiltros`), com filtros por setor/quadra (dentro da necrópole ativa — a aba já é
  restrita a uma única necrópole por `cemiterio/isolamento-contextual-abas`, então não há filtro de
  necrópole), modalidade (temporária/perpétua), situação (vigente/expirada/extinta), pendência de
  regularização (sucessão hereditária pendente), situação financeira (adimplente/inadimplente/sem guias) e
  faixa de vencimento (vencidas, a vencer em até 30/60/90 dias, sem prazo/perpétua), além de busca textual
  ampliada (número, processo administrativo, jazigo, concessionário, documento).
- **Data table completa**: a tabela passa a usar os recursos que o `DataTable` local já oferece e a aba
  ainda não usa — exportação (CSV/XLSX/PDF) das concessões filtradas, seletor de registros por página e
  colunas redimensionáveis — e ganha colunas hoje ausentes: setor/quadra do jazigo e indicador de situação
  financeira (adimplente/inadimplente) por concessão.
- **Extinção por renúncia voluntária**: nova ação "Renunciar concessão" (permissão
  `cemiterios.concessoes.manage`), disponível para concessões vigentes, que exige motivo textual e número
  do processo administrativo de baixa, registra `situacao = extinta`, `motivo_extincao = 'renuncia'` e
  libera o jazigo para nova concessão — mantendo a mesma máquina de estados (`JazigoEstadoService`) usada
  hoje pelo abandono e pela expiração.
- **Histórico auditável por concessão**: nova gaveta (Drawer) de histórico, aberta a partir da linha da
  tabela, listando os eventos de auditoria já gravados pelo `AuditLogger` para aquela concessão (criação,
  renovações, transferência por sucessão, extinção), sem necessidade de nova tabela — apenas uma consulta
  filtrada em `audit_logs`.
- Nenhuma mudança de contrato para as regras já existentes de trava anti-sepultamento, expiração automática
  ou abandono — a extinção por renúncia é um caminho adicional e explícito para o mesmo estado `extinta`.

## Capabilities

### New Capabilities

- `cemiterio/concessoes-gestao`: Governa a experiência completa de gestão da listagem de concessões —
  filtros avançados, colunas e indicadores financeiros, exportação e histórico auditável por concessão.

### Modified Capabilities

- `cemiterio/regras-concessao-sucessao`: adiciona o requisito de extinção por renúncia voluntária do
  concessionário como terceira hipótese de encerramento de concessão (ao lado de expiração por decurso de
  prazo e extinção por abandono), com motivo obrigatório e registro de auditoria.

## Impact

- **Backend (`apps/api/Modules/Cemiterios`)**:
  - `Http/Controllers/ConcessaoController@index`: novos parâmetros de filtro (`modalidade`, `setor_id`,
    `vence_ate`, `financeiro`), seguindo o padrão já usado em `JazigoController` para inadimplência via
    `whereHas('concessoes.guias', ...)`.
  - Novo método `ConcessaoController@renunciar` + `ConcessaoService::renunciar()` (espelha
    `AbandonoService`/`expirarVencidas` quanto a transação e recálculo de estado do jazigo via
    `JazigoEstadoService`).
  - Migration aditiva em `concessions` para as colunas `motivo_extincao` (string, nullable) e
    `extinta_em` (date, nullable) — sem alterar dados existentes.
  - Novo endpoint de histórico (`GET /api/cemiterios/concessoes/{id}/historico`) lendo `audit_logs`
    filtrado por `module = cemiterios` e `resource = "Concessao #{id}"`.
  - Novo teste de feature cobrindo renúncia, filtros novos e isolamento multi-tenant do histórico.
- **Frontend (`apps/web-client/src/modules/cemiterios`)**:
  - Novo `views/ConcessoesFiltros.tsx` e estado de filtros em `ConcessoesView.tsx`.
  - `api.ts`: novos parâmetros de `concessoes()`, tipo de retorno do histórico e função `renunciarConcessao`.
  - Novo `views/DrawerHistoricoConcessao.tsx` (reaproveitando o padrão de `PainelRegulatorioDrawer`).
  - `DataTable` da aba passa a receber `exportable`, `pageSizeSelector` e `resizableColumns`.
  - Nenhuma mudança de rota, apenas da aba já existente dentro de `CemiteriosModule.tsx`.
