# ADR 0002: Pool com isolamento lógico

**Status:** aceito

Dados transacionais compartilham o banco MySQL e toda tabela de negócio carrega `tenant_id`, com escopo global no model e contexto resolvido no backend. O frontend nunca escolhe um tenant sem validação da associação usuário-tenant. Índices e unicidades começam por tenant para reduzir risco de vazamento e preparar a migração futura para banco dedicado.
