# Spec Delta

## MODIFIED Requirements

### Requirement: Consolidação da NFC trienal determina elegibilidade à progressão
<!-- id: CicloService.consolidarNfcTrienal -->
<!-- entities: Servidor, CicloAvaliacao, Avaliacao, ConsolidacaoTrienal, PlanoMelhoria -->
<!-- enforced: CicloService.consolidarNfcTrienal() -->

A NFC SHALL ser a média aritmética das notas de ciclo do triênio (`(Nc1 + Nc2 + Nc3) / 3`),
com 2 casas decimais, apurada sobre os ciclos cujo ano base é `ano_competencia − (etapa − 1)`
até `+2`, no mesmo tenant. As notas de ciclo (Nc) SHALL ser obtidas convertendo
`Avaliacao.nota_final` (NFD, escala 0,00–10,00) para a escala 0–100 (`Nc = nota_final × 10`,
calculado com bcmath) — a mesma conversão já usada por `ConsolidacaoController.nfc()` — nunca
alterando a escala nativa de `CalculadoraNotaService`. A elegibilidade compara a NFC à
`nota_corte_nfc` do ciclo (padrão `70,00`, parametrizável pela Comissão, escala 0–100) e o
conceito sai das faixas configuráveis (Excelente/Bom/Regular/Insuficiente), também na escala
0–100. O resultado é publicado assincronamente como `capd.nfc.consolidada` via Outbox e auditado.

#### Scenario: servidor sem avaliações concluídas no triênio
- **WHEN** nenhum dos ciclos do triênio tem avaliação com `nota_final`
- **THEN** lança `DomainException` "não possui avaliações concluídas nos ciclos do triênio"

#### Scenario: NFC abaixo da nota de corte
<!-- test: ConsolidacaoNfcTest.test_calcula_nfc_dos_servidores_do_ciclo() -->
- **WHEN** a NFC apurada é inferior à `nota_corte_nfc` do ciclo
- **THEN** `elegivel = false`, o conceito é derivado das faixas e o evento Outbox carrega `elegivel: false`

#### Scenario: PDI/PMD pendente no ciclo de verificação
<!-- test: ConsolidacaoNfcTest.test_pdi_pendente_no_ciclo_de_verificacao_bloqueia_elegibilidade_mesmo_com_nfc_alta() -->
- **WHEN** o servidor possui `PlanoMelhoria` em aberto/em andamento/concluído sem verificação no ciclo
- **THEN** a elegibilidade é bloqueada mesmo com NFC acima do corte

#### Scenario: servidores inaptos geram plano de melhoria
<!-- test: ConsolidacaoNfcTest.test_processamento_da_consolidacao_cria_pmds_para_inaptos() -->
- **WHEN** o processamento da consolidação encontra servidores inaptos
- **THEN** `PmdService.criarParaServidor()` abre um `PlanoMelhoria` com status `aberto`, cancelando planos anteriores ainda ativos

#### Scenario: empate no ranking de progressão
<!-- test: ConsolidacaoNfcTest.test_ranking_de_progressao_com_criterios_de_desempate() -->
- **WHEN** dois candidatos têm a mesma NFC
- **THEN** o desempate aplica, em ordem: maior NFC, maior tempo de serviço (`data_admissao` mais antiga) e maior idade (`data_nascimento` mais antiga)

#### Scenario: reprocessamento da consolidação
<!-- test: ConsolidacaoNfcTest.test_reprocessar_consolidacao_cria_nova_versao_e_historico_lista_ambas() -->
- **WHEN** `ConsolidacaoTrienalService.persistir()` roda de novo para o mesmo (servidor, triênio)
- **THEN** cria um novo registro com `versao = max(versao) + 1`, preservando o snapshot anterior

#### Scenario: NFC apurada a partir de notas de ciclo NFD convertidas corretamente
- **WHEN** os três ciclos do triênio têm `nota_final` concluído em 7,00, 7,50 e 8,00 (NFD, escala
  0–10) e o ciclo final usa o corte padrão de 70,00
- **THEN** cada nota de ciclo é convertida para 70,00 / 75,00 / 80,00, a NFC apurada é 75,00, o
  servidor é considerado `elegivel = true`, e o conceito é determinado pelas faixas configuráveis
  na escala 0–100

## ADDED Requirements

### Requirement: Simulação de progressão converte NFD para a escala da NFC
<!-- id: AvaliacaoController.simularProgressao -->
<!-- entities: Servidor, Avaliacao, CicloAvaliacao -->
<!-- enforced: AvaliacaoController.simularProgressao() -->

A simulação de progressão de um servidor (`GET /servidores/{id}/simular-progressao`) SHALL
calcular a NFC projetada convertendo cada `Avaliacao.nota_final` (NFD, escala 0–10) das até 3
avaliações mais recentes para a escala 0–100 (mesma conversão de `ConsolidacaoController.nfc()`)
antes de calculá-la e compará-la ao corte de elegibilidade padrão, para que o resultado da
simulação seja consistente com o resultado da consolidação oficial.

#### Scenario: Servidor com notas NFD reais e elegíveis
- **WHEN** um servidor tem avaliações concluídas com `nota_final` 7,00 / 7,50 / 8,00 (NFD)
- **THEN** a NFC projetada retornada é 75,00 (não 7,50) e `elegivel_progressao = true`
