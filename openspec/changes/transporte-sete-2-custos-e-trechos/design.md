# Design — Transporte/SETE 2: custos e características de trecho

## Decisões

### D-C1. Fórmula pura, parâmetros explícitos
O cálculo é uma classe sem acesso a banco (`CalculadoraCustoRota`) que recebe um objeto de entrada (dados da rota + parâmetros) e devolve o resultado com **cada componente**. Isso permite testar com a planilha de referência e reaproveitar para simulação ("e se o diesel subir 10%?").

### D-C2. Não copiar as constantes do SETE sem validar
Lendo o SETE encontrei pontos que **não vão direto para o SysGov**:
- Rodoviário: `custo_final = 12 × fixo + (10 × variável) × (km_mensal × 20)`; aquaviário: `12 × fixo + 10 × variável` (sem o produto por km). As duas rotas do mesmo modelo usam fórmulas diferentes e os números 10, 12 e 20 não estão nomeados.
- O comentário do código diz "20 dias × 2 (ida e volta)", mas a conta usa só 20.
- O "preço do veículo sem rodagem" é calculado e depois não é usado na depreciação.
Por isso as constantes viram **parâmetros nomeados**: `meses_letivos`, `dias_letivos_por_mes`, `viagens_por_dia` (ida e volta), `meses_custo_fixo`. A fórmula só é considerada correta depois que a **planilha de referência** (FNDE ou do órgão) reproduzir os valores (tarefa 0.1).

### D-C3. Componentes (modelo a validar)
- **Fixo mensal por veículo**: pessoal (motorista = coeficiente de utilização × salário × (1 + encargos); monitor idem; manutenção), administrativo (percentual), depreciação (método da soma dos dígitos com valor residual, sobre o preço do veículo) e remuneração do capital (taxa × valor médio).
- **Variável por km**: combustível (preço ÷ rendimento km/l), óleo e lubrificantes (coeficiente × preço), rodagem (pneus + recapagens ÷ vida útil do pneu) e peças (coeficiente × preço do veículo ÷ km).
- **Aquaviário**: seguro e manutenção no fixo; combustível e óleo no variável; sem rodagem terrestre. O conjunto exato é confirmado na tarefa 0.2.
- **Saídas**: custo mensal, anual, por km, por aluno (alunos com alocação ativa da rota), por dia letivo.

### D-C4. Parâmetros
- `transporte_custo_parametros`: `tenant_id`, `ano`, `chave`, `valor` (decimal), `modal` (`rodoviario|aquaviario|comum`), `origem` (`padrao|orgao`), `atualizado_por`; único por tenant + ano + chave + modal.
- Catálogo declarativo de chaves, com rótulo, unidade, faixa válida e valor de referência. O órgão **não cria chave nova** (a fórmula é fixa); edita valores. Sem parâmetro obrigatório, o cálculo devolve "incompleto" e lista o que falta, em vez de zero.
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
