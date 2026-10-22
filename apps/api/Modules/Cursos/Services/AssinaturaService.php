<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Cursos\Models\Assinatura;
use Modules\Cursos\Models\ModeloCertificado;

/**
 * Biblioteca de assinaturas do órgão (D4). Imagem e selo ganham arquivo novo a cada envio e os
 * antigos NÃO são apagados — certificados emitidos apontam para eles no snapshot. Assinatura
 * usada por algum modelo não pode ser excluída, só desativada.
 */
final class AssinaturaService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{nome: string, cargo?: string|null, registro_profissional?: string|null, ativa?: bool} $dados
     */
    public function criar(array $dados): Assinatura
    {
        return DB::transaction(function () use ($dados): Assinatura {
            $assinatura = Assinatura::create($dados);
            $this->audit->record('cursos', 'assinatura.criada', "Assinatura #{$assinatura->id}", null, $assinatura->toArray());

            return $assinatura;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Assinatura $assinatura, array $dados): Assinatura
    {
        return DB::transaction(function () use ($assinatura, $dados): Assinatura {
            $antes = $assinatura->toArray();
            $assinatura->update($dados);
            $this->audit->record('cursos', 'assinatura.atualizada', "Assinatura #{$assinatura->id}", $antes, $assinatura->toArray());

            return $assinatura;
        });
    }

    public function excluir(Assinatura $assinatura): void
    {
        $usadaEm = $this->modelosQueUsam($assinatura);
        if ($usadaEm !== []) {
            throw new DomainException('Esta assinatura está em uso no(s) modelo(s): ' . implode(', ', $usadaEm) . '. Desative-a em vez de excluir.');
        }

        DB::transaction(function () use ($assinatura): void {
            $antes = $assinatura->toArray();
            $assinatura->delete();
            $this->audit->record('cursos', 'assinatura.excluida', "Assinatura #{$antes['id']}", $antes, null);
        });
    }

    public function definirImagem(Assinatura $assinatura, UploadedFile $arquivo): Assinatura
    {
        return $this->definirArquivo($assinatura, 'imagem_path', $arquivo, 'assinatura');
    }

    public function definirSelo(Assinatura $assinatura, UploadedFile $arquivo): Assinatura
    {
        return $this->definirArquivo($assinatura, 'selo_path', $arquivo, 'selo');
    }

    /**
     * Nomes dos modelos visuais que têm algum elemento apontando para a assinatura.
     *
     * @return list<string>
     */
    public function modelosQueUsam(Assinatura $assinatura): array
    {
        return ModeloCertificado::query()
            ->whereNotNull('elementos')
            ->get(['id', 'nome', 'elementos'])
            ->filter(fn (ModeloCertificado $m): bool => collect($m->elementos ?? [])->contains(fn (array $e): bool => (int) ($e['assinatura_id'] ?? 0) === $assinatura->id))
            ->pluck('nome')
            ->values()
            ->all();
    }

    private function definirArquivo(Assinatura $assinatura, string $coluna, UploadedFile $arquivo, string $prefixo): Assinatura
    {
        $antes = $assinatura->getAttribute($coluna);
        $caminho = $arquivo->storeAs(
            "cursos/{$assinatura->tenant_id}/assinaturas",
            "{$prefixo}-{$assinatura->id}-" . Str::random(12) . '.' . ($arquivo->extension() ?: 'png'),
            'public',
        );
        $assinatura->update([$coluna => $caminho]);
        $this->audit->record('cursos', "assinatura.{$prefixo}", "Assinatura #{$assinatura->id}", [$coluna => $antes], [$coluna => $caminho]);

        return $assinatura;
    }
}
