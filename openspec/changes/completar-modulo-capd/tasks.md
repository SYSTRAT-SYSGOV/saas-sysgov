# Tasks

## 1. Integração de Assinatura Digital (ICP-Brasil)

- [x] 1.1 Implementar a lógica real de chamada ao PSC no `IcpBrasilAdapter.php` e verificar via teste unitário que a resposta do mock do PSC é processada corretamente.
- [x] 1.2 Criar middleware de validação de certificado para endpoints de assinatura e verificar que certificados expirados retornam HTTP 423.
- [x] 1.3 Implementar o registro de timestamp e ID de transação do PSC na tabela de atas e verificar a persistência no banco de dados.
- [x] 1.4 Criar componente de status de assinatura no frontend (`apps/web-client`) e verificar a exibição do selo de validade jurídica.

## 2. Automações e Notificações

- [x] 2.1 Criar `CicloOpened` Event e `SendCycleNotification` Listener no backend e verificar que o evento é disparado ao abrir um ciclo.
- [x] 2.2 Implementar o Job `SendNotificationJob` com suporte a filas e verificar o envio de e-mails via logs do Laravel.
- [x] 2.3 Implementar o comando de agendamento (`Scheduler`) para alertas de prazo de 5 dias e verificar a execução via `php artisan schedule:run`.
- [x] 2.4 Implementar a transição automática de etapas no `CicloService` e verificar via teste de feature que a etapa muda após a data limite.

## 3. Sincronização de RH Bidirecional

- [x] 3.1 Atualizar `RhIntegrationService` para processar eventos de mudança de lotação do núcleo de RH e verificar a atualização da `org_unit_id` no CAPD.
- [x] 3.2 Implementar a criação automática de registros de servidores ausentes no CAPD e verificar que o alerta para o Gestor de RH é gerado.
- [x] 3.3 Implementar log de auditoria para cada sincronização realizada e verificar a presença dos registros na tabela `audit_logs`.

## 4. Ferramentas de Auditoria e Amostragem

- [ ] 4.1 Implementar query de amostragem aleatória por unidade organizacional usando Window Functions e verificar a representatividade do resultado.
- [ ] 4.2 Criar endpoint de distribuição de notas para o Dashboard de Auditoria e verificar que a média da unidade é calculada corretamente.
- [ ] 4.3 Implementar o relatório de consistência CIT (Nota vs Evidências) e verificar que avaliações com nota 5 sem incidentes são sinalizadas.
- [ ] 4.4 Desenvolver a interface de amostragem no frontend e verificar a geração da lista de trabalho para os relatores.
