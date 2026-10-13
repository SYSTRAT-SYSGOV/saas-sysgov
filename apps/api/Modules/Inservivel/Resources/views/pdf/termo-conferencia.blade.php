@extends('inservivel::pdf.layout')
@section('titulo', 'Termo de conferência — Lote ' . $lote['numero'])
@section('conteudo')
    <h1>Termo de conferência de bens</h1>
    <p><strong>Lote nº</strong> <span class="mono">{{ $lote['numero'] }}</span> &middot; {{ $lote['descricao'] }}<br>
       <strong>Entidade contemplada:</strong> {{ $entidade['nome_fantasia'] }} (CNPJ <span class="mono">{{ $entidade['cnpj'] }}</span>)<br>
       <strong>Data do sorteio:</strong> <span class="mono">{{ $data_sorteio }}</span></p>

    <h2>Relação de bens do lote</h2>
    <table>
        <thead><tr><th style="width:18%">Patrimônio</th><th>Descrição</th><th style="width:16%">Estado</th><th style="width:14%" class="centro">Conferido?</th></tr></thead>
        <tbody>
        @foreach($bens as $bem)
            <tr>
                <td class="mono">{{ $bem['numero_patrimonial'] }}</td>
                <td>{{ $bem['descricao'] }}@if($bem['marca'] || $bem['modelo'])<br><small>Marca: {{ $bem['marca'] ?: '-' }} &middot; Modelo: {{ $bem['modelo'] ?: '-' }}</small>@endif</td>
                <td>{{ $bem['estado'] ?: '-' }}</td>
                <td class="centro">( ) Sim &nbsp; ( ) Não</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <table class="assinaturas">
        <tr>
            <td><div class="linha">Responsável pela entrega<br>Nome / matrícula</div></td>
            <td><div class="linha">Responsável pelo recebimento<br>{{ $entidade['nome_fantasia'] }}</div></td>
        </tr>
    </table>
    <p style="margin-top:14px;">Data da conferência: ____/____/________</p>
@endsection
