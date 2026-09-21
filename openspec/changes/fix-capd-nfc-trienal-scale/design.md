# Design

## Context

Ver proposal.md - Why para a correção de rumo completa. Resumo do mapeamento de escala real do
módulo CAPD, confirmado por leitura de código (não suposição):

- `Avaliacao.nota_final`: NFD, escala 0,00–10,00, gravado por `CalculadoraNotaService.calcular()`
  (`Nf = (grau−1) × 2,5`). Fonte da verdade, correta, não muda.
- NFC (nota final consolidada trienal) e `nota_corte_nfc`: escala 0,00–100,00. O fluxo real e
  testado (`ConsolidacaoController::nfc()`, linha ~78) converte explicitamente:
  `bcmul((string) $av->nota_final, '10', 2)` — com comentário no próprio código confirmando que é
  intencional. `nota_corte_nfc` padrão `70.00` e as faixas de conceito (90/75/60) já estão
  corretas nessa escala e não precisam de nenhuma alteração.
- Dois lugares **não aplicam** essa conversão e por isso têm o bug real:
  `AvaliacaoController::simularProgressao()` (rota real, sem teste de escala) e
  `CicloService::consolidarNfcTrienal()` (zero chamadores — código morto, mas nomeado pelo
  requisito de spec `CicloService.consolidarNfcTrienal`).
- `CapdDadosDemonstracaoSeeder` tinha um bug não relacionado: computa `$grau` corretamente a
  partir de uma nota de demonstração 0–100, mas grava esse valor bruto como `nota_final` em vez de
  aplicar `Nf = (grau−1) × 2,5`.

## Goals / Non-Goals

**Goals:**
- `simularProgressao()` retorna uma NFC projetada e uma elegibilidade consistentes com o que a
  consolidação oficial (`ConsolidacaoController::nfc()`) produziria para os mesmos dados.
- `consolidarNfcTrienal()` (ainda que hoje inalcançável) segue o mesmo padrão de conversão, para
  que qualquer futuro chamador não reintroduza o bug.
- Dados de demonstração (`CapdDadosDemonstracaoSeeder`) refletem a escala real de `nota_final`.

**Non-Goals:**
- Não alterar `nota_corte_nfc`, faixas de conceito, ou validações — já estão corretas na escala
  0–100.
- Não migrar nenhum dado já persistido — não há dado de produção incorreto (a consolidação oficial
  sempre esteve certa); os dois pontos corrigidos aqui não persistem nada hoje
  (`simularProgressao` é só leitura/simulação, `consolidarNfcTrienal` é código morto).
- Não conectar `CicloService::consolidarNfcTrienal()` a nenhuma rota — permanece código morto,
  apenas corrigido por consistência.
- Não remover `NotaCalculoService::calcularNotaCiclo()` (motor de fatores ponderados, também não
  utilizado) — limpeza não relacionada a este bug.

## Decisions

**1. `simularProgressao()`: aplicar `bcmul(nota_final, '10', 2)` a cada nota antes de `calcularNfc()`.**
Mesmo padrão de `ConsolidacaoController::nfc()` linha ~78. Reverte a comparação de elegibilidade
para `>= 70.0` (não `>= 7.0`) e o `'nota_corte'` de resposta para `'70.00'` — a escala correta,
que já era a original antes de uma correção equivocada de rumo nesta mesma sessão.

**2. `consolidarNfcTrienal()`: mesma conversão, por consistência.**
Ainda que sem chamador real hoje, é o método nomeado pela spec (`CicloService.consolidarNfcTrienal`)
— corrigi-lo evita que uma futura integração reintroduza o bug original.

**3. Seeder: aplicar `Nf = (grau−1) × 2,5` ao gerar `nota_final`, mantendo `nota_corte_nfc` em `70.00`.**
Apenas a fórmula de `nota_final` muda; `nota_corte_nfc` e `elegivel_progressao` (a nível de
avaliação individual, que já usa corte NFD 7,00 corretamente) não mudam.

**4. Sem migração de dados.**
Ao contrário do que a versão anterior deste design.md concluía, não há necessidade de reescalar
`nota_corte_nfc` nem qualquer `ConsolidacaoTrienal` persistida — a consolidação oficial nunca
esteve incorreta.

## Risks / Trade-offs

- [Alguém pode ter integrado externamente com `simularProgressao()` já esperando o comportamento
  (incorreto) atual] → Mitigação: o endpoint é de simulação/consulta, não persiste nada; o
  comportamento corrigido é estritamente mais correto e alinhado à consolidação oficial já em uso.
- [`consolidarNfcTrienal()` seguir sem chamador é uma situação estranha para um método com
  requisito de spec dedicado] → Mitigação: fora do escopo desta correção decidir se/quando será
  conectado; registrar isso como observação para o time de produto, não uma ação de código aqui.

## Migration Plan

Nenhuma migração de schema ou de dados. Deploy é o release normal do backend; rollback é reverter
o commit.
