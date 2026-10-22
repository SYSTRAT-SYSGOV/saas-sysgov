<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Multiprofissional\Models\Acompanhado;
use Modules\Multiprofissional\Models\Laudo;
use Modules\Multiprofissional\Support\Vinculos;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Estudante acompanhado (D4): condições, profissionais de referência e laudos. Condições e laudos são dados
 * sensíveis (D7) — o controller só repassa `condicoes` quando o usuário pode acompanhar. Nenhum dado clínico vai
 * para a auditoria além dos ids.
 */
final class AcompanhadoService
{
    public const DISCO = 'local';

    public const REGRA_LAUDO = ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenant,
    ) {}

    /**
     * @param array{aluno_id?: int, observacoes?: string|null, ativo?: bool, profissionais?: list<array{id: int, papel?: string|null}>, condicoes?: list<array{id: int, diagnosticado_em?: string|null}>} $dados
     */
    public function salvar(?Acompanhado $acompanhado, array $dados, User $user): Acompanhado
    {
        if ($acompanhado === null && Acompanhado::query()->where('aluno_id', $dados['aluno_id'] ?? 0)->exists()) {
            throw new DomainException('Esse estudante já é acompanhado.');
        }

        return DB::transaction(function () use ($acompanhado, $dados, $user): Acompanhado {
            $antes = $acompanhado === null ? null : $this->retrato($acompanhado);
            if ($acompanhado === null) {
                $acompanhado = Acompanhado::create([
                    'aluno_id' => $dados['aluno_id'],
                    'observacoes' => $dados['observacoes'] ?? null,
                    'ativo' => $dados['ativo'] ?? true,
                    'criado_por' => $user->id,
                ]);
            } else {
                $acompanhado->update(array_intersect_key($dados, array_flip(['observacoes', 'ativo'])));
            }

            if (array_key_exists('profissionais', $dados)) {
                $acompanhado->profissionais()->sync(Vinculos::comTenant(
                    collect($dados['profissionais'])->mapWithKeys(fn (array $p): array => [$p['id'] => ['papel' => $p['papel'] ?? null]])
                ));
            }
            if (array_key_exists('condicoes', $dados)) {
                $acompanhado->condicoes()->sync(Vinculos::comTenant(
                    collect($dados['condicoes'])->mapWithKeys(fn (array $c): array => [$c['id'] => ['diagnosticado_em' => $c['diagnosticado_em'] ?? null]])
                ));
            }

            $this->audit->record('multiprofissional', $antes === null ? 'acompanhado.criado' : 'acompanhado.alterado', "acompanhado:{$acompanhado->id}", $antes, $this->retrato($acompanhado));

            return $acompanhado;
        });
    }

    /** @param array{descricao: string, emitente?: string|null, emitido_em?: string|null, condicao_id?: int|null} $dados */
    public function anexarLaudo(Acompanhado $acompanhado, UploadedFile $arquivo, array $dados, User $user): Laudo
    {
        $extensao = strtolower($arquivo->guessExtension() ?? $arquivo->getClientOriginalExtension());
        $pasta = "multiprofissional/{$this->tenant->id()}/laudos";
        $caminho = $arquivo->storeAs($pasta, Str::uuid()->toString() . '.' . $extensao, self::DISCO);
        if ($caminho === false) {
            throw new DomainException('Não foi possível gravar o arquivo. Tente novamente.');
        }

        $laudo = Laudo::create([
            'acompanhado_id' => $acompanhado->id,
            'condicao_id' => $dados['condicao_id'] ?? null,
            'descricao' => $dados['descricao'],
            'emitente' => $dados['emitente'] ?? null,
            'emitido_em' => $dados['emitido_em'] ?? null,
            'arquivo_path' => $caminho,
            'arquivo_mime' => (string) ($arquivo->getMimeType() ?? 'application/octet-stream'),
            'arquivo_nome' => Str::limit($arquivo->getClientOriginalName(), 190, ''),
            'arquivo_tamanho' => (int) $arquivo->getSize(),
            'enviado_por' => $user->id,
        ]);
        $this->audit->record('multiprofissional', 'laudo.anexado', "acompanhado:{$acompanhado->id}", null, ['laudo_id' => $laudo->id, 'descricao' => $laudo->descricao]);

        return $laudo;
    }

    public function removerLaudo(Laudo $laudo): void
    {
        Storage::disk(self::DISCO)->delete($laudo->arquivo_path);
        $laudo->delete();
        $this->audit->record('multiprofissional', 'laudo.removido', "acompanhado:{$laudo->acompanhado_id}", ['laudo_id' => $laudo->id, 'descricao' => $laudo->descricao], null);
    }

    /** Download auditado (D7). */
    public function arquivoLaudo(Laudo $laudo): ?StreamedResponse
    {
        $disco = Storage::disk(self::DISCO);
        if (!$disco->exists($laudo->arquivo_path)) {
            return null;
        }
        $this->audit->record('multiprofissional', 'laudo.baixado', "acompanhado:{$laudo->acompanhado_id}", null, ['laudo_id' => $laudo->id]);

        return $disco->response($laudo->arquivo_path, $laudo->arquivo_nome, [
            'Content-Type' => $laudo->arquivo_mime,
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** @return array<string, mixed> */
    private function retrato(Acompanhado $acompanhado): array
    {
        return [
            ...$acompanhado->only(['aluno_id', 'ativo']),
            'profissionais' => $acompanhado->profissionais()->pluck('multi_profissionais.id')->all(),
            'condicoes' => $acompanhado->condicoes()->pluck('multi_condicoes.id')->all(),
        ];
    }
}
