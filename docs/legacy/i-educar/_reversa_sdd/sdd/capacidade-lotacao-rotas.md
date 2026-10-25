# Spec: Capacidade e Lotação das Rotas de Transporte Escolar

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** Reversa (Time de Descoberta + Code New Project)
**Data:** 2026-10-20
**Reviewers:** N/A

> Todos os itens desta spec carregam o selo 🟡 PLANEJADO. Fatos extraídos do legado estão referenciados no Apêndice com a identificação da origem.

---

## 1. Resumo

🟡 O componente de capacidade e lotação apura o aproveitamento de cada rota de transporte escolar, relacionando estudantes alocados e capacidade do veículo escalado, e classifica o resultado em faixas que distinguem operação regular, operação no limite e superlotação vedada pelo CTB. Ele também produz os relatórios de transporte rural por escola, base do repasse de recursos do PNATE, e a apuração do tempo médio de deslocamento usado na meta de redução.

---

## 2. Contexto e Motivação

**Problema:**
O i-Educar não calcula a ocupação de rota. A verificação de lotação é feita por conferência manual de planilha, o que permite a operação de veículo acima da capacidade e não oferece indicador para a decisão de ampliação ou redimensionamento de linha. O modelo legado também não produz o total de estudantes transportados em área rural por escola, que é o insumo do repasse do PNATE, nem qualquer medida de tempo de deslocamento, que é a métrica de resultado do projeto.

**Evidências:**
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 4.3, que prevê `GET /api/v1/educa/transport/routes/{id}/occupancy` como relatório de ocupação com capacidade frente a alunos alocados.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 5, que define no contrato `TransportRoute` os campos `allocatedStudentsCount`, `stopsCount` e `capacityUtilizationPercentage`.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 6, que define as faixas do painel de lotação: verde até 80%, amarelo entre 81% e 100%, vermelho acima de 100%, com superlotação caracterizada como ilegal pelo CTB.
- PNATE, FNDE, Lei nº 10.880/2004, que calcula o repasse a partir do número de alunos transportados em áreas rurais registrados no Censo Escolar.
- PRD `_reversa_sdd/prd.md`: meta de redução de 15% no tempo médio de deslocamento e 100% de conformidade regulatória em 12 meses.

**Por que agora:**
A ocupação depende de três componentes já especificados, empresas, veículos, rotas e alocações. Com eles em contrato estável, a apuração passa a ser uma projeção sobre o modelo novo, e o indicador nasce junto com a carga de dados.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Apurar a ocupação de cada rota, com contagem de alocados, capacidade e porcentagem de aproveitamento.
- [ ] 🟡 G-02: Classificar a ocupação em faixa operacional, com destaque textual para a faixa de superlotação.
- [ ] 🟡 G-03: Produzir o relatório de transporte rural por escola, com o total de estudantes e a extensão não pavimentada das rotas.
- [ ] 🟡 G-04: Apurar o tempo médio de deslocamento das rotas, em valores comparáveis entre períodos.
- [ ] 🟡 G-05: Disponibilizar a ocupação por parada, para o planejamento do embarque.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Rotas com ocupação apurada no painel | 0% | 100% | 60 dias após o cutover |
| Rotas em superlotação detectadas e corrigidas | Sem medição | 0% | Contínuo após o cutover |
| Relatórios de transporte rural por escola disponíveis | 0% | 100% | Fim do cutover |
| Tempo de resposta P95 do relatório de ocupação | Sem medição | < 500 ms | 30 dias após o cutover |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá contagem de passageiros embarcados em tempo real por sensor ou por leitura de catraca; a ocupação apurada é a do vínculo de alocação.
- NG-02: Não haverá simulação de novas rotas com redistribuição de estudantes.
- NG-03: Não haverá cálculo de custo por passageiro-quilômetro nem de indicador financeiro de retorno sobre a frota.
- NG-04: Não haverá repasse de recurso do PNATE processado pelo sistema; o relatório de transporte rural é insumo de conferência, não execução financeira.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Técnico de transporte, que acompanha a ocupação das linhas e decide ajustes de escala, de horário e de roteirização.

**Usuário secundário:** 🟡 Gestor municipal e responsável pelo PNATE, que consulta o total de estudantes transportados em área rural por escola.

**Jornada atual (sem a feature):**
1. O técnico conta manualmente os estudantes alocados em cada linha.
2. A superlotação é percebida na operação, sem registro.
3. O número de estudantes transportados em área rural é apurado por conferência de relatório em planilha.
4. O tempo de deslocamento não é medido.

