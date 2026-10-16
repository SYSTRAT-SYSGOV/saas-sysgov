<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Fundo;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\TextoCertificado;

/**
 * Construtor por curso (D8): o leiaute montado com fundo e texto das bibliotecas é gravado como o
 * modelo visual do curso (`curso_id`) e vinculado a ele — emissão, snapshot, verso e emissão
 * avulsa seguem iguais.
 */
final class ConstrutorCursoService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function leiaute(Curso $curso): ?ModeloCertificado
    {
        return ModeloCertificado::query()->where('curso_id', $curso->id)->first();
    }

    /**
     * @param array{fundo_id: int, texto_id: int, elementos: mixed, verso_ativo?: bool} $dados
     */
    public function salvar(Curso $curso, array $dados): ModeloCertificado
    {
        $atual = $this->leiaute($curso);
        $atributos = $this->atributos($curso, $dados, $atual);

        return DB::transaction(function () use ($curso, $atual, $atributos): ModeloCertificado {
            $antes = $atual?->toArray();
            $modelo = $atual ?? new ModeloCertificado();
            $modelo->fill($atributos)->save();
            if ($curso->modelo_certificado_id !== $modelo->id) {
                $curso->update(['modelo_certificado_id' => $modelo->id]);
            }
            $this->audit->record('cursos', 'leiaute_curso.salvo', "Curso #{$curso->id}", $antes, $modelo->toArray());

            return $modelo->refresh();
        });
    }

    /**
     * Cópia em memória com as alterações ainda não salvas — só para a pré-visualização.
     *
     * @param array{fundo_id: int, texto_id: int, elementos: mixed, verso_ativo?: bool} $dados
     */
    public function previa(Curso $curso, array $dados): ModeloCertificado
    {
        $atual = $this->leiaute($curso);
        $modelo = new ModeloCertificado($this->atributos($curso, $dados, $atual));
        $modelo->setRelation('fundo', Fundo::query()->find($dados['fundo_id']));
        $modelo->setRelation('texto', TextoCertificado::query()->find($dados['texto_id']));

        return $modelo;
    }

    /**
     * @param array{fundo_id: int, texto_id: int, elementos: mixed, verso_ativo?: bool} $dados
     * @return array<string, mixed>
     */
    private function atributos(Curso $curso, array $dados, ?ModeloCertificado $atual): array
    {
        // TenantAware: fundo ou texto de outro órgão não é encontrado.
        $fundo = Fundo::query()->find($dados['fundo_id']);
        if ($fundo === null) {
            throw new DomainException('Fundo de certificado inexistente.');
        }
        if (!$fundo->ativo && $fundo->id !== $atual?->fundo_id) {
            throw new DomainException('Este fundo está inativo: ative-o na aba Fundos ou escolha outro.');
        }
        $texto = TextoCertificado::query()->find($dados['texto_id']);
        if ($texto === null) {
            throw new DomainException('Modelo de texto inexistente.');
        }
        if (!$texto->ativo && $texto->id !== $atual?->texto_id) {
            throw new DomainException('Este modelo de texto está inativo: ative-o na aba Textos ou escolha outro.');
        }

        return [
            'curso_id' => $curso->id,
            'nome' => Str::limit('Certificado — ' . $curso->titulo, 150, ''),
            'tipo' => ModeloCertificado::TIPO_VISUAL,
            'orientacao' => $fundo->orientacao,
            'fundo_id' => $fundo->id,
            'texto_id' => $texto->id,
            // Cópias de segurança: valem se o vínculo com a biblioteca deixar de existir.
            'titulo' => $texto->tipo_certificado ?: 'Certificado',
            'corpo' => $texto->texto_principal,
            'elementos' => LeiauteCertificado::validar($dados['elementos'], $fundo->orientacao, LeiauteCertificado::assinaturasReferenciadas($atual?->elementos)),
            'verso_ativo' => (bool) ($dados['verso_ativo'] ?? $atual->verso_ativo ?? false),
        ];
    }
}
