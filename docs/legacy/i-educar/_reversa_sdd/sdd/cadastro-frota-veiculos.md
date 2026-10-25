# Spec: Cadastro de Frota de Veículos e Vistorias do DETRAN

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** Reversa (Time de Descoberta + Code New Project)
**Data:** 2026-10-20
**Reviewers:** N/A

> Todos os itens desta spec carregam o selo 🟡 PLANEJADO. Fatos extraídos do legado estão referenciados no Apêndice com a identificação da origem.

---

## 1. Resumo

🟡 O componente de frota de veículos registra os veículos usados no transporte escolar, com identificação, lotação, tipologia INEP, indicação de acessibilidade e registro das vistorias semestrais exigidas pelo DETRAN. No SYSGOV, ele substitui `modules.veiculo` por `educa_transport_vehicles`, multi-tenant, e alimenta o cálculo de ocupação de rota e o preenchimento do Registro 60 do Censo Escolar.

---

## 2. Contexto e Motivação

**Problema:**
O i-Educar guarda placa, marca, ano e quantidade de passageiros do veículo, porém não registra a vistoria semestral do DETRAN nem a validade da autorização de transporte escolar, beide exigidas pelo CTB para circulação com estudantes. O modelo legado também aceita veículo com lotação declarada menor que o número de estudantes alocados, o que produz superlotação sem qualquer sinalização, e a tipologia INEP é mantida apenas como marcação student's no cadastro do aluno, sem amarração ao veículo real.

**Evidências:**
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 2.3, que descreve `educa_transport_vehicles` com `passenger_capacity`, `vehicle_type_inep`, `is_accessible_disability`, `last_inspection_date`, `inspection_certificate_number` e `inspection_valid_until`.
- CTB, Lei nº 9.503/1997, arts. 136 a 139: vistoria semestral obrigatória de equipamentos obrigatórios e autorização do órgão estadual de trânsito afixada na parte interna do veículo.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 3: a coluna legada `pmieducar.aluno.veiculo_transporte_escolar` é um arranjo de inteiros, e a migração precisa convertê-lo em vínculo com veículo real.

**Por que agora:**
A vistoria semestral só produz efeito quando o vínculo do veículo com a rota passa a exigir validade, e essa regra depende de a tipologia INEP estar amarrada ao veículo, o que só é viável na modelagem nova.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Registrar a frota de veículos com identificação completa, lotação e tipologia INEP válida.
- [ ] 🟡 G-02: Impedir a circulação de veículo com vistoria semestral vencida em rota ativa.
- [ ] 🟡 G-03: Sinalizar a superlotação quando a quantidade de estudantes alocados exceder a capacidade declarada.
- [ ] 🟡 G-04: Expor a tipologia INEP do veículo real para o Registro 60 do Censo Escolar.
- [ ] 🟡 G-05: Garantir 100% de fidelidade na migração da frota do i-Educar para `educa_transport_vehicles`.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Veículos migrados com placa e lotação preservadas | 0% | 100% | Fim do cutover |
| Veículos vinculados a rota com vistoria vencida | Sem medição | 0% | Contínuo após o cutover |
| Rotas com ocupação acima de 100% da capacidade | Sem medição | 0% | 60 dias após o cutover |
| Veículos com tipologia INEP preenchida | Sem medição | 100% | 60 dias após o cutover |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá integração automática com o sistema do DETRAN para consulta de vistoria ou de autorização de circulação; o registro é digitado pelo usuário.
- NG-02: Não haverá controle de manutenção, troca de óleo, pneus ou custo de manutenção do veículo.
- NG-03: Não haverá leitura automatizada de código de barras do documento do veículo; a leitura é digitada.
- NG-04: Não haverá gestão de múltiplos condutores por veículo com escala; o campo de condutor padrão é uma referência simples, e a escala pertence ao componente de rotas.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Técnico de transporte, que cadastra os veículos da frota e registra as vistorias semestrais.

**Usuário secundário:** 🟡 Coordenador escolar, que consulta a lotação do veículo antes de confirmar matrículas de estudantes que dependem de transporte.

**Jornada atual (sem a feature):**
1. O técnico busca o veículo pela placa e edita a lotação.
2. O sistema não registra nem exibe vistoria ou validade de autorização.
3. O estudante transportado excede a capacidade e a superlotação não aparece em nenhuma tela.
4. A irregularidade é percebida apenas na fiscalização ou em ocorrência de acidente.

