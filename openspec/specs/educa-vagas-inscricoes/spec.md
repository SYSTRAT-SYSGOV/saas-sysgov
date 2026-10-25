# Spec: Inscrições e Pré-Matrícula Municipal

## Purpose

Gestão do processo de solicitação de vagas e pré-matrícula escolar municipal, com identificação civil do aluno e do responsável legal, preferências de unidades escolares, comprovação de zoneamento e pontuação socioeconômica.

## Requirements

### Requirement: Registro de Solicitação de Vaga Escolar
O sistema DEVE (SHALL) registrar solicitações formais de vaga escolar vinculando o candidato (`pessoa_id`) e o responsável legal (`responsavel_pessoa_id`) ao cadastro único de pessoas do SYSGOV (`Modules/Pessoas`).

#### Scenario: Inscrição com opções de unidades escolares
- **WHEN** o responsável inscreve uma criança na pré-matrícula da educação infantil
- **THEN** o sistema permite selecionar até 3 unidades escolares de preferência e anexa o comprovante de residência com georreferenciamento de zoneamento

#### Scenario: Validação de idade corte para ingresso (Portaria MEC)
- **WHEN** a data de nascimento do candidato for informada
- **THEN** o sistema valida automaticamente a faixa etária correspondente à etapa solicitada segundo a data corte oficial (31 de março do ano letivo)

### Requirement: Comprovação de Critérios de Prioridade Socioeconômica
O sistema DEVE (SHALL) receber e analisar documentos comprobatórios dos critérios de prioridade social parametrizados pelo município.

#### Scenario: Comprovação de benefício de transferência de renda
- **WHEN** o responsável anexa o NIS/CadÚnico ou comprovante de benefício social vigente
- **THEN** o sistema atribui a pontuação de vulnerabilidade social à solicitação após validação da equipe de triagem

#### Scenario: Comprovação de irmão matriculado na mesma unidade
- **WHEN** o responsável indica que outro filho já estuda na escola pretendida
- **THEN** o sistema verifica a matrícula ativa do irmão na base de dados e pontua o critério de agrupamento familiar
