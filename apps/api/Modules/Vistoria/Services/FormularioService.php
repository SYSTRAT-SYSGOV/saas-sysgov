<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Support\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Pergunta;
use Modules\Vistoria\Models\RespostaChecklist;

final class FormularioService
{
    public function __construct(
        private AuditLogger $audit,
        private EvidenciaService $evidencias,
    ) {}

    /**
     * Cria um modelo de formulário com suas perguntas, disponível imediatamente para
     * seleção em ordens de serviço do mesmo tipo de fiscalização — sem deploy.
     *
     * @param array<string, mixed> $dados
     *
     * @throws \DomainException quando alguma pergunta tem tipo inválido
     */
    public function criarModeloFormulario(array $dados): ModeloFormulario
    {
        foreach ($dados['perguntas'] ?? [] as $pergunta) {
            if (! in_array($pergunta['tipo'] ?? null, Pergunta::TIPOS_VALIDOS, true)) {
                throw new \DomainException("Tipo de pergunta inválido: {$pergunta['tipo']}.");
            }
        }

        $modelo = DB::transaction(function () use ($dados): ModeloFormulario {
            $modelo = ModeloFormulario::create([
                'tipo_fiscalizacao' => $dados['tipo_fiscalizacao'],
                'nome' => $dados['nome'],
                'descricao' => $dados['descricao'] ?? null,
                'ativo' => $dados['ativo'] ?? true,
            ]);

            foreach ($dados['perguntas'] ?? [] as $indice => $pergunta) {
                Pergunta::create([
                    'modelo_id' => $modelo->id,
                    'enunciado' => $pergunta['enunciado'],
                    'tipo' => $pergunta['tipo'],
                    'opcoes' => $pergunta['opcoes'] ?? null,
                    'obrigatoria' => $pergunta['obrigatoria'] ?? true,
                    'ordem' => $pergunta['ordem'] ?? $indice,
                ]);
            }

            return $modelo;
        });

        $this->audit->record('vistoria', 'modelo_formulario.criado', "ModeloFormulario #{$modelo->id}", null, $modelo->load('perguntas')->toArray());

        return $modelo;
    }

    /**
     * @param array<string, mixed> $filtros
     *
     * @return LengthAwarePaginator<int, ModeloFormulario>
     */
    public function listar(array $filtros): LengthAwarePaginator
    {
        $query = ModeloFormulario::query()->with('perguntasAtivas')->latest();

        if ($tipo = $filtros['tipo_fiscalizacao'] ?? null) {
            $query->where('tipo_fiscalizacao', $tipo);
        }

        return $query->paginate((int) ($filtros['per_page'] ?? 15));
    }

    /**
     * Resolve o modelo de formulário vigente para a ordem, com base na classificação
     * de atividade do local fiscalizado.
     */
    public function resolverParaOrdem(OrdemServico $ordem): ?ModeloFormulario
    {
        $tipoFiscalizacao = $ordem->local?->classificacao_atividade;
        if (! $tipoFiscalizacao) {
            return null;
        }

        return ModeloFormulario::ativos()
            ->where('tipo_fiscalizacao', $tipoFiscalizacao)
            ->with('perguntasAtivas')
            ->latest()
            ->first();
    }

    /**
     * Garante que toda pergunta obrigatória do modelo tem uma resposta não vazia.
     *
     * @param array<int, array{pergunta_id: int, valor?: mixed}> $respostas
     *
     * @throws \DomainException quando falta resposta para uma pergunta obrigatória
     */
    public function validarRespostasObrigatorias(ModeloFormulario $modelo, array $respostas): void
    {
        $respondidas = [];
        foreach ($respostas as $resposta) {
            $valor = $resposta['valor'] ?? null;
            if ($valor !== null && $valor !== '') {
                $respondidas[(int) $resposta['pergunta_id']] = true;
            }
        }

        foreach ($modelo->perguntasAtivas as $pergunta) {
            if ($pergunta->obrigatoria && empty($respondidas[$pergunta->id])) {
                throw new \DomainException("Pergunta obrigatória não respondida: \"{$pergunta->enunciado}\".");
            }
        }
    }

    /**
     * Persiste as respostas do checklist vinculadas à execução, preservando o
     * georreferenciamento e o timestamp do dispositivo capturados no momento do registro.
     *
     * Perguntas tipo `foto` chegam com a imagem em base64 no `valor` — em vez de gravar
     * o payload bruto na coluna, delega ao `EvidenciaService` (seção 8), que separa o
     * arquivo original da versão com marca d'água, e grava só a referência à evidência
     * criada.
     *
     * @param array<int, array{pergunta_id?: int, valor?: mixed, latitude?: float|null, longitude?: float|null, capturado_em?: string|null}> $respostas
     */
    public function persistirRespostas(ExecucaoVistoria $execucao, ModeloFormulario $modelo, array $respostas): void
    {
        $perguntas = $modelo->perguntas()->get()->keyBy('id');

        foreach ($respostas as $resposta) {
            $perguntaId = (int) ($resposta['pergunta_id'] ?? 0);
            $pergunta = $perguntas->get($perguntaId);
            if ($pergunta === null) {
                continue;
            }

            $valor = $resposta['valor'] ?? null;

            if ($pergunta->tipo === Pergunta::TIPO_FOTO && is_string($valor) && $valor !== '') {
                $evidencia = $this->evidencias->registrarFotoChecklist(
                    $execucao,
                    $pergunta,
                    $valor,
                    isset($resposta['latitude']) ? (float) $resposta['latitude'] : null,
                    isset($resposta['longitude']) ? (float) $resposta['longitude'] : null,
                    $resposta['capturado_em'] ?? null,
                );
                $valor = ['evidencia_id' => $evidencia->id];
            }

            RespostaChecklist::updateOrCreate(
                ['execucao_id' => $execucao->id, 'pergunta_id' => $perguntaId],
                [
                    'valor' => $valor,
                    'latitude' => $resposta['latitude'] ?? null,
                    'longitude' => $resposta['longitude'] ?? null,
                    'capturado_em' => $resposta['capturado_em'] ?? null,
                ],
            );
        }
    }
}
