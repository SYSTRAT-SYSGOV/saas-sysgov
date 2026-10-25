# Spec: Alocação de Estudantes ao Transporte Escolar

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** Reversa (Time de Descoberta + Code New Project)
**Data:** 2026-10-20
**Reviewers:** N/A

> Todos os itens desta spec carregam o selo 🟡 PLANEJADO. Fatos extraídos do legado estão referenciados no Apêndice com a identificação da origem.

---

## 1. Resumo

🟡 O componente de alocação de estudantes vincula o estudante matriculado ao transporte escolar oficial, com a rota, o ponto de parada, o turno, a indicação de uso de transporte rural, o poder público responsável e a indicação de necessidade especial. No SYSGOV, ele substitui `modules.pessoa_transporte` por `educa_transport_students`, multi-tenant, e alimenta o cálculo de ocupação e o Registro 60 do Censo Escolar.

---

## 2. Contexto e Motivação

**Problema:**
A pessoa de transporte do i-Educar liga o estudante à rota e ao ponto de parada, com a marcação de transporte rural usada pelo Censo Escolar. O vínculo legado não é validado: aceita estudante sem matrícula vigente, aceita ponto que não pertence à rota, aceita a alocação em turno diferente do da rota e não impede a ultrapassagem da lotação do veículo. Como a alocação é a base do repasse de recursos do PNATE, que considera o número de alunos transportados em áreas rurais registrados no Censo Escolar, cada inconsistência aqui tem efeito financeiro além do pedagógico.

**Evidências:**
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 2.7, que descreve `educa_transport_students` com `student_id`, `registration_id`, `route_id`, `stop_id`, `uses_rural_transport`, `public_transport_jurisdiction`, `special_needs_transport`, `start_date` e `end_date`.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 3, que mapeia `pmieducar.aluno.utiliza_transporte_rural` para `uses_rural_transport` com conversão de `1` para verdadeiro e `0` para falso.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 4.4, que prevê `POST /api/v1/educa/transport/routes/{routeId}/students` e `DELETE` para desvincular.
- PNATE, FNDE, Lei nº 10.880/2004, e Registro 60 do Censo Escolar, que exigem a declaração de uso de transporte escolar público e a identificação do poder público responsável.

**Por que agora:**
A alocação é o único ponto do módulo em que o modelo legado acumula divergências sem validação. Corrigir isso no modelo novo é barato, e corrigir depois da migração exigiria reprocessar histórico de alocações.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Alocar estudante matriculado a uma rota, com ponto de parada e turno coerentes.
- [ ] 🟡 G-02: Impedir alocação em turno, ano letivo ou rota divergentes dos dados de matrícula.
- [ ] 🟡 G-03: Impedir a alocação que exceda a capacidade do veículo escalado na rota.
- [ ] 🟡 G-04: Garantir que estudante com necessidade especial só seja alocado a rota com veículo acessível.
- [ ] 🟡 G-05: Garantir 100% de fidelidade na migração das alocações do i-Educar, com marcação das divergências encontradas.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Alocações migradas com vínculo de matrícula preservado | 0% | 100% | Fim do cutover |
| Alocações divergentes marcadas na carga | 0% | 100% | Fim do cutover |
| Alocações em turno divergente da rota | Sem medição | 0% | 60 dias após o cutover |
| Rotas com ocupação acima de 100% | Sem medição | 0% | 60 dias após o cutover |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá controle de presença e de embarque effective do estudante a cada dia; a alocação descreve o vínculo de transporte, não a frequência.
- NG-02: Não haverá integração com o sistema de gratuidade ou de benefício de transporte estudantil.
- NG-03: Não haverá reserva de lugar individual por ordem de embarque dentro do veículo.
- NG-04: Não haverá alocação automática de estudantes a rotas; a definição do vínculo é feita pelo gestor.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Técnico de transporte, que aloca os estudantes às rotas e mantém a relação durante o ano letivo.

**Usuário secundário:** 🟡 Escola e família, que consultam a rota e o ponto de embarque do estudante.

**Jornada atual (sem a feature):**
1. O técnico busca o estudante e o adiciona à rota pela busca de ponto.
2. O sistema aceita o vínculo sem conferir matrícula, turno ou lotação.
3. A divergência aparece apenas na conferência manual da planilha de controle.
4. O estudante com necessidade especial pode ficar alocado a rota sem veículo acessível.

