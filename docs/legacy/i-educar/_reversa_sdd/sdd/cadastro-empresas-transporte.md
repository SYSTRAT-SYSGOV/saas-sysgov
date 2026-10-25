# Spec: Cadastro de Empresas de Transporte Escolar

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** Reversa (Time de Descoberta + Code New Project)
**Data:** 2026-10-20
**Reviewers:** N/A

> Todos os itens desta spec carregam o selo 🟡 PLANEJADO. Fatos extraídos do legado estão referenciados no Apêndice e identificados como origem da regra, nunca como requisito confirmado.

---

## 1. Resumo

🟡 O componente de cadastro de empresas de transporte escolar centraliza o registro das empresas prestadoras de serviço de transporte de estudantes e das frotas municipais próprias, com os dados de contrato, vigência e responsável legal. No SYSGOV, ele substitui a tabela `modules.empresa_transporte_escolar` do i-Educar por `educa_transport_companies`, multi-tenant, e é a base referencial para condutores, frota, rotas e alocação de estudantes.

---

## 2. Contexto e Motivação

**Problema:**
No i-Educar, a empresa de transporte escolar é uma entidade técnica (`modules.empresa_transporte_escolar`) referenciada por vehicles, rotas e pessoas de transporte, sem conceitualização de contrato, vigência ou responsabilidade. A empresa é escolhida por busca simples (helper `SimpleSearchEmpresa`) e não há garantia de que o contrato esteja vigente na data de vigência de uma rota. Isso permite alocar estudantes a empresas com contrato vencido, o que expõe o município a questionamentos do PNATE/FNDE e do órgão de fiscalização de transporte.

**Evidências:**
- Mapeamento do módulo em `_reversa_sdd/Transport/legacy-mapping.md`, seção 2.1, que descreve `educa_transport_companies` com `contract_number`, `contract_start_date`, `contract_end_date` e `is_active`.
- Legado: `modules.empresa_transporte_escolar` com `cod_empresa_transporte_escolar`, `ref_idpes`, `ref_resp_idpes`.
- O PRD (`_reversa_sdd/prd.md`) fixa como premissa que os dados legados do módulo de transporte sejam migrados sem perda crítica de informação, e como métrica 100% de conformidade regulatória em 12 meses.

**Por que agora:**
A modernização do módulo para o ecossistema SYSGOV cria a janela para corrigir a lacuna de vigência contratual: a nova tabela já nasce com campos de contrato, e a validação só é barata de implementar enquanto o dado é criado em um único ponto de entrada.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Permitir o cadastro completo de uma empresa de transporte escolar por tenant, com vínculo obrigatório a uma pessoa jurídica do cadastro corporate.
- [ ] 🟡 G-02: Garantir que nenhuma rota seja criada ou mantida ativa com empresa cujo contrato esteja fora da vigência.
- [ ] 🟡 G-03: Permitir a inativação de empresa com motivo registrado, bloqueando novas alocações de estudantes sem apagar o histórico.
- [ ] 🟡 G-04: Garantir 100% de fidelidade na migração das empresas do i-Educar para `educa_transport_companies`.
- [ ] 🟡 G-05: Expor o cadastro de empresas via API REST padronizada e via contrato TypeScript do `@sysgov/sdk`.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Empresas migradas sem perda de campo mapeado | 0% | 100% | Fim do cutover |
| Rotas ativas com contrato fora de vigência | Sem medição | 0% | Contínuo após o cutover |
| Tempo de resposta P95 do endpoint de listagem de empresas | Sem medição | < 300 ms | 30 dias após o cutover |
| Empresas com responsável legal preenchido | Sem medição | 100% | 60 dias após o cutover |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá, nesta versão, execução de faturamento, medição de quilometragem rodada ou repasse de recursos do PNATE; a spec registra apenas o contrato e sua vigência.
- NG-02: Não haverá portal do fornecedor para autoatendimento ou upload de documentos; a empresa é mantida exclusivamente por usuários autorizados do município.
- NG-03: Não haverá verificação automática de Certidão de Débitos ou de regularidade junto a órgão federal; a conferência é manual e registrada em observações.
- NG-04: Não haverá integração com o sistema de compras e licitações; o número do contrato é digitado e não vinculado a um processo licitatório.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Técnico de transporte da rede municipal, responsável pelo cadastro das empresas que prestam serviço de transporte escolar e pela conferência de vigência de contrato.