**Jornada futura (com a feature):**
1. O técnico abre o painel de ocupação e vê a faixa de cada rota do ano letivo.
2. A rota em superlotação aparece destacada com o excesso de vagas.
3. O gestor consulta o relatório de transporte rural por escola e confere o número de estudantes.
4. A apuração do tempo médio de deslocamento permite comparar o antes e o depois da reestruturação.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve apurar a ocupação de cada rota, com a contagem de estudantes alocados ativos, a capacidade do veículo escalado e a porcentagem de aproveitamento. | Must | Dado uma rota com 24 alocados e veículo de 30 assentos, quando a ocupação for apurada, então a contagem vale 24, a capacidade vale 30 e a porcentagem vale 80,0%. |
| RF-02 | 🟡 O sistema deve classificar a ocupação em faixa operacional regular até 80%, faixa de limite entre 81% e 100% e faixa de superlotação acima de 100%. | Must | Dado uma ocupação de 80,0%, a faixa apurada é a regular; dado 100,0%, a faixa é a de limite; dado 100,4%, a faixa é a de superlotação. |
| RF-03 | 🟡 O sistema deve apresentar a faixa de ocupação com rótulo textual, sem depender apenas de cor. | Must | Dado uma rota em superlotação, quando o painel for exibido, então o rótulo `Superlotação` aparece junto ao valor da porcentagem. |
| RF-04 | 🟡 O sistema deve contar como alocados somente as alocações ativas, ignorando as alocações encerradas ou desvinculadas. | Must | Dado uma rota com 30 alocados, sendo 2 encerrados, quando a ocupação for apurada, então a contagem vale 28. |
| RF-05 | 🟡 O sistema deve apurar a ocupação por parada, com a contagem de estudantes que embarcam em cada ponto do itinerário. | Should | Dado uma rota com 4 paradas, quando o relatório por parada for solicitado, então cada parada traz a contagem de estudantes alocados nela. |
| RF-06 | 🟡 O sistema deve produzir o relatório de transporte rural por escola, com o total de estudantes com indicação de transporte rural e a extensão não pavimentada das rotas que os atendem. | Must | Dado duas escolas com transporte rural, quando o relatório for solicitado, então cada escola traz o total de estudantes e a soma das extensões não pavimentadas das rotas correspondentes. |
| RF-07 | 🟡 O sistema deve apurar o tempo médio de deslocamento da rota, a partir do horário estimado de partida e do horário estimado de chegada. | Must | Dado uma rota com partida às 06:30 e chegada às 07:15, quando o tempo médio for apurado, então o valor apurado é de 45 minutos. |
| RF-08 | 🟡 O sistema deve arredondar a porcentagem de ocupação para uma casa decimal. | Should | Dado uma ocupação de 23 alocados em 30 assentos, quando a porcentagem for apurada, então o valor apresentado é 76,7%. |
| RF-09 | 🟡 O sistema deve sinalizar a rota sem veículo escalado como sem ocupação apurável, em vez de reportar zero por cento. | Must | Dado uma rota sem veículo, quando a ocupação for apurada, então o estado é `Sem veículo escalado` e nenhuma porcentagem é apresentada. |
| RF-10 | 🟡 O sistema deve expor o relatório de ocupação por rota em endpoint paginado e consolidado, com o total de alocados e a porcentagem junto dos dados da rota. | Should | Dado uma rota com 24 alocados, quando o relatório for solicitado, então a resposta traz a contagem de alocados e a porcentagem de aproveitamento. |
| RF-11 | 🟡 O sistema deve expor a contagem de alocados e a porcentagem de ocupação no contrato TypeScript `TransportRoute` do pacote `@sysgov/sdk`. | Should | Dado o pacote publicado, quando o cliente tipar o retorno do endpoint de rotas, então o campo de porcentagem de ocupação é reconhecido pelo compilador. |

### 6.2 Fluxo Principal (Happy Path)

1. O técnico autorizado abre o painel de ocupação do ano letivo corrente.
2. O sistema apura, para cada rota, a contagem de alocados ativos e a capacidade do veículo escalado.
3. O sistema classifica a ocupação na faixa correspondente e apresenta o rótulo e a porcentagem.
4. O técnico seleciona uma rota em superlotação e abre o relatório de alocados.
5. O sistema mostra os estudantes, os pontos de embarque e a extensão da rota.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Rota no limite da capacidade:**
1. O painel apresenta a rota na faixa de limite, entre 81% e 100%.
2. O técnico decide ajustar a escala e redistribui estudantes entre rotas.
3. A ocupação é recalculada após a nova alocação.

