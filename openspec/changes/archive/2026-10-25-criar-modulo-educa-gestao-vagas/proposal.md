# Proposta: Gestão de Vagas, Fila de Espera Unificada e Pré-Matrícula Municipal

## Por que

A gestão democrática do acesso à educação básica pública municipal — em especial na Educação Infantil (creches e pré-escolas) e nas primeiras etapas do Ensino Fundamental — exige transparência ativa, equidade e cumprimento estrito da legislação federal:
- **Lei Federal nº 14.685/2023**: Torna obrigatória a divulgação pública e transparente da ordem de espera e dos critérios de atendimento para vagas na educação infantil e básica da rede pública.
- **Estatuto da Criança e do Adolescente (ECA - Lei 8.069/1990) & Lei Brasileira de Inclusão (LBI - Lei 13.146/2015)**: Garantem prioridade absoluta a crianças e adolescentes com deficiência ou sob medida de proteção.
- **Equidade e Zoneamento**: Necessidade de critérios auditáveis e impessoais de pontuação socioeconômica (CadÚnico/Bolsa Família, mãe trabalhadora, proximidade de residência e irmãos na mesma escola) para eliminar favorecimentos ou filas paralelas em balcão.
- **Integração Nativa com o SYSGOV**: Conectar a solicitação de vaga à base única de cidadãos (`Modules/Pessoas`), ao fluxo de protocolo com autuação oficial (`Modules/Protocolo`) e, após o deferimento, viabilizar a conversão automática em matrícula ativa (`EducaEnrollment`).

## O que será construído

1. **Parametrização de Oferta e Capacidade de Vagas (`educa_school_capacities`)**:
   - Definição por escola, etapa de ensino e turno do número de salas, capacidade por turma e teto regulamentado.
   - Apuração em tempo real de vagas existentes, vagas preenchidas, vagas reservadas e vagas remanescentes.

2. **Cadastro e Gestão de Pré-Matrícula (`educa_enrollment_applications`)**:
   - Formulário de inscrição online e presencial vinculado a `pessoa_id` do candidato e do responsável.
   - Seleção de opções de escolas desejadas por ordem de preferência e indicação de zoneamento residencial.
   - Comprovação documental de critérios de pontuação socioeconômica e vulnerabilidade.

3. **Motor de Classificação e Fila de Espera Transparente (`educa_waitlists` & `WaitlistRankingService`)**:
   - Algoritmo determinístico de pontuação baseado em pesos auditáveis:
     - PcD / Necessidades Especiais (prioridade mandatória).
     - Vulnerabilidade social (CadÚnico / Bolsa Família).
     - Vínculo familiar (irmão matriculado na mesma unidade).
     - Mãe trabalhadora comprovada.
     - Proximidade de endereço (zoneamento).
   - Consulta pública de posição na fila de espera com máscara de dados sensíveis (LGPD).

4. **Convocação, Deferimento e Conversão em Matrícula**:
   - Fluxo de chamada nominal com prazo de comparecimento (SLA de resposta).
   - Deferimento com conversão automática dos dados em `EducaEnrollment` no subdomínio da Secretaria Escolar.

5. **Interface no Frontend (`apps/web-client`)**:
   - Tela `GestaoVagasView.tsx` integrada ao `EducaModule.tsx` exibindo:
     - Painel geral de capacidade e ocupação da rede escolar municipal.
     - Gestão de inscrições de pré-matrícula e análise documental.
     - Fila de espera unificada ordenada com simulador de critérios e convocação nominal.

## Impacto nos Usuários e na Operação

- **Gestores e Secretaria de Educação**: Visão unificada da demanda reprimida por bairro e etapa de ensino, embasando abertura de novas turmas ou parcerias conveniadas.
- **Comunidade Escolar e Famílias**: Acesso a uma lista de espera pública, transparente e rastreável, com notificações formais de convocação.
- **Órgãos de Controle (Ministério Público e Conselhos)**: Rastreabilidade completa e trilha de auditoria (`AuditLogger`) para fiscalização de atendimento prioritário.
