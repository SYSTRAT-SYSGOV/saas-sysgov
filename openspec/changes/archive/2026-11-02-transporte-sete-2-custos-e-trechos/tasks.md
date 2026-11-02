# Tarefas — Transporte/SETE 2: custos e características de trecho

## 0. Antes de começar
- [x] 0.1 (dispensado) O órgão **não tem a planilha de referência**; segue-se sem ela. Casos de teste conferidos à mão e aviso de “estimativa não validada” na tela
- [x] 0.2 Componentes do aquaviário definidos no modelo (seguro e manutenção no fixo; combustível e lubrificantes no variável); constantes viraram parâmetros
- [x] 0.3 Sem valores de referência inventados (só o calendário); características de trecho informativas (pergunta 2); dias letivos como parâmetro (pergunta 3)

## 1. Backend
- [x] 1.1 Migration `transporte_custo_parametros`; colunas `caracteristicas` (JSON) e `custo_contratado_mensal` em `transporte_rotas`
- [x] 1.2 Catálogo de parâmetros (chave, rótulo, unidade, faixa, obrigatoriedade, padrão do calendário) e `CustoParametroService` com cópia ao virar o ano
- [x] 1.3 `CalculadoraCustoRota` (pura) com resultado detalhado e estado "incompleto"
- [x] 1.4 `CustoRotaService` (monta a entrada a partir de rota, veículo, alocações e parâmetros) e simulação com parâmetro alterado
- [x] 1.5 Relatório por rota, escola e empresa e CSV com neutralização de fórmula (em `CustoRotaService`)
- [x] 1.6 Característica de trecho no cadastro da rota e filtros
- [x] 1.7 Permissões `transporte.custos.ver` e `transporte.custos.parametros`; Policies, Controllers, Resources, rotas; auditoria

## 2. Backend — testes
- [x] 2.1 Casos de referência conferidos à mão (rodoviário e aquaviário)
- [x] 2.2 Parâmetro faltando → incompleto com a lista; rota sem veículo; rota sem alunos (custo por aluno indefinido, não zero)
- [x] 2.3 Modal derivado pela tipologia; contratado × estimado
- [x] 2.4 Isolamento de tenant, permissões e cópia entre anos
- [x] 2.5 PHPStan nível 6 e `php artisan test --filter=Transporte`

## 3. Frontend
- [x] 3.1 Aba **Custos**: parâmetros do ano (por grupo, com unidade e faixa), cópia do ano anterior
- [x] 3.2 Resultado por rota com detalhamento dos componentes e simulação
- [x] 3.3 Comparativo estimado × contratado e relatório com CSV
- [x] 3.4 Características do trecho (e custo contratado) no formulário da rota e filtro por característica
- [ ] 3.4b (adiado) Cartão de custo no painel
- [x] 3.5 Testes vitest; `tsc` limpo

## 4. Fechamento
- [x] 4.1 `docs/modules/transporte.md` (metodologia, parâmetros, limites) e crédito ao SETE (MIT)
- [x] 4.2 Atualizar `openspec/specs/transporte/spec.md` e arquivar
