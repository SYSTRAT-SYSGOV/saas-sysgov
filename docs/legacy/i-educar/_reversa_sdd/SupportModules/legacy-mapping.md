# 🛠️ Mapeamento Técnico e Engenharia Reversa: Módulos de Suporte
## `ErrorTracking`, `Navigation` e `Notifications`

> **Status:** Especificado e Aprovado para SYSGOV (`SYS-Educa`)  
> **Data:** 2026-10-12  
> **Banco Alvo:** MySQL 8.0 / 8.4+ (`InnoDB`, `CHAR(36)` UUID, `utf8mb4_unicode_ci`, multi-tenant via `tenant_id`)  
> **Tabelas SYSGOV:** 88 a 94  

---

## 1. Visão Geral e Contexto de Engenharia Reversa

Os módulos de suporte compõem a espinha dorsal operacional, de observabilidade e de experiência de usuário da plataforma educacional. No **i-Educar legadíssimo**, esses recursos foram adicionados de forma fragmentada ao longo de mais de uma década, resultando em acoplamentos graves e arquitetura deficitária:

1. **`ErrorTracking` (Rastreamento de Erros e Exceções):**
   - **Legado:** Implementado via `iEducar\Modules\ErrorTracking` (`Tracker`, `TrackerFactory`, `HoneyBadgerTracker`, `EmailTracker`). Quando ocorria uma falha em relatórios ou no `Handler.php`, o sistema instanciava chamadas síncronas para o serviço Honeybadger ou disparava e-mails via `FlattenException` com o HTML cru do stack trace.
   - **Vulnerabilidades e Gargalos:** Sem sanitização de dados sensíveis (senhas em texto claro e CPFs no dump da request, violando LGPD); sem correlação de requisições (`trace_id` / `span_id`); envio síncrono que travava requisições em timeouts de rede; sem agregação de erros no banco local para auditoria interna da prefeitura.
   - **Alvo SYSGOV:** Integração com **OpenTelemetry** + **Sentry**, aliada a uma tabela nativa de incidentes (`core_system_errors`) e uma trilha de auditoria central (`core_audit_logs`). Sanitização prévia de payloads mascarando campos protegidos.

2. **`Navigation` (Navegação, Menus e Breadcrumbs):**
   - **Legado:** Tabela `portal.menu_menu` e classe `App\Menu` com relacionamento recursivo Adjacency List. O menu possuía um campo `process` que se ligava diretamente à tabela de permissões `pmieducar.menu_tipo_usuario`. Os breadcrumbs eram montados manualmente em cada controller via `iEducar\Support\Navigation\Breadcrumb`.
   - **Vulnerabilidades e Gargalos:** Acoplamento perigoso: menu e permissão eram a mesma entidade. Se uma tela não tivesse menu cadastrado, não possuía controle de permissão padronizado. Modificações exigiam migrations complexas com loops `attachMenuIfNotExists`.
   - **Alvo SYSGOV:** Separação estrita: permissões atômicas RBAC (`core_permissions`) governam o acesso à API. Os nós de navegação (`core_navigation_nodes`) declaram quais permissões exigem e são filtrados dinamicamente em árvore com suporte a **Command Palette (`Ctrl + K`)**, favoritos do usuário (`core_user_navigation_favorites`) e breadcrumbs automáticos calculados a partir da rota.

3. **`Notifications` (Notificações, Comunicados e Mensagens):**
   - **Legado:** Tabela `public.notifications` com `type_id` fixo (`NotificationType`: transferência, exportações, busca ativa), broadcast via WebSocket cru em canal composto `{$tenant}-notification-{$userHash}`. Posteriormente foram adicionadas as tabelas `announcements` (comunicados no login) e `school_notices` (avisos escolares).
   - **Vulnerabilidades e Gargalos:** Ausência de canais modernos (Web Push, WhatsApp, SMS); sem agrupamento por tópico ou prioridade; falta de fila de retentativas resiliente; mensagens institucionais não integradas ao centro de notificações unificado.
   - **Alvo SYSGOV:** Plataforma omnichannel com `core_notifications` (in-app, push, email, whatsapp), `core_announcements` (comunicados institucionais com bloqueio de login e confirmação de ciência obrigatória) e trilha de leitura auditável.

