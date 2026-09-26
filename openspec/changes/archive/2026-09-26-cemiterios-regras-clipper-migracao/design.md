# Documento de Design Técnico: Regras de Negócio do Clipper e Migração de Dados

## Contexto
O município gerenciava os cemitérios Central e Independência em um sistema DOS/Clipper legado, com dados armazenados em tabelas DBF (já extraídas para arquivos CSV padronizados em UTF-8). 
No sistema legado, foram identificadas regras de domínio essenciais que hoje não estavam formalizadas no SYSGOV:
1. Associação explícita do Processo Administrativo Municipal da concessão.
2. Identificação de titulares falecidos no cadastro de responsáveis, exigindo abertura de partilha/sucessão e bloqueando o uso do túmulo por terceiros.
3. Alocação de coveiros (servidores públicos) e pedreiros credenciados na inumação, bem como numeração da gaveta física ocupada.
4. Distinção de lotes temporários (terra, cadência de validade) de lotes perpétuos (gavetas em alvenaria/concreto).

## Objetivos / Não-Objetivos

**Objetivos:**
- Incorporar os campos e regras de processo administrativo municipal e bloqueio por titular falecido no backend Laravel e no frontend React do módulo de Cemitérios.
- Exibir com clareza o alerta de "Titular Falecido - Sucessão Pendente" no Drawer de Detalhes do Jazigo e na Ficha Cadastral.
- Registrar nas inumações a identificação da gaveta/nicho, coveiro e pedreiro.
- Desenvolver um comando Artisan CLI (`cemiterios:migrar-clipper`) com suporte a `--dry-run`, loteamento transacional (chunking) e recálculo de ocupação e estado para os 58.000 registros históricos.

**Não-Objetivos:**
- Executar a migração massiva em banco de produção nesta primeira etapa (o comando ficará desenvolvido, testado e pronto para execução sob agendamento acordado com o usuário).
- Migrar senhas em texto puro ou grupos de permissões de usuários DOS legados (a autenticação do SYSGOV é governada pelo Sanctum/Gov.br e RBAC central).

## Decisões Técnicas de Arquitetura

### 1. Extensão do Modelo de Dados Multi-Tenant
- **`concessions` (Concessão)**: Adição de `processo_administrativo` (VARCHAR 50, nullable) e `motivo_pendencia` (VARCHAR 100, nullable).
- **`concession_holders` (Concessionário)**: Adição de `titular_falecido` (BOOLEAN, default false), `data_falecimento_titular` (DATE, nullable) e `processo_inventario` (VARCHAR 50, nullable).
- **`cemetery_burials` (Inumação)**: Adição de `gaveta_numero` (SMALLINT, nullable), `coveiro_nome` (VARCHAR 150, nullable), `pedreiro_nome` (VARCHAR 150, nullable), `cartorio` (VARCHAR 200, nullable) e `medico` (VARCHAR 200, nullable).
- **`plot_inventory` (Jazigo)**: Adição de `codigo_legado` (VARCHAR 20, nullable) e `processo_administrativo` (VARCHAR 50, nullable) para compatibilização de lote e quadra antigos.

### 2. Trava Anti-Sepultamento no `OperacaoService`
- **Validação**: No método `OperacaoService::inumar()`, antes de efetivar o sepultamento em um jazigo concedido:
  - O serviço verifica se o concessionário titular possui `titular_falecido === true`.
  - Caso positivo, verifica se o falecido sendo sepultado é o próprio titular (comparando documento ou nome normalizado).
  - Se for terceiro e a sucessão não tiver sido regularizada (ou sem autorização judicial registrada em `ExcecaoJudicial`), o sistema lança `RegraNegocioException('concessao.titular_falecido_sucessao_pendente', 'Jazigo com titular falecido e sucessão hereditária pendente. Sepultamento de terceiros bloqueado.')`.

### 3. Interface no Frontend (`apps/web-client`)
- **Drawer de Detalhes do Jazigo (`InventarioView.tsx`)**:
  - Exibir bloco em destaque com o Processo Administrativo em tipografia técnica `font-mono tabular-nums`.
  - Se `titular_falecido === true`, renderizar um card de alerta com borda âmbar/rose e `Badge` indicando: `⚠️ Titular Falecido — Sucessão Hereditária Pendente`.
  - Na listagem de inumações, exibir colunas/badges para Gaveta/Nicho (ex: `Gaveta 1`), Coveiro e Pedreiro.
- **Ficha Cadastral Oficial (`ModalFichaCadastral.tsx`)**:
  - Incorporar o número do Processo Administrativo e as anotações sucessórias para fé pública.

### 4. Arquitetura do Comando de Migração (`MigrarClipperCommand`)
- **Localização**: `apps/api/Modules/Cemiterios/Console/MigrarClipperCommand.php`.
- **Assinatura**: `php artisan cemiterios:migrar-clipper {--tenant=} {--path=} {--necropole=all} {--dry-run}`.
- **Fluxo de Carga**:
  1. Resolução do Tenant ativo.
  2. Mapeamento de Cemitério Central (`01`) e Independência (`02`).
  3. Carga de Quadras em `cemetery_sectors`.
  4. Carga de Lotes em `plot_inventory` (tipo 1 = comum/temporário, tipo 3 = gaveta/perpétuo).
  5. Carga de Responsáveis em `concession_holders` e geração de `concessions` vigentes com número do processo. Detecção de strings `[FALECIDO]` para marcar `titular_falecido = true`.
  6. Carga de Falecidos em `deceased_records` com higienização de datas e criptografia de causa mortis.
  7. Carga de Ocupações em `cemetery_burials` como inumações históricas (`origem = 'historico'`, `revisao_pendente = false`).
  8. Disparo de recálculo de ocupação e estado para cada jazigo via `JazigoEstadoService::recalcular()`.

## Riscos e Mitigações

- **[Risco: Conflito de códigos de lotes duplicados entre quadras]** → Mapeamento composto com chave única `(tenant_id, park_id, sector_id, codigo)`.
- **[Risco: CPFs ausentes ou inválidos na base legada de 1990-2010]** → A coluna de documento do concessionário aceitará identificador provisório gerado ou RG legado sem quebrar a integridade, mantendo máscara e hash seguros.
- **[Risco: Volume elevado de inumações (~22.000) degradar memória]** → Processamento em lotes (chunks de 500) com `DB::transaction` controlada e liberação explícita de memória garbage collector.

## Plano de Rollback
- Todas as migrations possuem método `down()` rigoroso com deleção reversa de colunas.
- O comando de migração marca a origem dos dados (`origem = 'legado_clipper'`) permitindo purga segura e isolada caso haja necessidade de reexecução.
