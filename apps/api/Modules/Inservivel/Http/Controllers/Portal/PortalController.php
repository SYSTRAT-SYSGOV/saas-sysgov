<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\BemFoto;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\EntidadeDocumento;
use Modules\Inservivel\Models\Interesse;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Services\ArquivoService;
use Modules\Inservivel\Services\ConfiguracaoService;
use Modules\Inservivel\Services\EntidadeService;
use Modules\Inservivel\Services\InscricaoService;
use Modules\Inservivel\Services\TermoService;
use Modules\Inservivel\Services\ValidadeDocumentoService;
use Modules\Inservivel\Support\EntidadeAtual;
use Modules\Inservivel\Support\FormataBem;
use Modules\Inservivel\Support\FormataEntidade;
use Modules\Inservivel\Support\FormataLote;
use Modules\Inservivel\Support\RegrasEntidade;
use Symfony\Component\HttpFoundation\Response;

/**
 * Portal da entidade (spec: Portal da entidade; D7). Toda rota resolve a entidade pelo usuário logado; lote, bem,
 * foto e documento de outra entidade ou fora do que o portal mostra respondem 404.
 */
final class PortalController extends Controller
{
    use RespondeErroDeNegocio;

    /** Status de lote que a entidade habilitada enxerga. */
    private const VISIVEIS = [StatusLote::Publicado, StatusLote::Sorteado, StatusLote::Entregue, StatusLote::Baixado];

