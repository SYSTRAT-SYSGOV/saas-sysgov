# Proposta: Regras de Negócio do Sistema Legado Clipper e Preparação de Migração de Dados

## Why
O município opera historicamente com sistemas legados em Clipper (DOS/DBF) nos cemitérios Central e Independência, acumulando regras operacionais críticas — tais como controle de processo administrativo municipal de concessão, trava anti-sepultamento de terceiros para titular falecido sem sucessão hereditária, e alocação de coveiros e pedreiros por inumação. A incorporação dessas regras no SYSGOV e a estruturação de um comando robusto de migração garantem a continuidade dos registros sem perda de histórico e com total segurança jurídica e conformidade multi-tenant.

## What Changes
- **Concessão e Processo Administrativo Municipal**: Suporte ao número de processo administrativo municipal em concessões e túmulos, permitindo diferenciar lotes temporários (terra, cadência de validade) de lotes perpétuos (gaveta/concreto).
- **Titular Falecido e Trava de Sucessão Hereditária**: Flag e indicador de titular falecido no concessionário, acionando pendência de regularização sucessória e bloqueando novos sepultamentos de terceiros no jazigo até a formalização da transferência aos herdeiros.
- **Registro Operacional de Inumação**: Campos para identificação da gaveta/nicho ocupado no lote, coveiro responsável pela abertura/fechamento e pedreiro/empreiteiro credenciado pela obra tumular.
- **Exibição e Ações no Inventário e Detalhe do Jazigo**: Visualização no Drawer de detalhes e ficha cadastral do número do processo administrativo, alerta visual em destaque de "Titular Falecido - Sucessão Pendente" e composição das inumações com nicho, coveiro e pedreiro.
- **Infraestrutura de Migração de Dados Legados (ETL)**: Comando Artisan CLI `cemiterios:migrar-clipper` idempotente, transacional e validado para ler as bases exportadas das duas necrópoles (Cemitério Central `01` e Independência `02`), mapeando com integridade referencial parques, setores, jazigos, concessionários, concessões, falecidos e inumações.

## Capabilities

### New Capabilities
- `cemiterio/regras-concessao-sucessao`: Regras de negócio de concessão municipal com processo administrativo, trava anti-sepultamento para titular falecido e controle de sucessão hereditária familiar.
- `cemiterio/migracao-legado`: Rotina de extração, transformação e carga (ETL) idempotente para importar acervo histórico das necrópoles Central e Independência.

### Modified Capabilities
- `cemiterio/inventario`: Inclusão dos campos de processo administrativo, indicador de titular falecido, gaveta/nicho e profissionais fúnebres no inventário e ficha de detalhes do túmulo.

## Impact
- **Backend (`apps/api/Modules/Cemiterios`)**:
  - Migrations adicionando `processo_administrativo`, `titular_falecido`, `gaveta_numero`, `coveiro_nome`, `pedreiro_nome`.
  - Atualização dos models `Jazigo`, `Concessao`, `Concessionario`, `Inumacao`.
  - Implementação da trava de titular falecido em `OperacaoService` e `ConcessaoService`.
  - Comando Artisan `MigrarClipperCommand` em `Console/`.
- **Frontend (`apps/web-client/src/modules/cemiterios`)**:
  - Atualização dos contratos de tipos em `api.ts`.
  - Atualização de `InventarioView.tsx` (Drawer de detalhes do jazigo) e `ModalFichaCadastral.tsx`.
  - Atualização de `ConcessoesView.tsx` e `OperacoesView.tsx`.
- **Testes**:
  - Testes unitários de backend no Laravel para trava de titular falecido e comando de migração.
  - Testes unitários de frontend no Vitest para exibição dos novos campos e alertas de sucessão.
