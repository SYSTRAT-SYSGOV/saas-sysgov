# Tarefas — Transporte, Fase 1: Fundação e frota

## 1. Backend — estrutura
- [x] 1.1 `php artisan make:module Transporte` (module.json: `requires` Admin, Pessoas e Escola; permissões `transporte.*` do design D2; menu "Transporte Escolar", grupo GESTÃO SETORIAL)
- [x] 1.2 Migrations: `transporte_empresas`, `transporte_motoristas`, `transporte_veiculos`, `transporte_vistorias` (todas com `tenant_id` e índices compostos; exclusão lógica; únicos do design)
- [x] 1.3 Models `TenantAware` com casts e relações (pessoa, empresa, motorista padrão, vistorias); enums `TipoEmpresa` (prestadora, locadora), `OrigemVeiculo` (propria, locada, terceirizada), `CategoriaCnh`, `TipoRede`
- [x] 1.4 `TransporteRbacSeeder` idempotente (permissões e perfis Coordenação, Operador e Consulta) e a linha no `docker-entrypoint.sh`
- [x] 1.5 Rodar `php artisan module:register Transporte` e conferir o catálogo (permissões e menu) — feito em produção em 31/10/2026 (módulo 23, 10 permissões, 3 perfis)

## 2. Backend — regras
- [x] 2.1 `EmpresaService`: exige pessoa jurídica, contrato e vigência de toda empresa, unicidade por pessoa
- [x] 2.2 `MotoristaService`: exige pessoa física, único por pessoa e por CNH, cálculo de elegibilidade com motivos, recusa de ativação inelegível
- [x] 2.3 `VeiculoService`: normaliza e valida a placa (antigo e Mercosul), capacidade, tipologia, motivo de inativação, regra origem × empresa (própria sem empresa; locada com locadora; terceirizada com prestadora)
- [x] 2.4 `VistoriaService`: registra com histórico e calcula a regularidade do veículo (maior validade)
- [x] 2.5 `AlertaService`: vencidos e a vencer em 30 dias, só de itens ativos, ordenados por gravidade
- [x] 2.6 Policies por recurso e auditoria (`AuditLogger`) em todas as mutações
- [x] 2.7 Controllers, Form Requests, API Resources e rotas (`api/transporte/...`), sem expor dado sensível da pessoa além do necessário (CPF mascarado)

## 3. Backend — testes
- [x] 3.1 Teste de isolamento de tenant (A × B) e `LogicException` sem tenant
- [x] 3.2 Empresa: sem contrato, PF recusada, duplicidade, contrato vencido
- [x] 3.3 Motorista: elegível, categoria B, toxicológico vencido, menor de 21, duplicidade por pessoa e por CNH
- [x] 3.4 Veículo: normalização, placa duplicada, capacidade, inativação com e sem motivo, origem × empresa e locadora com contrato vencido
- [x] 3.5 Vistoria: histórico preservado, regularidade, sem vistoria, validade inválida
- [x] 3.6 Alertas: a vencer, vencido, item inativo, vazio
- [x] 3.7 Autorização: 403 por perfil e por objeto; seeder idempotente
- [x] 3.8 Auditoria registrada com antes e depois

## 4. Frontend (`apps/web-client/src/modules/transporte`, `@sysgov/ui`)
- [x] 4.1 Contrato do módulo em `apps/web-client/src/modules/transporte/api.ts` (tipos e cliente). Desvio da versão aprovada: os módulos recentes (Multiprofissional, Passeio, Ata) não usam `@sysgov/sdk`, então o módulo segue o mesmo padrão
- [x] 4.2 `TransporteModule.tsx` com abas Visão geral, Empresas, Motoristas e Veículos
- [x] 4.3 Visão geral: cartões de alerta crítico e de atenção, com estado vazio
- [x] 4.4 Empresas: lista, formulário com CNPJ e razão social resolvidos pelo Cadastro de Pessoas (como o Multiprofissional faz com o CPF), tipo e contrato
- [x] 4.5 Motoristas: lista com selo de elegibilidade e motivos, formulário com CPF, nome e nascimento resolvidos pelo Cadastro de Pessoas
- [x] 4.6 Veículos: lista, formulário, aba de vistorias (histórico e registro)
- [x] 4.7 Fonte técnica, ações escondidas por permissão, modais sem `alert`/`confirm` nativos
- [x] 4.8 `npm run generate:registry`; typecheck e vitest

## 5. Entrega
- [x] 5.1 phpunit, phpstan e front verdes; CI do PR verde
- [ ] 5.2 Conferência (pendente: precisa de login no navegador) no navegador: cadastrar empresa, motorista e veículo; registrar vistoria; ver os alertas
- [x] 5.3 PR #141 mesclado; rebuild de `api` e `web`; `TransporteRbacSeeder` rodado no entrypoint; módulo habilitado no tenant `systrat`
