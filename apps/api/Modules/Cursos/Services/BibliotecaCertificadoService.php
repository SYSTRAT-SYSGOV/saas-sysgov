<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Cursos\Models\Fundo;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\TextoCertificado;

/**
 * Bibliotecas de fundos e de modelos de texto usadas pelo construtor por curso (D8). Como nas
 * assinaturas: item em uso por algum leiaute não é excluído, só desativado; arquivo de fundo
 * trocado fica guardado, porque certificados emitidos apontam para ele no snapshot.
 */
final class BibliotecaCertificadoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * @param array{nome: string, descricao?: string|null, ativo?: bool} $dados
     */
    public function criarFundo(array $dados, UploadedFile $imagem): Fundo
    {
        return DB::transaction(function () use ($dados, $imagem): Fundo {
            $fundo = Fundo::create([...$dados, ...$this->guardarFundo($imagem)]);
            $this->audit->record('cursos', 'fundo.criado', "Fundo #{$fundo->id}", null, $fundo->toArray());

            return $fundo;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizarFundo(Fundo $fundo, array $dados, ?UploadedFile $imagem = null): Fundo
    {
        return DB::transaction(function () use ($fundo, $dados, $imagem): Fundo {
            $antes = $fundo->toArray();
            $fundo->update($imagem !== null ? [...$dados, ...$this->guardarFundo($imagem)] : $dados);
            $this->audit->record('cursos', 'fundo.atualizado', "Fundo #{$fundo->id}", $antes, $fundo->toArray());

            return $fundo;
        });
    }

    public function excluirFundo(Fundo $fundo): void
    {
        $usadoEm = ModeloCertificado::query()->where('fundo_id', $fundo->id)->pluck('nome')->all();
        if ($usadoEm !== []) {
            throw new DomainException('Este fundo está em uso no(s) leiaute(s): ' . implode(', ', $usadoEm) . '. Desative-o em vez de excluir.');
        }

        DB::transaction(function () use ($fundo): void {
            $antes = $fundo->toArray();
            $fundo->delete();
            $this->audit->record('cursos', 'fundo.excluido', "Fundo #{$antes['id']}", $antes, null);
        });
    }

    /**
     * @param array{nome: string, tipo_certificado?: string|null, texto_principal: string, texto_complementar?: string|null, observacoes?: string|null, ativo?: bool} $dados
     */
    public function criarTexto(array $dados): TextoCertificado
    {
        $dados = $this->normalizarTexto($dados);

        return DB::transaction(function () use ($dados): TextoCertificado {
            $texto = TextoCertificado::create($dados);
            $this->audit->record('cursos', 'texto_certificado.criado', "TextoCertificado #{$texto->id}", null, $texto->toArray());

            return $texto;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizarTexto(TextoCertificado $texto, array $dados): TextoCertificado
    {
        $dados = $this->normalizarTexto($dados);

        return DB::transaction(function () use ($texto, $dados): TextoCertificado {
            $antes = $texto->toArray();
            $texto->update($dados);
            $this->audit->record('cursos', 'texto_certificado.atualizado', "TextoCertificado #{$texto->id}", $antes, $texto->toArray());

            return $texto;
        });
    }

    public function excluirTexto(TextoCertificado $texto): void
    {
        $usadoEm = ModeloCertificado::query()->where('texto_id', $texto->id)->pluck('nome')->all();
        if ($usadoEm !== []) {
            throw new DomainException('Este texto está em uso no(s) leiaute(s): ' . implode(', ', $usadoEm) . '. Desative-o em vez de excluir.');
        }

        DB::transaction(function () use ($texto): void {
            $antes = $texto->toArray();
            $texto->delete();
            $this->audit->record('cursos', 'texto_certificado.excluido', "TextoCertificado #{$antes['id']}", $antes, null);
        });
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function normalizarTexto(array $dados): array
    {
        if (array_key_exists('texto_principal', $dados)) {
            $dados['texto_principal'] = ModeloCertificadoService::textoComCampos((string) $dados['texto_principal'], 'no texto principal');
            if ($dados['texto_principal'] === '') {
                throw new DomainException('Escreva o texto principal do certificado.');
            }
        }
        if (array_key_exists('texto_complementar', $dados) && $dados['texto_complementar'] !== null) {
            $dados['texto_complementar'] = ModeloCertificadoService::textoComCampos((string) $dados['texto_complementar'], 'no texto complementar');
        }

        return $dados;
    }

    /**
     * Fundo em JPEG (D2) com a orientação da página deduzida da proporção da imagem.
     *
     * @return array{imagem_path: string, orientacao: string}
     */
    private function guardarFundo(UploadedFile $imagem): array
    {
        $info = @getimagesize((string) $imagem->getRealPath());
        if ($info === false) {
            throw new DomainException('Não foi possível ler a imagem de fundo.');
        }
        $caminho = 'cursos/' . $this->tenantContext->id() . '/fundos/fundo-' . Str::random(16) . '.jpg';
        Storage::disk('public')->put($caminho, ModeloCertificadoService::fundoEmJpeg((string) $imagem->getRealPath()));

        return ['imagem_path' => $caminho, 'orientacao' => $info[0] >= $info[1] ? 'paisagem' : 'retrato'];
    }
}
