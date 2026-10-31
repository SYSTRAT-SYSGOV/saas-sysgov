# Tarefas — Transporte, Fase 1: Fundação e frota

## 1. Backend — estrutura
- [ ] 1.1 `php artisan make:module Transporte` (module.json: `requires` Admin, Pessoas e Escola; permissões `transporte.*` do design D2; menu "Transporte Escolar", grupo GESTÃO SETORIAL)
- [ ] 1.2 Migrations: `transporte_empresas`, `transporte_motoristas`, `transporte_veiculos`, `transporte_vistorias` (todas com `tenant_id` e índices compostos; exclusão lógica; únicos do design)
- [ ] 1.3 Models `TenantAware` com casts e relações (pessoa, empresa, motorista padrão, vistorias); enums `TipoEmpresa` (prestadora, locadora), `OrigemVeiculo` (propria, locada, terceirizada), `CategoriaCnh`, `TipoRede`
- [ ] 1.4 `TransporteRbacSeeder` idempotente (permissões e perfis Coordenação, Operador e Consulta) e a linha no `docker-entrypoint.sh`
- [ ] 1.5 Rodar `php artisan module:register Transporte` e conferir o catálogo (permissões e menu)

## 2. Backend — regras
- [ ] 2.1 `EmpresaService`: exige pessoa jurídica, contrato e vigência de toda empresa, unicidade por pessoa
- [ ] 2.2 `MotoristaService`: exige pessoa física, único por pessoa e por CNH, cálculo de elegibilidade com motivos, recusa de ativação inelegível
- [ ] 2.3 `VeiculoService`: normaliza e valida a placa (antigo e Mercosul), capacidade, tipologia, motivo de inativação, regra origem × empresa (própria sem empresa; locada com locadora; terceirizada com prestadora)
- [ ] 2.4 `VistoriaService`: registra com histórico e calcula a regularidade do veículo (maior validade)
- [ ] 2.5 `AlertaService`: vencidos e a vencer em 30 dias, só de itens ativos, ordenados por gravidade
- [ ] 2.6 Policies por recurso e auditoria (`AuditLogger`) em todas as mutações
- [ ] 2.7 Controllers, Form Requests, API Resources e rotas (`api/transporte/...`), sem expor dado sensível da pessoa além do necessário (CPF mascarado)

## 3. Backend — testes
- [ ] 3.1 Teste de isolamento de tenant (A × B) e `LogicException` sem tenant
- [ ] 3.2 Empresa: sem contrato, PF recusada, duplicidade, contrato vencido
- [ ] 3.3 Motorista: elegível, categoria B, toxicológico vencido, menor de 21, duplicidade por pessoa e por CNH
- [ ] 3.4 Veículo: normalização, placa duplicada, capacidade, inativação com e sem motivo, origem × empresa e locadora com contrato vencido
- [ ] 3.5 Vistoria: histórico preservado, regularidade, sem vistoria, validade inválida
- [ ] 3.6 Alertas: a vencer, vencido, item inativo, vazio
- [ ] 3.7 Autorização: 403 por perfil e por objeto; seeder idempotente
- [ ] 3.8 Auditoria registrada com antes e depois

## 4. Frontend (`apps/web-client/src/modules/transporte`, `@sysgov/ui`)
- [ ] 4.1 Contrato no SDK: `packages/sdk/src/modules/transporte` (`types.ts`, `client.ts`, `index.ts`)
- [ ] 4.2 `TransporteModule.tsx` com abas Visão geral, Empresas, Motoristas e Veículos
- [ ] 4.3 Visão geral: cartões de alerta crítico e de atenção, com estado vazio
- [ ] 4.4 Empresas: lista, formulário com `PessoaPicker` (jurídica), tipo e contrato
- [ ] 4.5 Motoristas: lista com selo de elegibilidade e motivos, formulário com `PessoaPicker` (física)
- [ ] 4.6 Veículos: lista, formulário, aba de vistorias (histórico e registro)
- [ ] 4.7 Fonte técnica, ações escondidas por permissão, modais sem `alert`/`confirm` nativos
- [ ] 4.8 `npm run generate:registry`; typecheck e vitest

## 5. Entrega
- [ ] 5.1 phpunit, phpstan e front verdes; CI do PR verde
- [ ] 5.2 Conferência no navegador: cadastrar empresa, motorista e veículo; registrar vistoria; ver os alertas
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`; rodar o `TransporteRbacSeeder` em produção
