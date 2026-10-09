<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Support\AuditLogger;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\Vistoria\Models\ExecucaoVistoria;

/**
 * Registro de ocorrências de queimada e abertura automática de auto de infração
 * ambiental quando o responsável é identificado — ver spec `meio-ambiente/queimadas`.
 *
 * A abertura automática reaproveita `FiscalizacaoAmbientalService` (Fase 4), que
 * opera sobre pares (`ExecucaoVistoria`, `Empreendimento`) — por isso só dispara
 * quando o responsável identificado é um `Empreendimento` *e* uma execução de
 * vistoria é informada junto (ver nota de implementação em tasks.md, Fase 8).
 * Responsável só pessoa física (sem empreendimento) registra normalmente, mas não
 * abre auto de infração automaticamente.
 */
final readonly class QueimadasService
{
    public function __construct(
        private FiscalizacaoAmbientalService $fiscalizacao,
        private AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     data_ocorrencia: string,
     *     latitude: float,
     *     longitude: float,
     *     area_queimada_ha?: float|null,
     *     responsavel_pessoa_id?: int|null,
     *     responsavel_empreendimento_id?: int|null,
     *     referencia_imagem_satelite?: array<string, mixed>|null,
     * } $dados
     */
    public function registrarOcorrencia(array $dados): OcorrenciaQueimada
    {
        $responsavelIdentificado = ! empty($dados['responsavel_pessoa_id']) || ! empty($dados['responsavel_empreendimento_id']);

        $ocorrencia = OcorrenciaQueimada::create($dados + [
            'situacao' => $responsavelIdentificado
                ? OcorrenciaQueimada::SITUACAO_RESPONSAVEL_IDENTIFICADO
                : OcorrenciaQueimada::SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO,
        ]);
        $this->audit->record('meio_ambiente', 'ocorrencia_queimada.registrada', "OcorrenciaQueimada #{$ocorrencia->id}", null, $ocorrencia->toArray());

        return $ocorrencia;
    }

    /**
     * @param array{
     *     responsavel_pessoa_id?: int|null,
     *     responsavel_empreendimento_id?: int|null,
     *     execucao_vistoria_id?: int|null,
     * } $dados
     */
    public function vincularResponsavel(OcorrenciaQueimada $ocorrencia, array $dados): OcorrenciaQueimada
    {
        $antes = $ocorrencia->toArray();
        $ocorrencia->update([
            'responsavel_pessoa_id' => $dados['responsavel_pessoa_id'] ?? $ocorrencia->responsavel_pessoa_id,
            'responsavel_empreendimento_id' => $dados['responsavel_empreendimento_id'] ?? $ocorrencia->responsavel_empreendimento_id,
            'situacao' => OcorrenciaQueimada::SITUACAO_RESPONSAVEL_IDENTIFICADO,
        ]);

        if ($ocorrencia->responsavel_empreendimento_id !== null
            && ! empty($dados['execucao_vistoria_id'])
            && $ocorrencia->auto_infracao_ambiental_id === null
        ) {
            $this->abrirAutoInfracao($ocorrencia, (int) $dados['execucao_vistoria_id']);
        }

        // Registrado depois da eventual abertura do auto, para o `after` já trazer o vínculo
        // `auto_infracao_ambiental_id` (o auto em si tem registro próprio, no FiscalizacaoAmbientalService).
        $ocorrencia->refresh();
        $this->audit->record('meio_ambiente', 'ocorrencia_queimada.responsavel_vinculado', "OcorrenciaQueimada #{$ocorrencia->id}", $antes, $ocorrencia->toArray());

        return $ocorrencia;
    }

    private function abrirAutoInfracao(OcorrenciaQueimada $ocorrencia, int $execucaoVistoriaId): AutoInfracaoAmbiental
    {
        $execucao = ExecucaoVistoria::findOrFail($execucaoVistoriaId);
        $empreendimento = Empreendimento::findOrFail($ocorrencia->responsavel_empreendimento_id);

        $auto = $this->fiscalizacao->emitirAutoInfracaoAmbiental($execucao, $empreendimento, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_QUEIMADA,
            'area_afetada_ha' => $ocorrencia->area_queimada_ha,
        ]);

        $ocorrencia->update(['auto_infracao_ambiental_id' => $auto->id]);

        return $auto;
    }
}
