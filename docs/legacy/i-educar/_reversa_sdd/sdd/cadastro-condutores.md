# Spec: Cadastro de Condutores e Conformidade CTB

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** Reversa (Time de Descoberta + Code New Project)
**Data:** 2026-10-20
**Reviewers:** N/A

> Todos os itens desta spec carregam o selo 🟡 PLANEJADO. Regras de negócio extraídas do legado e da legislação estão referenciadas no Apêndice com a identificação da origem.

---

## 1. Resumo

🟡 O componente de cadastro de condutores registra os motoristas e condutores habilitados ao transporte escolar e aplica, no momento do vínculo com rota, as exigências do Código de Trânsito Brasileiro para condutor de estudante. No SYSGOV, ele substitui `modules.motorista` por `educa_transport_drivers`, com vínculo à pessoa física do cadastro central e à empresa de transporte.

---

## 2. Contexto e Motivação

**Problema:**
O i-Educar armazena a CNH, a categoria e a empresa do motorista, porém não registra as duas credenciais que o CTB exige para direção de transporte escolar: o curso especializado do CONTRAN e o exame toxicológico regular. O modelo legado também não impede o vínculo de condutor com categoria de habilitação insuficiente para transporte de estudantes, nem verifica idade mínima. O resultado é uma frota habilitada em papel, mas não conformante na prática, com exposição do município em fiscalização de trânsito e em auditoria de recursos do PNATE.

**Evidências:**
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 2.2, que descreve `educa_transport_drivers` com `cnh_category`, `school_transport_course_certificate`, `course_expiration_date`, `toxicological_exam_date` e `toxicological_expiration_date`.
- CTB, Lei nº 9.503/1997, arts. 136 a 139: categoria D ou E, idade superior a 21 anos, ausência de infração gravíssima nos últimos 12 meses, curso especializado e exame toxicológico regular.
- PRD `_reversa_sdd/prd.md`: premissa de migração sem perda crítica e métrica de 100% de conformidade regulatória em 12 meses.

**Por que agora:**
A tabela nova já nasce com os campos de credencial, e a regra de bloqueio de vínculo é barata de implementar enquanto o módulo de rotas ainda não foi construído no alvo.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Registrar condutor com vínculo a pessoa física, empresa, CNH e categoria de habilitação.
- [ ] 🟡 G-02: Impedir o vínculo de condutor não conforme com rota, com mensagem que aponte a credencial vencida ou ausente.
- [ ] 🟡 G-03: Expor, na listagem de condutores, a situação de validade de CNH, curso do CONTRAN e exame toxicológico.
- [ ] 🟡 G-04: Alertar o gestor sobre vencimento de credencial nos 30 dias seguintes.
- [ ] 🟡 G-05: Garantir 100% de fidelidade na migração dos motoristas do i-Educar para `educa_transport_drivers`.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Condutores migrados com os três pares de data preservados | 0% | 100% | Fim do cutover |
| Condutores vinculados a rota com credencial vencida | Sem medição | 0% | Contínuo após o cutover |
| Condutores sem categoria D ou E | Sem medição | 0% | 30 dias após o cutover |
| Tempo de resposta P95 do endpoint de condutores | Sem medição | < 300 ms | 30 dias após o cutover |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá integração com o serviço do DENATRAN ou do CONTRAN para consulta automática de situação de CNH; a atualização é digitada pelo usuário.
- NG-02: Não haverá gestão de escala, jornada de trabalho ou folha de pagamento do condutor.
- NG-03: Não haverá ficha funcional completa do servidor público condutor; o componente usa apenas a pessoa do cadastro central.
- NG-04: Não haverá cálculo de multa ou-infração automática; a ocorrência de infração gravíssima é registrada pelo usuário para efeito de bloqueio.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Técnico de transporte, que cadastra condutores e mantém atualizadas as credenciais exigidas pelo CTB.

**Usuário secundário:** 🟡 Fiscal ou responsável de contrato de transporte, que consulta a situação de habilitação antes de escalar uma rota.

**Jornada atual (sem a feature):**
1. O técnico busca o motorista pelo nome e edita o registro de CNH.
2. O sistema não exibe validade, vencimento nem credencial de curso.
3. O condutor com credencial vencida continua vinculado à rota sem aviso.
4. A irregularidade é detectada apenas em vistoria externa.