**Usuário secundário:** 🟡 Coordenador escolar, que consulta a empresa vinculada à rota de seu turno para resolver dúvidas de Famílias e de fiscalização.

**Jornada atual (sem a feature):**
1. O técnico busca a empresa pelo nome usando a busca simples do i-Educar.
2. O sistema devolve a empresa sem contrato, sem vigência e sem indicação de situação.
3. O técnico descobre o vencimento de contrato por meio de controle paralelo, fora do sistema.
4. A rota é mantida ativa mesmo com contrato vencido, e a inconsistência só aparece na auditoria.

**Jornada futura (com a feature):**
1. O técnico cadastra a empresa com pessoa jurídica, contrato e vigência.
2. O sistema valida a vigência no momento da criação da rota e sinaliza o bloqueio quando o contrato está vencido.
3. O técnico inativa a empresa com motivo e a alocação de novos estudantes passa a ser recusada.
4. A coordenação consulta a situação contratual na própria tela da rota.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve permitir criar uma empresa de transporte escolar no tenant corrente com pessoa jurídica (`legal_person_id`) e responsável legal (`responsible_person_id`) obrigatórios. | Must | Dado um usuário com permissão de escrita e uma pessoa jurídica ativa do mesmo tenant, quando ele enviar o payload de criação, então a empresa é criada com `tenant_id` igual ao do contexto e a listagem a exibe. |
| RF-02 | 🟡 O sistema deve registrar número de contrato, data de início de vigência e data de fim de vigência de forma opcional, mantendo a empresa ativa por padrão. | Must | Dado um payload com `contract_number`, `contract_start_date` e `contract_end_date`, quando a empresa for criada, então os três campos são persistidos e `is_active` fica `true` na ausência de inativação explícita. |
| RF-03 | 🟡 O sistema deve recusar o registro de data de término anterior à data de início de vigência do contrato. | Must | Dado um payload com `contract_end_date` menor que `contract_start_date`, quando a validação rodar, então a requisição é rejeitada com erro de validação no campo `contract_end_date` e nenhuma linha é gravada. |
| RF-04 | 🟡 O sistema deve permitir inativar uma empresa com motivo obrigatório, preservando o registro e seu histórico. | Must | Dado uma empresa ativa, quando o usuário informar o motivo de inativação, então `is_active` passa a `false`, `deactivation_reason` é gravado e a empresa permanece consultável nas listagens. |
| RF-05 | 🟡 O sistema deve impedir o vínculo de veículos e condutores a uma empresa inativa. | Should | Dado uma empresa inativa, quando o usuário tentar vincular um veículo a ela, então a requisição é rejeitada com mensagem que indica a empresa como inativa. |
| RF-06 | 🟡 O sistema deve listar empresas do tenant com filtros por situação, vigência do contrato e texto de busca, com paginação. | Must | Dado um tenant com 30 empresas, quando o usuário filtrar por `is_active=true`, então a resposta traz apenas as empresas ativas, limitado ao tamanho de página informado. |
| RF-07 | 🟡 O sistema deve recusar o uso de pessoa jurídica pertencente a outro tenant. | Must | Dado um `legal_person_id` de outro tenant, quando a empresa for criada, então a requisição é rejeitada e nenhuma informação do tenant de origem é retornada na mensagem de erro. |
| RF-08 | 🟡 O sistema deve expor a empresa em contrato TypeScript `TransportCompany` no pacote `@sysgov/sdk`. | Should | Dado o pacote publicado, quando o cliente tipar o retorno do endpoint de empresas, então o campo `contractEndDate` é reconhecido como `string` opcional pelo compilador. |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário autorizado abre a tela de empresas de transporte e inicia um novo cadastro.
2. O usuário seleciona a pessoa jurídica no cadastro corporate, o responsável legal e informa número de contrato e vigência.
3. O sistema valida a pessoa jurídica no tenant, valida a coerência das datas e grava a empresa com `is_active` igual a `true`.
4. O sistema exibe a confirmação do cadastro com o identificador da empresa e a situação contratual vigente.
5. Resultado: a empresa passa a estar disponível para vínculo de frota, condutores e rotas.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Inativação por fim de contrato:**
1. O contrato vigente encerra na data de expiração prevista.
2. O sistema mantém a empresa cadastrada e sinaliza a situação contratual como vencida nas listagens e na tela da rota.
3. O usuário decide inativar e registra o motivo.

