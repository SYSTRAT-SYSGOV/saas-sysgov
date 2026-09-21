<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Validation\ValidationException;
use Modules\Licita\Models\CampoConfiguracao;

final class CampoConfiguracaoService
{
    /**
     * Campos nativos (colunas reais do model) que o órgão pode reorganizar
     * como se fossem campos extras — rótulo, aba e obrigatoriedade são
     * editáveis pelo tenant; `key`/`tipo` são fixos (o schema do banco não
     * muda) e nunca aceitos do cliente, só derivados daqui. Hoje só o TR
     * tem seções nativas configuráveis; os demais tipos de documento não
     * entram neste mapa e o comportamento fica idêntico ao anterior (só
     * campos extras, ver validarSchema/getConfigMesclada).
     *
     * @var array<string, array<int, array{key: string, label: string, tipo: string}>>
     */
    private const CAMPOS_NATIVOS = [
        'tr' => [
            ['key' => 'fundamentacao_contratacao', 'label' => 'Fundamentação da Contratação', 'tipo' => 'texto_longo'],
            ['key' => 'descricao_solucao', 'label' => 'Descrição da Solução como um Todo', 'tipo' => 'texto_longo'],
            ['key' => 'requisitos_contratacao', 'label' => 'Requisitos da Contratação', 'tipo' => 'texto_longo'],
            ['key' => 'modelo_execucao', 'label' => 'Modelo de Execução do Objeto', 'tipo' => 'texto_longo'],
            ['key' => 'modelo_gestao_contrato', 'label' => 'Modelo de Gestão do Contrato', 'tipo' => 'texto_longo'],
            ['key' => 'criterio_julgamento', 'label' => 'Critério de Julgamento', 'tipo' => 'selecao_fixa'],
            ['key' => 'obrigacoes_contratante', 'label' => 'Obrigações da Contratante', 'tipo' => 'texto_longo'],
            ['key' => 'obrigacoes_contratada', 'label' => 'Obrigações da Contratada', 'tipo' => 'texto_longo'],
            ['key' => 'sancoes_administrativas', 'label' => 'Sanções Administrativas', 'tipo' => 'texto_longo'],
            ['key' => 'vigencia_contrato', 'label' => 'Vigência do Contrato', 'tipo' => 'texto'],
            ['key' => 'adequacao_orcamentaria', 'label' => 'Adequação Orçamentária', 'tipo' => 'texto_longo'],
            ['key' => 'equipe_planejamento', 'label' => 'Equipe de Planejamento', 'tipo' => 'equipe'],
        ],
    ];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenantContext,
    ) {}

    public function getAtiva(string $tipoDocumento): ?CampoConfiguracao
    {
        if (!$this->tenantContext->hasTenant()) {
            return null;
        }

        return CampoConfiguracao::query()
            ->where('tipo_documento', $tipoDocumento)
            ->where('ativo', true)
            ->first();
    }

    /**
     * Lista de campos "prontos para uso" de um tipo de documento: os campos
     * nativos desse tipo (com o rótulo/aba/obrigatoriedade que o tenant já
     * tiver salvo, ou os padrões de fábrica se nunca configurou) seguidos
     * dos campos extras que o tenant cadastrou — tudo já ordenado por
     * `ordem`. É a lista que a tela de configuração exibe e que o
     * formulário do documento usa para saber o que e em que aba renderizar.
     *
     * @return array<int, array{key: string, label: string, tipo: string, opcoes?: array<int, string>, obrigatorio: bool, ordem: int, ajuda: string|null, aba: string|null, nativo: bool}>
     */
    public function getConfigMesclada(string $tipoDocumento): array
    {
        $nativos = self::CAMPOS_NATIVOS[$tipoDocumento] ?? [];
        $configuracao = $this->getAtiva($tipoDocumento);
        $armazenados = $configuracao === null ? [] : $configuracao->campos;

        $armazenadosPorKey = [];
        foreach ($armazenados as $campo) {
            $armazenadosPorKey[$campo['key']] = $campo;
        }

        $resultado = [];
        foreach ($nativos as $ordemPadrao => $defaults) {
            $salvo = $armazenadosPorKey[$defaults['key']] ?? null;
            unset($armazenadosPorKey[$defaults['key']]);

            $resultado[] = [
                'key' => $defaults['key'],
                'label' => $salvo['label'] ?? $defaults['label'],
                'tipo' => $defaults['tipo'],
                'obrigatorio' => $salvo['obrigatorio'] ?? false,
                'ordem' => $salvo['ordem'] ?? $ordemPadrao,
                'ajuda' => $salvo['ajuda'] ?? null,
                'aba' => $salvo['aba'] ?? null,
                'nativo' => true,
            ];
        }

        foreach ($armazenadosPorKey as $campo) {
            $campo['nativo'] = false;
            $resultado[] = $campo;
        }

        usort($resultado, static fn (array $a, array $b): int => $a['ordem'] <=> $b['ordem']);

        return $resultado;
    }

    /**
     * @param array<int, array{key: string, label: string, tipo: string, opcoes?: array<int, string>, obrigatorio: bool, ordem: int, ajuda?: string|null, aba?: string|null, nativo?: bool}> $campos
     */
    public function salvar(string $tipoDocumento, array $campos): CampoConfiguracao
    {
        $campos = $this->validarSchema($tipoDocumento, $campos);

        $configuracao = CampoConfiguracao::query()->updateOrCreate(
            ['tenant_id' => $this->tenantContext->id(), 'tipo_documento' => $tipoDocumento],
            ['campos' => $campos, 'ativo' => true]
        );

        $this->audit->record('licita', 'campo_configuracao.salvo', "CampoConfiguracao#{$tipoDocumento}", null, $configuracao->toArray());

        return $configuracao;
    }

    /**
     * Valida as respostas de um documento contra a configuração ativa do
     * tenant para aquele tipo — cobre tanto os campos extras quanto (para
     * tipos com seções nativas configuráveis, ex. TR) os campos nativos
     * marcados como obrigatório pelo tenant. `$respostas` deve trazer as
     * duas coisas mescladas num único array associativo `key => valor`
     * (ver TrService::criar/atualizar para como monta esse array).
     *
     * @param array<string, mixed> $respostas
     *
     * @throws ValidationException Um por campo obrigatório faltando, no MESMO formato (`errors: {campo:
     *         [mensagens]}`) da validação padrão do Laravel — não uma DomainException com uma única
     *         mensagem "achatada". Campo obrigatório vazio é erro de VALIDAÇÃO DE FORMULÁRIO (o mesmo
     *         tipo de erro que Objeto/Justificativa vazios), não uma regra de negócio; usar o mesmo
     *         formato é o que faz o front cair na ValidationErrorModal em vez de um alerta inline que
     *         passa despercebido se a tela estiver rolada (ver `getApiValidationErrors`/`DfdForm`).
     */
    public function validarRespostas(string $tipoDocumento, array $respostas): void
    {
        $campos = $this->getConfigMesclada($tipoDocumento);

        $erros = [];
        foreach ($campos as $campo) {
            if (!$campo['obrigatorio']) {
                continue;
            }

            $valor = $respostas[$campo['key']] ?? null;
            if ($valor === null || $valor === '' || $valor === []) {
                // Campo nativo é um atributo de primeiro nível do documento
                // (ex.: "fundamentacao_contratacao"), então o erro vai na
                // própria chave — mesma convenção da validação padrão do
                // Laravel para esses campos. Campo extra continua sob o
                // prefixo `campos_extras.` (formato já esperado pelo front).
                $chaveErro = $campo['nativo'] ? $campo['key'] : "campos_extras.{$campo['key']}";
                $erros[$chaveErro] = ["O campo \"{$campo['label']}\" é obrigatório."];
            }
        }

        if ($erros !== []) {
            throw ValidationException::withMessages($erros);
        }
    }

    /**
     * @param array<int, array{key?: mixed, label?: mixed, tipo?: mixed, obrigatorio?: mixed, ordem?: mixed, opcoes?: mixed, ajuda?: mixed, aba?: mixed, nativo?: mixed}> $campos
     * @return array<int, array{key: string, label: string, tipo: string, opcoes?: array<int, string>, obrigatorio: bool, ordem: int, ajuda: string|null, aba: string|null, nativo: bool}>
     */
    private function validarSchema(string $tipoDocumento, array $campos): array
    {
        $tiposValidos = ['texto', 'texto_longo', 'numero', 'data', 'booleano', 'selecao'];
        $nativosPorKey = [];
        foreach (self::CAMPOS_NATIVOS[$tipoDocumento] ?? [] as $nativo) {
            $nativosPorKey[$nativo['key']] = $nativo;
        }

        $chaves = [];
        $validados = [];

        foreach ($campos as $campo) {
            $key = $campo['key'] ?? null;
            if (!is_string($key) || $key === '') {
                throw new DomainException('Todo campo precisa de uma chave (key) válida.');
            }
            if (in_array($key, $chaves, true)) {
                throw new DomainException("Chave de campo duplicada: {$key}.");
            }
            $chaves[] = $key;

            if (!is_string($campo['label'] ?? null) || $campo['label'] === '') {
                throw new DomainException("O campo '{$key}' precisa de um rótulo (label).");
            }

            if (!is_int($campo['ordem'] ?? null)) {
                throw new DomainException("O campo '{$key}' precisa de uma ordem (ordem) válida.");
            }

            $nativo = $nativosPorKey[$key] ?? null;

            if ($nativo !== null) {
                // Campo nativo: o tenant só controla rótulo/aba/obrigatoriedade/
                // ordem. `tipo`/`key` sempre vêm do registro, nunca do que o
                // cliente mandou — evita que alguém "promova" uma seção do TR
                // para um tipo/opções arbitrários via payload adulterado.
                $validados[] = [
                    'key' => $nativo['key'],
                    'label' => $campo['label'],
                    'tipo' => $nativo['tipo'],
                    'obrigatorio' => (bool) ($campo['obrigatorio'] ?? false),
                    'ordem' => (int) $campo['ordem'],
                    'ajuda' => $campo['ajuda'] ?? null,
                    'aba' => $campo['aba'] ?? null,
                    'nativo' => true,
                ];

                continue;
            }

            if (!in_array($campo['tipo'] ?? null, $tiposValidos, true)) {
                throw new DomainException("Tipo inválido para o campo '{$key}'.");
            }

            $entrada = [
                'key' => $key,
                'label' => $campo['label'],
                'tipo' => $campo['tipo'],
                'obrigatorio' => (bool) ($campo['obrigatorio'] ?? false),
                'ordem' => (int) $campo['ordem'],
                'ajuda' => $campo['ajuda'] ?? null,
                'aba' => $campo['aba'] ?? null,
                'nativo' => false,
            ];
            if (isset($campo['opcoes']) && is_array($campo['opcoes'])) {
                $entrada['opcoes'] = $campo['opcoes'];
            }

            $validados[] = $entrada;
        }

        return $validados;
    }
}