**Jornada futura (com a feature):**
1. O técnico cadastra o veículo com placa, lotação, tipologia INEP e condutor padrão.
2. O sistema registra a vistoria semestral com data de validade.
3. O sistema recusa o vínculo do veículo a uma rota quando a vistoria está vencida.
4. A listagem de frota destaca os veículos com vistoria a vencer em até 30 dias.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve permitir cadastrar veículo no tenant corrente com descrição, placa, empresa e tipologia INEP. | Must | Dado um payload com descrição, placa, empresa ativa e tipologia INEP válida, quando o usuário enviar, então o veículo é criado com `tenant_id` do contexto. |
| RF-02 | 🟡 O sistema deve normalizar a placa para letras e números maiúsculos, removendo espaços e hifens, e aceitar o padrão Mercosul e o padrão antigo. | Must | Dado a placa `abc-1d23`, quando o veículo for salvo, então o valor gravado é `ABC1D23` e a consulta devolve o mesmo formato. |
| RF-03 | 🟡 O sistema deve recusar o cadastro de veículo com placa já existente no tenant. | Must | Dado um veículo existente com a placa `ABC1D23`, quando outro cadastro usar a mesma placa, então a requisição é rejeitada com mensagem de duplicidade. |
| RF-04 | 🟡 O sistema deve exigir a capacidade de passageiros e recusar valor negativo ou zero. | Must | Dado um payload com `passenger_capacity` igual a zero, quando a validação rodar, então a requisição é rejeitada com erro no campo correspondente. |
| RF-05 | 🟡 O sistema deve validar que a tipologia INEP informada pertence ao conjunto aceito para transporte escolar. | Must | Dado um valor de tipologia fora do conjunto de 1 a 11, quando o cadastro for submetido, então a requisição é rejeitada com a lista de valores aceitos. |
| RF-06 | 🟡 O sistema deve registrar a indicação de uso exclusivo de transporte escolar e a indicação de acessibilidade para pessoa com deficiência. | Must | Dado os dois indicadores no payload, quando o veículo for salvo, então ambos são persistidos e exibidos na listagem como rótulos. |
| RF-07 | 🟡 O sistema deve registrar vistoria do DETRAN com data, número do certificado e data de validade. | Must | Dado um payload de vistoria, quando o registro for salvo, então as três informações são persistidas e a situação de validade é recalculada. |
| RF-08 | 🟡 O sistema deve impedir o vínculo de veículo a uma rota quando a vistoria semestral estiver vencida. | Must | Dado um veículo com validade de vistoria anterior à data da rota, quando o usuário tentar vinculá-lo, então a requisição é rejeitada com a data de vencimento. |
| RF-09 | 🟡 O sistema deve listar veículos do tenant com filtros por empresa, tipologia INEP, acessibilidade e situação de vistoria, com paginação. | Must | Dado um tenant com 25 veículos, quando o usuário filtrar por acessibilidade, então a resposta traz apenas os veículos acessíveis, limitado ao tamanho de página. |
| RF-10 | 🟡 O sistema deve permitir desativar veículo com motivo obrigatório, preservando o histórico de vínculos. | Should | Dado um veículo ativo, quando o usuário informar o motivo, então `is_active` passa a `false`, o motivo é gravado e o registro permanece consultável. |
| RF-11 | 🟡 O sistema deve permitir vincular um condutor padrão ao veículo, validando a conformidade das credenciais do condutor. | Should | Dado um condutor com credencial vencida, quando o usuário tentar vinculá-lo como condutor padrão, então a requisição é rejeitada com a credencial faltante. |
| RF-12 | 🟡 O sistema deve expor o veículo em contrato TypeScript `TransportVehicle` no pacote `@sysgov/sdk`. | Should | Dado o pacote publicado, quando o cliente tipar o retorno do endpoint de veículos, então os campos de vistoria e tipologia INEP são reconhecidos pelo compilador. |

### 6.2 Fluxo Principal (Happy Path)

1. O técnico autorizado abre a tela de frota e inicia um novo cadastro de veículo.
2. O usuário informa descrição, placa, empresa, tipologia INEP, lotação, ano de fabricação e os indicadores de exclusividade e acessibilidade.
3. O sistema normaliza a placa, valida a tipologia e a lotação, e grava o veículo ativo.
4. O usuário registra a vistoria semestral com o número do certificado e a data de validade.
5. O sistema exibe a confirmação com a situação de vistoria e a disponibilidade do veículo para vínculo de rota.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Nova vistoria semestral:**
1. O técnico abre o veículo e registra nova vistoria.
2. O sistema substitui as datas de vistoria anteriores e mantém o histórico de auditoria com os valores anteriores.
3. A situação de validade passa a `Válida` e o veículo volta a ser elegível para vínculo de rota.