**Jornada futura (com a feature):**
1. O técnico cadastra o condutor com a categoria de CNH e as credenciais do CTB.
2. O sistema valida categoria, idade e validade no momento do vínculo com a rota.
3. A listagem destaca os condutores com credencial vencendo em até 30 dias.
4. O vínculo com rota é recusado com a indicação exata da credencial faltante.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve permitir cadastrar condutor no tenant corrente com vínculo a uma pessoa física e a uma empresa de transporte ativa. | Must | Dado uma pessoa e uma empresa ativa do mesmo tenant, quando o usuário enviar o payload de cadastro, então o condutor é criado com `person_id` e `company_id` preenchidos. |
| RF-02 | 🟡 O sistema deve validar que a categoria da CNH informada seja `D` ou `E`. | Must | Dado um payload com categoria `A`, quando a validação rodar, então a requisição é rejeitada com erro no campo `cnh_category` e nenhum condutor é criado. |
| RF-03 | 🟡 O sistema deve validar que a idade do condutor, apurada pela data de nascimento da pessoa física, seja superior a 21 anos na data de início da habilitação. | Must | Dado uma pessoa com data de nascimento que resulte em idade igual ou inferior a 21 anos, quando o cadastro for submetido, então a requisição é rejeitada com mensagem que informa a idade mínima exigida. |
| RF-04 | 🟡 O sistema deve registrar o comprovante do curso especializado do CONTRAN e a data de expiração correspondente. | Must | Dado um payload com certificado e expiração do curso, quando o condutor for salvo, então ambos os campos são persistidos e ficam visíveis na tela de detalhe. |
| RF-05 | 🟡 O sistema deve registrar a data do exame toxicológico e a data de expiração correspondente. | Must | Dado um payload com as datas do exame toxicológico, quando o condutor for salvo, então ambas as datas são persistidas e exibidas no detalhe. |
| RF-06 | 🟡 O sistema deve impedir o vínculo de condutor a uma rota quando a CNH, o curso do CONTRAN ou o exame toxicológico estiverem vencidos ou ausentes. | Must | Dado um condutor com CNH vencida, quando o usuário tentar vinculá-lo a uma rota, então a requisição é rejeitada nomeando a credencial vencida e a data de expiração. |
| RF-07 | 🟡 O sistema deve registrar a ocorrência de infração gravíssima nos últimos 12 meses e bloquear o vínculo de rota enquanto o registro estiver vigente. | Should | Dado um condutor com infração gravíssima registrada há 30 dias, quando o usuário tentar vinculá-lo a uma rota, então a requisição é rejeitada com a data da infração. |
| RF-08 | 🟡 O sistema deve listar condutores do tenant com filtros por empresa, situação de habilitação e vencimento, com paginação. | Must | Dado um tenant com 40 condutores, quando o usuário filtrar por vencimento em até 30 dias, então a resposta traz apenas os condutores que atendem ao filtro, limitado ao tamanho de página. |
| RF-09 | 🟡 O sistema deve permitir inativar condutor com motivo, preservando o histórico de vínculos de rota. | Should | Dado um condutor ativo, quando o usuário informar o motivo, então `is_active` passa a `false` e o registro permanece consultável. |
| RF-10 | 🟡 O sistema deve expor o condutor em contrato TypeScript `TransportDriver` no pacote `@sysgov/sdk`. | Should | Dado o pacote publicado, quando o cliente tipar o retorno do endpoint de condutores, então os campos de validade das credenciais são reconhecidos pelo compilador. |

### 6.2 Fluxo Principal (Happy Path)

1. O técnico autorizado abre a tela de condutores e inicia um novo cadastro.
2. O usuário seleciona a pessoa física, a empresa, a categoria da CNH e informa os dados das três credenciais.
3. O sistema valida a categoria, apura a idade pela data de nascimento e grava o condutor com as datas de validade.
4. O sistema exibe a confirmação com a situação de cada credencial.
5. Resultado: o condutor fica disponível para vínculo com rotas.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Renovação de credencial:**
1. O técnico abre o condutor já cadastrado e informa a nova data de expiração da CNH.
2. O sistema atualiza a credencial, preserva o histórico de auditoria e recalcula a situação exibida.
3. O condutor volta a ficar elegível para vínculo de rota.

