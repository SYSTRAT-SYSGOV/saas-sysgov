<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\ClassDiaryCreateRequest;
use Modules\Educa\Models\EducaClassDiary;
use Modules\Educa\Services\ClassDiaryService;

final class ClassDiaryController extends Controller
{
    public function __construct(
        private readonly ClassDiaryService $classDiaryService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaClassDiary::class);

        $diarios = $this->classDiaryService->listar([
            'school_class_id' => $request->input('school_class_id'),
            'curriculum_component_id' => $request->input('curriculum_component_id') ?? $request->input('component_id'),
            'data_inicio' => $request->input('data_inicio'),
            'data_fim' => $request->input('data_fim'),
        ]);

        return response()->json([
            'data' => $diarios,
        ]);
    }

    public function store(ClassDiaryCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaClassDiary::class);

        $diario = $this->classDiaryService->registrarAula($request->validated());

        return response()->json([
            'data' => $diario,
        ], 201);
    }

    public function show(string $diarioId): JsonResponse
    {
        $this->authorize('view', EducaClassDiary::class);

        $diario = EducaClassDiary::with(['turma', 'componente', 'frequencias.enturmacao.matricula.aluno'])
            ->where('id', $diarioId)
            ->firstOrFail();

        return response()->json([
            'data' => $diario,
        ]);
    }
}