**Fluxo Alternativo B — Empresa de frota própria:**
1. O usuário cadastra a empresa com os dados do próprio município como pessoa jurídica.
2. O sistema mantém o mesmo fluxo de contrato, que pode ser preenchido ou não.
3. Nenhuma regra adicional é aplicada a esse tipo de empresa.

**Fluxo Alternativo C — Consulta por coordenador escolar:**
1. O coordenador abre a rota do turno e consulta a empresa vinculada.
2. O sistema exibe a razão social, o número do contrato e a situação de vigência, sem permitir edição.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | P95 < 300 ms na listagem paginada | Índice por `tenant_id` e por `is_active` |
| RNF-02 | Isolamento multi-tenant | 100% das consultas filtradas por `tenant_id` | Sem dado de outro tenant em resposta ou erro |
| RNF-03 | Segurança | Autenticação obrigatória e permissão `transport.companies.write` para escrita | Leitura exige `transport.companies.read` |
| RNF-04 | Auditoria | Gravação de ator, data e valores anteriores e posteriores em toda alteração | Requisito do ADR 006 de RBAC unificado |
| RNF-05 | Integridade referencial | Exclusão física vedada; apenas desativação lógica com `deleted_at` | Preserva o histórico de rotas e alocações |
| RNF-06 | Acessibilidade | Campos obrigatórios sinalizados em texto e não apenas por cor | Alinhado ao padrão de UI do `@sysgov/ui` |

---

## 8. Design e Interface

**Componentes afetados:** tela de listagem de empresas, formulário de empresa, seletor de empresa em rota, componente de contrato no `@sysgov/ui`.

**Comportamento esperado:**
🟡 O formulário exibe pessoa jurídica, responsável legal, número de contrato, data de início, data de fim e observações. A data de fim aceita valor posterior à data de início; a validação acontece no envio e também durante a digitação no campo de data de fim, com mensagem imediata quando a data for anterior. A situação contratual aparece como rótulo de estado ao lado da razão social, com texto `Vigente`, `Vencido` ou `Sem contrato informado`. A ação de inativar exige preenchimento do motivo e pede confirmação antes de gravar.