**Jornada futura (com a feature):**
1. O técnico aloca o estudante a uma rota, escolhendo o ponto de parada da rota.
2. O sistema valida matrícula vigente, turno, ano letivo e lotação, e recusa o vínculo divergente.
3. O sistema exige veículo acessível quando o estudante tem necessidade especial registrada.
4. A listagem da rota mostra os alocados com ponto de embarque e situação de transporte rural.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve permitir alocar um estudante à rota, com matrícula, escola e turno da alocação informados. | Must | Dado um estudante com matrícula vigente, quando o usuário enviar a alocação, então o registro é criado com `student_id`, `registration_id`, `route_id`, `school_id` e `shift` preenchidos. |
| RF-02 | 🟡 O sistema deve recusar a alocação de estudante sem matrícula vigente no ano letivo da rota. | Must | Dado um estudante com matrícula encerrada, quando o usuário tentar alocá-lo, então a requisição é rejeitada com a indicação do encerramento da matrícula. |
| RF-03 | 🟡 O sistema deve validar que o turno informado na alocação é igual ao turno da rota. | Must | Dado uma rota de turno da manhã, quando o usuário alocar com turno da tarde, então a requisição é rejeitada com os dois turnos em conflito. |
| RF-04 | 🟡 O sistema deve exigir que o ponto de parada informado pertença à rota. | Must | Dado um ponto que não está no itinerário da rota, quando o usuário tentar usá-lo, então a requisição é rejeitada com a indicação do itinerário da rota. |
| RF-05 | 🟡 O sistema deve registrar a data de início da alocação como obrigatória e a data de término como opcional. | Must | Dado um payload sem data de início, quando a requisição for validada, então ela é rejeitada com erro no campo de data de início. |
| RF-06 | 🟡 O sistema deve registrar a indicação de uso de transporte escolar rural, usada no repasse do PNATE e no Registro 60. | Must | Dado um payload com a indicação de transporte rural, quando a alocação for salva, então o valor é persistido e exibido na listagem da rota. |
| RF-07 | 🟡 O sistema deve validar que o poder público responsável informado pertence ao conjunto de valores do Censo Escolar. | Must | Dado um valor de poder público responsável fora do conjunto, quando a requisição for validada, então ela é rejeitada com a relação dos valores aceitos. |
| RF-08 | 🟡 O sistema deve recusar a alocação de estudante com necessidade especial a rota cujo veículo não é acessível. | Must | Dado um estudante com necessidade especial e uma rota com veículo não acessível, quando o usuário tentar alocá-lo, então a requisição é recusada com a indicação da falta de acessibilidade. |
| RF-09 | 🟡 O sistema deve recusar a alocação que exceda a capacidade do veículo escalado na rota. | Must | Dado um veículo com 30 assentos e 30 estudantes alocados, quando o usuário alocar mais um, então a requisição é recusada com o total, a capacidade e o excesso de vagas. |
| RF-10 | 🟡 O sistema deve permitir desvincular o estudante da rota, preservando o histórico da alocação encerrada. | Must | Dado um estudante alocado, quando o usuário desvincular, então a alocação passa a inativa com a data de término e permanece consultável no histórico. |
| RF-11 | 🟡 O sistema deve listar as alocações de uma rota com nome do estudante, ponto de embarque, turno e indicação de transporte rural. | Must | Dado uma rota com 12 alocados, quando o usuário consultar a listagem da rota, então as 12 alocações são devolvidas com os campos informados. |
| RF-12 | 🟡 O sistema deve expor a alocação em contrato TypeScript `TransportStudentAllocation` no pacote `@sysgov/sdk`. | Should | Dado o pacote publicado, quando o cliente tipar o retorno do endpoint de alocações, então os campos de rota, ponto e turno são reconhecidos pelo compilador. |

### 6.2 Fluxo Principal (Happy Path)

1. O técnico autorizado abre a rota e inicia uma nova alocação.
2. O usuário seleciona o estudante matriculado e o ponto de parada do itinerário.
3. O sistema confere matrícula, ano letivo, turno, necessidade especial e lotação da rota.
4. O usuário confirma a indicação de transporte rural e o poder público responsável.
5. O sistema grava a alocação ativa e atualiza a contagem de ocupados na rota.
6. Resultado: o estudante passa a constar na listagem da rota com o ponto de embarque.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Alocação de estudante com necessidade especial:**
1. O técnico seleciona o estudante e informa a necessidade especial com a observação de acompanhamento.
2. O sistema exige que a rota tenha veículo acessível e recusa a escolha de rota sem acessibilidade.
3. A alocação é gravada com a indicação de necessidade especial e a observação.

