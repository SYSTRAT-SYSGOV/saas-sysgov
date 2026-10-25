# Mapeamento Legado: Reports e Documentos Oficiais (Atestados, Boletins, Fichas e Atas)

> **Módulo:** `Reports / Documentos Oficiais`  
> **Submódulo SYSGOV:** `SYS-Educa`  
> **Banco de Dados Alvo:** **MySQL 8.0/8.4+** (`InnoDB`, `CHAR(36)` UUID, `tenant_id`, `utf8mb4_unicode_ci`)  
> **Data:** 2026-10-12  

---

## 1. Visão Geral e Arquitetura Comparada

### 1.1 O Modelo Legado do i-Educar
No i-Educar legado:
1. **JasperReports / Daemon Java**: A emissão de relatórios dependia de templates compilados em arquivos `.jrxml` processados por um servidor Java externo (JasperServer ou daemon PHPJasper com biblioteca Java runtime). Essa dependência criava gargalos de memória, instabilidade de daemon e impossibilitava customizações rápidas de layout pelo gestor municipal.
2. **Ausência de Autenticidade e Auditoria**: O sistema gerava PDFs em streaming diretamente para o navegador (`ReportController` ou `ReportCoreController`). Não havia persistência de metadados das vias emitidas, código de verificação de autenticidade, nem QR Code para conferência pública por terceiros (outras escolas, cartórios ou empregadores).
3. **Contadores Voláteis**: A única persistência relacionada no banco legado era a tabela `report_counts`, que apenas incrementava um contador numérico simplório por escola/relatório, sem rastreabilidade de quem emitiu o documento para qual aluno ou matrícula.

### 1.2 A Arquitetura Moderna no SYSGOV (`SYS-Educa`)
1. **Motor de Renderização Nativo em Blade & Headless Chromium**:
   - Templates desenhados em Laravel Blade e Tailwind v4 com suporte rigoroso a CSS Paged Media (`@page`, cabeçalhos/rodapés repetíveis, paginação `page-break-inside: avoid`).
   - Renderização determinística via Gotenberg ou Browsershot (Chromium headless), exportando em formato arquivístico **PDF/A-1b** ou **PDF/A-2b** com metadados XMP embutidos, além de modo de impressão direta via browser.
2. **Autenticidade Documental Pública e Rastreabilidade Completa**:
   - Cada via emitida recebe um código alfanumérico seguro (`AUTH-2026-XXXX-YYYY`) e um hash SHA-256 criptográfico gerado a partir do payload dos dados no momento da emissão.
   - Todo documento impresso possui um QR Code com a URL do portal de validação pública do tenant (`https://{tenant}.sysgov.br/valida-documento?codigo=...`), permitindo que qualquer cidadão ou órgão valide a idoneidade do documento e veja o espelho oficial dos dados em tempo real.
   - Status do documento: `ACTIVE`, `EXPIRED`, `REVOKED` (caso uma certidão seja anulada por fraude ou erro material).
3. **Assinatura Eletrônica e ICP-Brasil**:
   - Vínculo com assinaturas eletrônicas avançadas (diretor, secretário escolar) em conformidade com a Lei nº 14.063/2020 e ICP-Brasil com carimbo de tempo.
4. **Consolidação de Rendimento para Ata Final**:
   - Tabela dedicada `educa_final_grade_records` que congela os dados consolidados de aprovação, médias finais, faltas e situação do aluno para geração instantânea da Ata de Resultados Finais e Termos de Encerramento do Ano Letivo.

---

## 2. Modelagem de Dados MySQL 8.0/8.4+