**Fluxo Alternativo B — Substituição de veículo na rota:**
1. O técnico desativa o veículo com motivo de entrada em manutenção.
2. O técnico vincula outro veículo com vistoria válida à mesma rota.
3. O sistema mantém as duas referências no histórico da rota, com a desativação datada.

**Fluxo Alternativo C —Consulta de frota por tipo INEP:**
1. O responsável pelo Censo Escolar filtra a frota pela tipologia INEP.
2. O sistema devolve os veículos correspondentes com a placa, a lotação e a empresa, para conferência do Registro 60.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | P95 < 300 ms na listagem paginada | Índice por `tenant_id` e por `tenant_id` com `plate` |
| RNF-02 | Isolamento multi-tenant | 100% das consultas filtradas por `tenant_id` | Placa é única apenas dentro do tenant |
| RNF-03 | Segurança | Permissões `transport.vehicles.read` e `transport.vehicles.write` | RBAC unificado do SYSGOV |
| RNF-04 | Auditoria | Ator, data e valores anteriores e posteriores em toda alteração | Inclui registro de vistoria |
| RNF-05 | Integridade | Exclusão física vedada; desativação lógica com `deleted_at` | Preserva vínculos com rotas e alocações |
| RNF-06 | Integridade de capacidade | Capacidade de passageiros nunca negativa e nunca zero | Base do cálculo de ocupação |

---

## 8. Design e Interface

**Componentes afetados:** tela de listagem de frota, formulário de veículo, registro de vistoria, seletor de veículo na rota, cartões de alerta de fiscalização.

**Comportamento esperado:**
🟡 O formulário exibe os dados de identificação, a lotação, os indicadores de exclusividade e acessibilidade e o bloco de vistoria. A placa é digitada em campo com máscara que aceita o padrão Mercosul e o padrão antigo, e o valor exibido é sempre o normalizado. A tipologia INEP é selecionada a partir de lista rotulada com a descrição do modal, com valor e código de cada opção. A situação de vistoria aparece como rótulo textual `Válida`, `Vence em N dias` ou `Vencida`. O painel de alertas destaca veículos com vistoria a vencer em até 30 dias.