    public function __construct(
        private readonly EntidadeAtual $atual,
        private readonly EntidadeService $entidades,
        private readonly InscricaoService $inscricoes,
        private readonly ConfiguracaoService $configuracao,
        private readonly ValidadeDocumentoService $validade,
        private readonly ArquivoService $arquivos,
        private readonly TermoService $termos,
    ) {}

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->ficha($this->atual->de($request)));
    }

    public function atualizar(Request $request): JsonResponse
    {
        $entidade = $this->atual->de($request);
        $dados = $request->validate(RegrasEntidade::dados(false, comCnpj: false));

        return $this->executar(fn (): JsonResponse => response()->json($this->ficha($this->entidades->atualizar($entidade, $dados))));
    }

    public function enviarDocumento(Request $request): JsonResponse
    {
        $entidade = $this->atual->de($request);
        $dados = $request->validate([
            'tipo' => ['required', 'string', 'max:60'],
            'arquivo' => ['required', ...ArquivoService::REGRA_DOCUMENTO_ENTIDADE],
            'validade' => ['nullable', 'date'],
        ]);

        return $this->executar(function () use ($entidade, $dados, $request): JsonResponse {
            $this->entidades->enviarDocumento($entidade, $dados['tipo'], $request->file('arquivo'), $dados['validade'] ?? null);

            return response()->json($this->ficha($entidade->refresh()), 201);
        });
    }

    public function documento(Request $request, EntidadeDocumento $documento): Response
    {
        abort_unless($documento->entidade_id === $this->atual->de($request)->id, 404);

        return $this->arquivos->resposta($documento->caminho, $documento->mime, $documento->tipo)
            ?? response()->json(['error' => 'Arquivo não encontrado.'], 404);
    }

    public function lotes(Request $request): JsonResponse
    {
        $entidade = $this->atual->de($request);
        if ($entidade->status !== StatusEntidade::Habilitada) {
            return response()->json(['liberado' => false, 'mensagem' => $this->mensagemStatus($entidade), 'lotes' => []]);
        }
        $inscritos = Interesse::query()->where('entidade_id', $entidade->id)->pluck('lote_id')->all();
        $lotes = FormataLote::comTotais(Lote::query())->with('sorteio')->whereIn('status', self::VISIVEIS)->latest('id')->get()
            ->map(fn (Lote $l): array => [...FormataLote::card($l), ...$this->situacaoDaEntidade($l, $entidade, $inscritos)]);

        return response()->json(['liberado' => true, 'mensagem' => null, 'lotes' => $lotes]);
    }

    public function lote(Request $request, Lote $lote): JsonResponse
    {
        $entidade = $this->loteVisivel($request, $lote);
        $lote = FormataLote::comTotais(Lote::query())->with(['sorteio', 'bens.situacao', 'bens.estadoConservacao', 'bens.categoria', 'bens.secretaria', 'bens.setor', 'bens.fotoPrincipal'])->findOrFail($lote->id);
        $inscritos = Interesse::query()->where('entidade_id', $entidade->id)->pluck('lote_id')->all();

        return response()->json([
            ...FormataLote::card($lote),
            'observacoes' => $lote->getAttribute('observacoes'),
            'bens' => $lote->bens->sortBy('numero_patrimonial')->values()->map(fn (Bem $b): array => FormataBem::resumo($b))->all(),
            ...$this->situacaoDaEntidade($lote, $entidade, $inscritos),
        ]);
    }

    public function participar(Request $request, Lote $lote): JsonResponse
    {
        $entidade = $this->loteVisivel($request, $lote);

        return $this->executar(function () use ($entidade, $lote, $request): JsonResponse {
            $this->inscricoes->participar($entidade, $lote, $request->ip());

            return response()->json(['inscrita' => true], 201);
        });
    }

    public function desistir(Request $request, Lote $lote): JsonResponse
    {
        $entidade = $this->loteVisivel($request, $lote);

        return $this->executar(function () use ($entidade, $lote): JsonResponse {
            $this->inscricoes->desistir($entidade, $lote);

            return response()->json(['inscrita' => false]);
        });
    }

    public function fotoBem(Request $request, Lote $lote, Bem $bem, BemFoto $foto): Response
    {
        $this->loteVisivel($request, $lote);
        abort_unless($lote->bens()->whereKey($bem->id)->exists() && $foto->bem_id === $bem->id, 404);

        return $this->arquivos->resposta($foto->caminho, $foto->mime, "bem-{$bem->numero_patrimonial}-{$foto->id}")
            ?? response()->json(['error' => 'Arquivo não encontrado.'], 404);
    }

    /** Termos do lote: só a entidade vencedora (de outro lote ou não sorteado: 404). */
    public function termo(Request $request, Lote $lote, string $tipo): Response
    {
        $entidade = $this->loteVisivel($request, $lote);
        abort_unless(isset(TermoService::TERMOS_LOTE[$tipo]) && $lote->sorteio?->entidade_vencedora_id === $entidade->id, 404);

        return response($this->termos->termoLote($lote, $tipo), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="termo-' . $tipo . '-lote-' . str_replace('/', '-', $lote->numero) . '.pdf"',
        ]);
    }

    /** Lote fora dos status visíveis ou entidade não habilitada: 404 (o portal não confirma que o lote existe). */
    private function loteVisivel(Request $request, Lote $lote): Entidade
    {
        $entidade = $this->atual->de($request);
        if ($entidade->status !== StatusEntidade::Habilitada) {
            abort(403, $this->mensagemStatus($entidade));
        }
        abort_unless(in_array($lote->status, self::VISIVEIS, true), 404);

        return $entidade;
    }

    /**
     * @param list<int> $inscritos
     * @return array<string, mixed>
     */
    private function situacaoDaEntidade(Lote $lote, Entidade $entidade, array $inscritos): array
    {
        $sorteio = $lote->sorteio;

        return [
            'inscrita' => in_array($lote->id, $inscritos, true),
            'pode_participar' => $lote->status === StatusLote::Publicado,
            'sorteado' => $sorteio !== null,
            'vencedora' => $sorteio !== null && $sorteio->entidade_vencedora_id === $entidade->id,
        ];
    }

    private function mensagemStatus(Entidade $entidade): string
    {
        return match ($entidade->status) {
            StatusEntidade::Reprovada, StatusEntidade::Desabilitada => 'Sua entidade está com pendências no cadastro e não pode participar dos lotes. Veja o motivo e envie os documentos corrigidos.',
            default => 'Seu cadastro está em análise pelo Patrimônio. Os lotes ficam disponíveis depois da habilitação.',
        };
    }

    /** @return array<string, mixed> */
    private function ficha(Entidade $entidade): array
    {
        return FormataEntidade::completo($entidade, $this->configuracao->documentosExigidos(), [
            'bloqueios' => $this->validade->bloqueios($entidade),
            'alertas_documentos' => $this->validade->alertasDa($entidade),
            'mensagem_status' => $entidade->status === StatusEntidade::Habilitada ? null : $this->mensagemStatus($entidade),
        ]);
    }
}