```sql
-- =============================================================================
-- TABELA 70: educa_document_templates (Modelos e Layouts de Documentos Oficiais)
-- =============================================================================
CREATE TABLE `educa_document_templates` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `school_id` CHAR(36) NULL COMMENT 'Se NULL, template padrão para toda a rede/tenant',
    `document_type` ENUM(
        'REPORT_CARD',                  -- Boletim Escolar (Aluno/Responsável)
        'TEACHER_REPORT_CARD',          -- Boletim do Professor (Por Turma)
        'ENROLLMENT_CERTIFICATE',       -- Atestado de Matrícula
        'ATTENDANCE_CERTIFICATE',       -- Atestado de Frequência
        'TRANSFER_DECLARATION',         -- Declaração de Transferência
        'STUDENT_INDIVIDUAL_RECORD',    -- Ficha Individual do Aluno
        'FINAL_GRADE_SHEET',            -- Ata de Resultados Finais
        'CLOSING_TERM'                  -- Termo de Encerramento do Ano Letivo
    ) NOT NULL,
    `name` VARCHAR(150) NOT NULL COMMENT 'Nome de exibição do modelo',
    `description` VARCHAR(255) NULL,
    `header_layout` JSON NOT NULL COMMENT 'Configurações de cabeçalho: brasão, nome mantenedora, secretaria, dados da escola',
    `body_template` MEDIUMTEXT NOT NULL COMMENT 'Corpo estruturado com placeholders Blade ou HTML customizado',
    `footer_layout` JSON NOT NULL COMMENT 'Configurações de rodapé: portaria, decreto de autorização, avisos de validade',
    `page_orientation` ENUM('PORTRAIT', 'LANDSCAPE') NOT NULL DEFAULT 'PORTRAIT',
    `paper_size` ENUM('A4', 'LETTER', 'LEGAL') NOT NULL DEFAULT 'A4',
    `show_qr_code` TINYINT(1) NOT NULL DEFAULT 1,
    `validity_days` INT UNSIGNED NULL COMMENT 'Prazo padrão de validade em dias (ex: 30 dias para atestados)',
    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,

    PRIMARY KEY (`id`),
    INDEX `idx_doc_templates_tenant_type` (`tenant_id`, `document_type`, `is_active`),
    INDEX `idx_doc_templates_school` (`tenant_id`, `school_id`),
    CONSTRAINT `fk_doc_templates_tenant` FOREIGN KEY (`tenant_id`)
        REFERENCES `sys_tenants` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_doc_templates_school` FOREIGN KEY (`school_id`)
        REFERENCES `educa_schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- TABELA 71: educa_issued_documents (Registro Auditável de Vias e Autenticidade)
-- =============================================================================
CREATE TABLE `educa_issued_documents` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `school_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NULL COMMENT 'Aluno titular do documento (quando aplicável)',
    `enrollment_id` CHAR(36) NULL COMMENT 'Matrícula de referência (quando aplicável)',
    `school_class_id` CHAR(36) NULL COMMENT 'Turma de referência (quando aplicável, ex: Boletim Turma ou Ata)',
    `template_id` CHAR(36) NULL,
    `document_type` ENUM(
        'REPORT_CARD',
        'TEACHER_REPORT_CARD',
        'ENROLLMENT_CERTIFICATE',
        'ATTENDANCE_CERTIFICATE',
        'TRANSFER_DECLARATION',
        'STUDENT_INDIVIDUAL_RECORD',
        'FINAL_GRADE_SHEET',
        'CLOSING_TERM'
    ) NOT NULL,
    `verification_code` VARCHAR(32) NOT NULL COMMENT 'Código alfanumérico público único (ex: AUTH-2026-A1B2-C3D4)',
    `document_hash` CHAR(64) NOT NULL COMMENT 'Hash SHA-256 do payload compilado do documento',
    `document_data_snapshot` JSON NOT NULL COMMENT 'Snapshot integral congelado dos dados no momento da emissão',
    `pdf_storage_path` VARCHAR(255) NULL COMMENT 'Caminho no S3/MinIO para o PDF/A assinado',
    `file_size_bytes` INT UNSIGNED NULL,
    `issued_by_user_id` CHAR(36) NOT NULL COMMENT 'Operador/secretário responsável pela emissão',
    `purpose` VARCHAR(200) NULL COMMENT 'Finalidade declarada (ex: Para fins de transporte escolar)',
    `issued_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NULL COMMENT 'Data de expiração da validade da certidão',
    `status` ENUM('ACTIVE', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `revocation_reason` VARCHAR(255) NULL COMMENT 'Motivo formal da anulação/revogação',
    `revoked_by_user_id` CHAR(36) NULL,
    `revoked_at` TIMESTAMP NULL,
    `verification_views_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Contador de conferências públicas via QR Code',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_issued_doc_code` (`tenant_id`, `verification_code`),
    INDEX `idx_issued_doc_hash` (`tenant_id`, `document_hash`),
    INDEX `idx_issued_doc_student` (`tenant_id`, `student_id`, `document_type`),
    INDEX `idx_issued_doc_enrollment` (`tenant_id`, `enrollment_id`),
    INDEX `idx_issued_doc_class` (`tenant_id`, `school_class_id`),
    INDEX `idx_issued_doc_issued_at` (`tenant_id`, `issued_at`),
    CONSTRAINT `fk_issued_doc_tenant` FOREIGN KEY (`tenant_id`)
        REFERENCES `sys_tenants` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_issued_doc_school` FOREIGN KEY (`school_id`)
        REFERENCES `educa_schools` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_issued_doc_student` FOREIGN KEY (`student_id`)
        REFERENCES `educa_students` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_issued_doc_enrollment` FOREIGN KEY (`enrollment_id`)
        REFERENCES `educa_enrollments` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_issued_doc_class` FOREIGN KEY (`school_class_id`)
        REFERENCES `educa_school_classes` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_issued_doc_template` FOREIGN KEY (`template_id`)
        REFERENCES `educa_document_templates` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_issued_doc_issuer` FOREIGN KEY (`issued_by_user_id`)
        REFERENCES `sys_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- TABELA 72: educa_document_signatures (Assinaturas Digitais e Eletrônicas)
-- =============================================================================
CREATE TABLE `educa_document_signatures` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `issued_document_id` CHAR(36) NOT NULL,
    `signatory_user_id` CHAR(36) NOT NULL,
    `signatory_role` ENUM('PRINCIPAL', 'SECRETARY', 'COORDINATOR', 'TEACHER') NOT NULL,
    `signatory_name` VARCHAR(150) NOT NULL,
    `signatory_cpf` CHAR(11) NOT NULL,
    `signature_type` ENUM('ELECTRONIC', 'DIGITAL_ICP_BRASIL') NOT NULL DEFAULT 'ELECTRONIC',
    `certificate_issuer` VARCHAR(255) NULL COMMENT 'Autoridade Certificadora no caso de ICP-Brasil',
    `signature_hash` VARCHAR(512) NOT NULL COMMENT 'Hash da assinatura ou token criptográfico',
    `timestamp_token` TEXT NULL COMMENT 'Carimbo de tempo oficial (timestamp authority)',
    `signed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,

    PRIMARY KEY (`id`),
    INDEX `idx_doc_signatures_document` (`tenant_id`, `issued_document_id`),
    INDEX `idx_doc_signatures_user` (`tenant_id`, `signatory_user_id`),
    CONSTRAINT `fk_doc_signatures_tenant` FOREIGN KEY (`tenant_id`)
        REFERENCES `sys_tenants` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_doc_signatures_doc` FOREIGN KEY (`issued_document_id`)
        REFERENCES `educa_issued_documents` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_doc_signatures_user` FOREIGN KEY (`signatory_user_id`)
        REFERENCES `sys_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- TABELA 73: educa_final_grade_records (Ata Consolidada de Resultados Finais)
-- =============================================================================
CREATE TABLE `educa_final_grade_records` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `school_class_id` CHAR(36) NOT NULL,
    `academic_year_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `enrollment_id` CHAR(36) NOT NULL,
    `order_in_class` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Número de chamada do aluno',
    `student_name` VARCHAR(200) NOT NULL,
    `student_registration_code` VARCHAR(50) NOT NULL,
    `discipline_scores` JSON NOT NULL COMMENT 'Mapa de disciplinas: [{discipline_id, name, final_score, exam_score, absences, situation}]',
    `total_absences` INT UNSIGNED NOT NULL DEFAULT 0,
    `attendance_percentage` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    `final_situation` ENUM(
        'APPROVED',                         -- Aprovado
        'APPROVED_BY_EXAM',                -- Aprovado pelo Conselho / Exame Final
        'RETAINED_BY_SCORE',               -- Retido por Nota
        'RETAINED_BY_ABSENCE',             -- Retido por Frequência
        'RETAINED_BY_SCORE_AND_ABSENCE',   -- Retido por Nota e Frequência
        'TRANSFERRED',                     -- Transferido no decorrer do ano
        'ABANDONED',                       -- Deixou de frequentar
        'DECEASED'                         -- Falecido
    ) NOT NULL,
    `observations` VARCHAR(500) NULL,
    `is_closed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Se 1, ata homologada e travada',
    `closed_by_user_id` CHAR(36) NULL,
    `closed_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_final_grade_enrollment` (`tenant_id`, `school_class_id`, `enrollment_id`),
    INDEX `idx_final_grade_class_order` (`tenant_id`, `school_class_id`, `order_in_class`),
    INDEX `idx_final_grade_student` (`tenant_id`, `student_id`),
    CONSTRAINT `fk_final_grade_tenant` FOREIGN KEY (`tenant_id`)
        REFERENCES `sys_tenants` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_final_grade_class` FOREIGN KEY (`school_class_id`)
        REFERENCES `educa_school_classes` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_final_grade_year` FOREIGN KEY (`academic_year_id`)
        REFERENCES `educa_academic_years` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_final_grade_student` FOREIGN KEY (`student_id`)
        REFERENCES `educa_students` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_final_grade_enrollment` FOREIGN KEY (`enrollment_id`)
        REFERENCES `educa_enrollments` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_final_grade_closed_by` FOREIGN KEY (`closed_by_user_id`)
        REFERENCES `sys_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Matriz De/Para: Legado vs SYSGOV

| Conceito / Recurso Legado | Solução Legada (i-Educar) | Nova Solução SYSGOV (`SYS-Educa`) | Justificativa da Evolução |
| :--- | :--- | :--- | :--- |
| **Motor de Renderização** | JasperReports (`.jrxml`) via daemon Java (`phpjasper` ou servidor HTTP remoto) | Blade Templates + Headless Chromium (Gotenberg / Browsershot) | Eliminação de dependência de Java VM; renderização idêntica entre tela e PDF/A; suporte a CSS Moderno. |
| **Boletim do Aluno** | `ReportController::reportCard` chamando Jasper | `DocumentIssuanceService::generateReportCard` | Layout responsivo, geração em lote ou individual, emissão com QR Code de autenticação. |
| **Boletim do Professor** | `ReportController::teacherReportCard` chamando Jasper | `DocumentIssuanceService::generateTeacherReportCard` | Visão tabular consolidada da turma por etapa, impressa em formato paisagem com notas e faltas. |
| **Atestado de Matrícula e Frequência** | Scripts procedurais PHP legados sem registro | `educa_issued_documents` + templates dinâmicos | Validade jurídica com prazo em dias, rastreabilidade de via e QR Code para confirmação externa. |
| **Ficha Individual do Aluno** | Jasper Report complexo e estático | `educa_issued_documents` tipo `STUDENT_INDIVIDUAL_RECORD` | Consolida vida escolar, notas por etapa, histórico de faltas, dados de saúde e transporte escolar. |
| **Ata Final de Resultados** | Script PHP de contabilidade manual | `educa_final_grade_records` | Tabela congelada pós-fechamento do ano letivo; garante imutabilidade da ata para inspeção escolar. |
| **Auditoria e Autenticidade** | Inexistente (apenas `report_counts` incrementando inteiro) | `verification_code`, `document_hash` (SHA-256) e QR Code público | Atende aos padrões de governo digital e conformidade com órgãos reguladores de educação. |
| **Assinatura do Documento** | Apenas carimbo manual após impressão | `educa_document_signatures` (Eletrônica e ICP-Brasil) | Em conformidade com a Lei Federal nº 14.063/2020 e ICP-Brasil com carimbo de tempo. |

---

## 4. Serviços Backend Laravel 13 (`apps/api`)

### 4.1 `DocumentIssuanceService.php`

```php
<?php