**Estados da UI:**
- Estado vazio: 🟡 mensagem informando que nenhuma empresa foi cadastrada no tenant, com ação de criar a primeira empresa.
- Estado de carregamento: 🟡 indicador na tabela enquanto a listagem paginada é obtida.
- Estado de erro: 🟡 mensagem por campo inválido no formulário e faixa de erro no topo da listagem quando a API falha, com ação de tentar novamente.
- Estado de sucesso: 🟡 confirmação com o identificador da empresa e opção de abrir a empresa recém-criada.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
educa_transport_companies {
  id: UUID                    // chave primária, gerada no banco
  tenant_id: UUID             // obrigatório, referência a core_tenants
  legal_person_id: UUID       // obrigatório, referência a core_legal_entities
  responsible_person_id: UUID // referência a core_people
  contract_number: string     // até 100 caracteres
  contract_start_date: date
  contract_end_date: date
  is_active: boolean          // padrão true
  deactivation_reason: text   // preenchido na inativação
  notes: text
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz     // desativação lógica
}
```

**Migrações necessárias:** 🟡 Sim — carga inicial a partir de `modules.empresa_transporte_escolar`, com mapa de de/para dos campos `ref_idpes`, `ref_resp_idpes` e criação de UUID versionada para preservar a rastreabilidade do identificador legado.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|-------------------------|
| Cadastro corporate (`core_legal_entities`) | Obrigatória | Bloqueia o cadastro de nova empresa; a API responde com erro 503 e mensagem de indisponibilidade do cadastro |
| Cadastro de pessoas (`core_people`) | Obrigatória | Bloqueia a seleção de responsável legal; a empresa é mantida inalterada |
| Módulo de rotas e alocação | Obrigatória | A empresa não pode ser vinculada a rota nem receber estudantes |
| Módulo de frota e condutores | Obrigatória | O vínculo de veículo ou condutor fica indisponível |
| Auditoria do SYSGOV | Obrigatória | A escrita é recusada com erro explícito, evitando registro sem rastro |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Contrato com data de fim anterior à data de início | Usuário informa datas invertedidas no formulário | 🟡 A requisição é rejeitada com mensagem no campo `contract_end_date` e nenhuma empresa é criada |
| EC-02: Pessoa jurídica de outro tenant | `legal_person_id` pertence a outro tenant | 🟡 A requisição é rejeitada com erro de vínculo inválido, sem revelar a existência do registro de origem |
| EC-03: Empresa sem contrato informado | Cadastro sem `contract_number` e sem datas | 🟡 A empresa é criada com situação `Sem contrato informado` e rotulada como pendência na listagem |
| EC-04: Número de contrato duplicado no mesmo tenant | Nova empresa com `contract_number` já existente | 🟡 A requisição é rejeitada com mensagem de duplicidade, com indicação do campo conflictivo |
| EC-05: Cadastro corporate indisponível durante o cadastro | Falha de timeout ou erro 503 na consulta de pessoa jurídica | 🟡 A requisição falha com erro 503, mensagem de indisponibilidade do cadastro corporate e ação de tentar novamente, sem gravar empresa parcial |
| EC-06: Inativação de empresa já inativa | Usuário inativa a mesma empresa duas vezes | 🟡 A requisição é idempotente, retorna a empresa inativa e não duplica o motivo de inativação |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 obrigatória, com token do SYSGOV e resolução de tenant a partir do contexto autenticado.
- **Autorização:** 🟡 permissão `transport.companies.read` para consulta e `transport.companies.write` para criação, edição e inativação.
- **Dados sensíveis:** 🟡 a razão social e o contrato não são dados pessoais; o responsável legal é uma pessoa física e herda a proteção de dado pessoal do SYSGOV.
- **Auditoria:** 🟡 toda criação, edição e inativação registra ator, data, tenant, identificador da empresa e valores anteriores e posteriores.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 rollout por tenant, com habilitação da API e da tela de empresas em ambiente de homologação antes do processo de migração do tenant de origem.
- **Como reverter (rollback):** 🟡 desabilitar o componente no tenant e restaurar a leitura da tabela legada `modules.empresa_transporte_escolar`, que permanece preservada durante o período de convívio.
- **Monitoramento pós-deploy:** 🟡 acompanhar contagem de empresas por tenant, taxa de erro 4xx e 5xx no endpoint de empresas, divergências entre o total legado e o total migrado, e empresas criadas sem responsável legal.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | ⚠️ ABERTO: A obrigatoriedade do responsável legal vale para as empresas de frota própria do município, em que o responsável é o próprio gestor público? | Alto | Produto | Antes do início da implementação |
| OQ-02 | ⚠️ ABERTO: A vigência do contrato deve ser validada no momento do vínculo do veículo, da rota ou apenas da alocação do estudante? | Alto | Produto | Antes do início da implementação |
| OQ-03 | ⚠️ ABERTO: O campo `contract_number` precisa de unicidade por tenant ou aceita contratos renovados com o mesmo número em anos diferentes? | Médio | Produto | Antes do início da implementação |
| OQ-04 | ⚠️ ABERTO: Existe exigência de upload de instrumento contratual assinado, que hoje não existe na tabela planejada? | Médio | Jurídico | 30 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Inativação lógica com `deleted_at` e motivo obrigatório | Exclusão física, ou desativação sem motivo | Preserva a rastreabilidade das rotas e alocações já vinculadas, exigida pelo ADR 001 de isolamento por schema |
| Validação de vigência no domínio de empresa | Validação apenas na aplicação que consome o dado | Centraliza a regra e evita que outros módulos criem vínculos inválidos |
| Herança das permissões do RBAC unificado do SYSGOV | Tabela de permissões própria do módulo de transporte | Evita duplicar autorização e segue o ADR 006 |

---

## Apêndice

### Referências
- `_reversa_sdd/Transport/legacy-mapping.md` — seções 2.1 e 3 (tabela de campos e de/para).
- `_reversa_sdd/adrs/001-multi-tenancy-schema-isolation.md` — isolamento por tenant.
- `_reversa_sdd/adrs/006-unified-rbac-access-control.md` — RBAC unificado.
- `_reversa_sdd/prd.md` — problema raiz, premissas e métricas.
- Legado: `modules.empresa_transporte_escolar`, `ieducar/lib/Portabilis/View/Helper/Input/Resource/SimpleSearchEmpresa.php`.

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
  Arquivo: D:\SYSTRAT\I-Educar\_reversa_sdd\sdd\cadastro-empresas-transporte.md
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
