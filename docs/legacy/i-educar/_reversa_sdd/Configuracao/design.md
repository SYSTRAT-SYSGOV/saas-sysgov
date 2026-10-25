# Configuracao (i-Educar legado), Design

> Como o subsistema de parametrização está estruturado no código legado, com os fluxos principais, as dependências, as decisões de design e os riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes legados

| Componente | Papel | Fonte |
|----------|-------|-------|
| `clsCadastro` (instituição, educar_instituicao_cad) | Parâmetros e datas da mantenedora | 🟢 `ieducar/intranet/educar_instituicao_cad.php:6-113` |
| `clsCadastro` (configurações gerais) | Identidade, rodapés e integração | 🟢 `ieducar/intranet/educar_configuracoes_gerais.php:6-79` |
| `clsCadastro` (bloqueio do ano letivo) | CRUD da janela por instituição e ano | 🟢 `ieducar/intranet/educar_bloqueio_ano_letivo_cad.php:5-150` |
| `SettingController` | Dicionário de parâmetros do sistema | 🟢 `app/Http/Controllers/SettingController.php:12-56` |
| `Setting` + `SettingCategory` | `public.settings` e categorias | 🟢 `app/Setting.php:8-25` |
| `LoadSettings` (middleware) | Carga das configurações em `Config` com cache | 🟢 `app/Http/Middleware/LoadSettings.php:12-68` |
| `LegacyInstitution` / `LegacyGeneralConfiguration` / `LegacySchoolYearLock` | Modelos das três tabelas institucionais | 🟢 `app/Models/**` |
| `DiarioApiController` | Consumidor do bloqueio | 🟢 `ieducar/modules/Avaliacao/Views/DiarioApiController.php:40-72` |

### Domínio

O domínio é a **disposição e o travamento administrativo**: cinco fontes de configuração mantidas em telas distintas, sem modelo unificado, com a trava do ano letivo aplicada apenas a um consumidor. As datas da mantenedora dividem-se entre bloqueios operacionais reais (fechamento de turmas, expiração de reserva) e regras de apresentação (ordenar remanejados e deslocados em relatórios). 🟢 `educar_instituicao_cad.php:227-297`

### Endpoints HTTP legados

| Rota | Uso | Fonte |
|------|-----|-------|
| `educar_instituicao_cad.php` / `_det` / `_lst` | Parâmetros e datas da mantenedora (processo 559) | 🟢 `educar_instituicao_cad.php:114-141` |
| `educar_configuracoes_gerais.php` | Configurações gerais (processo 999873) | 🟢 `educar_configuracoes_gerais.php:56-79` |
| `educar_configuracoes_index.php` | Índice do menu | 🟡 `educar_configuracoes_index.php` |
| `educar_bloqueio_ano_letivo_cad.php` / `_det` / `_lst` | CRUD do bloqueio (processo 21251) | 🟢 `educar_bloqueio_ano_letivo_cad.php:24-150` |
| `/configuracoes/sistema` (view `settings.index`) | Dicionário de parâmetros | 🟢 `SettingController.php:28-46` |
| POST da mesma tela via `saveInputs` | Gravação do dicionário | 🟢 `SettingController.php:48-56` |
| `DiarioController` (API de avaliação) | Verificação da janela e do ano encerrado | 🟢 `DiarioApiController.php:40-72` |

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `Inicializar()` (instituição) | Carga por `clsPmieducarInstituicao::detalhe` e conversão de bandeiras | 🟢 `educar_instituicao_cad.php:114-168` |
| `Gerar()` (instituição) | Formulário com datas e cerca de trinta e cinco caixas | 🟢 `educar_instituicao_cad.php:171-399` |
| `Editar()` (instituição) | Gravação por `clsPmieducarInstituicao` | 🟡 `educar_instituicao_cad.php:406-408` |
| `Editar()` (configurações gerais) | Conversão das caixas e gravação do registro um a um | 🟢 `educar_configuracoes_gerais.php:274-277` |
| `Novo()` / `Editar()` / `Excluir()` (bloqueio) | CRUD direto do `LegacySchoolYearLock` | 🟢 `educar_bloqueio_ano_letivo_cad.php:74-144` |
| `Config::set` (middleware) | Injeção de `legacy.config` e das configurações do dicionário | 🟢 `LoadSettings.php:62-64` |
| Verificações do bloqueio | Janela e bandeira da escola | 🟢 `DiarioApiController.php:45-69` |

---

## Fluxo Principal

**Carga das configurações na requisição.**

1. O middleware resgata o dicionário inteiro em cache e injeta em `Config`. 🟢 `LoadSettings.php:58-62`
2. A configuração geral da instituição ativa é resgatada com a outra chave de cache. 🟢 `LoadSettings.php:21-29`
3. Os dados da conexão do banco completam as configurações injetadas. 🟢 `LoadSettings.php:37-48`
4. A requisição prossegue com todas as configurações disponíveis por chave pontilhada. 🟢

---

