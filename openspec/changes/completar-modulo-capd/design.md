# Design

## Context

O módulo CAPD já implementa a lógica de negócio de avaliação, mas as camadas de integração e automação são rudimentares. A assinatura digital é atualmente simulada via mocks, e a sincronização de RH é unidirecional e manual. A infraestrutura de notificação é inexistente, dependendo de disparos manuais ou verificações periódicas do usuário.

## Goals / Non-Goals

**Goals:**
- Substituir mocks de assinatura por integração real com ICP-Brasil via PSC.
- Implementar motor de notificações assíncronas para ciclos avaliativos.
- Transformar a sincronização de RH em um processo bidirecional e automatizado.
- Criar visões de auditoria baseadas em amostragem estatística.

**Non-Goals:**
- Alterar a metodologia de avaliação (Escala Gráfica/CIT).
- Implementar novo sistema de autenticação de usuários (reutiliza o núcleo).
- Substituir a infraestrutura de banco de dados atual.

## Decisions

### 1. Integração ICP-Brasil via Adapter Pattern
**Decisão**: Implementar a integração com o PSC através de um `IcpBrasilAdapter` que implementa `AssinaturaDigitalInterface`.
**Racional**: Permite a troca do prestador de serviço de confiança sem impactar a lógica de negócio do módulo.
**Alternativas**: Chamadas diretas no service. Rejeitado por acoplamento excessivo.

### 2. Notificações via Laravel Queue e Eventos
**Decisão**: Utilizar `Events` e `Listeners` do Laravel disparando `Jobs` em fila para notificações.
**Racional**: Garante que a experiência do usuário não seja impactada por latências de envio de e-mail ou APIs externas.
**Alternativas**: Síncrono. Rejeitado por risco de timeout em lotes grandes de servidores.

### 3. Sincronização de RH via Webhooks/Eventos do Núcleo
**Decisão**: O `RhIntegrationService` passará a ouvir eventos de mudança de lotação/cargo disparados pelo módulo de RH.
**Racional**: Evita a necessidade de polls constantes no banco de dados, reduzindo a carga no servidor.
**Alternativas**: Cron job diário. Rejeitado por falta de tempestividade.

### 4. Amostragem via SQL Window Functions
**Decisão**: Implementar a amostragem aleatória utilizando `RAND()` combinada com `PARTITION BY` para garantir representatividade por unidade organizacional.
**Racional**: Performance superior em grandes volumes de dados comparado a processamento em memória no PHP.
**Alternativas**: Coleta de IDs em PHP e sorteio via `array_rand`. Rejeitado por ineficiência em escalas maiores.

## Risks / Trade-offs

- **Dependência de Terceiros (PSC)**: A disponibilidade do sistema de assinatura depende de APIs externas. $\to$ **Mitigação**: Implementar cache de status de assinatura e filas de tentativa (retries) com backoff exponencial.
- **Volume de Notificações**: O disparo massivo de e-mails pode ser marcado como spam. $\to$ **Mitigação**: Utilizar provedores de e-mail transacional (Amazon SES/SendGrid) e implementar rate limiting nos Jobs.
- **Consistência de Dados de RH**: Mudanças rápidas no RH podem gerar conflitos durante a sincronização. $\to$ **Mitigação**: Implementar travas otimistas e logs de auditoria detalhados para cada sincronização.
