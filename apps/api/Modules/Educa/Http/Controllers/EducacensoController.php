<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Educa\Http\Requests\CensusAuditRequest;
use Modules\Educa\Http\Requests\CensusExportRequest;
use Modules\Educa\Http\Requests\CensusImportRequest;
use Modules\Educa\Jobs\ExportEducacensoJob;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCensusExport;
use Modules\Educa\Models\EducaCensusInepLog;
use Modules\Educa\Models\EducaCensusValidation;
use Modules\Educa\Services\CensusAuditService;
use Modules\Educa\Services\CensusImportService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class EducacensoController extends Controller
{
    public function __construct(
        private readonly CensusAuditService $auditService,
        private readonly CensusImportService $importService,
    ) {}

    public function listarValidacoes(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaCensusValidation::class);

        $schoolId = $request->query('school_id');
        $academicYearId = $request->query('academic_year_id');

        $query = EducaCensusValidation::query();

        if ($schoolId) {
            $query->where('school_id', $schoolId);
        }
        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }
        if ($request->has('gravidade')) {
            $query->where('gravidade', $request->query('gravidade'));
        }
        if ($request->has('tipo_registro')) {
            $query->where('tipo_registro', $request->query('tipo_registro'));
        }

        $validacoes = $query->latest()->get();

        $totalErros = $validacoes->where('gravidade', EducaCensusValidation::GRAVIDADE_IMPEDITIVO)->count();
        $totalAvisos = $validacoes->where('gravidade', EducaCensusValidation::GRAVIDADE_AVISO)->count();

        return response()->json([
            'total_erros' => $totalErros,
            'total_avisos' => $totalAvisos,
            'data' => $validacoes,
        ]);
    }

    public function auditar(CensusAuditRequest $request): JsonResponse
    {
        $this->authorize('auditar', EducaCensusValidation::class);

        $tenantId = app(TenantContext::class)->id();
        $schoolId = (string) $request->validated('school_id');
        $academicYearId = (string) $request->validated('academic_year_id');
        $dataReferencia = (string) $request->validated('data_referencia');

        $resultado = $this->auditService->auditar(
            $tenantId,
            $schoolId,
            $academicYearId,
            $dataReferencia
        );

        return response()->json([
            'data' => $resultado,
        ]);
    }

    public function listarExportacoes(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaCensusExport::class);

        $query = EducaCensusExport::query();

        if ($request->has('school_id')) {
            $query->where('school_id', $request->query('school_id'));
        }
        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->query('academic_year_id'));
        }
        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $exportacoes = $query->latest()->get();

        return response()->json([
            'data' => $exportacoes,
        ]);
    }

    public function solicitarExportacao(CensusExportRequest $request): JsonResponse
    {
        $this->authorize('exportar', EducaCensusExport::class);

        $tenantId = app(TenantContext::class)->id();
        $schoolId = (string) $request->validated('school_id');
        $academicYearId = (string) $request->validated('academic_year_id');
        $etapaCenso = (string) ($request->validated('etapa_censo') ?? EducaCensusExport::ETAPA_MATRICULA_INICIAL);

        // Bloqueio de exportação caso existam inconsistências impeditivas não sanadas
        $inconsistenciasImpeditivas = EducaCensusValidation::query()
            ->where('tenant_id', $tenantId)
            ->where('school_id', $schoolId)
            ->where('academic_year_id', $academicYearId)
            ->where('gravidade', EducaCensusValidation::GRAVIDADE_IMPEDITIVO)
            ->get();

        if ($inconsistenciasImpeditivas->isNotEmpty()) {
            return response()->json([
                'message' => 'A exportação foi bloqueada por inconsistências cadastrais impeditivas.',
                'errors' => [
                    'censo' => $inconsistenciasImpeditivas->pluck('mensagem')->all(),
                ],
            ], 422);
        }

        $anoLetivo = EducaAcademicYear::query()->where('id', $academicYearId)->firstOrFail();

        $export = EducaCensusExport::create([
            'tenant_id' => $tenantId,
            'school_id' => $schoolId,
            'academic_year_id' => $academicYearId,
            'ano' => $anoLetivo->ano,
            'etapa_censo' => $etapaCenso,
            'status' => EducaCensusExport::STATUS_SOLICITADA,
        ]);

        ExportEducacensoJob::dispatch($export);

        return response()->json([
            'message' => 'Exportação do Censo enfileirada com sucesso.',
            'data' => $export,
        ], 202);
    }

    public function obterExportacao(string $exportId): JsonResponse
    {
        $this->authorize('view', EducaCensusExport::class);

        $export = EducaCensusExport::query()->where('id', $exportId)->firstOrFail();

        return response()->json([
            'data' => $export,
        ]);
    }

    public function downloadExportacao(string $exportId): StreamedResponse|JsonResponse
    {
        $this->authorize('download', EducaCensusExport::class);

        $export = EducaCensusExport::query()->where('id', $exportId)->firstOrFail();

        if ($export->status !== EducaCensusExport::STATUS_CONCLUIDA || empty($export->arquivo_path)) {
            return response()->json([
                'message' => 'O arquivo de exportação ainda não foi gerado ou o processamento falhou.',
            ], 400);
        }

        $disk = Storage::disk('local');
        if (!$disk->exists($export->arquivo_path)) {
            return response()->json([
                'message' => 'Arquivo não localizado no armazenamento.',
            ], 404);
        }

        $conteudo = $disk->get($export->arquivo_path);
        $filename = basename($export->arquivo_path);

        return response()->streamDownload(function () use ($conteudo) {
            echo $conteudo;
        }, $filename, [
            'Content-Type' => 'text/plain; charset=ISO-8859-1',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function processarRetorno(CensusImportRequest $request): JsonResponse
    {
        $this->authorize('importarRetorno', EducaCensusInepLog::class);

        $tenantId = app(TenantContext::class)->id();
        $schoolId = (string) $request->validated('school_id');
        $academicYearId = (string) $request->validated('academic_year_id');
        $arquivo = $request->file('arquivo');

        $resultado = $this->importService->importar(
            $tenantId,
            $schoolId,
            $academicYearId,
            $arquivo
        );

        return response()->json([
            'data' => $resultado,
        ]);
    }

    public function listarLogsRetorno(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaCensusInepLog::class);

        $query = EducaCensusInepLog::query();

        if ($request->has('school_id')) {
            $query->where('school_id', $request->query('school_id'));
        }
        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->query('academic_year_id'));
        }

        $logs = $query->latest()->get();

        return response()->json([
            'data' => $logs,
        ]);
    }
}