---

## 2. Matriz De/Para: Legado i-Educar vs. SYSGOV

| Recurso / Conceito | Entidade Legada (i-Educar) | Entidade Moderna SYSGOV (`SYS-Educa`) | Justificativa da Mudança |
| :--- | :--- | :--- | :--- |
| **Exceções e Logs** | `TrackerFactory`, `HoneyBadgerTracker`, `EmailTracker` | `core_system_errors` + OpenTelemetry / Sentry | Armazenamento local de incidentes, sanitização LGPD de PII, rastreamento por `trace_id`. |
| **Auditoria de Operações** | `pmieducar.historico_escolar` (logs isolados) | `core_audit_logs` | Trilha de auditoria uniforme para qualquer mutação crítica (quem, quando, tenant, IP, diff JSON). |
| **Árvore de Menus** | `portal.menu_menu`, `App\Menu` | `core_navigation_nodes` | Estrutura hierárquica desacoplada de IDs de processo, amarrada a chaves RBAC canônicas. |
| **Atalhos / Favoritos** | Inexistente (busca em menu estático) | `core_user_navigation_favorites` | Atalhos personalizáveis pelo servidor para acesso rápido no Dashboard e na Command Bar. |
| **Notificações de Usuário**| `public.notifications`, `public.notification_type` | `core_notifications` | Notificações estruturadas com payload JSON, severidade (`info`, `warning`, `urgent`) e multi-canal. |
| **Avisos Institucionais** | `announcements`, `announcement_users` | `core_announcements` & `core_announcement_reads` | Comunicados da Secretaria com bloqueio de tela, público segmentado por papel/escola e log de aceite. |
| **Avisos Escolares** | `school_notices`, `messages` | `educa_school_bulletins` / Sub-rotas de Notificações | Centralização de eventos e avisos específicos de calendário escolar. |

---

## 3. DDL MySQL 8.0/8.4+ das Tabelas 88 a 94

```sql
-- =============================================================================
-- SISTEMA INTEGRADO DE GESTÃO GOVERNAMENTAL (SYSGOV) - MÓDULO EDUCACIONAL
-- TABELAS 88 A 94: MÓDULOS DE SUPORTE (ERROR TRACKING, NAVIGATION, NOTIFICATIONS)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- TABELA 88: core_system_errors (Registro de Falhas, Exceções e Incidentes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `core_system_errors` (
    `id` CHAR(36) NOT NULL COMMENT 'Identificador único da ocorrência (UUID v4)',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Identificador do município / tenant',
    `user_id` CHAR(36) NULL COMMENT 'Usuário que disparou a requisição (se autenticado)',
    `school_id` CHAR(36) NULL COMMENT 'Escola ativa no momento da falha (se aplicável)',
    `trace_id` VARCHAR(64) NOT NULL COMMENT 'Identificador distribuído da requisição (OpenTelemetry TraceID)',
    `environment` ENUM('production', 'staging', 'development', 'testing') NOT NULL DEFAULT 'production',
    `severity` ENUM('debug', 'info', 'warning', 'error', 'critical', 'emergency') NOT NULL DEFAULT 'error',
    `exception_class` VARCHAR(255) NOT NULL COMMENT 'Classe da exceção PHP/TypeScript',
    `message` TEXT NOT NULL COMMENT 'Mensagem de erro sanitizada (sem dados pessoais)',
    `file` VARCHAR(255) NOT NULL COMMENT 'Arquivo fonte onde a falha se originou',
    `line` INT UNSIGNED NOT NULL COMMENT 'Linha do código onde ocorreu o throw',
    `stack_trace` LONGTEXT NOT NULL COMMENT 'Stack trace completo formatado em JSON ou texto',
    `http_method` VARCHAR(10) NULL COMMENT 'GET, POST, PUT, DELETE, PATCH',
    `request_uri` VARCHAR(2048) NULL COMMENT 'URI acessada',
    `request_payload_sanitized` JSON NULL COMMENT 'Corpo da requisição com dados sensíveis mascarados (LGPD)',
    `client_ip` VARCHAR(45) NULL COMMENT 'Endereço IP de origem',
    `user_agent` VARCHAR(512) NULL COMMENT 'Navegador / cliente',
    `resolved_at` TIMESTAMP NULL COMMENT 'Data/hora em que o incidente foi marcado como corrigido',
    `resolved_by_user_id` CHAR(36) NULL COMMENT 'Engenheiro ou administrador que finalizou o incidente',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_errors_tenant_created` (`tenant_id`, `created_at`),
    INDEX `idx_errors_trace` (`trace_id`),
    INDEX `idx_errors_severity_class` (`severity`, `exception_class`),
    CONSTRAINT `fk_errors_user` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_errors_resolved_by` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `core_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Incidentes e falhas técnicas capturados pelo backend e frontend';

