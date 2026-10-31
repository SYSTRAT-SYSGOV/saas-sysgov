# Proposal

## Why

O gestor de transporte escolar precisa saber **quanto custa cada rota**, por mês, por km e **por aluno**, e comparar com o que é pago às empresas contratadas. Hoje o módulo controla frota, rotas e alunos, mas **não calcula custo**. O SETE (UFG/CECATE, MIT) traz um modelo de custos para rotas rodoviárias e aquaviárias, com custo fixo (pessoal, administrativo, depreciação, remuneração do capital) e variável (combustível, óleo, rodagem, peças), baseado na metodologia usada pelo FNDE.

Rotas rurais também têm **obstáculos** (porteira, mata-burro, colchete, atoleiro, ponte rústica) que o SETE registra e que influenciam tempo, risco e custo. E municípios ribeirinhos operam **rotas aquaviárias**, que já têm tipologia no Censo (7 a 10) mas nenhum tratamento próprio de custo.

## What Changes

- **Parâmetros de custo** por órgão e ano (salários, encargos, preço do combustível, preço de pneu, vida útil, valor residual, taxa de remuneração etc.), com valores de referência editáveis e histórico por ano.
- **Cálculo do custo da rota** (mensal, anual, por km e por aluno), com **detalhamento** de cada componente e transparência de qual parâmetro entrou na conta. Modal **rodoviário** ou **aquaviário** derivado da tipologia do veículo da rota.
- **Custo contratado × estimado**: para frota locada ou terceirizada, informar o valor contratado da rota e comparar com o estimado.
- **Características do trecho** da rota (porteira, mata-burro, colchete, atoleiro, ponte rústica) em catálogo declarativo.
- **Relatório de custos** por rota, por escola e por empresa; exportação CSV.
- **Painel**: custo médio por aluno e rotas acima da média.
- **Auditoria** de alteração de parâmetro e de cálculo exportado.

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta parâmetros de custo, cálculo e comparação de custo da rota, e características de trecho.

## Impact

- **Backend**: `CustoParametroService`, `CustoRotaService` (fórmulas puras, testáveis), `RelatorioCustosService`; tabela `transporte_custo_parametros`; colunas `caracteristicas` (JSON) e `custo_contratado_mensal` em `transporte_rotas`.
- **Depende** do módulo atual (rotas com km pavimentado/não pavimentado, veículo com tipologia, alocações para o número de alunos).
- **Risco principal**: as fórmulas do SETE têm inconsistências (ver D-C2). A fórmula só entra após **validação do órgão** contra uma planilha de referência.
- **Permissões**: `transporte.custos.ver` e `transporte.custos.parametros` (editar). Custo não expõe dado pessoal.
