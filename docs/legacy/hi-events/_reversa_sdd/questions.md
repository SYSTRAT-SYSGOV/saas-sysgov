# Perguntas para Validação Humana — Hi.Events

> Gerado pelo Revisor em 2026-10-24  
> Responda cada pergunta no campo correspondente ou diretamente no chat.

---

## Pergunta 1

**Contexto:** Unidade `pedidos` — Timeout de checkout temporário em `OrderService.php`  
**Spec afetada:** [`_reversa_sdd/pedidos/requirements.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/pedidos/requirements.md#L30) / [`tasks.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/pedidos/tasks.md)  
**Pergunta:** O tempo limite de expiração da reserva temporária de 15 minutos é um valor fixo global da plataforma ou pode ser customizado individualmente pelos organizadores nas configurações do evento (`event_settings`)?  
**Impacto:** Se for configurável por evento, a lógica de agendamento de expiração deve consultar a tabela `event_settings` em vez de usar uma constante estática de 15 minutos.  

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 2

**Contexto:** Unidade `pagamentos` — Conversão de valores em centavos no Stripe Connect  
**Spec afetada:** [`_reversa_sdd/pagamentos/requirements.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/pagamentos/requirements.md) / [`design.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/pagamentos/design.md)  
**Pergunta:** A plataforma prevê suporte a moedas de zero casas decimais (zero-decimal currencies, como JPY) ou o sistema opera estritamente com moedas baseadas em centavos padrão (BRL, USD, EUR, GBP)?  
**Impacto:** Se houver suporte a moedas sem decimais, os DTOs de pagamento e chamadas à API Stripe exigem um multiplicador condicional baseado no código ISO 4217 da moeda do evento.  

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 3

**Contexto:** Unidade `autenticacao-e-permissoes` — Política de rate limit no desafio de Segundo Fator (2FA)  
**Spec afetada:** [`_reversa_sdd/autenticacao-e-permissoes/requirements.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/autenticacao-e-permissoes/requirements.md)  
**Pergunta:** Qual deve ser a política de rate limit e bloqueio temporário após tentativas consecutivas incorretas de código 2FA (TOTP)? (Padrão sugerido: throttle de 5 tentativas por 15 minutos).  
**Impacto:** Definição dos parâmetros do middleware `throttle:2fa` no backend.  

**Resposta:** <!-- preencha aqui -->
