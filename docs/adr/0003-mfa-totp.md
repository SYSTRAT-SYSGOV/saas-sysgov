# ADR 0003 — Autenticação de Dois Fatores (MFA) com TOTP

- **Status:** Aceita
- **Data:** 2026-08-24
- **Decisores:** Arquitetura SYSGOV

## Contexto

Papéis privilegiados (`super_admin`, `admin_ops`, `admin_tenant`) precisam de um
segundo fator de autenticação (RN-USR-005). Alternativas: TOTP (Time-based One-Time
Password), SMS, e-mail OTP ou WebAuthn.

## Decisão

**TOTP via `pragmarx/google2fa-qrcode`.**

- Secret gerado com `generateSecretKey()` (32 bytes base32) e armazenado **criptografado**
  em `users.mfa_secret` usando `encrypt()` (APP_KEY), nunca em claro.
- `users.mfa_enabled` + `users.mfa_confirmed_at` marcam o estado (ativo somente após
  confirmar o primeiro código de 6 dígitos).
- QR Code é opcional: o backend retorna `otpauth_url` e tenta gerar o QR inline apenas
  se `bacon/bacon-qr-code` estiver instalado (não é dependência obrigatória).
- A verificação no login e no `EnsureMfa` usa o `Google2FA::verifyKey`.

## Consequências

- Sem custo de SMS/e-mail; funciona offline no app autenticador.
- O usuário precisa de um app autenticador (Google Authenticator, Authy, etc.).
- O secret criptografado impede leitura direta no banco; a chave de criptografia é o
  `APP_KEY` (segredo de deploy).

## Alternativas rejeitadas

- **SMS/e-mail OTP:** custo e latência; dependência de gateway.
- **WebAuthn (chaves de segurança):** grande parte dos usuários municipais não possui
  hardware; complexidade de onboarding elevada.
