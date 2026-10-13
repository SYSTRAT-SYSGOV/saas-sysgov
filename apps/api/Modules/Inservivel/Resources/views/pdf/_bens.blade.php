<table>
    <thead><tr><th style="width:5%">Nº</th><th style="width:16%">Patrimônio</th><th>Descrição</th><th style="width:14%">Estado</th><th style="width:15%" class="direita">Valor (R$)</th></tr></thead>
    <tbody>
    @foreach($bens as $i => $bem)
        <tr>
            <td class="mono">{{ str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) }}</td>
            <td class="mono">{{ $bem['numero_patrimonial'] }}</td>
            <td>{{ $bem['descricao'] }}@if($bem['marca'] || $bem['modelo'])<br><small>Marca: {{ $bem['marca'] ?: '-' }} &middot; Modelo: {{ $bem['modelo'] ?: '-' }}</small>@endif</td>
            <td>{{ $bem['estado'] ?: '-' }}</td>
            <td class="direita mono">{{ $bem['valor'] }}</td>
        </tr>
    @endforeach
        <tr class="total"><td colspan="4" class="direita">Valor total do lote</td><td class="direita mono">{{ $total }}</td></tr>
    </tbody>
</table>