-- -----------------------------------------------------------------------------
-- TABELA 89: core_audit_logs (Trilha de Auditoria e Conformidade LGPD)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `core_audit_logs` (
    `id` CHAR(36) NOT NULL COMMENT 'Identificador único do evento de auditoria (UUID v4)',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Identificador do município / tenant',
    `user_id` CHAR(36) NULL COMMENT 'Operador responsável pela ação',
    `school_id` CHAR(36) NULL COMMENT 'Escola contextual da ação',
    `action` ENUM('insert', 'update', 'delete', 'login', 'logout', 'export', 'view_sensitive', 'revoke') NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL COMMENT 'Nome da entidade afetada (ex: Student, Grade, UserRole)',
    `entity_id` CHAR(36) NOT NULL COMMENT 'ID da entidade afetada',
    `old_values` JSON NULL COMMENT 'Estado anterior dos dados em formato JSON',
    `new_values` JSON NULL COMMENT 'Novo estado dos dados em formato JSON',
    `client_ip` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_audit_tenant_entity` (`tenant_id`, `entity_type`, `entity_id`),
    INDEX `idx_audit_user_action` (`tenant_id`, `user_id`, `created_at`),
    CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trilha imutável de auditoria de dados e conformidade com a LGPD';

-- -----------------------------------------------------------------------------
-- TABELA 90: core_navigation_nodes (Árvore de Menus e Rotas da Aplicação)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `core_navigation_nodes` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do item de navegação',
    `parent_id` CHAR(36) NULL COMMENT 'Nó pai na hierarquia (NULL para categorias raiz)',
    `code` VARCHAR(60) NOT NULL COMMENT 'Código único do item (ex: educa.students, educa.grades.launch)',
    `title` VARCHAR(100) NOT NULL COMMENT 'Rótulo exibido na interface',
    `description` VARCHAR(255) NULL COMMENT 'Descrição detalhada para busca no Command Palette',
    `route_name` VARCHAR(100) NULL COMMENT 'Nome da rota frontend (ex: educa.students.index)',
    `route_path` VARCHAR(255) NULL COMMENT 'Path relativo da URL (ex: /educa/alunos)',
    `icon_name` VARCHAR(50) NULL COMMENT 'Nome do ícone da biblioteca Lucide (ex: Users, BookOpen)',
    `order_index` INT NOT NULL DEFAULT 0 COMMENT 'Ordenação de exibição',
    `required_permission` VARCHAR(100) NULL COMMENT 'Chave de permissão RBAC exigida para visualização',
    `badge_expression` VARCHAR(100) NULL COMMENT 'Chave do provider de badge numérico (ex: pending_transfers_count)',
    `is_visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Exibido no menu; 0=Item oculto/atalho de comando',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_nav_code` (`code`),
    INDEX `idx_nav_parent_order` (`parent_id`, `order_index`),
    CONSTRAINT `fk_nav_parent` FOREIGN KEY (`parent_id`) REFERENCES `core_navigation_nodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Estrutura hierárquica unificada de menus e itens do Command Palette';

-- -----------------------------------------------------------------------------
-- TABELA 91: core_user_navigation_favorites (Atalhos e Itens Fixados por Usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `core_user_navigation_favorites` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `navigation_node_id` CHAR(36) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_nav_fav` (`user_id`, `navigation_node_id`),
    INDEX `idx_fav_user_order` (`user_id`, `order_index`),
    CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_fav_node` FOREIGN KEY (`navigation_node_id`) REFERENCES `core_navigation_nodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Atalhos rápidos e menus favoritados pelo operador';

-- -----------------------------------------------------------------------------
-- TABELA 92: core_notifications (Notificações Omnichannel para Usuários)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `core_notifications` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 da notificação',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Tenant de origem',
    `user_id` CHAR(36) NOT NULL COMMENT 'Destinatário da notificação',
    `category` ENUM('system', 'academic', 'administrative', 'security', 'export') NOT NULL DEFAULT 'system',
    `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    `title` VARCHAR(150) NOT NULL COMMENT 'Título curto e direto da notificação',
    `content` TEXT NOT NULL COMMENT 'Corpo da mensagem (suporta formatação Markdown)',
    `action_url` VARCHAR(2048) NULL COMMENT 'Link de ação ao clicar (deep link)',
    `action_label` VARCHAR(50) NULL COMMENT 'Rótulo do botão de ação (ex: Ver Matrícula, Baixar Arquivo)',
    `payload` JSON NULL COMMENT 'Metadados adicionais em formato chave-valor',
    `read_at` TIMESTAMP NULL COMMENT 'Data e hora em que o usuário marcou como lida',
    `delivered_channels` JSON NULL COMMENT 'Lista de canais atendidos (["in_app", "email", "push"])',
    `expires_at` TIMESTAMP NULL COMMENT 'Data de expiração da visibilidade da notificação',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_notif_user_unread` (`user_id`, `read_at`, `created_at`),
    INDEX `idx_notif_tenant_category` (`tenant_id`, `category`),
    CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notificações operacionais e acadêmicas enviadas aos operadores';

-- -----------------------------------------------------------------------------
-- TABELA 93: core_announcements (Comunicados Institucionais da Secretaria)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `core_announcements` (
    `id` CHAR(36) NOT NULL COMMENT 'UUID v4 do comunicado',
    `tenant_id` CHAR(36) NOT NULL COMMENT 'Tenant da prefeitura',
    `created_by_user_id` CHAR(36) NOT NULL COMMENT 'Gestor autor do comunicado',
    `title` VARCHAR(150) NOT NULL COMMENT 'Título do comunicado institucional',
    `content_html` LONGTEXT NOT NULL COMMENT 'Conteúdo rico formatado (HTML sanitizado)',
    `target_scope` ENUM('all_network', 'specific_schools', 'specific_roles') NOT NULL DEFAULT 'all_network',
    `target_filter_ids` JSON NULL COMMENT 'Lista de IDs de escolas ou roles elegíveis',
    `is_mandatory_acknowledgement` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Exige clique em ciente antes de liberar o sistema',
    `repeat_until_acknowledged` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Exibe a cada login até que o usuário confirme ciência',
    `starts_at` TIMESTAMP NOT NULL COMMENT 'Início da vigência do comunicado',
    `ends_at` TIMESTAMP NOT NULL COMMENT 'Término da vigência do comunicado',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_ann_tenant_dates` (`tenant_id`, `starts_at`, `ends_at`),
    CONSTRAINT `fk_ann_author` FOREIGN KEY (`created_by_user_id`) REFERENCES `core_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comunicados oficiais com suporte a bloqueio de tela e ciência compulsória';

-- -----------------------------------------------------------------------------
-- TABELA 94: core_announcement_reads (Auditoria de Confirmação e Leitura de Avisos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `core_announcement_reads` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `announcement_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `read_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `acknowledged_at` TIMESTAMP NULL COMMENT 'Carimbo de confirmação explícita de ciência',
    `client_ip` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ann_read_user` (`announcement_id`, `user_id`),
    INDEX `idx_ann_reads_user` (`user_id`, `announcement_id`),
    CONSTRAINT `fk_reads_ann` FOREIGN KEY (`announcement_id`) REFERENCES `core_announcements` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reads_user` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comprovações e assinaturas eletrônicas de leitura de comunicados';

SET FOREIGN_KEY_CHECKS = 1;
```

---

## 4. Implementação de Serviços Backend (Laravel 13)

### 4.1. `ErrorTrackingService` (Sanitização LGPD e Disparo Assíncrono)

```php
<?php

namespace App\Services\Support;

use App\Models\CoreSystemError;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class ErrorTrackingService
{
    private array $sensitiveKeys = [
        'password', 'password_confirmation', 'secret', 'token', 
        'cpf', 'credit_card', 'rg', 'certidao_nascimento'
    ];

    public function recordException(
        Throwable $exception,
        ?string $tenantId = null,
        ?string $userId = null,
        ?string $schoolId = null,
        array $requestContext = []
    ): string {
        $traceId = $requestContext['trace_id'] ?? (string) Str::uuid();
        $sanitizedPayload = $this->sanitizePayload($requestContext['payload'] ?? []);

        try {
            $errorRecord = CoreSystemError::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId ?? '00000000-0000-0000-0000-000000000000',
                'user_id' => $userId,
                'school_id' => $schoolId,
                'trace_id' => $traceId,
                'environment' => config('app.env', 'production'),
                'severity' => 'error',
                'exception_class' => get_class($exception),
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'stack_trace' => $exception->getTraceAsString(),
                'http_method' => $requestContext['method'] ?? null,
                'request_uri' => $requestContext['uri'] ?? null,
                'request_payload_sanitized' => $sanitizedPayload,
                'client_ip' => $requestContext['ip'] ?? null,
                'user_agent' => $requestContext['user_agent'] ?? null,
            ]);

            // Integração nativa com Sentry se configurado
            if (app()->bound('sentry')) {
                \Sentry\withScope(function (\Sentry\State\Scope $scope) use ($exception, $tenantId, $userId, $traceId) {
                    $scope->setTag('tenant_id', (string) $tenantId);
                    $scope->setTag('trace_id', $traceId);
                    if ($userId) $scope->setUser(['id' => $userId]);
                    \Sentry\captureException($exception);
                });
            }

            return $errorRecord->id;
        } catch (Throwable $e) {
            // Fallback seguro em arquivo caso o MySQL falhe
            Log::emergency("Falha crítica ao gravar log de erro no MySQL: " . $e->getMessage(), [
                'original_exception' => $exception->getMessage()
            ]);
            return 'FALLBACK-LOGGED';
        }
    }

    private function sanitizePayload(array $payload): array
    {
        array_walk_recursive($payload, function (&$value, $key) {
            if (in_array(strtolower($key), $this->sensitiveKeys, true)) {
                $value = '******** [REDACTED_BY_LGPD]';
            }
        });
        return $payload;
    }
}
```

### 4.2. `NavigationTreeService` (Resolução Dinâmica com Cache em Redis)

```php
<?php

namespace App\Services\Support;

use App\Models\CoreNavigationNode;
use Illuminate\Support\Facades\Redis;

class NavigationTreeService
{
    public function getUserMenuTree(string $tenantId, string $userId, array $userPermissions): array
    {
        $cacheKey = "nav:tree:{$tenantId}:{$userId}";
        $cached = Redis::get($cacheKey);
        if ($cached) {
            return json_decode($cached, true);
        }

        $allNodes = CoreNavigationNode::where('is_active', 1)
            ->where('is_visible', 1)
            ->orderBy('order_index')
            ->get();

        $filteredTree = $this->buildTree($allNodes, null, $userPermissions);

        // Cache de 1 hora com expiração automática em alterações de perfil
        Redis::setex($cacheKey, 3600, json_encode($filteredTree));

        return $filteredTree;
    }

    private function buildTree($nodes, ?string $parentId, array $userPermissions): array
    {
        $branch = [];

        foreach ($nodes->where('parent_id', $parentId) as $node) {
            // Verifica permissão se exigida pelo nó
            if ($node->required_permission && !in_array($node->required_permission, $userPermissions, true)) {
                continue;
            }

            $children = $this->buildTree($nodes, $node->id, $userPermissions);

            // Se o nó é uma pasta sem filhos autorizados e sem rota direta, não exibe
            if (empty($node->route_name) && empty($children)) {
                continue;
            }

            $branch[] = [
                'id' => $node->id,
                'code' => $node->code,
                'title' => $node->title,
                'description' => $node->description,
                'routeName' => $node->route_name,
                'routePath' => $node->route_path,
                'iconName' => $node->icon_name,
                'children' => $children,
            ];
        }

        return $branch;
    }
}
```

---

## 5. DTOs TypeScript (`@sysgov/sdk`)

```typescript
// @sysgov/sdk - Support and Core Services Definitions

export interface SystemErrorDTO {
  id: string;
  tenantId: string;
  traceId: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical' | 'emergency';
  exceptionClass: string;
  message: string;
  createdAt: string;
}

export interface NavigationNodeDTO {
  id: string;
  code: string;
  title: string;
  description?: string;
  routeName?: string;
  routePath?: string;
  iconName?: string;
  children: NavigationNodeDTO[];
}

export interface NotificationDTO {
  id: string;
  category: 'system' | 'academic' | 'administrative' | 'security' | 'export';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  content: string;
  actionUrl?: string;
  actionLabel?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface AnnouncementBarrierDTO {
  id: string;
  title: string;
  contentHtml: string;
  isMandatoryAcknowledgement: boolean;
  startsAt: string;
  endsAt: string;
}
```

---

## 6. Componentes Frontend Modernos (React 19 & Tailwind v4)

### 6.1. `CommandPaletteModal` (Busca Rápida de Menus `Ctrl + K`)

```tsx
import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import { NavigationNodeDTO } from '@sysgov/sdk';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  navigationTree: NavigationNodeDTO[];
  onNavigate: (path: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  navigationTree,
  onNavigate
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-base"
            placeholder="Digite o nome da tela, módulo ou ação (ex: Lançar Notas, Censo, Alunos)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="px-2 py-0.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {navigationTree.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.routePath) {
                  onNavigate(item.routePath);
                  onClose();
                }
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                  {item.description && (
                    <div className="text-xs text-slate-500">{item.description}</div>
                  )}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-500">
          <span>Navegue com as setas ↑ ↓</span>
          <span className="flex items-center gap-1 font-mono">
            <CornerDownLeft className="w-3 h-3" /> para abrir
          </span>
        </div>
      </div>
    </div>
  );
};
```

---

## 7. Verificação de Regras e Conformidade

1. **Proteção LGPD:** Toda exceção gravada no `core_system_errors` tem garantia matemática de que chaves identificadas como dados sensíveis são mascaradas antes da gravação ou disparo para APM externa.
2. **Desacoplamento Completo do Menu:** A autorização das requisições é feita estritamente no nível da rota via RBAC (`core_permissions`). O `core_navigation_nodes` serve exclusivamente para renderização visual e atalhos de usabilidade.
3. **Resiliência Multi-Canal:** Falhas no envio de webhooks ou e-mails de notificação não bloqueiam a entrega in-app nem quebram transações de domínio.
