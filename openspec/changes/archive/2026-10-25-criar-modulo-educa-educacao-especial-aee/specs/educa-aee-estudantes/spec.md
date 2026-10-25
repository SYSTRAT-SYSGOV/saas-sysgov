# Spec Delta: Prontuário e Laudos de Alunos da Educação Especial

## Purpose

Identificação cadastral, classificação clínica e pedagógica de estudantes do público-alvo da educação especial (PAEE), controle de laudos médicos com CID-10/11, barreiras de acessibilidade e histórico de desenvolvimento.

## ADDED Requirements

### Requirement: Cadastro de Perfil de Educação Especial do Estudante
O sistema DEVE (SHALL) permitir cadastrar o perfil de educação especial vinculado à matrícula ativa do estudante, especificando as categorias do público-alvo (deficiência física, auditiva, visual, intelectual, surdocegueira, deficiência múltipla, Transtorno do Espectro Autista ou Altas Habilidades/Superdotação).

#### Scenario: Registro de diagnóstico com laudo médico comprobatório
- **WHEN** o coordenador pedagógico ou especialista em AEE vincula um aluno à educação especial informando código CID-10/11, data de emissão do laudo e profissional emissor (CRM/CRP)
- **THEN** o sistema armazena o prontuário sob controle de sigilo médico LGPD e atualiza o indicador de estudante com deficiência para exportação do Censo Escolar

#### Scenario: Registro provisório durante processo de investigação diagnóstica
- **WHEN** o estudante apresenta hipótese diagnóstica em avaliação multiprofissional sem laudo conclusivo
- **THEN** o sistema permite atendimento temporário de AEE com sinalização de laudo pendente e prazo máximo de reavaliação

### Requirement: Mapeamento de Barreiras e Necessidades de Acessibilidade
O sistema DEVE (SHALL) registrar o inventário de barreiras pedagógicas, arquitetônicas, comunicacionais e atitudinais enfrentadas pelo aluno no ambiente escolar.

#### Scenario: Identificação de barreira de comunicação e necessidade de Libras
- **WHEN** a equipe avalia estudante surdo com necessidade de língua de sinais
- **THEN** o sistema registra a demanda prioritária por Tradutor e Intérprete de Libras e material bilíngue
