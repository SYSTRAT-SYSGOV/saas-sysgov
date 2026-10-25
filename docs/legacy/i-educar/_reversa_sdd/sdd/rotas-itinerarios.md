# Spec: Rotas e Itinerários de Transporte Escolar

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** Reversa (Time de Descoberta + Code New Project)
**Data:** 2026-10-20
**Reviewers:** N/A

> Todos os itens desta spec carregam o selo 🟡 PLANEJADO. Fatos extraídos do legado estão referenciados no Apêndice com a identificação da origem.

---

## 1. Resumo

🟡 O componente de rotas e itinerários registra as linhas de transporte escolar que atendem a uma escola em determinado ano letivo e turno, com extensão pavimentada e não pavimentada, ordem de paradas, veículo e condutor escalationados. No SYSGOV, ele substitui `modules.rota_transporte_escolar` por `educa_transport_routes` e `educa_transport_route_stops`, multi-tenant, e é a unidade de cálculo da ocupação de transporte escolar.

---

## 2. Contexto e Motivação

**Problema:**
A rota legada do i-Educar guarda extensão pavimentada e não pavimentada, turno e ano, e é ligada a uma escola de destino e a uma empresa por busca. Ela não tem ordem de paradas estruturada, o que impede a ordenação do itinerário, o cálculo de tempo de deslocamento e a verificação de lotação por linha. O modelo legado também aceita o vínculo de uma empresa com contrato vencido, sem qualquer validação no momento da escala.

**Evidências:**
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 2.5, que descreve `educa_transport_routes` com `academic_year`, `shift`, `route_type`, `km_paved`, `km_unpaved`, `total_km` gerado e horários de partida, chegada e retorno.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 2.6, que descreve `educa_transport_route_stops` com `sequence_order` e índice único por rota e ordem.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 4.3, que prevê `GET /api/v1/educa/transport/routes` com filtros por ano letivo, escola e turno, e `POST` para criação do itinerário com associação de paradas ordenadas.
- PRD `_reversa_sdd/prd.md`: meta de redução de 15% no tempo médio de deslocamento das rotas escolares, o que depende de itinerário estruturado e de extensão declarada por trecho.

**Por que agora:**
A rota é o agregado central do módulo: a ocupação, a alocação de estudantes e o Registro 60 do Censo Escolar se referenciam a ela. Criar a rota no modelo novo com ordem de paradas desde o início evita a segunda passagem de carga sobre os itinerários.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Registrar rotas por ano letivo, turno, escola de destino e empresa, com extensão declarada.
- [ ] 🟡 G-02: Garantir ordem determinística e única de paradas em cada rota.
- [ ] 🟡 G-03: Impedir a escala de rota com empresa fora da vigência contratual, veículo com vistoria vencida ou condutor com credencial vencida.
- [ ] 🟡 G-04: Disponibilizar a listagem de rotas por ano letivo, escola e turno com o total de estudantes alocados.
- [ ] 🟡 G-05: Garantir 100% de fidelidade na migração das rotas do i-Educar, com a ordem das paradas reconstruída.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Rotas migradas com extensão preservada | 0% | 100% | Fim do cutover |
| Rotas ativas sem ordem de paradas definida | Sem medição | 0% | 60 dias após o cutover |
| Rotas ativas com empresa fora da vigência | Sem medição | 0% | Contínuo após o cutover |
| Tempo de resposta P95 da listagem de rotas | Sem medição | < 300 ms | 30 dias após o cutover |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá motor de otimização de rotas que sugira reordenação de paradas com base em tempo de deslocamento; a spec define a ordem, e a sugestão de otimização é um componente futuro.
- NG-02: Não haverá controle de ponto de partida e chegada em tempo real, nem rastreamento por GPS do veículo em operação.
- NG-03: Não haverá emissão de ordens de serviço ou escala de condutores por dia da semana dentro da rota.
- NG-04: Não haverá dimensionamento de frota por rota, nem projeção de custo de viagem por quilômetro.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Técnico de transporte, que monta o itinerário do ano letivo, define a ordem das paradas e escala veículo e condutor.

**Usuário secundário:** 🟡 Coordenador escolar, que consulta as rotas que atendem à sua escola no turno vigente e os alunos alocados em cada linha.

**Jornada atual (sem a feature):**
1. O técnico cria a rota informando extensão e turno.
2. O sistema não ordena paradas, e a ordem de embarque fica no conhecimento do usuário.
3. A empresa é vinculada por busca, sem conferência de vigência de contrato.
4. A listagem não traz o total de estudantes por linha.