**Fluxo Alternativo B — Desvinculação no fim do ano letivo:**
1. O técnico desvincula o estudante da rota.
2. O sistema encerra a alocação com a data de término e mantém o registro para a conferência do Censo do ano anterior.

**Fluxo Alternativo C — Alocação de estudante transportado rural:**
1. O técnico aloca o estudante e confirma a indicação de transporte rural.
2. O sistema registra a indicação e a torna visível no relatório de transporte rural por escola.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | P95 < 300 ms na listagem de alocados de uma rota | Índice por `tenant_id` e por `route_id` |
| RNF-02 | Isolamento multi-tenant | 100% das consultas filtradas por `tenant_id` | Alocação legada de outro tenant é rejeitada |
| RNF-03 | Segurança | Permissões `transport.students.read` e `transport.students.write` | RBAC unificado do SYSGOV |
| RNF-04 | Auditoria | Ator, data e valores anteriores e posteriores em alocação e desvinculação | Vincula a matrícula como evidência do vínculo |
| RNF-05 | Integridade referencial | Exclusão de matrícula mantém a alocação para histórico | A exclusão lógica impede perda de dado do Censo |
| RNF-06 | Consistência de concorrência | Duas alocações simultâneas na mesma rota não excedem a capacidade | Verificação transacional no ato da alocação |

---

## 8. Design e Interface

**Componentes afetados:** tela de listagem de alocados da rota, formulário de alocação, seletor de estudante, painel de ocupação com barra de progresso.

**Comportamento esperado:**
🟡 O formulário de alocação exibe o estudante com a matrícula vigente indicada, o ponto de parada em lista ordenada do itinerário, o turno herdado da rota em campo somente leitura, a indicação de transporte rural, o poder público responsável e o campo de necessidade especial com observação. A capacidade restante da rota aparece durante o preenchimento. A alocação de estudante com necessidade especial exibe aviso quando a rota selecionada não tem veículo acessível, com a opção de escolher outra rota. A listagem da rota mostra nome do estudante, ponto de embarque e rótulo de transporte rural.

