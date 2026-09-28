<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\CsvSeguro;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\FrequenciaService;
use Modules\Cursos\Services\InscricaoService;
use Modules\Cursos\Services\ListaInscritosService;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class InscricaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly InscricaoService $inscricoes,
        private readonly FrequenciaService $frequencia,
        private readonly ListaInscritosService $listaInscritos,
        private readonly AuditLogger $audit,
        private readonly CsvSeguro $csv,
    ) {}

    /** O participante logado se inscreve na turma. */
    public function inscrever(Request $request, Turma $turma): JsonResponse
    {
        $this->authorize('inscrever', $turma);
        $user = $request->user();

        return $this->executar(fn () => response()->json(
            $this->inscricoes->inscrever($turma, $this->inscricoes->participanteDoUsuario($user), $user),
            201,
        ));
    }

    /** O Administrador inscreve um usuário do órgão diretamente. */
    public function inscreverDireto(Request $request, Turma $turma): JsonResponse
    {
        $this->authorize('inscreverOutros', $turma);
        $dados = $request->validate(['user_id' => ['required', 'integer']]);

        $tenantId = app(TenantContext::class)->id();
        $alvo = User::query()
            ->whereKey($dados['user_id'])
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId)->where('tenant_user.status', 'active'))
            ->first();
        if ($alvo === null) {
            return response()->json(['error' => 'Usuário não encontrado neste órgão.'], 422);
        }

        return $this->executar(fn () => response()->json(
            $this->inscricoes->inscrever($turma, $this->inscricoes->participanteDoUsuario($alvo), $request->user(), peloAdministrador: true),
            201,
        ));
    }

    public function index(Turma $turma): JsonResponse
    {
        $this->authorize('operar', $turma);

        return response()->json($this->listaInscritos->linhas($turma));
    }

    public function exportar(Turma $turma): StreamedResponse
    {
        $this->authorize('operar', $turma);
        $linhas = $this->listaInscritos->linhas($turma);

        $this->audit->record('cursos', 'inscricoes.exportadas', "Turma #{$turma->id}", null, ['formato' => 'csv', 'linhas' => count($linhas)]);

        $nome = 'inscritos-turma-' . $turma->id . '-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($linhas): void {
            $saida = fopen('php://output', 'wb');
            $this->csv->escreverCabecalho($saida, ['Nome', 'E-mail', 'Status', 'Data da inscrição', 'Frequência até o momento (%)']);
            foreach ($linhas as $l) {
                $this->csv->escreverLinha($saida, [
                    $l['nome'], $l['email'], $l['status_label'],
                    $l['inscrito_em'], number_format($l['frequencia']['percentual'], 2, ',', ''),
                ]);
            }
            fclose($saida);
        }, $nome, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function show(Inscricao $inscricao): JsonResponse
    {
        $this->authorize('view', $inscricao);
        $inscricao->load(['turma.curso', 'participante', 'certificado']);

        return response()->json([
            ...$inscricao->toArray(),
            'posicao_fila' => $this->inscricoes->posicaoNaFila($inscricao),
            'frequencia' => $this->frequencia->resumo($inscricao, ateAgora: true),
            'nota' => $this->listaInscritos->nota($inscricao),
            'aulas' => $this->frequencia->detalhe($inscricao),
        ]);
    }

    /** Área do participante: as próprias inscrições. */
    public function minhas(Request $request): JsonResponse
    {
        $participante = Participante::query()->where('user_id', $request->user()->id)->first();
        if ($participante === null) {
            return response()->json([]);
        }

        $inscricoes = Inscricao::query()
            ->where('participante_id', $participante->id)
            ->with(['turma.curso:id,titulo,tipo,carga_horaria_minutos,capa_path', 'certificado:id,inscricao_id,codigo,revogado_em'])
            ->latest('id')
            ->get()
            ->map(fn (Inscricao $i): array => [
                ...$i->toArray(),
                'posicao_fila' => $this->inscricoes->posicaoNaFila($i),
                'frequencia' => $this->frequencia->resumo($i, ateAgora: true),
                'nota' => $this->listaInscritos->nota($i),
            ]);

        return response()->json($inscricoes);
    }

    public function aprovar(Request $request, Inscricao $inscricao): JsonResponse
    {
        $this->authorize('decidir', $inscricao);

        return $this->executar(fn () => response()->json($this->inscricoes->aprovar($inscricao, $request->user())));
    }

    public function recusar(Request $request, Inscricao $inscricao): JsonResponse
    {
        $this->authorize('decidir', $inscricao);
        $dados = $request->validate(['motivo' => ['required', 'string', 'max:450']]);

        return $this->executar(fn () => response()->json($this->inscricoes->recusar($inscricao, $request->user(), $dados['motivo'])));
    }

    public function cancelar(Request $request, Inscricao $inscricao): JsonResponse
    {
        $this->authorize('cancelar', $inscricao);
        $dados = $request->validate(['motivo' => ['sometimes', 'nullable', 'string', 'max:500']]);
        $peloAdministrador = $request->user()->hasPermission('cursos.manage', app(TenantContext::class)->id());

        return $this->executar(fn () => response()->json(
            $this->inscricoes->cancelar($inscricao, $request->user(), $peloAdministrador, $dados['motivo'] ?? null),
        ));
    }
}
