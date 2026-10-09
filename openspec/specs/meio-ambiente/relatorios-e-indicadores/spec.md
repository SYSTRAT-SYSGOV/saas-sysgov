# meio-ambiente/relatorios-e-indicadores Specification

## Purpose
Geração e exportação de relatórios ambientais obrigatórios exigidos por órgãos de controle, e painel de
indicadores ambientais com visão consolidada de licenciamento, autuação, queimadas e coleta seletiva.

## Requirements

### Requirement: Geração de relatórios ambientais obrigatórios
<!-- entities: RelatorioAmbiental -->

O sistema SHALL gerar relatórios ambientais obrigatórios a partir dos dados do módulo, incluindo o
inventário de emissões de Gases de Efeito Estufa (GEE) e o Relatório Anual de Resíduos Sólidos (RARS),
com exportação no formato esperado pelo órgão de controle destinatário.

#### Scenario: Geração do Relatório Anual de Resíduos Sólidos
- **GIVEN** um exercício com coletas regulares e seletivas registradas no módulo de resíduos sólidos
- **WHEN** `gerarRelatorio()` é chamado com `tipo = 'RARS'` e o exercício desejado
- **THEN** o relatório é gerado consolidando os volumes coletados por tipo e destinação do exercício, disponível para exportação

#### Scenario: Exportação em formato exigido pelo órgão de controle
- **GIVEN** um relatório de inventário de emissões de GEE já gerado
- **WHEN** `exportarRelatorio()` é chamado indicando o formato exigido pelo órgão destinatário
- **THEN** o arquivo exportado é gerado no formato solicitado, pronto para envio ao órgão de controle

### Requirement: Painel de indicadores ambientais
<!-- entities: PainelIndicadoresAmbientais -->

O sistema SHALL disponibilizar um painel com indicadores consolidados do módulo: número de licenças
emitidas por período, valor de multas aplicadas versus arrecadadas, evolução da área queimada (km²) e
cobertura da coleta seletiva (toneladas), com mapas e gráficos atualizados a partir dos dados vigentes.

#### Scenario: Indicador de multas aplicadas versus arrecadadas
- **GIVEN** autos de infração ambiental com R$ 50.000,00 em multas aplicadas e R$ 30.000,00 efetivamente pagos no período selecionado
- **WHEN** `obterIndicadores()` é chamado para esse período
- **THEN** o painel retorna `valor_aplicado_centavos = 5000000` e `valor_arrecadado_centavos = 3000000` para o indicador de multas

#### Scenario: Indicador de cobertura de coleta seletiva por período
- **GIVEN** coletas seletivas registradas totalizando 12 toneladas no mês selecionado
- **WHEN** `obterIndicadores()` é chamado para esse mês
- **THEN** o painel retorna `coleta_seletiva_toneladas = 12` para o indicador correspondente

### Requirement: Acesso restrito ao painel e aos relatórios
<!-- entities: PainelIndicadoresAmbientais, RelatorioAmbiental -->

O sistema SHALL restringir o acesso ao painel de indicadores e à geração/exportação de relatórios
obrigatórios a usuários com a permissão de gestão/chefia do módulo de Meio Ambiente.

#### Scenario: Usuário sem permissão de chefia não acessa o painel
- **GIVEN** um usuário autenticado sem a permissão `meio_ambiente.chefia`
- **WHEN** ele tenta acessar o endpoint do painel de indicadores
- **THEN** o controller responde HTTP 403
