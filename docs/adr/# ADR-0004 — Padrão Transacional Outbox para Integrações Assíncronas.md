# ADR-0004 — Padrão Transacional Outbox para Integrações Assíncronas

- **Status:** Aceito (implementado)
- **Data:** 22/08/2026
- **Decisores:** Arquitetura de Software SYSTRAT

## Contexto

A plataforma integra-se a serviços governamentais externos de alta latência e
disponibilidade variável (PNCP, gateways bancários, provedores de mensageria).
Chamadas HTTP síncronas durante a requisição degradam a experiência e geram risco
de inconsistência transacional (ex.: contrato salvo localmente, mas falha de rede
ao enviar ao PNCP).

## Decisão

Adotar o padrão **Transactional Outbox**. Eventos que demandam comunicação externa
são persistidos na tabela `outbox_events` **na mesma transação** do fato gerador.
Workers em background (Laravel Queue/Horizon) consomem os eventos, aplicam *backoff*
exponencial em falhas e registram a confirmação de entrega de forma assíncrona e
rastreável.

## Consequências

- ✅ Desacoplamento de latência externa.
- ✅ Garantia de entrega *at-least-once delivery*.
- ✅ Resiliência contra indisponibilidade temporária de APIs governamentais.
- ⚠️ Consistência eventual entre o sistema e a API externa (aceitável para
  notificações/integrações).

## Alternativas consideradas

- **Chamada HTTP síncrona na transação** — rejeitado pelo risco de travamento de
  conexões e rollbacks fantasmas.
- **Envio direto para fila Redis sem persistência** — rejeitado pelo risco de perda
  de eventos em falhas de processo do Redis.