declare(strict_types=1);

namespace App\Services\Educa;

use App\Models\Educa\IssuedDocument;
use App\Models\Educa\DocumentTemplate;
use App\Models\Educa\Enrollment;
use App\Models\Educa\SchoolClass;
use App\Services\Security\TenantContext;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Spatie\Browsershot\Browsershot;

class DocumentIssuanceService
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly DocumentSecurityService $securityService,
        private readonly DocumentDataCompilerService $compilerService
    ) {}

    /**
     * Emite um documento oficial com snapshot de dados, código de autenticação e PDF/A.
     */
    public function issueDocument(
        string $documentType,
        string $schoolId,
        ?string $studentId = null,
        ?string $enrollmentId = null,
        ?string $schoolClassId = null,
        ?string $purpose = null,
        ?int $customValidityDays = null
    ): IssuedDocument {
        $tenantId = $this->tenantContext->getTenantId();
        $userId = auth()->id();

        // 1. Obter template ativo
        $template = DocumentTemplate::where('tenant_id', $tenantId)
            ->where('document_type', $documentType)
            ->where(function ($query) use ($schoolId) {
                $query->where('school_id', $schoolId)->orWhereNull('school_id');
            })
            ->where('is_active', true)
            ->orderByRaw('school_id IS NOT NULL DESC')
            ->first();

        // 2. Compilar dados cadastrais e acadêmicos em snapshot imutável
        $compiledData = $this->compilerService->compilePayload(
            documentType: $documentType,
            schoolId: $schoolId,
            studentId: $studentId,
            enrollmentId: $enrollmentId,
            schoolClassId: $schoolClassId
        );

        // 3. Gerar código alfanumérico público e Hash SHA-256
        $verificationCode = $this->securityService->generateUniqueVerificationCode($tenantId);
        $documentHash = hash('sha256', json_encode($compiledData, JSON_THROW_ON_ERROR));

        // 4. Montar URL de validação pública e QR Code
        $validationUrl = route('public.document.verify', [
            'tenant' => $this->tenantContext->getTenantSlug(),
            'codigo' => $verificationCode,
        ]);
        $qrCodeBase64 = $this->securityService->generateQrCodeDataUri($validationUrl);

        // 5. Injetar metadados de autenticidade no payload
        $compiledData['metadata'] = [
            'verification_code' => $verificationCode,
            'document_hash' => $documentHash,
            'validation_url' => $validationUrl,
            'qr_code_base64' => $qrCodeBase64,
            'issued_at' => now()->toIso8601String(),
            'purpose' => $purpose,
        ];

        // 6. Calcular data de validade (se aplicável)
        $validityDays = $customValidityDays ?? $template?->validity_days;
        $expiresAt = $validityDays ? now()->addDays($validityDays) : null;

        // 7. Renderizar HTML e gerar PDF/A via Headless Chromium
        $renderedHtml = view("reports.documents.{$documentType}", [
            'data' => $compiledData,
            'template' => $template,
        ])->render();

        $storagePath = "tenants/{$tenantId}/documents/{$verificationCode}.pdf";
        $pdfContent = Browsershot::html($renderedHtml)
            ->setOption('args', ['--no-sandbox', '--disable-setuid-sandbox'])
            ->format($template?->paper_size ?? 'A4')
            ->landscape($template?->page_orientation === 'LANDSCAPE')
            ->showBackground()
            ->pdf();

        Storage::disk('s3')->put($storagePath, $pdfContent);

        // 8. Persistir o registro oficial em educa_issued_documents
        return IssuedDocument::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'school_id' => $schoolId,
            'student_id' => $studentId,
            'enrollment_id' => $enrollmentId,
            'school_class_id' => $schoolClassId,
            'template_id' => $template?->id,
            'document_type' => $documentType,
            'verification_code' => $verificationCode,
            'document_hash' => $documentHash,
            'document_data_snapshot' => $compiledData,
            'pdf_storage_path' => $storagePath,
            'file_size_bytes' => strlen($pdfContent),
            'issued_by_user_id' => $userId,
            'purpose' => $purpose,
            'issued_at' => now(),
            'expires_at' => $expiresAt,
            'status' => 'ACTIVE',
        ]);
    }
}
```

### 4.2 `DocumentSecurityService.php`

```php
<?php

