# Mapeamento Técnico de Migração: Perfis de Acesso, Autenticação e Permissões (RBAC)

> **Módulo:** `Usuario (Perfis de Acesso, Autenticação e Permissões)` (`AccessControl` / `Authentication` / `RBAC` / `SchoolScopes`)  
> **Sistema Origem:** `i-Educar (Legado PHP / PostgreSQL)`  
> **Sistema Destino:** `SYSGOV` / `SYS-Educa` (`Laravel 13 PHP 8.4` / `MySQL 8.0/8.4+` / `React 19`)  
> **Data de Elaboração:** `2026-10-12`  
> **Status:** `Pronto para Implementação (Fase SDD / Forward)`

---

## 1. Visão Geral e Contexto de Negócio

No i-Educar legado original, o modelo de autenticação e autorização sofria de severas fragilidades estruturais e acoplamentos conceituais:
1. **Identidade Fragmentada e Bifurcada:** As credenciais de acesso (login, e-mail e hash MD5/Bcrypt da senha) residiam em `portal.funcionario`, enquanto as configurações pedagógicas do usuário eram geridas em `pmieducar.usuario`, unidas por uma chave primária não auto-explicativa (`cod_usuario` = `ref_cod_pessoa_fj`).
2. **Autorização Engessada por Telas de Menu:** O controle de permissões era baseado na tabela `pmieducar.menu_tipo_usuario`, associando os tipos de usuário diretamente aos identificadores numéricos das páginas legadas do sistema com flags ternárias (`visualiza`, `cadastra`, `exclui`). Essa modelagem deixava APIs e endpoints vulneráveis a acessos diretos caso a checagem no topo do script legado fosse omitida.
3. **Níveis Hierárquicos Rígidos em Constantes:** Os tipos de usuário eram limitados a constantes de bitmask ou inteiros fixos (`1 - Poli-institucional`, `2 - Institucional`, `4 - Escola`, `8 - Biblioteca`), impedindo atribuição granular de responsabilidades (por exemplo, um servidor que é Coordenador Pedagógico em uma escola e Professor em outra).
4. **Ausência de MFA e Identidade Federada:** Não havia suporte a Segundo Fator de Autenticação (MFA/TOTP) nem conformidade com o padrão nacional de identidade do setor público (**Gov.br / ICP-Brasil**), indispensável para a governança moderna.

### Transformação e Modernização para o SYSGOV
- **Identidade Unificada Multi-Tenant (`core_users`):** Uma tabela canônica de usuários identificada por UUID v4 e CPF, com proteção nativa contra ataques de força bruta, hashing moderno (Argon2id), suporte a MFA (TOTP com segredo criptografado) e autenticação federada Gov.br (OAuth2/OIDC).
- **Modelo RBAC Granular e Desacoplado de Interface (`core_roles`, `core_permissions`, `core_role_permissions`):** Papéis representam atribuições funcionais (`school_director`, `teacher`, `school_secretary`, `pedagogical_coordinator`, `education_secretary_admin`), associados a permissões atômicas padronizadas em padrão `recurso.subrecurso.acao` (ex.: `evaluations.grades.post`, `daily_record.attendance.register`).
- **Escopo e Lotação Escolar Dinâmica (`educa_user_school_scopes`):** O usuário pode ter permissões globais na rede municipal ou papéis contextualizados por unidade escolar, com suporte a datas de vigência e papéis diferenciados por escola.
- **Trilha de Auditoria e Segurança Ativa:** Rastreamento de tentativas falhas de login, bloqueio automático temporário de conta, logs imutáveis de autenticação e revogação instantânea de sessões via Redis.

---

## 2. DDL no Padrão SYSGOV (MySQL 8.0/8.4+ InnoDB)

