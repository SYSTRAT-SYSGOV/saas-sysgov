# ADR-007: Notificações Omnichannel Orientadas a Eventos e Rastreamento OpenTelemetry

> **Status:** 🟢 Aprovado / Decisão Arquitetural Consolidada  
> **Data:** 2026-10-12  
> **Autor:** Reversa Detective (`reversa-detective`) & Architect (`reversa-architect`)  
> **Contexto:** Plataforma SYSGOV — Modernização do i-Educar (`SYS-Educa`)

---

## 1. Contexto e Problema

No ecossistema da gestão escolar pública, a comunicação célere e auditável com pais, professores e comunidade é elemento fundamental para redução da infrequência escolar e conformidade com o ECA (Estatuto da Criança e do Adolescente).
No i-Educar legado:
- Não existia motor de notificações omnichannel estruturado;
- Envios de e-mails ocorriam de forma síncrona dentro dos controllers web, travando o carregamento da página do usuário quando o servidor SMTP estava lento;
- Não havia garantia de entrega, rastreabilidade de abertura/leitura de comunicados oficiais urgentes (ex.: suspensão de aulas por chuvas ou convocação de responsáveis);
- Em caso de falhas ou exceções em produção, logs de texto dispersos em arquivos `laravel.log` dificultavam o diagnóstico e não protegiam dados sensíveis de menores (LGPD).

---

## 2. Decisão Arquitetural

Implementar uma **Arquitetura de Notificações Orientada a Eventos (`NotificationDispatcherService`) com Filas Desacopladas, Sanitização de PII e Observabilidade OpenTelemetry**:

1. **Despacho Assíncrono Orientado a Eventos de Domínio:**
   - Eventos de negócio (ex.: `EnrollmentStatusChanged`, `StudentExcessiveAbsenceDetected`, `GradePublished`, `EmergencyNoticePublished`) são emitidos pela camada de domínio e consumidos por listeners assíncronos.
2. **Canais Omnichannel Configuráveis:**
   - O motor suporta entrega em múltiplos canais:
     - **In-App:** Notificações em tempo real no sino da barra superior via WebSockets / SSE;
     - **E-mail:** Mensagens formatadas com templates padronizados da mantenedora via fila SMTP/SES;
     - **Push Notification:** Para aplicativos móveis de responsáveis e professores;
     - **SMS / WhatsApp:** Mensagens críticas de aviso de ausência escolar para os pais.
3. **Comunicados Oficiais Obrigatórios com Aceite Legal (`MandatoryNotice`):**
   - Suporte a notificações bloqueantes de tela para comunicados regulamentares urgentes, exigindo que o usuário clique em "Ciente" antes de continuar navegando, com registro jurídico de data/hora, IP e dispositivo.
4. **Observabilidade e Sanitização com OpenTelemetry:**
   - Cada requisição gera um `trace_id` e `span_id` no padrão W3C Distributed Tracing, propagado entre frontend, backend e jobs em segundo plano.
   - O subsistema de captura de erros sanitiza automaticamente dados PII (CPF, senhas, dados de saúde) antes do envio para o APM / collector de telemetria.

---

## 3. Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens / Motivo de Rejeição |
| :--- | :--- | :--- |
| **Envio Síncrono no Controller HTTP** | Menor esforço de implementação inicial. | Risco de timeout HTTP se a API externa do WhatsApp ou gateway de e-mail oscilar; lentidão perceptível para o usuário final. |
| **Solução Proprietária de Notificação Acoplada a um Único Fornecedor** | Integração rápida com uma ferramenta específica. | Lock-in de fornecedor inaceitável para contratos públicos municipais; dificuldade de troca de gateways em licitações públicas. |
| **Arquitetura Orientada a Eventos com Drivers Abstratos e Filas Redis (Escolhida)** | Zero impacto na latência das requisições web; alta resiliência com retentativas automáticas (`backoff`); facilidade de plugar novos canais. | Exige infraestrutura de mensageria ativa e monitoramento de dead-letter queues (DLQ). |

---

## 4. Consequências

### Positivas:
- O sistema se torna proativo: pais recebem alerta no WhatsApp no mesmo instante em que a falta do aluno é lançada no diário pelo professor.
- A Secretaria de Educação passa a ter métricas reais de alcance e leitura de seus comunicados oficiais.
- Resolução ágil de bugs em produção através de rastreamento distribuído ponta a ponta (`trace_id`).

### Negativas / Riscos Mitigados:
- Custo de disparo de SMS/WhatsApp em redes com grande número de alunos. *Mitigação:* Regras de priorização configuráveis no painel de parâmetros do município (ex.: SMS apenas para faltas consecutivas ou situações de risco).
