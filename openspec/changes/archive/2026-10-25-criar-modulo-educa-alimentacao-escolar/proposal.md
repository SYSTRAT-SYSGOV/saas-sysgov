# Proposal: Submódulo de Alimentação Escolar (Merenda / PNAE) no SYS-Educa

## Why

A gestão da merenda escolar nos municípios brasileiros é regida pelas diretrizes rigorosas do Programa Nacional de Alimentação Escolar (PNAE / FNDE - Lei Federal nº 11.947/2009 e Resolução CD/FNDE nº 6/2020), que exigem planejamento nutricional balanceado por faixa etária, atendimento prioritário a estudantes com restrições ou alergias alimentares comprovadas por laudo e prestação de contas com controle diário de refeições servidas. Atualmente, as secretarias de educação operam essas rotinas de forma fragmentada ou em planilhas manuais, resultando em risco sanitário para alunos alérgicos, desperdício de insumos públicos e apontamentos em auditorias dos Conselhos de Alimentação Escolar (CAE) e FNDE. Este submódulo unifica e automatiza a gestão nutricional municipal integrada ao Cadastro Único de Pessoas (MDM) e às escolas do SYSGOV.

## What Changes

- **Parametrização de Cardápios Nutricionais do PNAE**: Criação de cardápios semanais e mensais organizados por etapa de ensino (creche, pré-escola, ensino fundamental, EJA) e turno escolar, contendo fichas técnicas de preparação, ingredientes e estimativas de macronutrientes (carboidratos, proteínas, lipídios, fibras) e calorias mínimas exigidas pelo FNDE, com homologação por Nutricionista Responsável Técnico (CRN).
- **Prontuário de Restrições Alimentares e Alergias**: Registro de laudos médicos de alunos com patologias ou restrições alimentares (intolerância à lactose, doença celíaca/glúten, diabetes mellitus, fenilcetonúria, alergia a ovo/leite/oleaginosas), exibindo badge visual crítico na lista de chamada e ficha da secretaria, com indicação de cardápio adaptado individualizado.
- **Registro Diário de Refeições Servidas e Controle de Desperdício**: Lançamento diário das refeições preparadas e distribuídas por unidade escolar (desjejum, colação, almoço, lanche da tarde), com quantitativo de alunos atendidos, monitoramento de sobras limpas/restos e controle de consumo de insumos na despensa escolar.
- **Auditoria, Trilha LGPD e Indicadores CAE**: Trilha imutável em `audit_logs` de todas as alterações de cardápio e laudos de saúde, com geração de relatórios de conformidade para o Conselho de Alimentação Escolar (CAE).

## Capabilities

### New Capabilities
- `educa-merenda-cardapios`: Planejamento, versionamento e homologação técnica de cardápios escolares com cálculo nutricional e faixas etárias do PNAE/FNDE.
- `educa-merenda-restricoes`: Gestão de laudos médicos, cadastro de restrições/alergias alimentares de alunos e emissão de alertas na rotina escolar.
- `educa-merenda-refeicoes`: Registro diário de refeições servidas por escola/turno com controle de desperdício e prestação de contas.

### Modified Capabilities
<!-- Nenhuma capacidade existente tem seus requisitos funcionais alterados. -->

## Impact

- **Backend (`apps/api`)**:
  - Novo submódulo sob `Modules/Educa/Submodules/Merenda` ou integrado a `Modules/Educa`: Models Eloquent (`EducaMenu`, `EducaMenuItem`, `EducaDietaryRestriction`, `EducaMealLog`), Migrations com PK UUID e `tenant_id`, Services (`NutritionCalculationService`, `MealLogService`), Policies e rotas REST `/api/educa/merenda/*`.
  - Integração com `Modules\Pessoas\Models\Pessoa` para vinculação de laudos de restrição alimentar de estudantes e CRN de nutricionistas.
  - Extensão do middleware de acesso de submódulo `module-access:educa-merenda`.
- **Frontend (`apps/web-client`)**:
  - Nova visualização e aba no `EducaModule.tsx`: `AlimentacaoEscolarView.tsx` com sub-abas de Cardápios da Semana, Prontuário de Alergias e Registro Diário de Refeições.
  - Componentes do Design System `@sysgov/ui`: `Card`, `Badge`, `Button`, `Modal`, `Table`, `Input`, `Select` e tipografia `JetBrains Mono` (`font-mono tabular-nums`).
- **Segurança & RBAC**:
  - Permissões granulares: `educa.merenda.cardapio.manage`, `educa.merenda.cardapio.view`, `educa.merenda.restricoes.manage`, `educa.merenda.refeicoes.register`.
