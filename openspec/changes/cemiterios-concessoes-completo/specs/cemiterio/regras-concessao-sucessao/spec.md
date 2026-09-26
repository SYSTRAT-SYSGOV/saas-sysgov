# Spec Delta

## ADDED Requirements

### Requirement: Extinção de Concessão por Renúncia Voluntária
O sistema SHALL permitir a extinção de uma concessão vigente por renúncia voluntária do concessionário,
como hipótese distinta da expiração automática por decurso de prazo e da extinção por abandono, exigindo o
registro do motivo/justificativa e, quando houver, do número do processo administrativo de baixa, e SHALL
liberar o jazigo para nova concessão somente após a confirmação da renúncia.

#### Scenario: Renúncia de concessão vigente
- **WHEN** o concessionário formaliza a renúncia de uma concessão vigente e o operador confirma a operação
  informando o motivo
- **THEN** o sistema registra a concessão como `extinta` com o motivo de extinção "renúncia", grava o
  evento na auditoria e libera o jazigo para nova concessão

#### Scenario: Tentativa de renúncia sem motivo informado
- **WHEN** o operador tenta registrar a renúncia de uma concessão sem informar o motivo/justificativa
- **THEN** o sistema rejeita a operação e exige o preenchimento do motivo antes de extinguir a concessão

#### Scenario: Renúncia de concessão já extinta ou expirada
- **WHEN** o operador tenta registrar renúncia para uma concessão cuja situação não é "vigente"
- **THEN** o sistema impede a operação com erro de regra de negócio, pois apenas concessões vigentes podem
  ser objeto de renúncia