```sql
-- =============================================================================
-- TABELA 83: core_users (Identidade Central e Autenticação de Usuários)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `core_users` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do usuário',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `person_id` CHAR(36) DEFAULT NULL COMMENT 'FK educa_pessoas: Vínculo com os dados civis da pessoa física',
    `cpf` VARCHAR(14) NOT NULL COMMENT 'CPF do usuário formatado (000.000.000-00)',
    `name` VARCHAR(255) NOT NULL COMMENT 'Nome completo do usuário',
    `email` VARCHAR(191) NOT NULL COMMENT 'Endereço de e-mail institucional ou pessoal',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT 'Telefone de contato com DDD',
    `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash da senha com algoritmo Argon2id ou Bcrypt',
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_ACTIVATION') NOT NULL DEFAULT 'PENDING_ACTIVATION' COMMENT 'Situação cadastral do usuário',
    `email_verified_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Data e hora da verificação de e-mail',
    `mfa_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = MFA ativado, 0 = MFA desativado',
    `mfa_secret` VARCHAR(255) DEFAULT NULL COMMENT 'Segredo TOTP criptografado com AES-256-GCM',
    `mfa_type` ENUM('NONE', 'TOTP', 'EMAIL_OTP', 'SMS_OTP', 'GOV_BR') NOT NULL DEFAULT 'NONE' COMMENT 'Tipo de segundo fator configurado',
    `govbr_subject_id` VARCHAR(191) DEFAULT NULL COMMENT 'Identificador único do usuário no Gov.br (OIDC sub claim)',
    `last_login_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Data e hora do último acesso bem-sucedido',
    `last_login_ip` VARCHAR(45) DEFAULT NULL COMMENT 'Endereço IPv4 ou IPv6 do último acesso',
    `failed_login_attempts` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Contador de falhas consecutivas de autenticação',
    `locked_until` TIMESTAMP NULL DEFAULT NULL COMMENT 'Timestamp até o qual o login está bloqueado por excesso de tentativas',
    `password_changed_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Data da última alteração de senha para expiração periódica',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Soft delete para conformidade com a LGPD',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_tenant_cpf` (`tenant_id`, `cpf`),
    UNIQUE KEY `uk_users_tenant_email` (`tenant_id`, `email`),
    UNIQUE KEY `uk_users_tenant_govbr` (`tenant_id`, `govbr_subject_id`),
    INDEX `idx_users_tenant` (`tenant_id`),
    INDEX `idx_users_person` (`person_id`),
    INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 83: Usuários centrais e credenciais do SYSGOV';

-- =============================================================================
-- TABELA 84: core_roles (Papéis e Perfis de Acesso Funcionais)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `core_roles` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do papel/perfil',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `name` VARCHAR(100) NOT NULL COMMENT 'Nome de exibição do papel (ex: Diretor Escolar)',
    `slug` VARCHAR(60) NOT NULL COMMENT 'Identificador canônico (ex: school_director, teacher, school_secretary)',
    `description` TEXT DEFAULT NULL COMMENT 'Detalhamento das responsabilidades do perfil',
    `hierarchy_level` TINYINT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'Nível hierárquico (1=Super Admin, 2=Secretário Municipal, 3=Diretor, 4=Secretário Escolar, 5=Docente)',
    `scope_type` ENUM('GLOBAL_NETWORK', 'MUNICIPAL_SECRETARIAT', 'SCHOOL_UNIT', 'PORTAL_PARENT_STUDENT') NOT NULL DEFAULT 'SCHOOL_UNIT' COMMENT 'Escopo primário de atuação do papel',
    `is_system_preset` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Perfil padrão do sistema (não deletável)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Papel ativo, 0 = Inativo',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_roles_tenant_slug` (`tenant_id`, `slug`),
    INDEX `idx_roles_tenant` (`tenant_id`),
    INDEX `idx_roles_level` (`hierarchy_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 84: Perfis funcionais de acesso (Roles)';

-- =============================================================================
-- TABELA 85: core_permissions (Permissões Atômicas do Sistema)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `core_permissions` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 da permissão',
    `module` VARCHAR(50) NOT NULL COMMENT 'Módulo do sistema (ex: evaluations, daily_record, enrollments, reports, users)',
    `action` VARCHAR(50) NOT NULL COMMENT 'Ação autorizada (ex: view, create, update, delete, post, approve, export)',
    `slug` VARCHAR(100) NOT NULL COMMENT 'Slug canônico único da permissão (ex: evaluations.grades.post)',
    `name` VARCHAR(150) NOT NULL COMMENT 'Nome legível da permissão (ex: Lançar Notas e Avaliações)',
    `description` TEXT DEFAULT NULL COMMENT 'Explicação detalhada do efeito da permissão',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_permissions_slug` (`slug`),
    INDEX `idx_permissions_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 85: Catálogo global de permissões atômicas';

-- =============================================================================
-- TABELA 86: core_role_permissions (Matriz de Vínculo entre Papéis e Permissões)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `core_role_permissions` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do vínculo',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `role_id` CHAR(36) NOT NULL COMMENT 'FK core_roles: Papel que recebe a permissão',
    `permission_id` CHAR(36) NOT NULL COMMENT 'FK core_permissions: Permissão concedida',
    `granted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data da concessão da permissão ao perfil',
    `granted_by` CHAR(36) DEFAULT NULL COMMENT 'UUID do usuário administrador que realizou a concessão',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_permissions` (`tenant_id`, `role_id`, `permission_id`),
    INDEX `idx_rp_tenant` (`tenant_id`),
    INDEX `idx_rp_role` (`role_id`),
    INDEX `idx_rp_perm` (`permission_id`),
    CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `core_roles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `core_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 86: Vínculo N:N entre perfis de acesso e permissões';

-- =============================================================================
-- TABELA 87: educa_user_school_scopes (Escopos e Lotação Escolar de Usuários)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `educa_user_school_scopes` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do escopo de lotação',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'UUID do município / órgão gestor',
    `user_id` CHAR(36) NOT NULL COMMENT 'FK core_users: Usuário lotado na unidade escolar',
    `school_id` CHAR(36) NOT NULL COMMENT 'FK educa_schools: Unidade escolar em que o usuário atua',
    `role_id` CHAR(36) NOT NULL COMMENT 'FK core_roles: Papel funcional exercido nesta unidade escolar específica',
    `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Lotação principal do servidor',
    `status` ENUM('ACTIVE', 'INACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Situação do vínculo funcional na escola',
    `valid_from` DATE DEFAULT NULL COMMENT 'Data inicial de vigência da designação/lotação',
    `valid_until` DATE DEFAULT NULL COMMENT 'Data final da designação (nulo se por prazo indeterminado)',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_school_role` (`tenant_id`, `user_id`, `school_id`, `role_id`),
    INDEX `idx_scope_tenant` (`tenant_id`),
    INDEX `idx_scope_user` (`user_id`),
    INDEX `idx_scope_school` (`school_id`),
    INDEX `idx_scope_role` (`role_id`),
    CONSTRAINT `fk_scope_user` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_scope_school` FOREIGN KEY (`school_id`) REFERENCES `educa_schools` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_scope_role` FOREIGN KEY (`role_id`) REFERENCES `core_roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela 87: Lotação escolar e escopos de acesso de usuários';
```

---

## 3. Matriz De/Para: Legado (i-Educar) ➔ SYSGOV

| Conceito / Objeto | Legado i-Educar (`pmieducar` / `portal`) | SYSGOV (`SYS-Educa` / `core`) | Justificativa da Transformação |
|---|---|---|---|
| **Identidade do Usuário** | `pmieducar.usuario` + `portal.funcionario` | `core_users` | Centralização de dados cadastrais, e-mail, CPF, senha, MFA e identidade Gov.br sob chave UUID única. |
| **Login / Autenticação** | `portal.funcionario.matricula` ou `email` | `core_users.cpf` ou `email` | Padronização nacional por CPF como chave de identificação do servidor/cidadão. |
| **Hash de Senha** | MD5 antigo ou Bcrypt legado em `portal.funcionario` | `core_users.password_hash` | Algoritmo moderno **Argon2id** (padrão OWASP/NIST) com custo de memória calibrado. |
| **Segundo Fator (MFA)** | Inexistente no i-Educar | `core_users.mfa_enabled` + `mfa_secret` | Suporte a TOTP (Google Authenticator/Microsoft Authenticator) com segredo encriptado via AES-256-GCM. |
| **Integração Gov.br** | Inexistente no i-Educar | `core_users.govbr_subject_id` | Suporte nativo ao Login Único Gov.br (OIDC) para servidores públicos municipais e cidadãos. |
| **Perfis de Acesso** | `pmieducar.tipo_usuario` (constantes de nível 1, 2, 4, 8) | `core_roles` | Perfis descritivos flexíveis com `slug`, nível hierárquico e escopo de atuação (`GLOBAL_NETWORK`, `SCHOOL_UNIT`). |
| **Permissões** | `pmieducar.menu_tipo_usuario` (permissão por tela/menu) | `core_permissions` + `core_role_permissions` | Permissões atômicas desacopladas de layout de menus (`module.action.slug`), validadas via middleware e policies. |
| **Vínculo com Escolas** | `pmieducar.usuario_escola` | `educa_user_school_scopes` | Permite lotação multi-escola com papel diferenciado por unidade e controle estrito de vigência. |
| **Controle de Bloqueio** | Inexistente (ou tentativas não auditadas) | `failed_login_attempts` + `locked_until` | Mitigação nativa contra ataques de brute-force e credenciais vazadas. |
| **Histórico de Acesso** | `portal.acesso` | `educa_auth_audit_logs` / Redis Sessions | Rastreabilidade detalhada com IP, User-Agent, tipo de autenticação e revogação imediata via Redis. |

---

## 4. Serviços de Domínio no Backend (Laravel 13 PHP 8.4)

### 4.1 `AuthenticationService.php`

```php
<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\CoreUser;
use App\Models\CoreRole;
use App\Services\Security\TotpService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

final class AuthenticationService
{
    public function __construct(
        private readonly TotpService $totpService,
    ) {}

    /**
     * Autentica usuário por CPF e Senha com suporte a bloqueio por tentativas falhas e MFA.
     *
     * @param string $tenantId
     * @param string $cpf
     * @param string $password
     * @param string $clientIp
     * @return array{status: string, token?: string, mfa_token?: string, user?: CoreUser}
     */
    public function authenticate(string $tenantId, string $cpf, string $password, string $clientIp): array
    {
        $normalizedCpf = preg_replace('/\D/', '', $cpf);

        /** @var CoreUser|null $user */
        $user = CoreUser::query()
            ->where('tenant_id', $tenantId)
            ->where('cpf', $normalizedCpf)
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'cpf' => ['Credenciais inválidas para o município informado.'],
            ]);
        }

        // Verifica se a conta está temporariamente bloqueada
        if ($user->locked_until && $user->locked_until->isFuture()) {
            $minutesRemaining = (int) ceil(now()->diffInSeconds($user->locked_until) / 60);
            throw ValidationException::withMessages([
                'cpf' => ["Conta bloqueada por excesso de tentativas falhas. Tente novamente em {$minutesRemaining} minuto(s)."],
            ]);
        }

        // Validação da senha com Argon2id/Bcrypt
        if (! Hash::check($password, $user->password_hash)) {
            $user->increment('failed_login_attempts');

            if ($user->failed_login_attempts >= 5) {
                $user->update([
                    'locked_until' => now()->addMinutes(15),
                ]);
            }

            throw ValidationException::withMessages([
                'password' => ['Credenciais inválidas.'],
            ]);
        }

        // Verifica situação cadastral
        if ($user->status !== 'ACTIVE') {
            throw ValidationException::withMessages([
                'cpf' => ['Usuário inativo ou com acesso suspenso no município.'],
            ]);
        }

        // Reseta contador de falhas
        $user->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
            'last_login_ip' => $clientIp,
        ]);

        // Se MFA estiver ativo, emite ticket temporário de segundo fator
        if ($user->mfa_enabled) {
            $mfaTicket = Str::random(64);
            Redis::setex("mfa_ticket:{$mfaTicket}", 300, (string) $user->id);

            return [
                'status' => 'MFA_REQUIRED',
                'mfa_token' => $mfaTicket,
            ];
        }

        // Emite JWT de sessão completa
        $token = $this->generateJwtSession($user);

        return [
            'status' => 'AUTHENTICATED',
            'token' => $token,
            'user' => $user,
        ];
    }

    /**
     * Valida o desafio de MFA (TOTP) e emite a sessão final.
     */
    public function verifyMfaChallenge(string $mfaTicket, string $code): array
    {
        $userId = Redis::get("mfa_ticket:{$mfaTicket}");

        if (! $userId) {
            throw ValidationException::withMessages([
                'mfa_token' => ['Desafio de autenticação em duas etapas expirado ou inválido.'],
            ]);
        }

        /** @var CoreUser $user */
        $user = CoreUser::query()->findOrFail($userId);

        if (! $this->totpService->verify($user->mfa_secret, $code)) {
            throw ValidationException::withMessages([
                'code' => ['Código de autenticação em duas etapas inválido.'],
            ]);
        }

        Redis::del("mfa_ticket:{$mfaTicket}");
        $token = $this->generateJwtSession($user);

        return [
            'status' => 'AUTHENTICATED',
            'token' => $token,
            'user' => $user,
        ];
    }

    /**
     * Gera o JWT contendo as claims de tenant, usuário e escopos escolares autorizados.
     */
    private function generateJwtSession(CoreUser $user): string
    {
        $scopes = $user->schoolScopes()
            ->with(['school:id,name,inep_code', 'role:id,name,slug'])
            ->where('status', 'ACTIVE')
            ->get()
            ->map(fn ($s) => [
                'school_id' => $s->school_id,
                'school_name' => $s->school->name,
                'role_slug' => $s->role->slug,
                'is_primary' => (bool) $s->is_primary,
            ]);

        $payload = [
            'sub' => $user->id,
            'tenant_id' => $user->tenant_id,
            'cpf' => $user->cpf,
            'name' => $user->name,
            'email' => $user->email,
            'scopes' => $scopes->toArray(),
            'iat' => time(),
            'exp' => time() + (8 * 3600), // 8 horas de validade
        ];

        return app('jwt.signer')->encode($payload);
    }
}
```

---

### 4.2 `AuthorizationRbacService.php`

```php
<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\CoreUser;
use App\Models\CoreRole;
use App\Models\CorePermission;
use App\Models\EducaUserSchoolScope;
use Illuminate\Support\Facades\Cache;

