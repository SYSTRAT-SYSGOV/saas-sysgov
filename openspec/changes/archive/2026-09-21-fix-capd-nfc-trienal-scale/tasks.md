# Tasks

## 1. Backend — Corrigir a Conversão de Escala Ausente

- [x] 1.1 Corrigir `AvaliacaoController::simularProgressao()` para converter cada `nota_final`
      (NFD 0–10) para escala 0–100 via `bcmul(..., '10', 2)` antes de `calcularNfc()`, revertendo
      a comparação de elegibilidade e o `'nota_corte'` de resposta para `70.0`/`'70.00'`.
      Verificado com `SimularProgressaoEscalaNfcTest` (2 testes): NFC projetada de notas NFD
      7,00/7,50/8,00 é 75,00 (`elegivel = true`); notas 5,00/6,00/6,50 dão NFC 58,33
      (`elegivel = false`).
- [x] 1.2 Aplicar a mesma conversão em `CicloService::consolidarNfcTrienal()` (código sem
      chamador real hoje, mas nomeado pelo requisito de spec `CicloService.consolidarNfcTrienal`),
      por consistência. Verificado por `composer test` (não há teste direto do método, já que não
      tem chamador — coberto indiretamente pela suíte completa não quebrar).
- [x] 1.3 Corrigir `CapdDadosDemonstracaoSeeder` para gerar `nota_final` aplicando
      `Nf = (grau − 1) × 2,5` sobre o `$grau` já calculado, em vez de persistir o valor bruto
      0–100; `elegivel_progressao` (nível avaliação, corte NFD 7,00) ajustado para usar o valor
      corrigido. `nota_corte_nfc` do seeder permanece `70.00` (correto, escala 0–100).
      Verificado por leitura de código; sem teste dedicado (dado de demonstração).

## 2. Verificação Final

- [x] 2.1 `vendor/bin/phpunit Modules/Capd`: **OK (160 tests, 504 assertions)**.
- [x] 2.2 `composer test` (suíte completa `apps/api`): **OK (446 tests, 1258 assertions)**.
