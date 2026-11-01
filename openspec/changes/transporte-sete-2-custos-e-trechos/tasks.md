# Tarefas — Transporte/SETE 2: custos e características de trecho

## 0. Antes de começar
- [ ] 0.1 Obter a **planilha de referência** da metodologia de custos (FNDE ou do órgão) e montar casos de teste com os valores esperados
- [ ] 0.2 Confirmar com o órgão o conjunto de componentes do modal aquaviário e as constantes (meses, dias, viagens por dia)
- [ ] 0.3 Definir valores de referência dos parâmetros e responder as perguntas abertas 2 e 3

## 1. Backend
- [ ] 1.1 Migration `transporte_custo_parametros`; colunas `caracteristicas` (JSON) e `custo_contratado_mensal` em `transporte_rotas`
- [ ] 1.2 Catálogo de parâmetros (chave, rótulo, unidade, faixa, valor de referência) e `CustoParametroService` com cópia ao virar o ano
- [ ] 1.3 `CalculadoraCustoRota` (pura) com resultado detalhado e estado "incompleto"
- [ ] 1.4 `CustoRotaService` (monta a entrada a partir de rota, veículo, alocações e parâmetros) e simulação com parâmetro alterado
- [ ] 1.5 `RelatorioCustosService` (por rota, escola e empresa) e CSV com neutralização de fórmula
- [ ] 1.6 Característica de trecho no cadastro da rota e filtros
- [ ] 1.7 Permissões `transporte.custos.ver` e `transporte.custos.parametros`; Policies, Controllers, Resources, rotas; auditoria

## 2. Backend — testes
- [ ] 2.1 Casos da planilha de referência (rodoviário e aquaviário)
- [ ] 2.2 Parâmetro faltando → incompleto com a lista; rota sem veículo; rota sem alunos (custo por aluno indefinido, não zero)
- [ ] 2.3 Modal derivado pela tipologia; contratado × estimado
- [ ] 2.4 Isolamento de tenant, permissões e cópia entre anos
- [ ] 2.5 PHPStan nível 6 e `php artisan test --filter=Transporte`

## 3. Frontend
- [ ] 3.1 Aba **Custos**: parâmetros do ano (por grupo, com unidade e faixa), cópia do ano anterior
- [ ] 3.2 Resultado por rota com detalhamento dos componentes e simulação
- [ ] 3.3 Comparativo estimado × contratado e relatório com CSV
- [ ] 3.4 Características do trecho no formulário da rota; cartão de custo no painel
- [ ] 3.5 Testes vitest; `tsc` limpo

## 4. Fechamento
- [ ] 4.1 `docs/modules/transporte.md` (metodologia, parâmetros, limites) e crédito ao SETE (MIT)
- [ ] 4.2 Atualizar `openspec/specs/transporte/spec.md` e arquivar