**Estados da UI:**
- Estado vazio: 🟡 mensagem informando que nenhum veículo foi cadastrado, com ação de cadastrar o primeiro.
- Estado de carregamento: 🟡 indicador na tabela enquanto a listagem paginada é obtida.
- Estado de erro: 🟡 mensagem por campo inválido no formulário e faixa de erro com ação de tentar novamente quando a API falha.
- Estado de sucesso: 🟡 confirmação com o identificador do veículo e a situação de vistoria.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
educa_transport_vehicles {
  id: UUID                        // chave primária
  tenant_id: UUID                 // obrigatório
  company_id: UUID                // referência a educa_transport_companies
  default_driver_id: UUID         // referência a educa_transport_drivers
  description: string             // obrigatório, até 255 caracteres
  plate: string                   // até 10 caracteres, normalizada
  renavam: string                 // até 30 caracteres
  chassis: string                 // até 30 caracteres
  brand_model: string             // até 150 caracteres
  manufacture_year: int
  model_year: int
  passenger_capacity: int         // obrigatório, maior que zero
  network_type: string            // rural, urban ou mixed
  vehicle_type_inep: int          // tipologia do Censo Escolar
  is_exclusive_school_use: boolean
  is_accessible_disability: boolean
  last_inspection_date: date
  inspection_certificate_number: string
  inspection_valid_until: date
  is_active: boolean              // padrão true
  deactivation_reason: text
  notes: text
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz
}
```

**Migrações necessárias:** 🟡 Sim — carga inicial a partir de `modules.veiculo`, com conversão de `char(1)` para booleano em `exclusivo_transporte_escolar` e `adaptado_necessidades_especiais`, e conversão do arranjo `pmieducar.aluno.veiculo_transporte_escolar` em vínculos com veículos reais.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|-------------------------|
| Componente de empresas de transporte | Obrigatória | Bloqueia o vínculo de empresa do veículo |
| Componente de condutores | Obrigatória | Bloqueia o vínculo de condutor padrão e a validação de credencial |
| Componente de rotas e alocação | Obrigatória | O veículo não pode ser escalado nem receber estudantes |
| Componente de Censo Escolar | Obrigatória | A tipologia INEP do veículo não chega ao Registro 60 |
| Auditoria do SYSGOV | Obrigatória | A escrita é recusada com erro explícito |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Placa duplicada no tenant | Novo cadastro com placa já existente | 🟡 A requisição é rejeitada com mensagem de duplicidade, indicando o campo `plate` |
| EC-02: Capacidade de passageiros inferior à alocação | Veículo com 20 assentos e 23 estudantes alocados na rota | 🟡 A operação é recusada com o total alocado, a capacidade e o excesso de vagas |
| EC-03: Vistoria semestral vencida | Válidade de vistoria anterior à data da rota | 🟡 O vínculo é recusado com a data de vencimento da vistoria e a periodicidade semestral |
| EC-04: Vistoria nunca registrada | Veículo novo sem histórico de vistoria | 🟡 O vínculo é recusado com mensagem que exige o registro da vistoria antes do uso em rota |
| EC-05: Tipologia INEP fora do conjunto aceito | Valor de tipologia não mapeado | 🟡 A requisição é rejeitada com a relação dos códigos INEP aceitos |
| EC-06: Ano de fabricação posterior ao ano corrente | Payload com `manufacture_year` acima do ano corrente | 🟡 A requisição é rejeitada com mensagem que indica o ano máximo aceito |
| EC-07: Falha de timeout na validação do condutor padrão | Serviço de condutores indisponível durante o vínculo | 🟡 A requisição falha com erro 503 e mensagem de indisponibilidade, sem gravar o vínculo |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 obrigatória, com resolução de tenant pelo contexto autenticado.
- **Autorização:** 🟡 `transport.vehicles.read` para consulta e `transport.vehicles.write` para escrita.
- **Dados sensíveis:** 🟡 placa e renavam identificam o bem e o condutor, e ficam sujeitos à política de dados do SYSGOV.
- **Auditoria:** 🟡 registro de ator, data e valores anteriores e posteriores em cadastro, edição, vistoria e desativação.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 habilitação por tenant, com a regra de vistoria válida ativada depois da conferência da carga migrada.
- **Como reverter (rollback):** 🟡 desativar a regra de bloqueio por vistoria vencida, preservando os registros de vistoria, e voltar a ler `modules.veiculo`.
- **Monitoramento pós-deploy:** 🟡 acompanhar contagem de veículos por tenant, bloqueios por vistoria, divergência de placas migradas e taxa de erro nos endpoints de frota.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | ⚠️ ABERTO: A vistoria semestral do DETRAN se aplica a todos os modais registrados, incluindo bicicleta e tração animal que não dependem de vistoria veicular? | Alto | Jurídico | Antes do início da implementação |
| OQ-02 | ⚠️ ABERTO: O número da autorização do DETRAN, afixada na parte interna do veículo, deve ser registrado como campo próprio ou anexado ao certificado de vistoria? | Alto | Jurídico | Antes do início da implementação |
| OQ-03 | ⚠️ ABERTO: A lotação do veículo inclui o condutor no total de assentos conforme o CTB? | Médio | Jurídico | Antes do início da implementação |
| OQ-04 | ⚠️ ABERTO: Um mesmo veículo pode operar em mais de um turno do mesmo dia com condutores diferentes, e como isso é registrado? | Médio | Produto | 30 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Vistoria registrada como atributos do veículo | Tabela de histórico de vistorias | O modelo legado e o consumo no Registro 60 tratam de uma vigência corrente, e o histórico fica na auditoria |
| Capacidade de passageiros obrigatória e maior que zero | Capacidade opcional com valor padrão | Sem capacidade declarada não há como calcular ocupação nem detectar superlotação |
| Bloquear o vínculo de veículo com vistoria vencida | Exibir apenas aviso na tela | A vistoria semestral é exigência legal de operação, e a meta de conformidade é de 100% |

---

## Apêndice

### Referências
- `_reversa_sdd/Transport/legacy-mapping.md` — seções 2.3, 3 e 6.
- CTB, Lei nº 9.503/1997, arts. 136 a 139 — vistoria e autorização de circulação.
- `_reversa_sdd/adrs/004-daily-attendance-and-record-audit-trail.md` — trilha de auditoria.
- Legado: `modules.veiculo`, `public/vendor/legacy/TransporteEscolar/Assets/Javascripts/Veiculo.js`, `src/Modules/Educacenso/Model/VeiculoTransporteEscolar.php`.

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
  Arquivo: D:\SYSTRAT\I-Educar\_reversa_sdd\sdd\cadastro-frota-veiculos.md
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