**Jornada futura (com a feature):**
1. O técnico cria a rota com escola, ano letivo, turno, empresa e extensão.
2. O sistema recusa a criação quando o contrato da empresa está fora da vigência.
3. O técnico adiciona as paradas com ordem e horário estimado, e o sistema garante ordem única.
4. O técnico escala veículo e condutor, com validação de vistoria e de credencial.
5. A listagem mostra o total de alocados e a ocupação de cada linha.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve permitir criar rota no tenant corrente com escola de destino, empresa, ano letivo e turno obrigatórios. | Must | Dado um payload com escola, empresa, ano letivo e turno válidos, quando o usuário enviar, então a rota é criada com `tenant_id` do contexto. |
| RF-02 | 🟡 O sistema deve validar que o turno informado pertence ao conjunto `morning`, `afternoon`, `night` ou `full_day`. | Must | Dado um turno fora do conjunto, quando a validação rodar, então a requisição é rejeitada com a relação dos turnos aceitos. |
| RF-03 | 🟡 O sistema deve recusar extensão pavimentada ou não pavimentada negativa e calcular a extensão total pela soma das duas. | Must | Dado um payload com `km_paved` igual a `12.50` e `km_unpaved` igual a `7.50`, quando a rota for salva, então `total_km` vale `20.00`. |
| RF-04 | 🟡 O sistema deve permitir associar paradas à rota com ordem de passagem e horários estimados de embarque e desembarque. | Must | Dado uma rota e um ponto de parada, quando o usuário informar a ordem `3`, então a associação é criada com `sequence_order` igual a `3`. |
| RF-05 | 🟡 O sistema deve garantir ordem única de paradas dentro da rota, recusando a duplicidade da posição. | Must | Dado uma rota com a ordem `3` ocupada, quando o usuário tentar usar a ordem `3` para outra parada, então a requisição é rejeitada com indicação da posição em uso. |
| RF-06 | 🟡 O sistema deve permitir reordenar as paradas da rota sem duplicar posições e sem perder as paradas vinculadas. | Must | Dado uma rota com as paradas nas ordens `1`, `2` e `3`, quando o usuário reordenar para `3`, `1` e `2`, então as três paradas permanecem vinculadas com as novas ordens. |
| RF-07 | 🟡 O sistema deve permitir vincular veículo à rota, validando a vistoria vigente e a compatibilidade com o tipo de rota. | Must | Dado um veículo com vistoria vencida, quando o usuário tentar vinculá-lo, então a requisição é rejeitada com a data de vencimento da vistoria. |
| RF-08 | 🟡 O sistema deve permitir vincular condutor à rota, validando as credenciais do CTB e o vínculo do condutor com a empresa da rota. | Must | Dado um condutor de outra empresa, quando o usuário tentar vinculá-lo, então a requisição é rejeitada com a indicação da empresa de origem do condutor. |
| RF-09 | 🟡 O sistema deve recusar a criação ou a ativação de rota cuja empresa esteja com contrato fora da vigência. | Must | Dado uma empresa com contrato encerrado, quando o usuário tentar criar a rota, então a requisição é rejeitada com as datas de vigência do contrato. |
| RF-10 | 🟡 O sistema deve listar rotas do tenant com filtros por ano letivo, escola, turno e empresa, com paginação. | Must | Dado um tenant com 35 rotas, quando o usuário filtrar por ano letivo e escola, então a resposta traz somente as rotas do filtro, limitado ao tamanho de página. |
| RF-11 | 🟡 O sistema deve permitir desativar rota com motivo obrigatório, preservando as alocações de estudantes vinculadas. | Should | Dado uma rota ativa com estudantes alocados, quando o usuário informar o motivo, então `is_active` passa a `false` e as alocações são preservadas para consulta histórica. |
| RF-12 | 🟡 O sistema deve expor a rota em contrato TypeScript `TransportRoute` no pacote `@sysgov/sdk`. | Should | Dado o pacote publicado, quando o cliente tipar o retorno do endpoint de rotas, então os campos de extensão e de contagem de alocados são reconhecidos pelo compilador. |

### 6.2 Fluxo Principal (Happy Path)

1. O técnico autorizado abre a tela de rotas e inicia uma nova rota do ano letivo corrente.
2. O usuário informa escola de destino, empresa, turno, tipo de rota e as extensões pavimentada e não pavimentada.
3. O sistema valida a vigência do contrato da empresa e grava a rota ativa.
4. O usuário adiciona os pontos de parada com a ordem de passagem e o horário estimado de embarque.
5. O usuário escala o veículo e o condutor, e o sistema valida vistoria e credenciais.
6. O sistema exibe a confirmação com a extensão total e a quantidade de paradas.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Reordenação do itinerário:**
1. O técnico abre a rota e reorganiza a ordem das paradas.
2. O sistema recalcula as posições mantendo a unicidade e preserva os horários estimados associados a cada parada.
3. O desenho do itinerário passa a refletir a nova ordem.