final class AuthorizationRbacService
{
    /**
     * Verifica se o usuário possui a permissão requerida no contexto atual.
     *
     * @param CoreUser $user
     * @param string $permissionSlug Ex: 'evaluations.grades.post'
     * @param string|null $schoolId ID da escola (caso o recurso seja contextual a uma unidade)
     * @return bool
     */
    public function can(CoreUser $user, string $permissionSlug, ?string $schoolId = null): bool
    {
        $cacheKey = "rbac_perm:{$user->id}:{$permissionSlug}:" . ($schoolId ?? 'global');

        return Cache::remember($cacheKey, 300, function () use ($user, $permissionSlug, $schoolId) {
            // 1. Obtém todas as permissões concedidas aos papéis globais do usuário na rede
            $hasGlobalPermission = $user->globalRoles()
                ->whereHas('permissions', fn ($q) => $q->where('slug', $permissionSlug))
                ->exists();

            if ($hasGlobalPermission) {
                return true;
            }

            // 2. Se a ação não exige contexto de escola específico, rejeita
            if (! $schoolId) {
                return false;
            }

            // 3. Verifica se o usuário tem escopo ativo na escola informada com papel que possui a permissão
            return EducaUserSchoolScope::query()
                ->where('tenant_id', $user->tenant_id)
                ->where('user_id', $user->id)
                ->where('school_id', $schoolId)
                ->where('status', 'ACTIVE')
                ->where(function ($q) {
                    $q->whereNull('valid_until')
                      ->orWhere('valid_until', '>=', now()->toDateString());
                })
                ->whereHas('role.permissions', fn ($q) => $q->where('slug', $permissionSlug))
                ->exists();
        });
    }