**Fluxo Alternativo B — Condutor de frota própria:**
1. O usuário cadastra o condutor vinculado a uma empresa de frota municipal própria.
2. O sistema aplica as mesmas regras de credencial, por se tratar de transporte escolar público.
3. Nenhuma regra adicional é aplicada.

**Fluxo Alternativo C — Auditoria de habilitação:**
1. O fiscal consulta a listagem de condutores filtrando por vencimento.
2. O sistema devolve a lista com a credencial vencida e a data de expiração de cada condutor.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | P95 < 300 ms na listagem paginada | Índices por `tenant_id`, `company_id` e `person_id` |
| RNF-02 | Isolamento multi-tenant | 100% das consultas filtradas por `tenant_id` | Nenhum indício de condutor de outro tenant em resposta |
| RNF-03 | Segurança | Permissões `transport.drivers.read` e `transport.drivers.write` | Escrita exige permissão do RBAC unificado |
| RNF-04 | Auditoria | Ator, data e valores anteriores e posteriores em toda alteração | Inclui troca de empresa e atualização de credencial |
| RNF-05 | Privacidade | Número da CNH tratado como dado pessoal | Exibição mascarada nos logs de auditoria |
| RNF-06 | Integridade | Exclusão física vedada; desativação lógica com `deleted_at` | Preserva o histórico de rotas |

---

## 8. Design e Interface

**Componentes afetados:** tela de listagem de condutores, formulário de condutor, seletor de condutor na rota, painel de alertas de fiscalização.

**Comportamento esperado:**
🟡 O formulário exibe pessoa, empresa, número e categoria da CNH, data de emissão, data de expiração, certificado do curso do CONTRAN com a validade, datas do exame toxicológico e observações. As três credenciais aparecem agrupadas em blocos identificados por rótulo regulatório e por a base legal. A situação de cada credencial é exibida como rótulo textual com o texto `Válida`, `Vence em N dias` ou `Vencida`, sem depender apenas de cor. O seletor de condutor na tela de rota filtra por empresa, categoria e situação de habilitação.

