# Spec Delta

## Purpose

Centraliza, por município (tenant), todos os prazos, dimensões e limites legais e operacionais usados pelas
regras de negócio do módulo de cemitérios, eliminando valores legais fixos em código.

## ADDED Requirements

### Requirement: Parâmetros legais configuráveis por município
<!-- rastreabilidade: RF-08, RF-12, RF-31, RF-32, RF-35; RN-01, RN-02, RN-07, RN-08, RN-09, RN-10; ADR-003 -->
O sistema SHALL manter, para cada tenant, um conjunto de parâmetros que inclui no mínimo: prazo mínimo de
exumação para adultos (anos), prazo mínimo de exumação para crianças (anos), idade-limite que classifica o
falecido como criança (anos), distanciamento mínimo entre jazigos (metros), dimensões máximas do túmulo
(comprimento e largura em metros), prazo do edital de abandono (dias), limite de obras simultâneas por
empreiteiro, antecedência da notificação de término de concessão (dias), número de suspensões que leva ao
cancelamento do empreiteiro, prazo padrão da concessão temporária (anos) e instruções de pagamento das guias
(texto e chave PIX opcional). Nenhuma regra de negócio do módulo SHALL usar um desses valores sem lê-lo dos
parâmetros do tenant.

#### Scenario: Tenant novo recebe valores de referência editáveis
- **WHEN** o módulo de cemitérios é habilitado para um tenant
- **THEN** o sistema cria o conjunto de parâmetros com os valores de referência do DRS (exumação adulto 3 anos, criança 2 anos, idade-limite 6 anos, distanciamento 0,50 m, túmulo 3,00 m × 2,10 m, edital 30 dias, 2 obras simultâneas, notificação 30 dias, 2 suspensões)
- **AND** todos os valores ficam editáveis pelo perfil autorizado

#### Scenario: Regra usa o valor do município
- **WHEN** o município A configura exumação de adultos em 5 anos e o município B em 3 anos
- **THEN** a validação de exumação de A exige 5 anos e a de B exige 3 anos, sem interferência entre tenants

### Requirement: Faixas legais de validação dos parâmetros
<!-- rastreabilidade: RF-08, RF-35; RN-01, RN-02, RN-10 -->
O sistema SHALL rejeitar valores de parâmetros fora das faixas legais de referência: prazo de exumação de
adultos entre 3 e 5 anos, prazo do edital de abandono entre 10 e 30 dias, e valores numéricos de prazo,
dimensão e limite estritamente positivos. As faixas SHALL ser definidas em configuração do módulo, e não em
lógica de regra.

#### Scenario: Prazo de edital fora da faixa
- **WHEN** o gestor tenta salvar o prazo do edital de abandono como 5 dias
- **THEN** o sistema rejeita a alteração com erro de validação indicando a faixa permitida (10 a 30 dias)

### Requirement: Vigência e histórico de parâmetros
<!-- rastreabilidade: RNF-08 -->
Toda alteração de parâmetro SHALL gerar uma nova versão com data de início de vigência, registro de autor e
registro de auditoria com valores anterior e novo. Uma operação SHALL ser avaliada com os parâmetros vigentes
na data em que foi solicitada, e o valor aplicado SHALL ficar registrado na própria operação.

#### Scenario: Alteração não retroage
- **WHEN** uma exumação foi deferida com prazo de 3 anos e depois o parâmetro muda para 5 anos
- **THEN** a exumação já deferida mantém o registro do prazo de 3 anos aplicado
- **AND** novas solicitações passam a usar 5 anos

### Requirement: Permissão para parametrizar
<!-- rastreabilidade: RNF-10; DRS §4 (Administrador Geral: configuração de regras) -->
Somente usuários com a permissão de parametrização do módulo SHALL alterar parâmetros; a leitura dos
parâmetros vigentes pelas regras internas não depende da permissão do usuário.

#### Scenario: Operador sem permissão
- **WHEN** um usuário sem permissão de parametrização envia uma alteração de parâmetro
- **THEN** o sistema responde 403 e nada é alterado