**Fluxo Alternativo B — Troca de veículo no início do ano letivo:**
1. O técnico desativa a rota do ano anterior com motivo de encerramento.
2. O técnico cria a rota do novo ano com os mesmos pontos, na nova ordem.
3. As alocações de estudantes são reprocessadas pelo componente de alocação.

**Fluxo Alternativo C — Rota de frota própria:**
1. O técnico cria a rota apontando para a empresa de frota municipal própria.
2. O sistema aplica as mesmas validações de contrato, vistoria e credencial.
3. Nenhuma regra adicional é aplicada.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | P95 < 300 ms na listagem paginada | Índices por `tenant_id`, `school_id` e `academic_year` |
| RNF-02 | Isolamento multi-tenant | 100% das consultas filtradas por `tenant_id` | Associação de parada sempre por tenant |
| RNF-03 | Segurança | Permissões `transport.routes.read` e `transport.routes.write` | RBAC unificado do SYSGOV |
| RNF-04 | Auditoria | Ator, data e valores anteriores e posteriores em toda alteração | Inclui reordenação de paradas e escala |
| RNF-05 | Integridade referencial | Exclusão física vedada; desativação lógica com `deleted_at` | Preserva o histórico de alocações |
| RNF-06 | Determinismo | Ordem das paradas única dentro da rota | Índice único por rota e posição |

---

## 8. Design e Interface

**Componentes afetados:** tela de listagem de rotas, formulário de rota, editor de itinerário com ordenação, painel de ocupação por linha.

**Comportamento esperado:**
🟡 O formulário de rota exibe escola de destino, empresa, ano letivo, turno, tipo de rota, extensão pavimentada, extensão não pavimentada, extensão total calculada e observações. O editor de itinerário lista as paradas com reordenação por posição e campo de horário estimado de embarque e desembarque. A violação de ordem única é comunicada em linha, com a posição já ocupada. O painel de ocupação mostra a contagem de alocados e a porcentagem frente à capacidade do veículo escalado.

**Estados da UI:**
- Estado vazio: 🟡 mensagem informando que nenhuma rota foi cadastrada no filtro vigente, com ação de criar a primeira rota.
- Estado de carregamento: 🟡 indicador na listagem e no editor de itinerário enquanto os dados são obtidos.
- Estado de erro: 🟡 mensagem por campo inválido no formulário e faixa de erro com ação de tentar novamente quando a API falha.
- Estado de sucesso: 🟡 confirmação com o identificador da rota, a extensão total e a quantidade de paradas.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
educa_transport_routes {
  id: UUID                   // chave primária
  tenant_id: UUID            // obrigatório
  school_id: UUID            // obrigatório, escola de destino
  company_id: UUID           // referência a educa_transport_companies
  vehicle_id: UUID           // referência a educa_transport_vehicles
  driver_id: UUID            // referência a educa_transport_drivers
  name: string               // obrigatório, até 255 caracteres
  academic_year: int         // obrigatório
  shift: string              // morning, afternoon, night ou full_day
  route_type: string         // rural, urban ou mixed
  km_paved: numeric          // 8 casas, 2 decimais, padrão zero
  km_unpaved: numeric        // 8 casas, 2 decimais, padrão zero
  total_km: numeric          // gerado pela soma das duas extensões
  departure_time: time
  arrival_time: time
  return_departure_time: time
  is_outsourced: boolean     // padrão false
  is_active: boolean         // padrão true
  notes: text
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz
}

