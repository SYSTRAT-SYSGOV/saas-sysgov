# Spec: Oferta e Capacidade de Vagas Escolares

## Purpose

Parametrização e apuração da capacidade física e regulamentar de atendimento de cada unidade escolar municipal, com controle dinâmico de vagas totais, vagas ocupadas e vagas remanescentes por etapa de ensino e turno.

## Requirements

### Requirement: Parametrização da Capacidade de Vagas por Escola e Turno
O sistema DEVE (SHALL) permitir cadastrar o quadro de vagas ofertadas por escola municipal para cada ano letivo, segmentado por etapa de ensino (creche berçário, maternal, pré-escola, anos iniciais, anos finais e EJA) e turno (matutino, vespertino, integral ou noturno).

#### Scenario: Definição de capacidade física de creche em tempo integral
- **WHEN** a Secretaria de Educação cadastra a oferta de 40 vagas de berçário integral para a EMEI Sol Nascente no ano letivo vigente
- **THEN** o sistema registra a capacidade máxima regulamentada com trava de integridade impedindo alocação acima do limite físico sem autorização especial

#### Scenario: Atualização em tempo real de vagas remanescentes
- **WHEN** uma nova matrícula é efetivada ou cancelada na escola para a referida etapa
- **THEN** o sistema recalcula imediatamente o quantitativo de vagas preenchidas e remanescentes disponíveis para a fila de espera

### Requirement: Monitoramento de Demanda e Ocupação da Rede Municipal
O sistema DEVE (SHALL) gerar indicadores de taxa de ocupação escolar e saldo de vagas por microrregião geográfica / bairro.

#### Scenario: Consulta de mapa de ocupação por bairro
- **WHEN** o gestor educacional consulta o painel de capacidade da zona leste
- **THEN** o sistema exibe a soma de vagas totais, taxa de ocupação percentual e escolas com déficit ou superávit de atendimento
