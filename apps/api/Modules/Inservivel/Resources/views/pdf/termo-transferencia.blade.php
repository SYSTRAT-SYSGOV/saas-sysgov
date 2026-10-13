@extends('inservivel::pdf.layout')
@section('titulo', 'Termo de transferência interna nº ' . $numero)
@section('conteudo')
    <h1>Termo de transferência interna de bem</h1>
    <p class="centro">Transferência nº <span class="mono">{{ $numero }}</span>@if($data_conclusao) &middot; aprovada em <span class="mono">{{ $data_conclusao }}</span>@endif</p>

    <h2>1. Bem transferido</h2>
    <table>
        <thead><tr><th style="width:18%">Patrimônio</th><th>Descrição</th><th style="width:16%">Estado</th><th style="width:16%" class="direita">Valor</th></tr></thead>
        <tbody><tr>
            <td class="mono">{{ $bem['numero_patrimonial'] }}</td>
            <td>{{ $bem['descricao'] }}@if($bem['marca'] || $bem['modelo'])<br><small>Marca: {{ $bem['marca'] ?: '-' }} &middot; Modelo: {{ $bem['modelo'] ?: '-' }}</small>@endif</td>
            <td>{{ $bem['estado'] ?: '-' }}</td>
            <td class="direita mono">{{ $bem['valor'] }}</td>
        </tr></tbody>
    </table>

    <h2>2. Unidades</h2>
    <p><strong>Secretaria de origem:</strong> {{ $origem }}@if($anunciante) (anunciado por {{ $anunciante }})@endif<br>
       <strong>Secretaria de destino:</strong> {{ $destino }}@if($solicitante) (solicitado por {{ $solicitante }})@endif<br>
       @if($aprovador)<strong>Aprovado por:</strong> {{ $aprovador }} — Patrimônio @endif</p>

    <p class="just">A secretaria de destino declara receber o bem acima no estado em que se encontra, passando a responder por sua guarda, conservação e uso, com o registro da movimentação no controle patrimonial.</p>

    <table class="assinaturas">
        <tr>
            <td><div class="linha">Secretaria de origem<br>{{ $origem }}</div></td>
            <td><div class="linha">Secretaria de destino<br>{{ $destino }}</div></td>
        </tr>
        <tr>
            <td colspan="2"><div class="linha" style="width:60%; margin:0 auto;">Patrimônio<br>{{ $aprovador }}</div></td>
        </tr>
    </table>
@endsection
