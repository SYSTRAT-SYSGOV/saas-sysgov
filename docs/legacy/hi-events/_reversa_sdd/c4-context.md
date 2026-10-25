# C4 Model — Diagrama de Contexto (Nível 1)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Fonte Técnica**: `docker/development/docker-compose.dev.yml`, `backend/routes/api.php`, `frontend/src/router.tsx`

---

## 1. Visão Geral do Contexto do Sistema

O **Hi.Events** é uma plataforma open-source de gestão de eventos e venda de ingressos com suporte a multi-inquilinos (contas/organizadores), mapa de assentos reservados, bilheteria presencial (box office), emissão de ingressos com QR Code e pagamentos integrados via Stripe.

```mermaid
C4Context
    title Diagrama de Contexto de Sistema - Hi.Events (Nível 1)

    Person(buyer, "Comprador de Ingressos", "Pessoa que navega pela página pública do evento, seleciona ingressos/assentos e efetua a compra.")
    Person(attendee, "Participante do Evento", "Portador final do ingresso com QR Code que comparece ao evento para credenciamento.")
    Person(organizer, "Organizador do Evento", "Gestor de equipe que cria eventos, configura lotes, gerencia participantes e analisa métricas.")
    Person(operator, "Operador de Bilheteria", "Operador de ponto de venda que realiza check-in e emite ingressos presenciais via Box Office.")
    Person(admin, "Superadmin da Plataforma", "Administrador que gerencia contas globais, revisa eventos suspeitos e controla licenciamento.")

    Enterprise_Boundary(b0, "Ecossistema Hi.Events") {
        System(hievents, "Hi.Events Platform", "Permite publicação de eventos, gestão de capacidade, reserva de assentos, vendas online e controle de acesso.")
    }

    System_Ext(stripe, "Stripe Payments & Terminal", "Gateway de pagamentos para processamento de cartões, Payment Intents, Webhooks e leitores POS físicos.")
    System_Ext(mail_provider, "Provedor de E-mail (SMTP / SES / Mailpit)", "Servidor de envio transacional de ingressos, notificações e recuperação de credenciais.")
    System_Ext(s3_storage, "Armazenamento S3 / MinIO", "Armazenamento de arquivos estáticos, banners de eventos e comprovantes.")
    System_Ext(sso_idp, "Provedores de Identidade SSO (OIDC / SAML)", "Provedores corporativos de autenticação federada (Google, Okta, Azure AD).")

    Rel(buyer, hievents, "Navega, reserva assentos e compra ingressos", "HTTPS / JSON")
    Rel(attendee, hievents, "Recebe bilhete com QR Code e faz check-in", "HTTPS / E-mail")
    Rel(organizer, hievents, "Configura eventos, gerencia vendas e analisa métricas", "HTTPS / JSON")
    Rel(operator, hievents, "Opera terminal de bilheteria e realiza validação de ingressos", "HTTPS / Box Office API")
    Rel(admin, hievents, "Administra contas globais, licenças e auditoria anti-spam", "HTTPS / Admin UI")

    Rel(hievents, stripe, "Cria Payment Intents e processa reembolsos", "HTTPS / Stripe SDK")
    Rel(stripe, hievents, "Dispara notificações de status de transação", "HTTPS / Webhooks")
    Rel(hievents, mail_provider, "Envia e-mails transacionais e confirmações de compra", "SMTP")
    Rel(hievents, s3_storage, "Armazena e recupera imagens de eventos e assets", "S3 API / HTTPS")
    Rel(hievents, sso_idp, "Autentica usuários corporativos via Enterprise SSO", "OIDC / SAML 2.0")
```

---

## 2. Personas e Papéis Identificados 🟢

1. **Comprador (`Ticket Buyer`)**: Acessa rotas públicas (`/public/events/{id}`), consulta lotes disponíveis, seleciona assentos no mapa interativo e preenche dados cadastrais.
2. **Participante (`Attendee`)**: Recebe ingresso individualizado por e-mail, exibe QR Code para leitura no portão de entrada e responde a questionários personalizados do evento.
3. **Organizador (`Event Organizer`)**: Acessa o dashboard operacional (`/manage/events/{id}`), cria ocorrências (`event_occurrences`), gerencia descontos e acessa relatórios financeiros caso possua `VIEW_FINANCIALS`.
4. **Operador de Bilheteria (`Box Office Operator`)**: Utiliza rotas dedicadas de bilheteria e leitores de ponto de venda físicos (Stripe Terminal Reader). Não possui acesso a PII de participantes conforme restrições de segurança.
5. **Superadministrador (`Superadmin`)**: Acesso global para fiscalização de eventos marcados pelo filtro anti-spam (`PENDING_MANUAL_REVIEW`), gestão de limites e auditoria.

---

## 3. Limites de Integração Externa 🟢

| Sistema Externo | Tipo de Comunicação | Protocolo | Responsabilidade | Confiança |
|---|---|---|---|:---:|
| **Stripe** | Bidirecional | HTTPS (API Rest + Webhook) | Processamento de cartões de crédito, Payment Intents, reembolsos e controle de leitores de terminal POS. | 🟢 CONFIRMADO |
| **Provedor de E-mail (SMTP / SES / Mailpit)** | Unidirecional (Saída) | SMTP / TLS | Envio transacional assíncrono via filas de e-mails com ingressos anexados, confirmações e 2FA. | 🟢 CONFIRMADO |
| **Object Storage (S3 / MinIO)** | Bidirecional | S3 Protocol (HTTPS) | Armazenamento de imagens públicas (banners, logos de organizadores) e documentos privados (faturas/exportações). | 🟢 CONFIRMADO |
| **Identity Providers (OIDC / SAML)** | Bidirecional | HTTPS / OIDC standard | Autenticação corporativa com Single Sign-On (recurso Enterprise). | 🟢 CONFIRMADO |