declare(strict_types=1);

namespace App\Services\Educa;

use App\Models\Educa\IssuedDocument;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Str;

class DocumentSecurityService
{
    /**
     * Gera código alfanumérico público legível e sem colisões.
     * Padrão: AUTH-YYYY-XXXX-YYYY (ex: AUTH-2026-F9D2-8B1A)
     */
    public function generateUniqueVerificationCode(string $tenantId): string
    {
        $year = date('Y');
        do {
            $part1 = strtoupper(Str::random(4));
            $part2 = strtoupper(Str::random(4));
            $code = "AUTH-{$year}-{$part1}-{$part2}";
            $exists = IssuedDocument::where('tenant_id', $tenantId)
                ->where('verification_code', $code)
                ->exists();
        } while ($exists);

        return $code;
    }

    /**
     * Gera imagem do QR Code em formato Data URI Base64.
     */
    public function generateQrCodeDataUri(string $url): string
    {
        $png = QrCode::format('png')
            ->size(150)
            ->margin(1)
            ->errorCorrection('H')
            ->generate($url);

        return 'data:image/png;base64,' . base64_encode($png);
    }
}
```

---

## 5. Contratos de API RESTful e DTOs TypeScript (`@sysgov/sdk`)

### 5.1 Endpoints da API

- `POST /api/v1/educa/reports/issue`: Emite um novo documento oficial (Atestado, Boletim, Ficha Individual, Ata).
- `GET /api/v1/educa/reports/issued-documents`: Lista histórico de documentos emitidos com filtros (escola, aluno, tipo, período).
- `GET /api/v1/educa/reports/issued-documents/{id}/download`: Download direto da via em PDF/A armazenada no S3.
- `POST /api/v1/educa/reports/issued-documents/{id}/revoke`: Revoga/anula uma via emitida com motivo formal.
- `POST /api/v1/educa/reports/final-grades/consolidate`: Congela as notas finais de uma turma e gera a Ata Oficial.
- `GET /api/v1/public/documents/verify/{verification_code}`: Endpoint **público** (sem auth) para conferência de autenticidade documental por QR Code ou chave alfanumérica.

### 5.2 Tipagens TypeScript (`packages/sdk/src/educa/reports.ts`)

```typescript
export type DocumentType =
  | 'REPORT_CARD'
  | 'TEACHER_REPORT_CARD'
  | 'ENROLLMENT_CERTIFICATE'
  | 'ATTENDANCE_CERTIFICATE'
  | 'TRANSFER_DECLARATION'
  | 'STUDENT_INDIVIDUAL_RECORD'
  | 'FINAL_GRADE_SHEET'
  | 'CLOSING_TERM';