**Estados da UI:**
- Estado vazio: 🟡 mensagem informando que a rota não possui estudantes alocados, com ação de iniciar a primeira alocação.
- Estado de carregamento: 🟡 indicador na listagem de alocados enquanto os dados são obtidos.
- Estado de erro: 🟡 mensagem por campo inválido no formulário e faixa de erro com ação de tentar novamente quando a API falha.
- Estado de sucesso: 🟡 confirmação com o nome do estudante e o ponto de embarque registrado.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
educa_transport_students {
  id: UUID                        // chave primária
  tenant_id: UUID                 // obrigatório
  student_id: UUID                // obrigatório, referência a educa_students
  registration_id: UUID           // obrigatório, referência a educa_registrations
  route_id: UUID                  // obrigatório, referência a educa_transport_routes
  stop_id: UUID                   // referência a educa_transport_stops
  school_id: UUID                 // obrigatório, escola do estudante
  shift: string                   // igual ao turno da rota
  uses_rural_transport: boolean   // padrão false
  public_transport_jurisdiction: int  // 1 estadual, 2 municipal, 3 compartilhado
  special_needs_transport: boolean    // padrão false
  special_needs_notes: text
  is_active: boolean              // padrão true
  start_date: date                // obrigatório
  end_date: date
  notes: text
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz
}
```

**Migrações necessárias:** 🟡 Sim — carga inicial a partir de `modules.pessoa_transporte`, com vínculo da matrícula correspondente e conversão de `pmieducar.aluno.utiliza_transporte_rural`.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|-------------------------|
| Módulo de matrículas (`educa_registrations`) | Obrigatória | Bloqueia a alocação e a validação de ano letivo e turno |
| Componente de rotas | Obrigatória | A alocação depende do itinerário e da capacidade da rota |
| Componente de pontos de parada | Obrigatória | O ponto de embarque não pode ser escolhido |
| Componente de frota de veículos | Obrigatória | A regra de acessibilidade e a capacidade não podem ser verificadas |
| Componente de Censo Escolar | Obrigatória | A indicação de transporte rural e o poder público responsável não chegam ao Registro 60 |
| Auditoria do SYSGOV | Obrigatória | A escrita é recusada com erro explícito |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Estudante sem matrícula vigente | Alocação de estudante cuja matrícula foi encerrada | 🟡 A requisição é rejeitada com a indicação do encerramento e o ano letivo da matrícula |
| EC-02: Turno divergente da rota | Alocação com turno da tarde em rota de turno da manhã | 🟡 A requisição é rejeitada com o turno da rota e o turno informado |
| EC-03: Ponto de parada fora do itinerário | Ponto que não pertence à rota | 🟡 A requisição é rejeitada com a indicação de que o ponto não está no itinerário |
| EC-04: Superlotação da rota | 31 estudantes em rota com veículo de 30 assentos | 🟡 A requisição é recusada com o total alocado, a capacidade e o excesso de vagas |
| EC-05: Necessidade especial sem veículo acessível | Estudante com necessidade especial em rota com veículo não acessível | 🟡 A requisição é recusada com a indicação de que a rota exige veículo acessível |
| EC-06: Estudante alocado em duas rotas do mesmo turno | Segunda alocação no mesmo turno com outra rota | 🟡 A requisição é recusada com a identificação da rota já vinculada, permitindo desvinculação antes da nova alocação |
| EC-07: Falha de timeout na consulta da matrícula | Serviço de matrículas indisponível durante a alocação | 🟡 A requisição falha com erro 503 e mensagem de indisponibilidade, sem gravar alocação parcial |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 obrigatória, com resolução de tenant pelo contexto autenticado.
- **Autorização:** 🟡 `transport.students.read` para consulta e `transport.students.write` para alocação e desvinculação.
- **Dados sensíveis:** 🟡 a alocação combina dado de matrícula, de endereço de ponto de embarque e de necessidade especial, exigindo o tratamento de dado pessoal do SYSGOV.
- **Auditoria:** 🟡 registro de ator, data, matrícula vinculada e valores anteriores e posteriores em alocação, desvinculação e alteração de indicação.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 habilitação por tenant, com as regras de validação ativadas em duas etapas, primeiro a conferência e a marcação de divergências e depois a recusa do vínculo inválido.
- **Como reverter (rollback):** 🟡 desativar a regra de recusa e manter o registro das divergências encontradas para correção, com retorno da leitura a `modules.pessoa_transporte`.
- **Monitoramento pós-deploy:** 🟡 acompanhar contagem de alocações por tenant, taxa de recusa por motivo, divergências de turno detectadas na carga e ocupação média das rotas.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | ⚠️ ABERTO: O poder público responsável do transporte deve ser registrado na alocação do estudante ou no cadastro da rota, uma vez que a mesma rota atende estudantes de municipalities com responsabilidades diferentes? | Alto | Produto | Antes do início da implementação |
| OQ-02 | ⚠️ ABERTO: A recusa de superlotação é bloqueante ou gera apenas alerta quando o veículo escalado é de uso compartilhado com outras rotas? | Alto | Produto | Antes do início da implementação |
| OQ-03 | ⚠️ ABERTO: A necessidade especial exige registro de acompanhante ou cuidador junto ao estudante na alocação? | Médio | Produto | 30 dias |
| OQ-04 | ⚠️ ABERTO: A alocação vale para todo o ano letivo ou admite reclassificação de turno no meio do ano, com data de início e fim próprios? | Médio | Produto | 30 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Alocação desvinculada por encerramento e não por exclusão | Exclusão física da alocação | O Censo Escolar e o PNATE consultam o número de alunos transportados de anos anteriores |
| Turno herdado da rota em campo somente leitura | Turno livre na alocação | A divergência de turno entre rota e alocação é a principal inconsistência do legado |
| Recusa da superlotação no ato da alocação | Apenas sinalização na listagem | A superlotação é infração do CTB e o alerta sem bloqueio não produz conformidade |

---

## Apêndice

### Referências
- `_reversa_sdd/Transport/legacy-mapping.md` — seções 2.7, 3, 4.4 e 6.
- PNATE, FNDE, Lei nº 10.880/2004 — repasse por aluno transportado em área rural.
- Registro 60 do Censo Escolar — declaração de transporte e poder público responsável.
- `_reversa_sdd/adrs/004-daily-attendance-and-record-audit-trail.md` — trilha de auditoria.
- Legado: `modules.pessoa_transporte`, `public/vendor/legacy/TransporteEscolar/Assets/Javascripts/Pessoatransporte.js`, `src/Modules/Educacenso/ExportRule/TransporteEscolarPublico.php`.

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
  Arquivo: D:\SYSTRAT\I-Educar\_reversa_sdd\sdd\alocacao-alunos-transporte.md
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
