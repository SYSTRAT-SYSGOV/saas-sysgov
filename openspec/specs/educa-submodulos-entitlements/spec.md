# Submódulos e Licenciamento do SYS-Educa Specification

## Purpose
Regula a ativação dinâmica, os planos de contratação e as dependências acíclicas entre os 7 submódulos verticais do SYS-Educa por tenant.

## Requirements

### Requirement: Submódulos ativáveis por licença
O sistema SHALL ativar os submódulos do Educa (`core`, `secretaria`, `pedagogico`, `servidores`, `educacenso`, `transporte`, `comunicacao`) como módulos do catálogo (aliases `educa`, `educa-secretaria`, `educa-pedagogico`, `educa-servidores`, `educa-educacenso`, `educa-transporte`, `educa-comunicacao`) protegidos por `module-access:{alias}`, sendo `core` obrigatório. Submódulo não licenciado SHALL responder 403 com `code=MODULE_ACCESS_DENIED` e SHALL ser omitido do menu.

#### Scenario: Submódulo não licenciado
- **WHEN** o tenant não possui o módulo `educa` habilitado e o usuário acessa uma rota do core
- **THEN** a resposta é 403 com `code=MODULE_ACCESS_DENIED`

### Requirement: Dependências entre submódulos
O sistema SHALL exigir que as dependências declaradas no manifesto estejam ativas e licenciadas antes de ativar um submódulo, e o grafo de dependências SHALL ser acíclico.

#### Scenario: Ativar educacenso sem secretaria
- **WHEN** a ativação de `educacenso` é solicitada sem `secretaria` ativo
- **THEN** a ativação é recusada informando a dependência ausente
