# Proposal

## Why

**Correção de rumo (achado após investigação mais profunda):** a hipótese inicial desta proposta —
que `CicloService::consolidarNfcTrienal()` alimenta o motor de NFC (0–100) com `nota_final` bruto
(NFD, 0–10) em produção — está **parcialmente errada**. `CicloService::consolidarNfcTrienal()` não
tem nenhum chamador no código (nem em rotas, nem em testes): é código morto. O fluxo real e testado
de consolidação (`ConsolidacaoController::nfc()`, usado por `/consolidacao/{id}/nfc`, `/ranking`,
`/processar`, `/exportar-pdf`) já converte corretamente `nota_final` (NFD 0–10) para a escala 0–100
via `bcmul($av->nota_final, '10', 2)` antes de calcular a NFC — com comentário explícito no código
afirmando essa conversão como intencional. `nota_corte_nfc` (padrão `70.00`) e as faixas de conceito
(90/75/60) estão corretas nessa escala 0–100 e não precisam mudar.

O bug real está em dois lugares que **não** aplicam essa mesma conversão:
1. `AvaliacaoController::simularProgressao()` — endpoint de simulação de progressão
   (`GET /servidores/{id}/simular-progressao`) passa `nota_final` bruto (0–10) direto para
   `calcularNfc()`/comparação com o corte 70,00, tornando qualquer servidor real sempre
   "inelegível" na simulação — inconsistente com o resultado correto da consolidação oficial.
2. `CicloService::consolidarNfcTrienal()` — mesmo sendo código morto hoje, é a implementação
   nomeada pelo requisito `CicloService.consolidarNfcTrienal` na spec principal; corrigida por
   consistência e porque presumivelmente será conectada a algum fluxo no futuro.

Um bug não relacionado, mas encontrado no caminho: `CapdDadosDemonstracaoSeeder` calculava
corretamente o `grau` (1–5) a partir de uma nota de demonstração 0–100, mas persistia esse valor
bruto como `nota_final` em vez de aplicar `Nf = (grau − 1) × 2,5` — os dados de demonstração nunca
refletiram a escala real de uma submissão de avaliação.

## What Changes

- Corrigir `AvaliacaoController::simularProgressao()` para converter `nota_final` (NFD 0–10) para
  a escala 0–100 (mesmo `bcmul(..., '10', 2)` de `ConsolidacaoController::nfc()`) antes de calcular
  a NFC projetada e compará-la ao corte de elegibilidade.
- Aplicar a mesma conversão em `CicloService::consolidarNfcTrienal()`, por consistência com o
  padrão já usado e testado no restante do módulo.
- Corrigir `CapdDadosDemonstracaoSeeder` para gerar `nota_final` aplicando
  `Nf = (grau − 1) × 2,5` sobre o grau já calculado, em vez de persistir o valor bruto 0–100.
- Adicionar testes de regressão comprovando que a simulação de progressão de um servidor com notas
  reais elegíveis (NFD ≥ 7,00 nos 3 ciclos) retorna `elegivel_progressao = true` — o cenário que
  hoje está sempre quebrado nesse endpoint específico.
- **Nenhuma mudança em `nota_corte_nfc`, faixas de conceito, ou qualquer dado já persistido** — a
  escala 0–100 já usada pela consolidação oficial está correta e não muda.

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `capd`: corrige a simulação de progressão (`AvaliacaoController.simularProgressao`) e a
  implementação nomeada `CicloService.consolidarNfcTrienal` para aplicarem a mesma conversão de
  escala NFD→NFC (0–10 para 0–100) já usada pela consolidação oficial.

## Impact

- Backend: `apps/api/Modules/Capd/Http/Controllers/AvaliacaoController.php`
  (`simularProgressao`), `apps/api/Modules/Capd/Services/CicloService.php`
  (`consolidarNfcTrienal`), `apps/api/Modules/Capd/Database/Seeders/CapdDadosDemonstracaoSeeder.php`.
- Sem migração de schema, sem migração de dados, sem mudança em `nota_corte_nfc`/faixas de
  conceito/validações — o restante do módulo já estava correto.
- Sem impacto em `ConsolidacaoController`, `ConsolidacaoTrienalService`, `PmdService` ou qualquer
  fluxo de consolidação oficial já testado — nenhum deles tinha o bug.