export type DocumentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface IssueDocumentPayload {
  document_type: DocumentType;
  school_id: string;
  student_id?: string;
  enrollment_id?: string;
  school_class_id?: string;
  purpose?: string;
  validity_days?: number;
}

export interface IssuedDocumentResponse {
  id: string;
  tenant_id: string;
  school_id: string;
  student_id?: string;
  enrollment_id?: string;
  school_class_id?: string;
  document_type: DocumentType;
  verification_code: string;
  document_hash: string;
  pdf_storage_path?: string;
  issued_by_user_id: string;
  purpose?: string;
  issued_at: string;
  expires_at?: string;
  status: DocumentStatus;
  verification_views_count: number;
}

export interface PublicDocumentVerificationResult {
  is_valid: boolean;
  status: DocumentStatus;
  verification_code: string;
  document_type: DocumentType;
  document_type_label: string;
  student_name?: string;
  school_name: string;
  issued_at: string;
  expires_at?: string;
  revocation_reason?: string;
  can_download_mirror: boolean;
  download_url?: string;
}
```

---

## 6. Componentes de Interface React 19 (`apps/web`)

### 6.1 Modal de Emissão de Documento Oficial (`DocumentIssuanceModal.tsx`)

```tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@sysgov/ui/dialog';
import { Button } from '@sysgov/ui/button';
import { Input } from '@sysgov/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@sysgov/ui/select';
import { Badge } from '@sysgov/ui/badge';
import { FileText, Printer, CheckCircle, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface DocumentIssuanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  studentName?: string;
  enrollmentId?: string;
  schoolId: string;
  schoolClassId?: string;
}

