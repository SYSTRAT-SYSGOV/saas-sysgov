@extends('inservivel::pdf.layout')
@section('titulo', 'Relatório oficial do sorteio — Lote ' . $lote['numero'])
@section('conteudo')
    <h1>Relatório oficial do sorteio</h1>
    <p class="centro">Lote nº <span class="mono">{{ $lote['numero'] }}</span> &middot; realizado em <span class="mono">{{ $sorteio['data'] }}</span></p>

    <h2>1. Identificação do lote</h2>
    <p><strong>Descrição:</strong> {{ $lote['descricao'] }}<br><strong>Responsável:</strong> {{ $lote['responsavel'] }}<br>
       <strong>Valor do lote:</strong> <span class="mono">{{ $total }}</span></p>

    <h2>2. Lógica do sorteio</h2>
    <div class="caixa just">
        <p><strong>Passo 1 — Aptidão:</strong> concorrem as entidades inscritas que estão habilitadas pelo Patrimônio e sem documento obrigatório vencido na data do sorteio. As demais aparecem na lista de participantes com o motivo da exclusão.</p>
        <p><strong>Passo 2 — Distribuição equitativa:</strong> havendo uma única entidade apta, ela é contemplada. Havendo mais de uma, ficam apenas as que receberam o menor número de lotes anteriormente, para evitar a concentração de doações.</p>
        <p><strong>Passo 3 — Desempate auditável:</strong> persistindo o empate, o sistema gera uma semente aleatória e escolhe a posição <span class="mono">mt_rand(0, n-1)</span> depois de <span class="mono">mt_srand(crc32(semente))</span>, sobre as empatadas na ordem das inscrições. Com a semente e a lista abaixo, qualquer órgão de controle refaz o cálculo e obtém o mesmo resultado.</p>
    </div>
    <p><strong>Regra aplicada:</strong>
        @switch($sorteio['regra'])
            @case('unica_inscrita') única entidade apta inscrita @break
            @case('menos_lotes') menor número de lotes recebidos @break
            @default desempate por semente auditável
        @endswitch
        @if($sorteio['semente'])<br><strong>Semente:</strong> <span class="mono">{{ $sorteio['semente'] }}</span>
        <br><strong>Empatadas (na ordem usada):</strong> <span class="mono">{{ implode(', ', $sorteio['empatadas']) }}</span>@endif
    </p>

    <h2>3. Bens do lote</h2>
    @include('inservivel::pdf._bens')

    <h2>4. Entidades participantes</h2>
    <table>
        <thead><tr><th style="width:8%">ID</th><th>Razão social</th><th style="width:22%">CNPJ</th><th style="width:12%" class="centro">Lotes recebidos</th><th style="width:22%">Situação</th></tr></thead>
        <tbody>
        @foreach($sorteio['participantes'] as $p)
            <tr>
                <td class="mono">{{ $p['entidade_id'] }}</td>
                <td>{{ $p['razao_social'] }}</td>
                <td class="mono">{{ $p['cnpj'] }}</td>
                <td class="centro mono">{{ $p['lotes_ganhos'] }}</td>
                <td>
                    @if($p['entidade_id'] === $vencedora['id']) <strong>Contemplada</strong>
                    @elseif($p['apta']) Participante
                    @elseif($p['motivo_exclusao'] === 'documento_vencido') Excluída: documento vencido ({{ implode(', ', $p['documentos_vencidos']) }})
                    @else Excluída: não habilitada
                    @endif
                </td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div class="destaque">
        <div style="font-size:9px; text-transform:uppercase; color:#168821;">Entidade contemplada</div>
        <div style="font-size:14px; font-weight:bold;">{{ $vencedora['razao_social'] }}</div>
        <div>CNPJ <span class="mono">{{ $vencedora['cnpj'] }}</span> &middot; Representante: {{ $vencedora['representante'] }}</div>
    </div>

    <p class="centro" style="font-size:8.5px;">Hash de conferência (SHA-256): <span class="mono">{{ $sorteio['hash'] }}</span></p>
@endsection
