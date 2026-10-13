# ADR-011: Atributos dinâmicos como serviço transversal de validação no núcleo

- **Status**: Proposta
- **Data**: 2026-10-13
- **Mudança relacionada**: `openspec/changes/criar-modulo-protocolo`

## Contexto

O Protocolo precisa de atributos dinâmicos tipados (numerico, texto, lista, lista_multipla, data, decimal,
texto_longo), e a mesma necessidade deve ser reutilizável por outros módulos sem criar dependência entre eles.

## Decisão

Catálogo de tipos e validação em `App\Support\AtributosDinamicos` (núcleo da plataforma), sem persistência.
Cada módulo persiste seus atributos em tabela própria (no Protocolo, `protocolo_atributos` com `valor` JSON).
`decimal` é validado e armazenado como string decimal — nunca `float`; valores monetários, se surgirem, usam
`App\Support\Money`.

## Alternativas consideradas

- **Validação dentro do módulo Protocolo**: outros módulos teriam de depender do Protocolo ou duplicar regras.
- **Módulo dedicado "Atributos" com tabela única polimórfica**: extração prematura, contrária à política de
  adiar extrações até haver necessidade comprovada.
- **EAV global único**: acopla dados de todos os módulos em uma tabela e complica isolamento e índices.

## Consequências

- (+) Regras idênticas entre módulos, sem acoplamento entre módulos de negócio.
- (+) Cada módulo controla índices e ciclo de vida dos seus atributos.
- (−) Definições/opções de atributos por tipo de processo não existem em v1 (validação apenas estrutural).
