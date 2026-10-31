# Design — Transporte, Fase 5: Carga e demonstração

As decisões comuns (D1 a D10) estão em `transporte-fase-1-fundacao-e-frota/design.md`.

## Decisões

### D31. Importação CSV
- Formatos: `veiculos.csv`, `motoristas.csv`, `paradas.csv`. Modelo para baixar em cada tela. UTF-8, separador `;` ou `,`, detectado.
- **Motoristas** exigem CPF: a linha é ligada à pessoa pelo CPF no Cadastro de Pessoas; CPF inexistente gera divergência `pessoa_nao_encontrada` (a importação **não cria** pessoa; quem quiser usa a importação do módulo Pessoas antes). CPF inválido e duplicado no arquivo viram divergência.
- **Veículos**: placa normalizada, capacidade e tipologia validadas; placa já existente é divergência, não sobrescrita. A coluna `origem` (`propria|locada|terceirizada`) é obrigatória; para `locada` e `terceirizada`, a empresa é indicada pelo CNPJ e deve existir com o tipo compatível.
- **Paradas**: coordenadas validadas; duplicidade por nome + logradouro + número gera aviso.
- Fluxo: envio → pré-visualização (válidas, avisos, divergências) → confirmação → processamento em fila → relatório final. O arquivo é lido com `LeitorCsv` do Escola, como na importação de alunos. Processamento **exclusivamente assíncrono** (requisito do módulo Pessoas para importações).
- Linhas com erro não impedem as válidas. Auditoria resume a carga (quem, arquivo, totais).
- Proteção do arquivo: limite de tamanho e de linhas, células neutralizadas na leitura (sem fórmula) e extensão validada.

### D32. Seeder de demonstração
Segue o padrão dos seeders `*DadosDemonstracaoSeeder` do projeto: tenant `systrat` por padrão, idempotente (não roda se já houver rotas), usa o `TenantContext` e o `AuditLogger`, e **não cria usuários com senha conhecida**. Cria dados fictícios coerentes: pessoas físicas e jurídicas com documentos válidos fictícios, frota própria, locada e terceirizada com vistorias em três situações, rotas com itinerário em Curitiba/região (coordenadas plausíveis), e alocações que deixam rotas em verde, amarelo e vermelho. Respeita as regras (capacidade, acessibilidade, elegibilidade): só a exceção de capacidade é feita por meio do Service.

### D33. Ponte opcional com o Passeio — decisão para aprovação
Hoje `passeio_veiculos` tem dados soltos (identificação, placa, motorista em texto). A ponte seria uma coluna opcional `transporte_veiculo_id` em `passeio_veiculos`, para o formulário do passeio **escolher** um veículo regular do Transporte e herdar placa, capacidade e motorista. Vantagem: uma frota só e vistoria à vista. Custo: toca o módulo Passeio e seus testes. **Recomendação: não incluir agora.** Se não for aprovada, a task fica marcada como descartada.

### D34. Documentação e arquivamento
`docs/modules/transporte.md` descreve fluxos, permissões, regras e limites conhecidos (inclusive D10 e as perguntas abertas da Fase 4). Ao fim, arquivar as cinco changes com `openspec archive` e criar a spec `openspec/specs/transporte/spec.md` com Purpose em pt-BR.
