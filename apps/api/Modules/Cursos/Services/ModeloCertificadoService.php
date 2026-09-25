<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Cursos\Models\ModeloCertificado;

/**
 * Modelos de certificado (design D9): corpo em texto puro com placeholders
 * fixos, renderizado por substituição simples — nunca como template, para
 * não abrir injeção de código.
 *
 * Imagens (logotipo e assinaturas) ganham nome único a cada envio e as
 * antigas NÃO são apagadas: certificados já emitidos apontam para elas no
 * snapshot.
 */
final class ModeloCertificadoService
{
    public const PLACEHOLDERS = ['participante', 'curso', 'carga_horaria', 'periodo', 'data_emissao', 'orgao', 'nota'];

    public const MAX_ASSINATURAS = 3;

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{nome: string, titulo: string, corpo: string, padrao?: bool, assinaturas?: list<array{nome: string, cargo: string}>} $dados
     */
    public function criar(array $dados): ModeloCertificado
    {
        $dados = $this->normalizar($dados);

        return DB::transaction(function () use ($dados): ModeloCertificado {
            if ($dados['padrao'] ?? false) {
                ModeloCertificado::query()->where('padrao', true)->update(['padrao' => false]);
            }
            $modelo = ModeloCertificado::create($dados);
            $this->audit->record('cursos', 'modelo_certificado.criado', "ModeloCertificado #{$modelo->id}", null, $modelo->toArray());

            return $modelo;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(ModeloCertificado $modelo, array $dados): ModeloCertificado
    {
        $dados = $this->normalizar($dados, $modelo);

        return DB::transaction(function () use ($modelo, $dados): ModeloCertificado {
            if ($dados['padrao'] ?? false) {
                ModeloCertificado::query()->whereKeyNot($modelo->id)->where('padrao', true)->update(['padrao' => false]);
            }
            $antes = $modelo->toArray();
            $modelo->update($dados);
            $this->audit->record('cursos', 'modelo_certificado.atualizado', "ModeloCertificado #{$modelo->id}", $antes, $modelo->toArray());

            return $modelo;
        });
    }

    public function excluir(ModeloCertificado $modelo): void
    {
        DB::transaction(function () use ($modelo): void {
            $antes = $modelo->toArray();
            $modelo->delete();
            $this->audit->record('cursos', 'modelo_certificado.excluido', "ModeloCertificado #{$antes['id']}", $antes, null);
        });
    }

    public function definirLogotipo(ModeloCertificado $modelo, UploadedFile $arquivo): ModeloCertificado
    {
        $antes = $modelo->logotipo_path;
        $modelo->update(['logotipo_path' => $this->guardar($modelo, $arquivo, 'logotipo')]);
        $this->audit->record('cursos', 'modelo_certificado.logotipo', "ModeloCertificado #{$modelo->id}", ['logotipo_path' => $antes], ['logotipo_path' => $modelo->logotipo_path]);

        return $modelo;
    }

    public function definirImagemAssinatura(ModeloCertificado $modelo, int $indice, UploadedFile $arquivo): ModeloCertificado
    {
        $assinaturas = $modelo->assinaturas ?? [];
        if (!isset($assinaturas[$indice])) {
            throw new DomainException('Assinatura inexistente neste modelo — cadastre o nome e o cargo antes de enviar a imagem.');
        }

        $antes = $assinaturas;
        $assinaturas[$indice]['imagem_path'] = $this->guardar($modelo, $arquivo, "assinatura-{$indice}");
        $modelo->update(['assinaturas' => $assinaturas]);
        $this->audit->record('cursos', 'modelo_certificado.assinatura', "ModeloCertificado #{$modelo->id}", ['assinaturas' => $antes], ['assinaturas' => $assinaturas]);

        return $modelo;
    }

    /**
     * Substitui os placeholders do corpo pelos valores (sem nenhuma avaliação de código).
     *
     * @param array<string, string> $valores
     */
    public static function renderizar(string $corpo, array $valores): string
    {
        return (string) preg_replace_callback(
            '/\{\{\s*([a-z_]+)\s*\}\}/',
            fn (array $m): string => $valores[$m[1]] ?? $m[0],
            $corpo,
        );
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function normalizar(array $dados, ?ModeloCertificado $atual = null): array
    {
        if (array_key_exists('corpo', $dados)) {
            $dados['corpo'] = trim(strip_tags((string) $dados['corpo']));
            preg_match_all('/\{\{\s*([^}]*?)\s*\}\}/', $dados['corpo'], $m);
            $desconhecidos = array_values(array_unique(array_diff($m[1], self::PLACEHOLDERS)));
            if ($desconhecidos !== []) {
                throw new DomainException('Campo dinâmico desconhecido no modelo: {{' . implode('}}, {{', $desconhecidos) . '}}. Use apenas: {{' . implode('}}, {{', self::PLACEHOLDERS) . '}}.');
            }
        }

        if (array_key_exists('assinaturas', $dados)) {
            $novas = $dados['assinaturas'] ?? [];
            if (count($novas) > self::MAX_ASSINATURAS) {
                throw new DomainException('O modelo aceita no máximo ' . self::MAX_ASSINATURAS . ' assinaturas.');
            }
            // Mantém a imagem já enviada de cada posição.
            $anteriores = $atual->assinaturas ?? [];
            $dados['assinaturas'] = array_map(fn (array $a, int $i): array => [
                'nome' => (string) $a['nome'],
                'cargo' => (string) $a['cargo'],
                'imagem_path' => $anteriores[$i]['imagem_path'] ?? null,
            ], $novas, array_keys($novas));
        }

        return $dados;
    }

    private function guardar(ModeloCertificado $modelo, UploadedFile $arquivo, string $prefixo): string
    {
        return $arquivo->storeAs(
            "cursos/{$modelo->tenant_id}/certificados",
            "modelo-{$modelo->id}-{$prefixo}-" . Str::random(12) . '.' . strtolower($arquivo->getClientOriginalExtension()),
            'public',
        );
    }
}
