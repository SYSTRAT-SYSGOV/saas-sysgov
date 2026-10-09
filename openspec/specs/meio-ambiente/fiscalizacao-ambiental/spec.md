# meio-ambiente/fiscalizacao-ambiental Specification

## Purpose
Emissão de autos de infração ambiental com cálculo automático de multa fundamentado em legislação
configurável, controle de reincidência, parcelamento e recursos, reaproveitando a execução de campo, a
emissão de documento com assinatura em tela e o processo administrativo sancionatório já existentes no
módulo Vistoria.

## Requirements

### Requirement: Emissão de auto de infração ambiental com tipificação
<!-- entities: AutoInfracaoAmbiental -->

O sistema SHALL permitir a emissão de auto de infração ambiental a partir de uma execução de vistoria do
módulo Vistoria, exigindo a tipificação da infração (`desmatamento`, `poluicao_hidrica`,
`poluicao_atmosferica`, `queimada`, `caca_ilegal` ou `outra`) e, quando aplicável, a área ou extensão do
dano.

#### Scenario: Emissão de auto de infração por desmatamento
- **GIVEN** uma execução de vistoria concluída em um empreendimento cadastrado
- **WHEN** `emitirAutoInfracaoAmbiental()` recebe `tipo_infracao = 'desmatamento'` e `area_afetada_ha = 2.5`
- **THEN** o auto de infração ambiental é criado vinculado ao documento de auto de infração emitido pelo módulo Vistoria, com `tipo_infracao` e `area_afetada_ha` persistidos

### Requirement: Cálculo automático da multa por legislação configurável
<!-- entities: TabelaMultaAmbiental -->

O sistema SHALL calcular automaticamente o valor sugerido da multa a partir de uma tabela de enquadramento
legal configurável (parametrizada inicialmente pelo Decreto Federal 6.514/2008), com base no tipo de
infração e na extensão do dano, expressando o resultado em `App\Support\Money` (centavos), sem impedir que
o julgador ajuste o valor final no julgamento do processo sancionatório.

#### Scenario: Cálculo de multa por desmatamento proporcional à área
- **GIVEN** a tabela de enquadramento legal vigente define multa de R$ 5.000,00 por hectare desmatado sem autorização
- **WHEN** `calcularMultaSugerida()` é chamado para um auto de infração ambiental com `tipo_infracao = 'desmatamento'` e `area_afetada_ha = 2`
- **THEN** retorna `valor_sugerido_centavos = 1000000` (R$ 10.000,00) como valor sugerido, sem aplicar ainda ao processo sancionatório

#### Scenario: Valor sugerido é editável pelo julgador
- **GIVEN** um processo sancionatório ambiental com multa sugerida de R$ 10.000,00
- **WHEN** o julgador registra julgamento com `penalidade_centavos` diferente do valor sugerido, justificando a divergência
- **THEN** o processo é julgado com o valor informado pelo julgador, mantendo o valor sugerido original apenas como referência histórica

### Requirement: Agravante de reincidência
<!-- entities: AutoInfracaoAmbiental -->

O sistema SHALL identificar reincidência quando o mesmo titular de empreendimento possuir outro auto de
infração ambiental do mesmo tipo com penalidade aplicada nos últimos 24 meses, aplicando um agravante
percentual configurável sobre o valor sugerido da multa.

#### Scenario: Agravante de 50% para segunda infração do mesmo tipo em 24 meses
- **GIVEN** um titular com auto de infração ambiental de `poluicao_hidrica` penalizado há 10 meses
- **WHEN** um novo auto de infração ambiental de `poluicao_hidrica` é emitido para o mesmo titular e o cálculo de multa sugerida é executado
- **THEN** o valor sugerido é acrescido do agravante de reincidência configurado, e o auto de infração é marcado com `reincidente = true`

### Requirement: Parcelamento da multa aplicada
<!-- entities: ParcelamentoMulta -->

O sistema SHALL permitir o parcelamento da multa aplicada em um processo sancionatório ambiental concluído
com penalidade, em até o número de parcelas configurado pela Secretaria, controlando vencimento e
pagamento de cada parcela.

#### Scenario: Parcelamento em 6 vezes de multa aplicada
- **GIVEN** um processo sancionatório ambiental concluído com `penalidade_centavos = 1000000`
- **WHEN** `parcelar()` é chamado com `numero_parcelas = 6`
- **THEN** 6 parcelas de R$ 1.666,67 (ajustadas para fechar a soma exata em centavos) são criadas com vencimento mensal, e o saldo devedor passa a ser acompanhado por parcela

#### Scenario: Parcelamento acima do limite configurado é rejeitado
- **GIVEN** o limite configurado de parcelamento é 12 vezes
- **WHEN** `parcelar()` é chamado com `numero_parcelas = 24`
- **THEN** lança `DomainException` "Número de parcelas excede o limite permitido" e o controller responde HTTP 422

### Requirement: Recurso administrativo da autuação ambiental
<!-- entities: ProcessoSancionatorio -->

O sistema SHALL reaproveitar a máquina de estados de defesa e recurso do processo sancionatório do módulo
Vistoria para a autuação ambiental, sem duplicar sua lógica, garantindo que o prazo e o rito de defesa e
recurso aplicados a infrações ambientais sejam os mesmos já validados para fiscalização geral.

#### Scenario: Apresentação de defesa dentro do prazo
- **GIVEN** um auto de infração ambiental com processo sancionatório em status `aberto` e prazo de defesa em aberto
- **WHEN** o autuado apresenta defesa dentro do prazo
- **THEN** o processo transita para `em_defesa`, exatamente como ocorre para autuações de fiscalização geral no módulo Vistoria
