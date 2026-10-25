# Spec: Integração do Transporte Escolar com o Censo Escolar (Registro 60)

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** Reversa (Time de Descoberta + Code New Project)
**Data:** 2026-10-20
**Reviewers:** N/A

> Todos os itens desta spec carregam o selo 🟡 PLANEJADO. Fatos extraídos do legado estão referenciados no Apêndice com a identificação da origem.

---

## 1. Resumo

🟡 O componente de integração com o Censo Escolar transporta para o Registro 60 a declaração de uso de transporte escolar público, o poder público responsável e a tipologia do modal utilizado, além de aplicar a regra de anulação já existente no i-Educar e oferecer a pré-validação de consistência antes da exportação. No SYSGOV, ele articula o módulo de transporte ao módulo de Censo Escolar do tenant.

---

## 2. Contexto e Motivação

**Problema:**
O i-Educar já exporta a informação de transporte público no Registro 60 e já contém a regra que anula essa informação quando a turma não tem atendimento curricular, quando a mediação didática não é presencial ou semipresencial e quando o aluno reside fora do Brasil. O que não existe é a amarração entre o transporte realmente alocado no módulo e a declaração exportada: o aluno registra tipos de veículo em um arranjo de inteiros no cadastro, enquanto a rota alocada tem um veículo com tipologia INEP própria, e nada garante que as duas informações digam a mesma coisa. O resultado é registro divergente no Censo e risco de apontamento no repasse de recursos do PNATE.

**Evidências:**
- `src/Modules/Educacenso/ExportRule/TransporteEscolarPublico.php`, que anula `transportePublico` quando a turma não possui atendimento curricular, quando a mediação não é presencial ou semipresencial ou quando o país de residência do aluno não é o Brasil.
- `src/Modules/Educacenso/Model/VeiculoTransporteEscolar.php`, que define a tipologia modal aceita.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 3, que mapeia `pmieducar.aluno.veiculo_transporte_escolar` como arranjo de inteiros para `vehicle_type_inep`.
- Registro 60 do Censo Escolar: declaração de transporte escolar público com valores 0 para não e 1 para sim, poder público responsável com 1 estadual, 2 municipal e 3 compartilhado, e tipologia modal rodoviária, aquaviária e ferroviária.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 4.4, que prevê `GET /api/v1/educa/transport/census/record60-validation` como pré-validação de consistência.

**Por que agora:**
A exportação do Censo Escolar é processo sazonal com prazo regulatório. Ter a pré-validação antes do período de exportação transforma erro discovered tarde em erro corrigido no momento da carga da alocação.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Exportar no Registro 60 a declaração de uso de transporte escolar público do estudante.
- [ ] 🟡 G-02: Exportar o poder público responsável e a tipologia modal aceita pelo Censo Escolar.
- [ ] 🟡 G-03: Aplicar a regra de anulação herdada do i-Educar, com a mesma condição de supressão.
- [ ] 🟡 G-04: Oferecer a pré-validação de consistência entre a alocação de transporte e o Registro 60 antes da exportação.
- [ ] 🟡 G-05: Garantir 100% de fidelidade na conversão do arranjo legado de tipos de veículo em valores INEP válidos.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Alunos com divergência entre alocação e Registro 60 | Sem medição | 0% | Antes de cada exportação |
| Tipos de veículo legados convertidos para valor INEP válido | 0% | 100% | Fim do cutover |
| Registros com tipologia modal vazia indevidamente | Sem medição | 0% | Antes de cada exportação |
| Tempo de resposta P95 da pré-validação | Sem medição | < 2 s | 30 dias após o cutover |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá alteração no layout nem no leiaute da exportação do Censo Escolar, que é definido pelo MEC e pelo Inep.
- NG-02: Não haverá ajuste das demais variáveis do Registro 60, que pertencem a outros módulos.
- NG-03: Não haverá envio direto ao sistema do MEC a partir desta aplicação; a exportação segue o processo já existente de geração de arquivo.
- NG-04: Não haverá recálculo do repasse do PNATE, que é apurado a partir do registro oficial do Censo.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Responsável pelo Censo Escolar, que valida a consistência e gera o arquivo de exportação antes do prazo de envio.

**Usuário secundário:** 🟡 Técnico de transporte, que corrige a alocação ou a tipologia do veículo quando a pré-validação aponta divergência.

