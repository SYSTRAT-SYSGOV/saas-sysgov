<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Escola\Models\Aluno;
use Modules\Parecer\Models\Ocorrencia;
use Modules\Parecer\Services\Concerns\RegistraMutacao;
use Modules\Parecer\Support\Catalogo;

/** Ocorrências do aluno (ocorrencias.php), com anexo opcional (foto ou PDF, até 5 MB) no disco local. */
final class OcorrenciaService
{
    use RegistraMutacao;

    public const DISCO = 'local';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** Quem pode editar/excluir: gestor ou quem registrou. */
    public static function podeMexer(Ocorrencia $o, User $user, bool $gestor): bool
    {
        return $gestor || $o->registrado_por === $user->id;
    }

    public function criar(Aluno $aluno, string $data, ?int $categoriaId, string $descricao, ?UploadedFile $anexo, User $user): Ocorrencia
    {
        return DB::transaction(function () use ($aluno, $data, $categoriaId, $descricao, $anexo, $user): Ocorrencia {
            $o = Ocorrencia::create([
                'aluno_id' => $aluno->id, 'data' => $data, 'categoria_id' => $categoriaId,
                'descricao' => Catalogo::primeiraMaiuscula(mb_substr($descricao, 0, 5000)),
                'registrado_por' => $user->id, 'registrado_nome' => $user->name,
                ...$this->guardar($anexo),
            ]);
            $this->auditar('ocorrencia', 'criada', $o->id, 'Ocorrência (' . ($o->categoria->nome ?? '—') . ') de ' . $aluno->nome);

            return $o;
        });
    }

    public function editar(Ocorrencia $o, string $data, ?int $categoriaId, string $descricao, ?UploadedFile $anexo, bool $removerAnexo): Ocorrencia
    {
        return DB::transaction(function () use ($o, $data, $categoriaId, $descricao, $anexo, $removerAnexo): Ocorrencia {
            $antes = $o->only(['data', 'categoria_id', 'descricao', 'anexo_nome']);
            $o->fill(['data' => $data, 'categoria_id' => $categoriaId, 'descricao' => Catalogo::primeiraMaiuscula(mb_substr($descricao, 0, 5000))]);
            if ($anexo !== null || $removerAnexo) {
                $this->apagarArquivo($o->anexo_path);
                $o->fill(['anexo_path' => null, 'anexo_nome' => null, ...$this->guardar($anexo)]);
            }
            $o->save();
            $this->auditar('ocorrencia', 'editada', $o->id, 'Ocorrência de ' . ($o->aluno->nome ?? '') . ' alterada', $antes, $o->only(['data', 'categoria_id', 'descricao', 'anexo_nome']));

            return $o;
        });
    }

    public function excluir(Ocorrencia $o): void
    {
        DB::transaction(function () use ($o): void {
            $registro = $o->toArray();
            $o->delete();
            $this->apagarArquivo($o->anexo_path);
            $this->auditar('ocorrencia', 'excluida', $o->id, 'Ocorrência de ' . ($o->aluno->nome ?? '') . ' excluída', $registro);
        });
    }

    /** @return array{anexo_path?: string, anexo_nome?: string} */
    private function guardar(?UploadedFile $anexo): array
    {
        if ($anexo === null) {
            return [];
        }
        $caminho = $anexo->storeAs('parecer/ocorrencias', 'oc_' . Str::random(16) . '.' . $anexo->extension(), self::DISCO);

        return ['anexo_path' => (string) $caminho, 'anexo_nome' => mb_substr(basename($anexo->getClientOriginalName()), 0, 255)];
    }

    private function apagarArquivo(?string $caminho): void
    {
        if ($caminho !== null && str_starts_with($caminho, 'parecer/ocorrencias/')) {
            Storage::disk(self::DISCO)->delete($caminho);
        }
    }
}
