<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Pedagogico\Models\Ocorrencia;
use Modules\Pedagogico\Services\Concerns\RegistraMutacao;

final class OcorrenciaService
{
    use RegistraMutacao;

    public const DISCO = 'local';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array{aluno_id: int, categoria_id: int, data: string, descricao: string, severidade: string} $dados */
    public function registrar(array $dados, ?UploadedFile $anexo, User $user): Ocorrencia
    {
        return DB::transaction(function () use ($dados, $anexo, $user): Ocorrencia {
            $ocorrencia = Ocorrencia::create([...$dados, 'registrado_por' => $user->id]);
            if ($anexo !== null) {
                $this->guardarAnexo($ocorrencia, $anexo);
            }
            $this->auditar('ocorrencia', 'registrada', $ocorrencia->id, null, $ocorrencia->toArray(), ['aluno_id' => $ocorrencia->aluno_id]);

            return $ocorrencia->load('categoria', 'aluno');
        });
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(Ocorrencia $ocorrencia, array $dados, ?UploadedFile $anexo): Ocorrencia
    {
        return DB::transaction(function () use ($ocorrencia, $dados, $anexo): Ocorrencia {
            $antes = $ocorrencia->toArray();
            $ocorrencia->update($dados);
            if ($anexo !== null) {
                $this->guardarAnexo($ocorrencia, $anexo);
            }
            $this->auditar('ocorrencia', 'atualizada', $ocorrencia->id, $antes, $ocorrencia->toArray());

            return $ocorrencia->load('categoria', 'aluno');
        });
    }

    /** Exclusão lógica; o anexo é mantido para a trilha de auditoria. */
    public function excluir(Ocorrencia $ocorrencia): void
    {
        DB::transaction(function () use ($ocorrencia): void {
            $antes = $ocorrencia->toArray();
            $ocorrencia->delete();
            $this->auditar('ocorrencia', 'excluida', $ocorrencia->id, $antes, null);
        });
    }

    private function guardarAnexo(Ocorrencia $ocorrencia, UploadedFile $anexo): void
    {
        $caminho = $anexo->storeAs(
            "pedagogico/{$ocorrencia->tenant_id}/ocorrencias",
            Str::uuid()->toString() . '.' . $anexo->extension(),
            self::DISCO,
        );
        $ocorrencia->update(['anexo_path' => $caminho, 'anexo_nome' => Str::limit($anexo->getClientOriginalName(), 250, '')]);
    }
}
