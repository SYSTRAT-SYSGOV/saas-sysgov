# Design: Arquitetura Técnica do Submódulo de Alimentação Escolar (Merenda / PNAE)

## Context

O SYS-Educa (`Modules/Educa`) já conta com os submódulos de Core Escolar (anos letivos, calendários de 200 dias/800h, turmas, quadro de horários anti-choque), Secretaria (matrículas e enturmações), Pedagógico (diário, frequência, notas), Servidores (piso docente) e Transporte Escolar. A alimentação escolar demanda gestão nutricional especializada e atendimento a diretrizes do FNDE/PNAE, exigindo modelagem robusta de cardápios, controle de alergias sensíveis com isolamento estrito por `tenant_id` e integração ao Cadastro Único de Pessoas (`Modules\Pessoas\Models\Pessoa`).

## Goals / Non-Goals

**Goals:**
- Prover modelagem relacional completa e auditável para cardápios, itens de refeição, laudos de restrição alimentar e registros diários de consumo escolar.
- Implementar `NutritionCalculationService` para apuração de calorias (kcal) e percentual de macronutrientes (carboidratos, proteínas, lipídios e fibras) das preparações culinárias.
- Implementar `DietaryRestrictionService` com trava de segurança e alertas visuais automáticos nos pontos de contato com o aluno (ficha cadastral, chamada e merenda).
- Expor API REST documentada em OpenAPI 3.1.0 e controlada por policies RBAC (`educa.merenda.*`).
- Implementar interface interativa no `apps/web-client` (`AlimentacaoEscolarView.tsx`) usando exclusivamente primitivos de `@sysgov/ui` e tipografia `JetBrains Mono` (`font-mono tabular-nums`).

**Non-Goals:**
- Não inclui módulo completo de compras públicas ou licitação de gêneros alimentícios (que pertence a `Modules/Licitacoes` e `Modules/Contratos`). O foco deste submódulo é o cardápio, a segurança nutricional do aluno e o controle diário de consumo/desperdício nas escolas.
- Não substitui prontuário médico clínico completo (pertencente ao SYS-Saúde). O registro limita-se a laudos e atestados aplicáveis à merenda escolar.

## Decisions

### 1. Modelagem de Dados e Relacionamentos
- `educa_menus`: Cabeçalho do cardápio (`id`, `tenant_id`, `academic_year_id`, `nome`, `etapa_ensino`, `turno`, `mes_vigencia`, `ano_vigencia`, `status` [rascunho, homologado, inativo], `nutritionist_employee_id`, `crn_registro`, `homologado_em`).
- `educa_menu_items`: Dias e refeições do cardápio (`id`, `tenant_id`, `menu_id`, `dia_semana`, `tipo_refeicao` [desjejum, colacao, almoco, lanche_tarde], `preparacao_nome`, `ingredientes_descricao`, `calorias_kcal`, `carboidratos_g`, `proteinas_g`, `lipidios_g`, `fibras_g`).
- `educa_dietary_restrictions`: Prontuário de restrições (`id`, `tenant_id`, `pessoa_id`, `tipo_restricao` [lactose, gluten, diabetes, alergia_ovo, alergia_amendoim, fenilcetonuria, outra], `descricao_detalhada`, `gravidade` [leve, moderada, severa_anafilatica], `data_laudo`, `validade_laudo`, `medico_crm`, `preparacao_adaptada_sugerida`, `ativo`).
- `educa_meal_logs`: Registro diário de refeições (`id`, `tenant_id`, `school_id`, `menu_id`, `data_refeicao`, `tipo_refeicao`, `quantidade_alunos_presentes`, `quantidade_refeicoes_servidas`, `sobra_limpa_kg`, `resto_ingesta_kg`, `observacoes`).

### 2. Validação Nutricional e Alertas Preventivos
- O serviço `NutritionCalculationService` confronta os totais calculados com os percentuais mínimos de referência do FNDE por faixa etária (ex: Creche período integral deve cobrir no mínimo 70% das necessidades nutricionais diárias).
- Estudantes com restrições classificadas como `severa_anafilatica` geram notificação de alta prioridade na matrícula e na lista de chamada da turma.

### 3. Integração com os Pilares Fundacionais do SYSGOV
- **Pessoas (MDM & LGPD)**: Alunos e nutricionistas apontam para `pessoas.id` via chave estrangeira. Dados médicos/alérgicos sensíveis contam com trilha auditada no `audit_logs` para conformidade com a LGPD.
- **OrgChart**: Toda escola vincula-se a `educa_schools` e `org_units`.
- **Multi-Tenant Estrito**: Todas as tabelas possuem `tenant_id`, trait `TenantAware` e índices compostos `(tenant_id, ...)`.

## Risks / Trade-offs

- **[Risco] Inserção de dados nutricionais genéricos sem precisão técnica** → *Mitigação:* O sistema exige a homologação formal com o número do Conselho Regional de Nutricionistas (CRN) antes de liberar a vigência do cardápio na rede.
- **[Risco] Aluno celíaco ou alérgico grave receber refeição com contaminação cruzada** → *Mitigação:* Alerta visual destacado em vermelho no diário do professor e na lista diária da cozinha com a identificação nominal da preparação substituta autorizada.
- **[Risco] Sobrecarga de preenchimento diário pelas escolas** → *Mitigação:* Interface simplificada com preenchimento em 3 campos (refeições servidas, sobra limpa e restos) com pré-preenchimento baseado na frequência escolar do dia.

## Migration Plan

1. Executar migration `educa_merenda_tables` com `tenant_id` e UUID.
2. Inserir permissões de RBAC `educa.merenda.*` no seeder oficial do módulo.
3. Disponibilizar endpoints REST na API e nova aba de "Alimentação Escolar" no `apps/web-client`.
4. Rollback seguro: Nenhuma tabela existente é alterada; caso necessário desativar, basta remover as permissões do perfil ou revogar o toggle do módulo.