educa_transport_route_stops {
  id: UUID                   // chave primária
  tenant_id: UUID            // obrigatório
  route_id: UUID             // referência a educa_transport_routes
  stop_id: UUID              // referência a educa_transport_stops
  sequence_order: int        // posição única dentro da rota
  estimated_pickup_time: time
  estimated_dropoff_time: time
  created_at: timestamptz
}
```

**Migrações necessárias:** 🟡 Sim — carga inicial a partir de `modules.rota_transporte_escolar`, com conversão das extensões e reconstrução da ordem das paradas a partir dos vínculos legados.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|-------------------------|
| Módulo de escolas | Obrigatória | A rota não pode ser criada sem escola de destino |
| Componente de empresas de transporte | Obrigatória | Bloqueia o vínculo de empresa e a validação de vigência |
| Componente de frota de veículos | Obrigatória | Bloqueia a escala de veículo e a validação de vistoria |
| Componente de condutores | Obrigatória | Bloqueia a escala de condutor e a validação de credencial |
| Componente de pontos de parada | Obrigatória | O itinerário não pode ser montado |
| Componente de capacidade e lotação | Obrigatória | A ocupação exibida na rota fica indisponível |
| Auditoria do SYSGOV | Obrigatória | A escrita é recusada com erro explícito |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Ordem de parada já ocupada | Nova parada com `sequence_order` igual ao de uma parada existente | 🟡 A requisição é rejeitada com a posição em uso e o identificador da parada que a ocupa |
| EC-02: Rota criada sem nenhuma parada | Rota salva sem associação de pontos | 🟡 A rota é criada e marcada como itinerário pendente na listagem, com aviso de que a ordem de embarque ainda não existe |
| EC-03: Contrato da empresa fora da vigência | Empresa com `contract_end_date` anterior à data de início da rota | 🟡 A criação ou a ativação da rota é recusada com as datas de vigência do contrato |
| EC-04: Condutor de empresa diferente da rota | Condutor vinculado a outra empresa | 🟡 A escalação é recusada com a indicação da empresa de origem do condutor |
| EC-05: Extensão negativa | Payload com `km_unpaved` igual a menos cinco | 🟡 A requisição é rejeitada com erro no campo de extensão |
| EC-06: Turno fora do conjunto | Turno informado como `vespertino` | 🟡 A requisição é rejeitada com a relação dos turnos aceitos e a sugestão de `afternoon` |
| EC-07: Falha de timeout na consulta da escola | Serviço de escolas indisponível no cadastro da rota | 🟡 A requisição falha com erro 503 e mensagem de indisponibilidade, sem gravar rota parcial |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 obrigatória, com resolução de tenant pelo contexto autenticado.
- **Autorização:** 🟡 `transport.routes.read` para consulta e `transport.routes.write` para criação, edição, escalação e desativação.
- **Dados sensíveis:** 🟡 a rota expõe a relação entre escola, empresa e turnos, com impacto em dados de Operação do serviço público.
- **Auditoria:** 🟡 registro de ator, data e valores anteriores e posteriores em criação, edição, reordenação, escalação e desativação.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 habilitação por tenant, com a carga das rotas legadas executada antes da ativação do componente de alocação de estudantes.
- **Como reverter (rollback):** 🟡 desabilitar o componente no tenant e voltar a ler `modules.rota_transporte_escolar`, preservando as tabelas novas para reanálise.
- **Monitoramento pós-deploy:** 🟡 acompanhar contagem de rotas por tenant, divergência entre o total legado e o total migrado, rotas sem itinerário e bloqueios por contrato, vistoria e credencial.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | ⚠️ ABERTO: O tempo médio de deslocamento usado na meta de redução de 15% é apurado a partir dos horários estimados de passagem ou de dados de execução real de cada turno? | Alto | Produto | Antes do início da implementação |
| OQ-02 | ⚠️ ABERTO: A mesma rota pode ser compartilhada por mais de uma escola de destino, e como isso aparece no itinerário? | Alto | Produto | Antes do início da implementação |
| OQ-03 | ⚠️ ABERTO: O turno `full_day` cobre o estudante que permanece na escola em período integral e recebe em ponto diferente ao final do dia? | Médio | Produto | 30 dias |
| OQ-04 | ⚠️ ABERTO: A extensão não pavimentada precisa ser discriminada por trecho da rota, e não apenas no total, para o cálculo do repasse do PNATE? | Médio | Jurídico | 30 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Ordem das paradas em tabela própria com índice único | Paradas em campo serializado na rota | Garante unicidade de posição, permite reordenação e preserva o histórico de vínculo |
| Extensão total como coluna gerada | Extensão total declarada pelo usuário | Elimina divergência entre soma e valor informado |
| Validação de contrato, vistoria e credencial na escalação | Validação apenas na exibição | Só a recusa no momento do vínculo impede a operação irregular |

---

## Apêndice

### Referências
- `_reversa_sdd/Transport/legacy-mapping.md` — seções 2.5, 2.6, 3 e 4.3.
- `_reversa_sdd/adrs/001-multi-tenancy-schema-isolation.md` — isolamento por tenant.
- `_reversa_sdd/prd.md` — meta de redução de 15% no tempo médio de deslocamento.
- Legado: `modules.rota_transporte_escolar`, `public/vendor/legacy/TransporteEscolar/Assets/Javascripts/Rota.js`, `ieducar/lib/Portabilis/View/Helper/DynamicInput/Rotas.php`.

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
  Arquivo: D:\SYSTRAT\I-Educar\_reversa_sdd\sdd\rotas-itinerarios.md
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