## Fluxos Alternativos

- **Gravação do dicionário:** cada chave da requisição atualiza o registro com o id correspondente, e o evento de atualização é disparado. 🟡 `SettingController.php:48-56`
- **Gravação das configurações gerais:** o registro um a um da instituição é carregado e reescrito com a conversão das caixas. 🟢 `educar_configuracoes_gerais.php:81-107` e `:274-277`
- **CRUD do bloqueio:** a entrada exige instituição e ano numéricos, e a existência decide entre edição e criação; a exclusão apaga o registro. 🟢 `educar_bloqueio_ano_letivo_cad.php:74-144`
- **Verificação na avaliação:** primeiro a bandeira escolar de anos encerrados, depois a janela institucional pela data atual. 🟢 `DiarioApiController.php:45-69`
- **Edição da mantenedora:** a carga por `detalhe` preenche os atributos, as bandeiras são convertidas com `dbBool`, e o formulário é montado por seções. 🟢 `educar_instituicao_cad.php:124-168`

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| `clsPmieducarInstituicao` | Carga e edição da mantenedora | Saída | 🟢 `educar_instituicao_cad.php:125` |
| `App_Model_IedFinder::getInstituicoes` | Seleções do operador | Saída | 🟢 telas |
| `clsPermissoes` | Processos 559, 999873 e 21251 | Saída | 🟢 cada tela |
| `CacheService` | Cache das configurações | Interna | 🟢 `LoadSettings.php:21` e `:58` |
| `DiarioApiController` (Avaliacao) | Consumo da janela e da bandeira | Entrada | 🟢 `DiarioApiController.php:45-69` |
| `ComponenteCurricular` (tela da turma) | Consumo do parâmetro institucional | Entrada | 🟢 `educar_turma_cad.php:936-948` |
| `SystemSettingsUpdatedEvent` | Invalidação de cache de configurações | Saída | 🟢 `SettingController.php:52` |

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Dispersão em cinco fontes, com as duas institucionais por chave única e as duas globais sem tenant. | migrações e modelos | 🟢 |
| Janela do bloqueio como período permitido, invertida no desenho do bastão. | `educar_bloqueio_ano_letivo_cad.php:70-71` | 🔴 |
| Bloqueio institucional único por ano, sem operação nem escopo. | chave composta | 🟢 |
| Dados de remanejamento e deslocamento como regras de apresentação, e não de bloqueio. | `educar_instituicao_cad.php:228-249` | 🟢 |
| Configuração por bandeiras booleanas correspondidas ao banco como inteiro um ou zero. | `educar_instituicao_cad.php:143-166` | 🟢 |
| Carga central das configurações no middleware com cache, e gravações com invalidação por evento. | `LoadSettings.php` e `SettingController` | 🟢 |
| Token de integração sem cifragem na camada de configuração geral. | `educar_configuracoes_gerais.php:142-148` | 🟢 |
| Dicionário sem lista de permissões na gravação, com depende do administrador como única guarda. | `SettingController.php:31-56` | 🟡 |

---

## Estado Interno

- O `Config`.retrieve das configurações vivem pelo ciclo da requisição após o middleware. 🟢 `LoadSettings.php:62-64`
- As propriedades públicas das telas espelham as colunas das tabelas. 🟢 cada tela
- O registro do bloqueio é único por instituição e ano, com a recuperação pela chave composta. 🟢 `educar_bloqueio_ano_letivo_cad.php:35-38`

---

## Observabilidade

- O evento de configurações atualizadas registra a troca sem autor nem valor anterior. 🔴
- As falhas de gravação são devolvidas como mensagens de tela. 🟢 telas
- Não há métricas nem trilha de auditoria dos parâmetros. 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Semântica invertida da janela | O desenho alvo trata o intervalo como travamento; o legado usa como permissão. | `educar_bloqueio_ano_letivo_cad.php:70-71` | 🔴 |
| Bloqueio aplicado a uma operação apenas | Matrículas, históricos e movimentações não são consultados pela janela. | busca de consumo | 🔴 |
| Sem exceção nem prorrogação | Nenhum mecanismo auditável de liberação por operador existe no legado. | busca | 🔴 |
| Gravação do dicionário sem defesa | Todas as chaves do POST viram atualizações, sem validação de tipo em servidor. | `SettingController.php:48-56` | 🟡 |
| Tokens em texto plano | O token de integração e o dicionário não suportam cifragem. | `Setting.php:14-25` | 🟢 |
| Bastão com colunas que não existem | Laudo médico (deficiência) e quantidade de dependência (regras de avaliação) não pertencem à instituição. | `LegacyDeficiency.php:28` e busca | 🔴 |
| Bandeira escolar fora do bastão | `bloquear_lancamento_diario_anos_letivos_encerrados` deve migrar como configuração por escola. | `DiarioApiController.php:48-52` | 🔴 |
| Sem isolamento de tenant no dicionário | `settings` é global no legado. | `app/Setting.php` | 🟡 |
