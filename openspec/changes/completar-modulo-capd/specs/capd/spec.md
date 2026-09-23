# Spec Delta

## MODIFIED Requirements

### Requirement: Sincronização de Dados de Servidor e Unidade
<!-- id: RhIntegrationService.sincronizar -->
<!-- entities: Servidor, OrgUnit, RhIntegrationService -->
<!-- enforced: RhIntegrationService.sincronizar() -->
A sincronização de dados de servidores e unidades organizacionais SHALL ser bidirecional e atômica, garantindo que qualquer alteração de lotação ou cargo no módulo de RH seja refletida no CAPD em tempo real (ou via trigger de evento).

#### Scenario: Sincronização de Mudança de Lotação
- **WHEN** o servidor é transferido de unidade no módulo de RH
- **THEN** o `RhIntegrationService` atualiza a `org_unit_id` no `capd_servidores` e registra a alteração no histórico de unidades do servidor, preservando a integridade de avaliações já concluídas em ciclos anteriores.

#### Scenario: Validação de Consistência de Dados
- **WHEN** a sincronização detecta um servidor ativo no RH mas ausente no CAPD
- **THEN** o sistema cria automaticamente o registro no módulo CAPD com as configurações padrão de plano de carreira, disparando um alerta para o Gestor de RH validar a parametrização.
