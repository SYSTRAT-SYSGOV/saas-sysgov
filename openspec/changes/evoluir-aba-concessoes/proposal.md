# Proposal

## Why

A aba Concessões do módulo de Cemitérios (SIGCM) atualmente possui apenas um status simples para controlar o estado das concessões de uso de jazigo, sem atender aos requisitos legais e operacionais completos para gestão de concessões em cemitérios municipais. É necessário implementar uma máquina de estados robusta que reflita o ciclo de vida jurídico completo das concessões, incluindo distinção entre concessões perpétuas e temporárias, sucessão hereditária, transferência inter vivos, caducidade, revogação, integração financeira e outras funcionalidades essenciais para conformidade com a legislação municipal e boas práticas de gestão funerária.

## What Changes

- Implementar máquina de estados da concessão com transições auditadas (append-only) incluindo estados: Solicitada, Ativa, Vencendo, Vencida, Caduca, Revertida, Sucedida, Transferida, Negada
- Distinguir concessão perpétua (prazo indeterminado) e temporária (prazo fixo parametrizável) com regras específicas por tipo (exumação obrigatória na temporária, reversão ao fim do prazo)
- Implementar fluxo completo de sucessão hereditária (causa mortis) com registro de herdeiros, inventário e titular indicado
- Permitir transferência inter vivos quando a lei municipal permitir, com validação de base legal
- Implementar caducidade e revogação com registro de motivo e processo de referência
- Criar registro geral numerado de concessões e suportar regularização de uso (transferência, sucessão, inclusão de titular)
- Vincular taxa anual de manutenção à concessão e integrar com módulo financeiro via outbox para geração de guias
- Implementar notificações de vencimento (prazo de manifestação configurado) e painel de concessões a vencer/vencidas
- Armazenar documentos digitalizados (termo, escritura, inventário) com hash e manter histórico append-only acessível
- Todas as regras de negócio (prazos, valores, base legal) devem ser parametrizáveis por tenant, nunca constantes fixas

## Capabilities

### New Capabilities
- `concessoes-completo`: Implementa o ciclo de vida jurídico completo da concessão de uso de jazigo em cemitério municipal, incluindo máquina de estados, sucessão hereditária, transferência inter vivos, caducidade, taxa de manutenção e integração financeira

### Modified Capabilities
- (Nenhuma - esta é uma nova capacidade)

## Impact

- Backend: Novas migrations, models, controllers, services e testes para o módulo de concessões em apps/api/Modules/Cemiterios
- Frontend: Novos componentes, atualizações em ConcessoesView.tsx, SucessaoView.tsx, api.ts e testes em apps/web-client/src/modules/cemiterios
- Banco de dados: Novas tabelas concessions, concession_historico, concession_documentos, concession_herdeiros com tenant_id e TenantAware
- Integrações: Conexão com módulo financeiro via outbox para geração de guias de manutenção anual
- Segurança: Novas policies e gates para controle de acesso baseado nas novas transições de estado