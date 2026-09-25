<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use App\Support\HtmlSanitizer;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Cursos\Enums\RegraLiberacao;
use Modules\Cursos\Enums\TipoMaterial;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Support\VideoUrl;
use Throwable;

/**
 * Materiais do curso (Fase 2). O PDF fica no disco privado `local` e só sai
 * pelo endpoint autorizado (design D3); vídeo vira provedor + ID (D4); o
 * texto é sanitizado ao salvar (D5).
 */
final class MaterialService
{
    public const DISCO_ARQUIVOS = 'local';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly HtmlSanitizer $sanitizer,
    ) {}

    /**
     * @param array<string, mixed> $dados
     */
    public function criar(Curso $curso, array $dados): Material
    {
        $tipo = TipoMaterial::from((string) ($dados['tipo'] ?? ''));
        $atributos = $this->atributos($curso, $tipo, $dados, null);

        return DB::transaction(function () use ($curso, $tipo, $dados, $atributos): Material {
            $material = $curso->materiais()->create([
                ...$atributos,
                'tipo' => $tipo->value,
                'ordem' => $dados['ordem'] ?? ((int) $curso->materiais()->max('ordem')) + 1,
            ]);
            $material->refresh(); // traz os defaults do banco (publicado, liberação)
            $this->audit->record('cursos', 'material.criado', "Material #{$material->id}", null, $material->toArray());

            return $material;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Material $material, array $dados): Material
    {
        if (isset($dados['tipo']) && $dados['tipo'] !== $material->tipo) {
            throw new DomainException('O tipo do material não pode ser alterado. Crie um novo material.');
        }

        $atributos = $this->atributos($material->curso, $material->tipoEnum(), $dados, $material);

        return DB::transaction(function () use ($material, $atributos, $dados): Material {
            $antes = $material->toArray();
            $material->update([...$atributos, ...(isset($dados['ordem']) ? ['ordem' => (int) $dados['ordem']] : [])]);
            $this->audit->record('cursos', 'material.atualizado', "Material #{$material->id}", $antes, $material->toArray());

            return $material;
        });
    }

    /**
     * @param list<int> $ids todos os materiais do curso, na nova ordem
     * @return Collection<int, Material>
     */
    public function reordenar(Curso $curso, array $ids): Collection
    {
        $existentes = $curso->materiais()->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $novos = array_map('intval', $ids);

        if (count($novos) !== count(array_unique($novos)) || array_diff($existentes, $novos) !== [] || array_diff($novos, $existentes) !== []) {
            throw new DomainException('A lista de reordenação deve conter exatamente os materiais do curso, sem repetições.');
        }

        DB::transaction(function () use ($curso, $novos): void {
            foreach ($novos as $posicao => $id) {
                $curso->materiais()->whereKey($id)->update(['ordem' => $posicao + 1]);
            }
            $this->audit->record('cursos', 'material.reordenados', "Curso #{$curso->id}", null, ['ordem' => $novos]);
        });

        return $curso->materiais()->get();
    }

    public function excluir(Material $material): void
    {
        $arquivo = $material->arquivo_path;

        DB::transaction(function () use ($material): void {
            $antes = $material->toArray();
            $material->delete();
            $this->audit->record('cursos', 'material.excluido', "Material #{$antes['id']}", $antes, null);
        });

        $this->apagarArquivo($arquivo);
    }

    /** Envia ou substitui o PDF; o arquivo anterior só é apagado depois de gravar a troca. */
    public function definirArquivo(Material $material, UploadedFile $arquivo): Material
    {
        if (!$material->tipoEnum()->is(TipoMaterial::Arquivo)) {
            throw new DomainException('Só materiais do tipo arquivo aceitam um PDF.');
        }

        $anterior = $material->arquivo_path;
        $caminho = $arquivo->storeAs("cursos/{$material->tenant_id}/materiais", Str::uuid()->toString() . '.pdf', self::DISCO_ARQUIVOS);
        if ($caminho === false) {
            throw new DomainException('Não foi possível gravar o arquivo. Tente novamente.');
        }

        try {
            DB::transaction(function () use ($material, $arquivo, $caminho): void {
                $material->update([
                    'arquivo_path' => $caminho,
                    'arquivo_nome' => Str::limit(basename($arquivo->getClientOriginalName()), 250, ''),
                    'arquivo_tamanho' => $arquivo->getSize(),
                ]);
                $this->audit->record('cursos', 'material.arquivo_definido', "Material #{$material->id}", null, [
                    'arquivo_nome' => $material->arquivo_nome, 'arquivo_tamanho' => $material->arquivo_tamanho,
                ]);
            });
        } catch (Throwable $e) {
            $this->apagarArquivo($caminho);

            throw $e;
        }

        if ($anterior !== null && $anterior !== $caminho) {
            $this->apagarArquivo($anterior);
        }

        return $material;
    }

    private function apagarArquivo(?string $caminho): void
    {
        if ($caminho !== null) {
            Storage::disk(self::DISCO_ARQUIVOS)->delete($caminho);
        }
    }

    /**
     * Valida e monta os atributos a gravar, já considerando o estado atual
     * (atualização parcial). Só os campos do tipo do material são aceitos.
     *
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function atributos(Curso $curso, TipoMaterial $tipo, array $dados, ?Material $atual): array
    {
        $atributos = [];

        foreach (['titulo', 'descricao'] as $campo) {
            if (array_key_exists($campo, $dados)) {
                $atributos[$campo] = $dados[$campo];
            }
        }

        $atributos += $this->conteudoDoTipo($tipo, $dados, $atual);
        $atributos += $this->liberacao($curso, $dados, $atual);

        if (array_key_exists('publicado', $dados)) {
            $atributos['publicado'] = (bool) $dados['publicado'];
        }

        $publicado = $atributos['publicado'] ?? ($atual !== null && $atual->publicado);
        if ($publicado && $tipo->is(TipoMaterial::Arquivo) && $atual?->arquivo_path === null) {
            throw new DomainException('Envie o arquivo PDF antes de publicar o material.');
        }

        return $atributos;
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function conteudoDoTipo(TipoMaterial $tipo, array $dados, ?Material $atual): array
    {
        $informado = static fn (string $campo): bool => array_key_exists($campo, $dados);
        $texto = static fn (string $campo): string => trim((string) ($dados[$campo] ?? ''));

        switch ($tipo) {
            case TipoMaterial::Texto:
                if ($atual === null || $informado('conteudo')) {
                    $conteudo = $this->sanitizer->sanitize($texto('conteudo'));
                    if (trim(strip_tags($conteudo)) === '') {
                        throw new DomainException('Informe o conteúdo do texto.');
                    }

                    return ['conteudo' => $conteudo];
                }

                return [];

            case TipoMaterial::Link:
                if ($atual === null || $informado('url')) {
                    $url = $texto('url');
                    $esquema = strtolower((string) parse_url($url, PHP_URL_SCHEME));
                    if ($url === '' || !in_array($esquema, ['http', 'https'], true) || filter_var($url, FILTER_VALIDATE_URL) === false) {
                        throw new DomainException('Informe um endereço válido que comece com http:// ou https://.');
                    }

                    return ['url' => $url];
                }

                return [];

            case TipoMaterial::Video:
                if ($atual === null || $informado('url')) {
                    $video = VideoUrl::parse($texto('url'));
                    if ($video === null) {
                        throw new DomainException('Endereço de vídeo não suportado. Provedores aceitos: YouTube e Vimeo.');
                    }

                    return ['video_provedor' => $video['provedor'], 'video_id' => $video['id']];
                }

                return [];

            case TipoMaterial::Arquivo:
                return [];
        }
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function liberacao(Curso $curso, array $dados, ?Material $atual): array
    {
        $regra = isset($dados['liberacao_regra'])
            ? RegraLiberacao::from((string) $dados['liberacao_regra'])
            : ($atual?->regraLiberacao() ?? RegraLiberacao::Imediata);
        $aulaId = array_key_exists('aula_id', $dados) ? ($dados['aula_id'] !== null ? (int) $dados['aula_id'] : null) : $atual?->aula_id;
        $dias = array_key_exists('liberacao_dias', $dados) ? ($dados['liberacao_dias'] !== null ? (int) $dados['liberacao_dias'] : null) : $atual?->liberacao_dias;

        if ($aulaId !== null && !Aula::query()->where('curso_id', $curso->id)->whereKey($aulaId)->exists()) {
            throw new DomainException('A aula informada não pertence a este curso.');
        }
        if ($regra === RegraLiberacao::InicioAula && $aulaId === null) {
            throw new DomainException('A liberação "no início da aula" exige uma aula vinculada ao material.');
        }
        if ($regra === RegraLiberacao::DiasAposInicio && ($dias === null || $dias < 0 || $dias > 365)) {
            throw new DomainException('Informe de 0 a 365 dias para a liberação após o início da turma.');
        }

        return [
            'aula_id' => $aulaId,
            'liberacao_regra' => $regra->value,
            'liberacao_dias' => $regra === RegraLiberacao::DiasAposInicio ? $dias : null,
        ];
    }
}
