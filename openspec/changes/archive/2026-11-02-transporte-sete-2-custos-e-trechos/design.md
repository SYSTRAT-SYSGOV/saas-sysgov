# Design — Transporte/SETE 2: custos e características de trecho

## Decisões

### D-C1. Fórmula pura, parâmetros explícitos
O cálculo é uma classe sem acesso a banco (`CalculadoraCustoRota`) que recebe um objeto de entrada (dados da rota + parâmetros) e devolve o resultado com **cada componente**. Isso permite testar com a planilha de referência e reaproveitar para simulação ("e se o diesel subir 10%?").

### D-C2. Não copiar as constantes do SETE sem validar
Lendo o SETE encontrei pontos que **não vão direto para o SysGov**:
- Rodoviário: `custo_final = 12 × fixo + (10 × variável) × (km_mensal × 20)`; aquaviário: `12 × fixo + 10 × variável` (sem o produto por km). As duas rotas do mesmo modelo usam fórmulas diferentes e os números 10, 12 e 20 não estão nomeados.
- O comentário do código diz "20 dias × 2 (ida e volta)", mas a conta usa só 20.
- O "preço do veículo sem rodagem" é calculado e depois não é usado na depreciação.
Por isso as constantes viram **parâmetros nomeados**: `meses_letivos`, `dias_letivos_por_mes`, `viagens_por_dia` (ida e volta), `meses_custo_fixo`. **Decisão do usuário (02/11/2026): o órgão não tem a planilha do FNDE e seguimos sem ela.** O modelo implementado é, portanto, uma **estimativa não validada contra planilha oficial**: a tela e a documentação dizem isso, os casos de teste foram conferidos à mão e a fórmula está isolada em `CalculadoraCustoRota` para ser ajustada quando houver referência. O resultado serve para comparar rotas e acompanhar contratos, não como valor oficial.

### D-C3. Componentes (modelo implementado; não validado contra planilha)
Fórmulas (por veículo; `n` = vida útil em anos, `idade` = ano letivo − ano de fabricação, limitada a `n`, `r` = valor residual):
- Pessoal = (salário do motorista × motoristas por veículo + salário do monitor × monitores por veículo) × (1 + encargos).
- Depreciação mensal = [(n − idade) ÷ (n × (n + 1) ÷ 2)] × (1 − r) × preço ÷ 12 (soma dos dígitos dos anos).
- Remuneração mensal = preço × [((n + 1) ÷ (2n)) × (1 − r) + r] × taxa ÷ 12 (capital médio).
- Combustível por km = preço do litro ÷ rendimento; lubrificantes = coeficiente × preço do litro; rodagem = (pneus × preço + pneus × recapagem × nº de recapagens) ÷ vida útil do pneu; peças = coeficiente anual × preço ÷ km do ano.
- Km do mês = km do percurso × viagens por dia × dias letivos por mês; km do ano = km do mês × meses letivos.
- Custo do mês = fixo mensal + variável × km do mês. Custo do ano = fixo mensal × meses de custo fixo + variável × km do ano.
Veículo sem ano de fabricação deixa o cálculo incompleto (não se presume idade).
- **Fixo mensal por veículo**: pessoal (motorista = coeficiente de utilização × salário × (1 + encargos); monitor idem; manutenção), administrativo (percentual), depreciação (método da soma dos dígitos com valor residual, sobre o preço do veículo) e remuneração do capital (taxa × valor médio).
- **Variável por km**: combustível (preço ÷ rendimento km/l), óleo e lubrificantes (coeficiente × preço), rodagem (pneus + recapagens ÷ vida útil do pneu) e peças (coeficiente × preço do veículo ÷ km).
- **Aquaviário**: seguro e manutenção no fixo; combustível e óleo no variável; sem rodagem terrestre. O conjunto exato é confirmado na tarefa 0.2.
- **Saídas**: custo mensal, anual, por km, por aluno (alunos com alocação ativa da rota), por dia letivo.

### D-C4. Parâmetros
- `transporte_custo_parametros`: `tenant_id`, `ano`, `chave`, `valor` (decimal), `atualizado_por`; único por tenant + ano + chave. O modal vai no prefixo da chave (`rod_`, `aqua_`; sem prefixo é comum).
- Catálogo declarativo de chaves (`Custo/Parametros.php`), com rótulo, unidade, faixa válida e obrigatoriedade. **Só as constantes do calendário têm valor inicial** (20 dias, 10 meses, 2 viagens, 12 meses de custo fixo, 1 motorista por veículo); salário, preço e consumo são dados do órgão e **não têm valor de referência inventado**. O órgão **não cria chave nova** (a fórmula é fixa); edita valores. Sem parâmetro obrigatório, o cálculo devolve "incompleto" e lista o que falta, em vez de zero.
- Ao virar o ano, os parâmetros do ano anterior são **copiados** para o novo.
- Preço e consumo podem ser sobrescritos **por veículo** (opcional) quando o veículo se afasta do padrão.

### D-C5. Modal derivado
Modal da rota = aquaviário quando a tipologia do veículo é 7 a 10; rodoviário nos demais. Rota sem veículo → "sem modal", sem cálculo.

### D-C6. Estimado × contratado
`custo_contratado_mensal` (nulo) na rota, preenchido só para frota locada/terceirizada. A tela mostra a diferença absoluta e percentual e sinaliza quando o contrato excede o estimado acima de um limite configurável.

### D-C7. Características do trecho
Catálogo declarativo (`porteira`, `mata_burro`, `colchete`, `atoleiro`, `ponte_rustica`), guardado em `transporte_rotas.caracteristicas` (lista de chaves). Informativo e filtro nos relatórios; **não** altera a fórmula do custo na primeira versão (pergunta aberta 2).

### D-C8. Segurança
Custo é dado de gestão, sem dado pessoal. Permissões separadas para ver e para editar parâmetros. Alteração de parâmetro e exportação são auditadas.

## Riscos e perguntas abertas

1. **Metodologia oficial**: qual planilha/versão do FNDE (ou da prefeitura) vale como referência?
2. Obstáculos de trecho devem ter **fator de custo**?
3. Dias letivos por mês: usar o calendário escolar do módulo Escola ou parâmetro fixo?
4. Rotas mistas (rodoviário + aquaviário no mesmo itinerário) ficam fora desta versão.