**Estados da UI:**
- Estado vazio: 🟡 mensagem informando que nenhum condutor foi cadastrado, com ação de cadastrar o primeiro.
- Estado de carregamento: 🟡 indicador enquanto a listagem paginada é obtida.
- Estado de erro: 🟡 mensagem por campo inválido no formulário e faixa de erro com ação de tentar novamente quando a API falha.
- Estado de sucesso: 🟡 confirmação com o identificador do condutor e a situação das credenciais.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
educa_transport_drivers {
  id: UUID                              // chave primária
  tenant_id: UUID                       // obrigatório
  person_id: UUID                       // obrigatório, referência a core_people
  company_id: UUID                      // referência a educa_transport_companies
  cnh_number: string                    // até 30 caracteres
  cnh_category: string                  // D ou E
  cnh_first_issue_date: date
  cnh_expiration_date: date             // obrigatório
  school_transport_course_certificate: string
  course_expiration_date: date
  toxicological_exam_date: date
  toxicological_expiration_date: date
  is_active: boolean                    // padrão true
  notes: text
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz
}
```

**Migrações necessárias:** 🟡 Sim — carga inicial a partir de `modules.motorista` (`cod_motorista`, `ref_idpes`, `cnh`, `tipo_cnh`), preservando o identificador legado por mapa de de/para.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|-------------------------|
| Cadastro de pessoas (`core_people`) | Obrigatória | Bloqueia o cadastro; a API responde com erro 503 e sem gravar condutor |
| Componente de empresas de transporte | Obrigatória | Bloqueia o vínculo do condutor a uma empresa |
| Componente de rotas | Obrigatória | O vínculo de condutor a rota fica indisponível |
| Auditoria do SYSGOV | Obrigatória | A escrita é recusada com erro explícito |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Categoria de CNH fora de `D` e `E` | Usuário seleciona categoria `C` | 🟡 A requisição é rejeitada com erro no campo `cnh_category`, sem gravação |
| EC-02: Condutor com idade igual ou inferior a 21 anos | Pessoa com data de nascimento que resulta em idade de 21 anos | 🟡 A requisição é rejeitada com mensagem que informa a idade mínima legal de 21 anos |
| EC-03: Credencial vencida no momento do vínculo de rota | Condutor com CNH expirada | 🟡 O vínculo é recusado com a credencial faltante e a data de expiração, sem criação de vínculo |
| EC-04: Pessoa sem data de nascimento no cadastro | Condutor sem data de nascimento disponível | 🟡 A apuração de idade é bloqueada com mensagem que aponta a lacuna no cadastro de pessoas, sem liberar o vínculo |
| EC-05: Infração gravíssima registrada nos últimos 12 meses | Registro de infração vigente | 🟡 O vínculo de rota é recusado com a data da infração, e o bloqueio cessa após 12 meses |
| EC-06: Falha de timeout na consulta de pessoa física | Serviço de cadastro de pessoas indisponível | 🟡 A requisição falha com erro 503, mensagem de indisponibilidade e ação de tentar novamente, sem gravar condutor parcial |
| EC-07: Mesma pessoa já cadastrada como condutor | Novo cadastro com `person_id` repetido no tenant | 🟡 A requisição é rejeitada com mensagem de duplicidade, apontando o condutor existente |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 obrigatória, com resolução de tenant pelo contexto autenticado.
- **Autorização:** 🟡 `transport.drivers.read` para consulta e `transport.drivers.write` para escrita.
- **Dados sensíveis:** 🟡 número de CNH, data de exame toxicológico e registro de infração são dados pessoais e sensíveis, protegidos conforme a política de dados do SYSGOV.
- **Auditoria:** 🟡 registro de ator, data e valores anteriores e posteriores em cadastro, alteração de credencial e vínculo de empresa.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 habilitação por tenant, com a regra de bloqueio de vínculo ativada depois da carga de dados e da conferência de credenciais migradas.
- **Como reverter (rollback):** 🟡 desativar a regra de bloqueio de vínculo, preservando o registro das credenciais, e voltar a ler `modules.motorista` enquanto a tabela nova não for validada.
- **Monitoramento pós-deploy:** 🟡 acompanhar quantas tentativas de vínculo foram bloqueadas por credencial, a distribuição de condutores por situação e a taxa de rejeição no endpoint de cadastro.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | ⚠️ ABERTO: Qual o prazo de validade do curso do CONTRAN aplicável ao transportador municipal, uma vez que a norma do CONTRAN trata de transportador e de condutor de transporte de estudantes? | Alto | Jurídico | Antes do início da implementação |
| OQ-02 | ⚠️ ABERTO: A verificação de infração gravíssima nos últimos 12 meses exige integração com o prontuário do condutor ou o registro manual é suficiente para o padrão de auditoria adotado? | Alto | Produto | Antes do início da implementação |
| OQ-03 | ⚠️ ABERTO: A idade mínima de 21 anos deve ser apurada na data de início da habilitação, na data de criação do cadastro ou na data de vigência da rota? | Médio | Produto | Antes do início da implementação |
| OQ-04 | ⚠️ ABERTO: Um condutor pode estar vinculado a mais de uma empresa ao mesmo tempo, e a regra vale para a frota própria do município? | Médio | Produto | Antes do início da implementação |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Bloquear o vínculo de rota em vez de apenas exibir aviso | Exibir apenas alerta na tela | A CTB trata a falta de credencial como condição de operação, e um alerta que não impede operação não produz conformidade |
| Validar idade pela data de nascimento da pessoa central | Campo de idade no cadastro de condutor | Evita duplicar dado pessoal e mantém a fonte única de verdade do cadastro central |
| Manter as três credenciais como colunas próprias da tabela de condutor | Tabela separada de credenciais | O número de credenciais é fixo e o consulta é sempre do conjunto completo |

---

## Apêndice

### Referências
- `_reversa_sdd/Transport/legacy-mapping.md` — seções 2.2 e 3.
- CTB, Lei nº 9.503/1997, arts. 136 a 139 — requisitos do condutor de transporte escolar.
- `_reversa_sdd/adrs/003-unified-person-identity-and-deduplication.md` — identidade única de pessoa.
- `_reversa_sdd/adrs/006-unified-rbac-access-control.md` — RBAC unificado.
- Legado: `modules.motorista`, `public/vendor/legacy/TransporteEscolar/Assets/Javascripts/Motorista.js`.

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
  Arquivo: D:\SYSTRAT\I-Educar\_reversa_sdd\sdd\cadastro-condutores.md
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
