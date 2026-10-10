@extends('inservivel::pdf.layout')
@section('titulo', 'Termo de entrega — Lote ' . $lote['numero'])
@section('conteudo')
    <h1>Termo de doação e recebimento definitivo de lote</h1>

    <h2>1. Dados do lote e do sorteio</h2>
    <p><strong>Lote nº</strong> <span class="mono">{{ $lote['numero'] }}</span> &middot; <strong>Status:</strong> {{ $lote['status'] }}<br>
       <strong>Descrição:</strong> {{ $lote['descricao'] }}<br>
       <strong>Data do sorteio:</strong> <span class="mono">{{ $data_sorteio }}</span></p>

    <h2>2. Entidade beneficiária (donatária)</h2>
    <p><strong>Razão social:</strong> {{ $entidade['razao_social'] }}<br>
       <strong>Nome fantasia:</strong> {{ $entidade['nome_fantasia'] }}<br>
       <strong>CNPJ:</strong> <span class="mono">{{ $entidade['cnpj'] }}</span><br>
       <strong>Contato:</strong> {{ $entidade['telefone'] }} &middot; {{ $entidade['email'] }}<br>
       <strong>Endereço:</strong> {{ $entidade['endereco'] }}, {{ $entidade['cidade'] }}/{{ $entidade['uf'] }}</p>

    <h2>3. Relação dos bens entregues</h2>
    @include('inservivel::pdf._bens')

    <h2>4. Declaração de aceite</h2>
    <p class="just">A entidade beneficiária acima qualificada declara ter conferido e recebido em doação definitiva os bens discriminados neste Termo, pertencentes ao Lote nº <span class="mono">{{ $lote['numero'] }}</span>, aceitando-os no estado de conservação em que se encontram e isentando a Administração Pública de qualquer garantia ou responsabilidade por vícios ocultos. A entidade assume a responsabilidade pelo transporte, pela destinação social e pela adequada utilização dos bens, conforme suas finalidades estatutárias.</p>

    <p style="margin-top:14px;">Data da entrega: ____ de _____________________ de ________.</p>

    <table class="assinaturas">
        <tr>
            <td><div class="linha"><strong>{{ $doador['nome'] }}</strong><br>Responsável pela entrega<br>{{ $doador['responsavel_nome'] ?? '' }}</div></td>
            <td><div class="linha"><strong>{{ $entidade['nome_fantasia'] }}</strong><br>CNPJ <span class="mono">{{ $entidade['cnpj'] }}</span> — recebedor</div></td>
        </tr>
    </table>
@endsection
