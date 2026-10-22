# Tasks

## 1. Conciliação dos registros existentes

- [x] 1.1 `ConciliacaoPorModelo` (Pessoas) reutilizável por qualquer model com `pessoa_id`. Verificar: `ConciliacaoModulosExistentesTest`.
- [x] 1.2 Adaptadores de Cemitérios (operadores, concessionários, herdeiros, falecidos) registrados no provider. Verificar: teste de operador e falecido sem alterar situação nem datas.
- [x] 1.3 Adaptadores da Campanha (coordenadores, cabos) ignorando o escopo por campanha no lote. Verificar: teste do coordenador.
- [x] 1.4 Adaptador de Cursos (participantes). Verificar: teste com CPF, sem documento e reexecução idempotente.
- [x] 1.5 Fronteira dos eleitores: cadastro público não cria nem altera pessoa. Verificar: `CaptacaoTest`.

## 2. Validação

- [x] 2.1 Suítes de Campanha, Cemitérios, Cursos e Pessoas (878 testes) e PHPStan do projeto todo verdes.
- [x] 2.2 Dry-run em produção de cada alias depois do deploy; decidir os `sem_responsavel`, `pessoa_juridica_inexistente` e divergências. **Feito em 21/10/2026:** `pessoas:conciliar <alias> --dry-run` rodou em produção para os 13 aliases e, em seguida, a conciliação real; resultado final no relatório de adoção da Fase 5 (517 de 517 vinculados, 0 divergências). Os 29 documentos inválidos (19 concessionários e 10 herdeiros) eram de demonstração e foram regenerados com CPFs e CNPJ válidos; Campanha e Cursos têm 0 registros.

## Pendente fora desta fase
- Prefeitos e vereadores da Campanha (decisão sobre mandatário), Multiprofissional (depende de `criar-modulo-multiprofissional`) e e-mail do participante (ver "Fora desta fase" no design).
