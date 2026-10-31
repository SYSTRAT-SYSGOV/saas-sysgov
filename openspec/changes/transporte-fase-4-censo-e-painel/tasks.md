# Tarefas — Transporte, Fase 4: Censo e painel

## 0. Antes de começar
- [ ] 0.1 Resolver as perguntas abertas do `design.md` (alunos que deveriam usar transporte; layout oficial do Educacenso)

## 1. Backend — regras
- [ ] 1.1 `CensoService::preValidar(ano)`: quatro pendências, aviso de turno, `approved`
- [ ] 1.2 `CensoService::exportarCsv(ano)`: linhas por alocação ativa, flags 1 a 11, anulação, UTF-8 com BOM e `;`
- [ ] 1.3 Neutralização de fórmula em células e minimização (sem CPF, endereço ou observação de necessidade)
- [ ] 1.4 `PainelService`: totais, ocupação média ponderada, lista por faixa, pendência sem veículo, alertas da Fase 1
- [ ] 1.5 Endpoint de auditoria do módulo com filtros; auditoria da exportação
- [ ] 1.6 Policies (`transporte.censo.export`, `transporte.audit`), Controllers, Resources e rotas

## 2. Backend — testes
- [ ] 2.1 Isolamento de tenant no Censo e no painel
- [ ] 2.2 Pendências: rota sem veículo, não adaptado, rural sem declaração, sem alocação ativa, turno divergente, sem pendências
- [ ] 2.3 CSV: ônibus municipal, ferroviário, encerrada fora, cabeçalho estável, BOM e `;`
- [ ] 2.4 Anulação: sem atendimento curricular, a distância, país `PY`, caso comum
- [ ] 2.5 Injeção de fórmula; ausência de CPF e da observação; exportação auditada
- [ ] 2.6 Painel: vermelha, amarela no limite, sem veículo, vazio, ordem dos alertas
- [ ] 2.7 Permissões (403) e filtro da auditoria

## 3. Frontend
- [ ] 3.1 Aba Censo: seletor de ano, lista de pendências, botão Exportar (some sem permissão)
- [ ] 3.2 Aba Painel: indicadores (`KpiCard`), lotação por rota com rótulo de texto, alertas
- [ ] 3.3 Aba Auditoria com filtros
- [ ] 3.4 SDK, `generate:registry`, typecheck e vitest

## 4. Entrega
- [ ] 4.1 phpunit, phpstan e front verdes; CI verde
- [ ] 4.2 Conferência no navegador e abertura do CSV no Excel (acentos e `;`)
- [ ] 4.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`