**Fluxo Alternativo B — Conferência do PNATE:**
1. O gestor abre o relatório de transporte rural e escolhe a escola.
2. O sistema apresenta o total de estudantes transportados em área rural e a extensão não pavimentada das rotas.
3. O gestor confere o número com o registro do Censo Escolar.

**Fluxo Alternativo C — Comparação de tempos de deslocamento:**
1. O gestor consulta o tempo médio de deslocamento do ano letivo anterior e do ano corrente.
2. O sistema apresenta os dois valores e a variação percentual.
3. A variação alimenta a meta de redução de 15% do projeto.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | P95 < 500 ms no relatório de ocupação por rota | Apuração sobre índice por rota e por tenant |
| RNF-02 | Performance | P95 < 2 s no relatório de transporte rural por escola | Agregação sobre o ano letivo |
| RNF-03 | Isolamento multi-tenant | 100% das consultas filtradas por `tenant_id` | Nenhum total de outro município na resposta |
| RNF-04 | Segurança | Permissão `transport.occupancy.read` | RBAC unificado do SYSGOV |
| RNF-05 | Precisão numérica | Porcentagem com uma casa decimal e capacidade em número inteiro | Arredondamento explícito e documentado |
| RNF-06 | Consistência | Contagem de alocados considera apenas alocações ativas na data corrente | Regra única entre painel e relatório |

---

## 8. Design e Interface

**Componentes afetados:** painel de lotação por turno, painel de ocupação por rota, relatório de transporte rural por escola, relatório de tempos de deslocamento.

**Comportamento esperado:**
🟡 O painel de lotação mostra uma barra de progresso por rota, com faixa verde até 80%, amarela entre 81% e 100% e vermelha acima de 100%, sempre acompanhada do rótulo textual e do percentual. Cada linha da tabela exibe o nome da rota, o turno, a escola, o total de alocados, a capacidade e a faixa. O relatório de transporte rural por escola exibe o total de estudantes, a extensão não pavimentada e o número de rotas. O relatório de deslocamento exibe o tempo médio atual, o tempo médio de referência e a variação percentual.

