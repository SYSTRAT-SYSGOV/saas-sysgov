# Proposal

## Why

Com o módulo pronto (Fases 1 a 4), o órgão ainda precisa **entrar com os dados** que hoje estão em planilhas e demonstrar a ferramenta. Cadastrar veículos, motoristas e paradas um a um é inviável para uma rede com dezenas de rotas. E, sem dados de demonstração coerentes, a apresentação do módulo depende de digitação manual.

## What Changes

- **Importação por CSV** de veículos, motoristas e paradas, com modelo para baixar, pré-visualização, relatório de divergências por linha e processamento assíncrono (fila), no padrão da importação de alunos do módulo Escola.
- **Seeder de demonstração** `TransporteDadosDemonstracaoSeeder`, idempotente, sobre as escolas e os alunos já existentes: empresas, motoristas, veículos com vistorias (vigentes, a vencer e vencidas), paradas, rotas com itinerário e alocações em várias faixas de ocupação.
- **Documentação** `docs/modules/transporte.md` e arquivamento das cinco changes na spec `transporte`.
- **Ponte opcional com o Passeio**: vincular `passeio_veiculos` a um veículo do Transporte (decisão no design).

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta importação CSV, dados de demonstração e (se aprovada) a ponte com o Passeio.

## Impact

- **Backend**: `ImportacaoTransporteService`, job de importação, seeder; rota e Resource de divergências.
- **Depende das Fases 1 a 4** mescladas.
- **Fora do escopo**: migração automática do i-Educar (as classes servidoras do legado não estão no repositório do Carlos, Q-01/Q-02) e geocodificação automática dos pontos.