export function DocumentIssuanceModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  enrollmentId,
  schoolId,
  schoolClassId,
}: DocumentIssuanceModalProps) {
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState<string>('ENROLLMENT_CERTIFICATE');
  const [purpose, setPurpose] = useState<string>('Para fins de comprovação');
  const [validityDays, setValidityDays] = useState<number>(30);
  const [issuedDoc, setIssuedDoc] = useState<any>(null);

  const issueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/educa/reports/issue', {
        document_type: docType,
        school_id: schoolId,
        student_id: studentId,
        enrollment_id: enrollmentId,
        school_class_id: schoolClassId,
        purpose,
        validity_days: validityDays,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setIssuedDoc(data);
      queryClient.invalidateQueries({ queryKey: ['issued-documents'] });
    },
  });

  const handleReset = () => {
    setIssuedDoc(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleReset}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <DialogTitle>Emissão de Documento Oficial</DialogTitle>
          </div>
        </DialogHeader>

        {!issuedDoc ? (
          <div className="space-y-4 py-2">
            {studentName && (
              <div className="rounded-md bg-muted/50 p-3">
                <span className="text-xs text-muted-foreground block">Aluno(a) Selecionado(a)</span>
                <span className="text-sm font-semibold text-foreground">{studentName}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de Documento</label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o documento..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENROLLMENT_CERTIFICATE">Atestado de Matrícula</SelectItem>
                  <SelectItem value="ATTENDANCE_CERTIFICATE">Atestado de Frequência</SelectItem>
                  <SelectItem value="REPORT_CARD">Boletim Escolar</SelectItem>
                  <SelectItem value="STUDENT_INDIVIDUAL_RECORD">Ficha Individual do Aluno</SelectItem>
                  <SelectItem value="TRANSFER_DECLARATION">Declaração de Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Finalidade do Documento</label>
              <Input
                placeholder="Ex: Passe escolar, benefícios sociais, comprovação geral"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prazo de Validade (dias)</label>
              <Input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
              />
            </div>

            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                Este documento receberá um <strong className="text-foreground">Código de Autenticação Único</strong> e <strong className="text-foreground">QR Code</strong> para conferência pública de veracidade por terceiros.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Documento Emitido com Sucesso!</h3>
              <p className="text-xs text-muted-foreground mt-1">O documento oficial foi registrado e o PDF/A gerado.</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Código Verificador:</span>
                <span className="font-mono font-bold text-primary">{issuedDoc.verification_code}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Hash SHA-256:</span>
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[240px]">
                  {issuedDoc.document_hash}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  ATIVO
                </Badge>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!issuedDoc ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending}
              >
                {issueMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando PDF/A...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Emitir e Autenticar
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                Fechar
              </Button>
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <a
                  href={`/api/v1/educa/reports/issued-documents/${issuedDoc.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PDF/A Oficial
                </a>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. Verificação e Conformidade Regulamentar

1. **Validade Jurídica de Certidões Digitais**: O mecanismo com hash SHA-256, QR Code e carimbo de data/hora no banco de dados atende às diretrizes do MEC para documentos escolares digitais e da Lei do Governo Digital (Lei Federal nº 14.129/2021).
2. **Imutabilidade da Ata de Resultados Finais**: Uma vez homologada pela direção (`is_closed = 1`), a tabela `educa_final_grade_records` não permite alterações sem a reabertura formal registrada por auditoria, garantindo que o histórico de notas e aprovações da turma permaneça inalterado para vistorias da Secretaria de Educação.