**Jornada atual (sem a feature):**
1. O responsável pelo censo gera o arquivo e recebe o arquivo sem conferência prévia.
2. O aluno que usa transporte aparece com a declaração herdada do cadastro, sem conferência com a rota real.
3. A divergência entre a tipologia do veículo alocado e a registrada no aluno só é percebida em devolutiva do órgão central.
4. Correções são feitas no cadastro do aluno, sem retorno ao módulo de transporte.

**Jornada futura (com a feature):**
1. O responsável pelo censo executa a pré-validação antes do período de exportação.
2. O sistema aponta os alunos com divergência entre a alocação e a declaração, com a causa.
3. O técnico de transporte corrige a alocação ou a tipologia do veículo.
4. A exportação é gerada com a declaração coerente e a regra de anulação já aplicada.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve exportar no Registro 60 a declaração de uso de transporte escolar público do estudante, com valor 1 para sim e 0 para não. | Must | Dado um estudante com alocação de transporte ativo, quando o Registro 60 for gerado, então a variável de transporte público é preenchida conforme a regra de anulação. |
| RF-02 | 🟡 O sistema deve exportar o poder público responsável do transporte, com valor 1 para estadual, 2 para municipal e 3 para compartilhado. | Must | Dado uma alocação com poder público responsável municipal, quando o Registro 60 for gerado, então a variável correspondente vale 2. |
| RF-03 | 🟡 O sistema deve exportar a tipologia do modal utilizado, conforme o conjunto rodoviário, aquaviário e ferroviário do Censo Escolar. | Must | Dado um estudante alocado em rota com veículo de tipologia 3, quando o Registro 60 for gerado, então a variável de tipologia modal vale 3. |
| RF-04 | 🟡 O sistema deve anular a declaração de transporte público quando a turma não possui atendimento curricular, quando a mediação didática não é presencial nem semipresencial ou quando o país de residência do estudante não é o Brasil. | Must | Dado um estudante com alocação de transporte, turma sem atendimento curricular e residência no Brasil, quando o Registro 60 for gerado, então a variável de transporte público é nula. |
| RF-05 | 🟡 O sistema deve derivar a tipologia modal declarada a partir do veículo escalado na rota de transporte do estudante. | Must | Dado um estudante alocado em rota com veículo de tipologia 1, quando a declaração for consultada, então a tipologia modal proposta é a 1. |
| RF-06 | 🟡 O sistema deve oferecer a pré-validação de consistência, listando por estudante a divergência entre a alocação de transporte e o Registro 60. | Must | Dado um estudante com alocação ativa e declaração de tipologia divergente, quando a pré-validação for executada, então o estudante é listado com a causa da divergência. |
| RF-07 | 🟡 O sistema deve classificar a divergência entre alocação e declaração em impeditiva de exportação e em informativo. | Must | Dado um estudante alocado sem declaração de transporte público, quando a pré-validação for executada, então a divergência é classificada como impeditiva. |
| RF-08 | 🟡 O sistema deve converter os tipos de veículo legados em valores INEP válidos, marcando como não mapeado o valor sem correspondência. | Must | Dado um tipo de veículo legado sem correspondência na tabela INEP, quando a carga for executada, então o registro é marcado como não mapeado e não é exportado como valor inválido. |
| RF-09 | 🟡 O sistema deve permitir registrar mais de uma tipologia modal para o estudante, quando a alocação envolver mais de um modal. | Should | Dado um estudante alocado em rotas de modais distintos, quando a exportação for gerada, então a variável de tipologia modal traz os valores correspondentes. |
| RF-10 | 🟡 O sistema deve gerar o relatório de divergências com o total de estudantes afetados, por escola e por tipo de causa. | Should | Dado a pré-validação com 14 estudantes divergentes, quando o relatório for solicitado, então o total e a quebra por causa são apresentados. |

### 6.2 Fluxo Principal (Happy Path)

1. O responsável pelo censo executa a pré-validação do tenant para o ano letivo de destino.
2. O sistema compara a alocação de transporte de cada estudante com a declaração de transporte público e a tipologia modal do Registro 60.
3. O sistema lista os estudantes divergentes, com a causa e o módulo responsável pela correção.
4. O técnico de transporte corrige a alocação ou a tipologia do veículo escalado.
5. A pré-validação é reexecutada e não apresenta divergência impeditiva.
6. A exportação é gerada com a declaração e a tipologia coerentes com a alocação.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Anulação por condição de turma:**
1. O estudante está alocado em transporte escolar e a turma não possui atendimento curricular.
2. A regra de anulação suprime a variável de transporte público no Registro 60.
3. O relatório de divergências não apresenta esse estudante, porque a anulação é esperada.