**Estados da UI:**
- Estado vazio: 🟡 mensagem informando que não há rotas ativas no ano letivo e no turno selecionados.
- Estado de carregamento: 🟡 indicador sobre o painel enquanto a apuração é obtida.
- Estado de erro: 🟡 faixa de erro com ação de tentar novamente quando a API falha.
- Estado de sucesso: 🟡 painel preenchido com as faixas e os totais de cada rota.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
educa_transport_occupancy (projeção de leitura) {
  tenant_id: UUID             // obrigatório
  route_id: UUID              // referência a educa_transport_routes
  academic_year: int
  shift: string
  allocated_count: int        // alocações ativas
  vehicle_capacity: int       // capacidade do veículo escalado
  utilization_percentage: numeric(5,1)
  occupancy_band: string      // regular, limite ou superlotacao
  rural_students_count: int
  km_unpaved: numeric(8,2)
  estimated_travel_minutes: int
}
```

**Migrações necessárias:** 🟡 Não — a apuração é derivada das tabelas de rota, veículo e alocação, sem nova carga. A projeção é recalculável a partir dos dados de origem.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|-------------------------|
| Componente de rotas e itinerários | Obrigatória | Sem rota não há o que apurar |
| Componente de frota de veículos | Obrigatória | Sem capacidade declarada não há porcentagem de ocupação |
| Componente de alocação de estudantes | Obrigatória | Sem alocação o total de alocados fica zerado |
| Componente de Censo Escolar | Obrigatória | O total de transporte rural não é conferido contra o Registro 60 |
| Auditoria do SYSGOV | Obrigatória | A escrita é recusada com erro explícito |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Rota sem veículo escalado | Rota criada sem veículo vinculado | 🟡 O estado é `Sem veículo escalado`, nenhuma porcentagem é apresentada e a rota fica fora das faixas |
| EC-02: Capacidade igual a zero em dado herdado | Veículo migrado com lotação zerada | 🟡 A apuração é tratada como capacidade não apurável, com mensagem que aponta o cadastro do veículo |
| EC-03: Alocação encerrada no meio do ano | Alocação com `end_date` anterior à data corrente | 🟡 A alocação não entra na contagem de alocados e permanece disponível no relatório histórico |
| EC-04: Arredondamento na faixa de 100% | Ocupação real de 100,4% | 🟡 O valor apresentado é 100,4% e a faixa apurada é a de superlotação, com o excesso de vagas exibido |
| EC-05: Turno sem nenhuma alocação | Rota recém-criada sem estudantes | 🟡 A contagem é zero e a ocupação é 0,0%, sem disparo de alerta |
| EC-06: Falha de timeout na agregação do relatório por escola | Indisponibilidade do serviço de matrículas durante a agregação | 🟡 A requisição falha com erro 503 e mensagem de indisponibilidade, sem apresentar total parcial |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 obrigatória, com resolução de tenant pelo contexto autenticado.
- **Autorização:** 🟡 `transport.occupancy.read` para consulta dos painéis e relatórios.
- **Dados sensíveis:** 🟡 os relatórios agregam dado de transporte de estudantes por escola e por empresa, com acesso restrito ao perfil de gestão de transporte.
- **Auditoria:** 🟡 registro de ator e data na geração de relatórios de transporte rural, por constituírem insumo de repasse de recurso público.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 o componente nasce somente leitura, com a apuração habilitada por tenant depois da conferência da carga de rotas e alocações.
- **Como reverter (rollback):** 🟡 desabilitar a apuração e os painéis, sem impacto sobre os dados de rota e de alocação, que permanecem inalterados.
- **Monitoramento pós-deploy:** 🟡 observar a distribuição de faixas de ocupação, a contagem de rotas em superlotação e o tempo de resposta do relatório por escola nas primeiras 48 horas.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | ⚠️ ABERTO: A redução de 15% no tempo médio de deslocamento é medida em relação a qual período de referência do município? | Alto | Produto | Antes do início da implementação |
| OQ-02 | ⚠️ ABERTO: O tempo médio de deslocamento usa os horários estimados de passagem ou a soma das extensões com a velocidade média da malha viária? | Alto | Produto | Antes do início da implementação |
| OQ-03 | ⚠️ ABERTO: A superlotação é contabilizada por rota e turno ou também consolidada por dia da semana, com totais de segunda a sexta? | Médio | Produto | 30 dias |
| OQ-04 | ⚠️ ABERTO: A extensão não pavimentada entra no relatório de PNATE como extensão de rota ou como extensão efetivamente percorrida por estudantes da área rural? | Médio | Jurídico | 30 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Apuração derivada, sem tabela nova de origem | Tabela materializada de ocupação | A ocupação é sempre recalculável e o dado derivado não pode divergir da origem |
| Superlotação como faixa apurada e não apenas como alerta | Apenas exibição de cor | A faixa precisa ser detectável por consulta e por relatório, sem depender de leitura visual |
| Contagem de alocados por alocação ativa na data corrente | Contagem histórica acumulada | Alocação encerrada não representa passageiro em operação |

---

## Apêndice

### Referências
- `_reversa_sdd/Transport/legacy-mapping.md` — seções 4.3, 5 e 6.
- CTB, Lei nº 9.503/1997, arts. 136 a 139 — vedação à superlotação em transporte escolar.
- PNATE, FNDE, Lei nº 10.880/2004 — repasse por aluno transportado em área rural.
- PRD `_reversa_sdd/prd.md` — meta de redução de 15% no tempo médio de deslocamento.

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-10-20 | Reversa | Criação inicial a partir do PRD e do mapeamento do módulo Transport |

---

## Relatório de Avaliação

Avaliação automática de qualidade desta spec, executada por `reversa-spec-sdd/scripts/spec_scorer.py`.

```text
============================================================
  SPEC QUALITY REPORT
  Arquivo: D:\SYSTRAT\I-Educar\_reversa_sdd\sdd\capacidade-lotacao-rotas.md
============================================================

  SCORE TOTAL: 100.0/100  —  ⭐ Excelente — Pronta para implementação

  BREAKDOWN POR DIMENSÃO:
  Dimensão             Score      Peso     Contribuição
  --------------------------------------------------
  Completude           100%       30%     30.0/pt
  Testabilidade        100%       25%     25.0/pt
  Clareza              100%       20%     20.0/pt
  Escopo               100%       15%     15.0/pt
  Edge Cases           100%       10%     10.0/pt

  ✅ PONTOS FORTES:
     ✅ Seção 1 (Resumo) presente e preenchida
     ✅ Seção 2 (Contexto) presente e preenchida
     ✅ Seção 3 (Goals) presente e preenchida
     ✅ Seção 4 (Non-Goals) presente e preenchida
     ✅ Seção 5 (Usuários) presente e preenchida

============================================================
```
