# Proposal: Submódulo de Educação Especial e Atendimento Educacional Especializado (AEE)

## Why

A garantia do direito à educação inclusiva e ao Atendimento Educacional Especializado (AEE) é um dever constitucional e legal dos municípios brasileiros (Lei de Diretrizes e Bases da Educação Nacional nº 9.394/1996, Lei Brasileira de Inclusão da Pessoa com Deficiência nº 13.146/2015, Decreto nº 7.611/2011 e Resolução CNE/CEB nº 4/2009). Atualmente, as redes municipais enfrentam desarticulação na gestão dos Planos Educacionais Individualizados (PEI), controle de laudos médicos com CID-10/11, dimensionamento de salas de recursos multifuncionais (SRM) e alocação de profissionais de apoio escolar (cuidadores e intérpretes de Libras). A implementação deste submódulo integrado ao SYS-Educa assegura conformidade legal plena, auditoria pedagógica contínua e reporte fidedigno ao Censo Escolar (MEC/Inep).

## What Changes

- **Identificação e Prontuário do Aluno PAEE:** Cadastro de condições do Público-Alvo da Educação Especial (Deficiência, TEA, Altas Habilidades/Superdotação) com repositório seguro de laudos médicos periciais, classificação CID-10/CID-11 e pareceres da equipe multidisciplinar.
- **Plano Educacional Individualizado (PEI / Plano de AEE):** Criação e acompanhamento colaborativo do PEI contendo objetivos pedagógicos, adequações curriculares na sala regular, recursos de tecnologia assistiva e avaliações periódicas de desenvolvimento.
- **Salas de Recursos Multifuncionais (SRM) & Atendimento no Contraturno:** Enturmação e controle de frequência do atendimento no contraturno escolar em SRMs polos ou da própria unidade.
- **Gestão de Profissionais de Apoio Escolar:** Alocação de cuidadores/estagiários de apoio à alimentação/higiene/locomoção e tradutores/intérpretes de Libras, com trava contra sobrecarga de atendimento por profissional.
- **Recursos de Acessibilidade & Tecnologia Assistiva:** Inventário de equipamentos e materiais didáticos adaptados por escola e aluno.

## Capabilities

### New Capabilities

- `educa-aee-estudantes`: Identificação do público-alvo da educação especial (PAEE), laudos médicos periciais com CID-10/11, barreiras de aprendizagem e histórico clínico-pedagógico.
- `educa-aee-plano-individualizado`: Elaboração, validação e acompanhamento do Plano Educacional Individualizado (PEI) e cronograma de atendimento no contraturno em salas de recursos.
- `educa-aee-apoio-acessibilidade`: Dimensionamento e alocação de profissionais de apoio escolar (cuidadores, intérpretes de Libras) e gestão de equipamentos de tecnologia assistiva.

### Modified Capabilities

Nenhuma capacidade existente sofre alteração de requisitos funcionais de forma incompatível; o submódulo consome e estende os dados de `educa-secretaria-matriculas`, `educa-servidores-lotacao-jornada` e `pessoas`.

## Impact

- **Backend (`apps/api/Modules/Educa`):** Novas migrations, models (`EducaAeeStudentProfile`, `EducaAeePei`, `EducaAeeResourceRoom`, `EducaAeeSupportAllocation`), services, FormRequests, policies RBAC (`educa.aee.*`) e rotas sob `/api/educa/aee/*`.
- **Frontend (`apps/web-client`):** Nova view `EducacaoEspecialAeeView.tsx` integrada às abas do `EducaModule.tsx`, com componentes `@sysgov/ui` e design acessível.
- **Módulos Core Vinculados:** Integração direta com `Modules/Pessoas` (Cadastro único com integridade de tenant), `OrgChart` (unidades e SRMs) e `Educacenso` (campos obrigatórios do Inep para alunos com deficiência).