**Fluxo Alternativo B — Estudante com tipologia legada não mapeada:**
1. O estudante tem tipo de veículo legado sem correspondência na tabela INEP.
2. A pré-validação classifica a divergência como impeditiva, com a indicação do valor legado.
3. O técnico ajusta a tipologia do veículo escalado ou corrige a tipologia do aluno.

**Fluxo Alternativo C — Alocação encerrada antes da exportação:**
1. O estudante teve a alocação desvinculada no fechamento do ano letivo.
2. A pré-validação não lista o estudante como divergente de transporte ativo.
3. A exportação reflete a ausência de transporte em transporte público.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | P95 < 2 s na pré-validação de um ano letivo | Processamento em lote com leitura por tenant |
| RNF-02 | Isolamento multi-tenant | 100% das consultas filtradas por `tenant_id` | Nenhum estudante de outro município na resposta |
| RNF-03 | Segurança | Permissões `transport.census.read` e `transport.census.export` | RBAC unificado do SYSGOV |
| RNF-04 | Fidelidade ao layout | Nenhuma alteração no layout de arquivo gerado pelo módulo de Censo Escolar | Compatibilidade com o validador do MEC e do Inep |
| RNF-05 | Determinismo | A mesma base gera sempre o mesmo resultado de pré-validação | Ordenação estável por estudante e por causa |
| RNF-06 | Rastreabilidade | Todo valor não mapeado na conversão legada é registrado com o valor de origem | Permite auditoria da carga |

---

## 8. Design e Interface

**Componentes afetados:** tela de pré-validação do Registro 60, relatório de divergências, tela de detalhe do estudante com a declaração de transporte.

**Comportamento esperado:**
🟡 A tela de pré-validação exibe o ano letivo, a quantidade de estudantes avaliados e a lista de divergências com nome do estudante, escola, tipo de causa e módulo responsável pela correção. As divergências impeditivas são separadas das informativas por rótulo textual. Cada item permite abrir a tela do estudante ou da rota de origem. O detalhe do estudante mostra a declaração de transporte público, o poder público responsável e a tipologia modal proposta, com a origem do valor.