    /**
     * Atribui uma permissão atômica a um perfil funcional da rede municipal.
     */
    public function grantPermissionToRole(string $tenantId, string $roleId, string $permissionSlug, string $adminUserId): void
    {
        $role = CoreRole::query()->where('tenant_id', $tenantId)->findOrFail($roleId);
        $permission = CorePermission::query()->where('slug', $permissionSlug)->firstOrFail();

        $role->permissions()->syncWithoutDetaching([
            $permission->id => [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'tenant_id' => $tenantId,
                'granted_by' => $adminUserId,
                'granted_at' => now(),
            ],
        ]);

        Cache::tags(["tenant_rbac:{$tenantId}"])->flush();
    }
}
```

---

## 5. DTOs e Tipagens TypeScript (`@sysgov/sdk`)

```typescript
// =============================================================================
// DTOs de Autenticação e Perfis RBAC do SYSGOV
// =============================================================================

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_ACTIVATION';
export type MfaType = 'NONE' | 'TOTP' | 'EMAIL_OTP' | 'SMS_OTP' | 'GOV_BR';
export type ScopeType = 'GLOBAL_NETWORK' | 'MUNICIPAL_SECRETARIAT' | 'SCHOOL_UNIT' | 'PORTAL_PARENT_STUDENT';

export interface CoreUserDTO {
  id: string;
  tenantId: string;
  personId: string | null;
  cpf: string;
  name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  mfaType: MfaType;
  govbrSubjectId: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoreRoleDTO {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  hierarchyLevel: number;
  scopeType: ScopeType;
  isSystemPreset: boolean;
  isActive: boolean;
  permissionsCount?: number;
}

export interface CorePermissionDTO {
  id: string;
  module: string;
  action: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface UserSchoolScopeDTO {
  id: string;
  tenantId: string;
  userId: string;
  schoolId: string;
  schoolName: string;
  schoolInepCode: string | null;
  roleId: string;
  roleName: string;
  roleSlug: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  validFrom: string | null;
  validUntil: string | null;
}

export interface AuthSessionResponse {
  status: 'AUTHENTICATED' | 'MFA_REQUIRED';
  token?: string;
  mfaToken?: string;
  user?: CoreUserDTO;
  scopes?: UserSchoolScopeDTO[];
}
```

---

## 6. Componentes Frontend no Padrão SYSGOV (React 19 + Tailwind v4 + `@sysgov/ui`)

### 6.1 `UserProfileAccessManager.tsx`

```tsx
import React, { useState } from 'react';
import { Card, Badge, Button, Dialog, Select, Input, Table, Alert } from '@sysgov/ui';
import type { CoreUserDTO, UserSchoolScopeDTO, CoreRoleDTO } from '@sysgov/sdk';

interface UserProfileAccessManagerProps {
  user: CoreUserDTO;
  scopes: UserSchoolScopeDTO[];
  availableRoles: CoreRoleDTO[];
  availableSchools: Array<{ id: string; name: string; inepCode: string }>;
  onAssignScope: (data: { schoolId: string; roleId: string; isPrimary: boolean }) => Promise<void>;
  onRevokeScope: (scopeId: string) => Promise<void>;
}

export const UserProfileAccessManager: React.FC<UserProfileAccessManagerProps> = ({
  user,
  scopes,
  availableRoles,
  availableSchools,
  onAssignScope,
  onRevokeScope,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveScope = async () => {
    if (!selectedSchool || !selectedRole) return;
    setIsLoading(true);
    try {
      await onAssignScope({ schoolId: selectedSchool, roleId: selectedRole, isPrimary });
      setIsModalOpen(false);
      setSelectedSchool('');
      setSelectedRole('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo do Usuário */}
      <Card className="p-6 border border-slate-800 bg-slate-900/90 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{user.name}</h2>
              <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                {user.status === 'ACTIVE' ? 'Ativo na Rede' : user.status}
              </Badge>
              {user.mfaEnabled && (
                <Badge variant="info" className="font-mono text-xs">MFA Ativo</Badge>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1 font-mono">
              CPF: <span className="text-slate-200">{user.cpf}</span> | E-mail: <span className="text-slate-200">{user.email}</span>
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20"
          >
            + Vincular Nova Unidade Escolar
          </Button>
        </div>
      </Card>

      {/* Tabela de Lotação e Escopos Escolares */}
      <Card className="p-6 border border-slate-800 bg-slate-900/90 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Lotações e Escopos Escolares Autorizados</h3>
        {scopes.length === 0 ? (
          <Alert variant="warning">
            Este servidor não possui nenhuma lotação escolar ativa associada no município.
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-3 px-4">Unidade Escolar</th>
                  <th className="py-3 px-4">Código INEP</th>
                  <th className="py-3 px-4">Papel / Função</th>
                  <th className="py-3 px-4">Lotação Principal</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {scopes.map((scope) => (
                  <tr key={scope.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-100">{scope.schoolName}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{scope.schoolInepCode ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-950 text-purple-300 border border-purple-800">
                        {scope.roleName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {scope.isPrimary ? (
                        <span className="text-emerald-400 font-semibold text-xs uppercase tracking-wide">Sim</span>
                      ) : (
                        <span className="text-slate-500 text-xs">Não</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={scope.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {scope.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRevokeScope(scope.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/30 font-medium"
                      >
                        Revogar Vínculo
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Nova Lotação */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Vincular Usuário à Unidade Escolar">
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Selecione a Escola</label>
            <Select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full bg-slate-950 border-slate-700 text-white rounded-lg"
            >
              <option value="">Escolha uma unidade...</option>
              {availableSchools.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.inepCode})</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Papel / Função Atribuída</label>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-slate-950 border-slate-700 text-white rounded-lg"
            >
              <option value="">Escolha um perfil funcional...</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.slug})</option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_primary" className="text-sm text-slate-300">Definir como Lotação Principal</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={isLoading} onClick={handleSaveScope}>Confirmar Vínculo</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
```

---

### 6.2 `RolePermissionMatrix.tsx`

```tsx
import React, { useState } from 'react';
import { Card, Badge, Button, Input } from '@sysgov/ui';
import type { CoreRoleDTO, CorePermissionDTO } from '@sysgov/sdk';

interface RolePermissionMatrixProps {
  roles: CoreRoleDTO[];
  permissions: CorePermissionDTO[];
  matrix: Record<string, string[]>; // roleId -> permissionSlugs[]
  onTogglePermission: (roleId: string, permissionSlug: string, isGranted: boolean) => Promise<void>;
}

export const RolePermissionMatrix: React.FC<RolePermissionMatrixProps> = ({
  roles,
  permissions,
  matrix,
  onTogglePermission,
}) => {
  const [filterModule, setFilterModule] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Agrupamento por módulo
  const modules = Array.from(new Set(permissions.map((p) => p.module)));

  const filteredPermissions = permissions.filter((p) => {
    const matchesModule = filterModule ? p.module === filterModule : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.slug.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesModule && matchesSearch;
  });

  const handleToggle = async (roleId: string, slug: string) => {
    const currentList = matrix[roleId] ?? [];
    const isGranted = currentList.includes(slug);
    const key = `${roleId}:${slug}`;
    setUpdatingKey(key);
    try {
      await onTogglePermission(roleId, slug, !isGranted);
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <Card className="p-6 border border-slate-800 bg-slate-900/90 rounded-xl shadow-lg space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Matriz de Permissões RBAC da Rede</h2>
          <p className="text-sm text-slate-400">Atribua permissões atômicas aos papéis funcionais do município.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Filtrar por nome ou slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-slate-950 border-slate-700 text-white font-mono text-xs rounded-lg"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              <th className="py-3 px-4 min-w-[260px]">Permissão Atômica</th>
              <th className="py-3 px-4">Módulo</th>
              {roles.map((role) => (
                <th key={role.id} className="py-3 px-3 text-center min-w-[120px]">
                  <span className="block text-slate-200 font-bold">{role.name}</span>
                  <span className="block text-[10px] text-slate-500 font-mono">{role.slug}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {filteredPermissions.map((perm) => (
              <tr key={perm.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-100">{perm.name}</div>
                  <div className="font-mono text-xs text-blue-400">{perm.slug}</div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="font-mono text-xs uppercase text-slate-300 border-slate-700">
                    {perm.module}
                  </Badge>
                </td>
                {roles.map((role) => {
                  const isGranted = (matrix[role.id] ?? []).includes(perm.slug);
                  const isBusy = updatingKey === `${role.id}:${perm.slug}`;

                  return (
                    <td key={role.id} className="py-3 px-3 text-center">
                      <button
                        type="button"
                        disabled={isBusy || role.isSystemPreset && role.slug === 'system_admin'}
                        onClick={() => handleToggle(role.id, perm.slug)}
                        className={`w-7 h-7 rounded flex items-center justify-center mx-auto transition-all ${
                          isGranted
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                        } ${isBusy ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {isGranted ? '✓' : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
```

---

## 7. Checklist de Validação e Homologação

- [x] **Unificação de Credenciais:** Migração dos hashes de senha e credenciais de `portal.funcionario` e dados de `pmieducar.usuario` para `core_users`.
- [x] **Isolamento Multi-Tenant:** `uk_users_tenant_cpf` e `uk_users_tenant_email` garantem unicidade rigorosa no âmbito de cada município sem conflitos entre redes.
- [x] **Desacoplamento de Menus:** Remoção definitiva de `pmieducar.menu_tipo_usuario`; autorização via `core_permissions` e `core_role_permissions`.
- [x] **Escopos Multi-Escola:** Implementação de `educa_user_school_scopes` permitindo que docentes e gestores atuem em múltiplas unidades com perfis independentes.
- [x] **Segundo Fator (MFA/TOTP):** Campos `mfa_enabled`, `mfa_secret` e `mfa_type` prontos para conformidade com normas do governo digital.
- [x] **Integração Gov.br:** Campo `govbr_subject_id` preparado para autenticação federada via OpenID Connect (OIDC).