**Estados da UI:**
- Estado vazio: 🟡 mensagem informando que não há divergências para o ano letivo selecionado.
- Estado de carregamento: 🟡 indicador enquanto a pré-validação é executada, com aviso de que o processo percorre todos os estudantes do ano letivo.
- Estado de erro: 🟡 faixa de erro com ação de tentar novamente quando a API falha.
- Estado de sucesso: 🟡 lista de divergências com o total por causa.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
educa_transport_census_declarations (projeção de leitura) {
  tenant_id: UUID             // obrigatório
  student_id: UUID            // referência a educa_students
  registration_id: UUID       // referência a educa_registrations
  academic_year: int
  uses_public_transport: boolean
  public_transport_jurisdiction: int
  vehicle_type_inep: int[]
  declaration_source: string  // alocacao, cadastro_do_aluno ou anulacao
  divergence_type: string     // nulo quando sem divergência
  legacy_vehicle_type: int    // valor legado quando não mapeado
}
```

**Migrações necessárias:** 🟡 Sim, parcialmente — a carga converte o arranjo legado `pmieducar.aluno.veiculo_transporte_escolar` em valores INEP válidos, preservando o valor original quando não há correspondência.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|-------------------------|
| Componente de alocação de estudantes | Obrigatória | A tipologia modal não pode ser derivada do veículo escalado |
| Componente de frota de veículos | Obrigatória | A tipologia INEP do veículo real fica indisponível |
| Componente de rotas e itinerários | Obrigatória | A alocação de transporte não pode ser consultada por estudante |
| Módulo de Censo Escolar do SYSGOV | Obrigatória | A exportação do Registro 60 não pode ser gerada |
| Módulo de matrículas | Obrigatória | A regra de anulação por tipo de atendimento e por mediação não pode ser aplicada |
| Auditoria do SYSGOV | Obrigatória | A escrita é recusada com erro explícito |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Tipologia modal legada sem correspondência INEP | Valor legado fora do conjunto de 1 a 11 | 🟡 O valor é marcado como não mapeado, a divergência é classificada como impeditiva e o valor original é preservado para auditoria |
| EC-02: Turma sem atendimento curricular | Aluno com alocação em turma sem componente curricular | 🟡 A declaração de transporte público é anulada na exportação e o estudante não entra na lista de divergências |
| EC-03: Mediação didática remota | Mediação da turma diferente de presencial e semipresencial | 🟡 A declaração de transporte público é anulada na exportação |
| EC-04: Residência fora do Brasil | País de residência do estudante diferente de Brasil | 🟡 A declaração de transporte público é anulada na exportação |
| EC-05: Alocação ativa sem declaração correspondente | Estudante alocado e Registro 60 sem transporte público | 🟡 A pré-validação classifica a divergência como impeditiva e indica o módulo de transporte como responsável |
| EC-06: Falha de timeout na consulta de matrículas durante a pré-validação | Serviço de matrículas indisponível | 🟡 A requisição falha com erro 503 e mensagem de indisponibilidade, sem apresentar resultado parcial |
| EC-07: Exportação com divergência impeditiva pendente | Usuário solicita a exportação com divergências impeditivas em aberto | 🟡 A exportação é recusada com a lista das divergências impeditivas e a quantidade de estudantes afetados |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 obrigatória, com resolução de tenant pelo contexto autenticado.
- **Autorização:** 🟡 `transport.census.read` para a pré-validação e `transport.census.export` para a geração do arquivo.
- **Dados sensíveis:** 🟡 o Relatório de divergências traz nome e escola de estudantes, com acesso restrito ao perfil de gestão de transporte e de censo.
- **Auditoria:** 🟡 registro de ator e data na execução da pré-validação e na geração da exportação, com o total de divergências apuradas.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 o componente é habilitado por tenant antes do período de exportação, com a pré-validação em modo informativo e a recusa de exportação por divergência impeditiva ativada na segunda etapa.
- **Como reverter (rollback):** 🟡 desativar a recusa de exportação e manter a pré-validação em modo informativo, sem alteração no layout do arquivo gerado.
- **Monitoramento pós-deploy:** 🟡 acompanhar o total de divergências impeditivas por escola, a taxa de conversão de tipos legados e o tempo de geração da exportação.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | ⚠️ ABERTO: A declaração de transporte público deve ser anulada quando a alocação é encerrada, ainda que o estudante use transporte escolar durante parte do ano letivo? | Alto | Produto | Antes do início da implementação |
| OQ-02 | ⚠️ ABERTO: O poder público responsável pertence ao cadastro da rota, à alocação ou à empresa de transporte? | Alto | Produto | Antes do início da implementação |
| OQ-03 | ⚠️ ABERTO: A recusa de exportação por divergência impeditiva pode ser suspensa pelo responsável, com registro de justificativa? | Alto | Jurídico | Antes do início da implementação |
| OQ-04 | ⚠️ ABERTO: O módulo de Censo Escolar do SYSGOV passa a consumir a alocação de transporte diretamente, ou continua consumindo o campo declarado no cadastro do estudante? | Médio | Arquitetura | 30 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Preservar a regra de anulação herdada do i-Educar | Redefinir a regra com a nova modelagem | A regra já está em produção no Censo e mudá-la altera dado oficial sem revisão legal |
| Derivar a tipologia modal a partir do veículo escalado | Manter somente a tipologia declarada no cadastro do aluno | A tipologia do veículo real é a informação auditável e rastreável |
| Recusa de exportação apenas após a etapa informativa | Recusa imediata em todo tenant | A pré-validação informativa permite corrigir a divergência antes de barrar o processo |

---

## Apêndice

### Referências
- `src/Modules/Educacenso/ExportRule/TransporteEscolarPublico.php` — regra de anulação da declaração.
- `src/Modules/Educacenso/Model/VeiculoTransporteEscolar.php` — tipologia modal aceita.
- `_reversa_sdd/Transport/legacy-mapping.md` — seções 3 e 4.4.
- Registro 60 do Censo Escolar, MEC e Inep — variáveis de transporte público, poder público responsável e tipologia modal.
- PNATE, FNDE, Lei nº 10.880/2004 — repasse por aluno transportado em área rural.
- `_reversa_sdd/adrs/005-educacenso-censo-escolar-stateless-batch-export.md` — exportação em lote sem estado.

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-10-20 | Reversa | Criação inicial a partir do PRD, do mapeamento do módulo Transport e da regra legada de exportação |

---

## Relatório de Avaliação

Avaliação automática de qualidade desta spec, executada por `reversa-spec-sdd/scripts/spec_scorer.py`.

```text
============================================================
  SPEC QUALITY REPORT
  Arquivo: D:\SYSTRAT\I-Educar\_reversa_sdd\sdd\censo-escolar-transporte.md
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
