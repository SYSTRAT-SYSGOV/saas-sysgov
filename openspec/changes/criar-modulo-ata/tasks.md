# Tarefas — Módulo Ata

## 1. Backend — estrutura
- [x] 1.1 `php artisan make:module Ata` (module.json: requires OrgChart e Pessoas; permissões `ata.*`; menu)
- [x] 1.2 Migrations: `ata_tipos`, `ata_numeracoes` (contador), `ata_secretaria_configs`, `atas`, `ata_participantes` (todas com `tenant_id` e índices compostos)
- [x] 1.3 Models TenantAware + enum `AtaStatus`
- [x] 1.4 Seeder RBAC das permissões (no entrypoint do time) + tipos de ata padrão
- [x] 1.5 Config `ata.php` (`GEMINI_API_KEY`, `ATA_IA_MODELO`) e `.env.example` sem valores

## 2. Backend — regras
- [x] 2.1 `AtaService`: criar (numeração com lock), editar só em `em_redacao`, salvar rascunho (trava), excluir
- [x] 2.2 `AssinaturaService`: assinar uma vez, lista de pendentes
- [x] 2.3 `AtaPdfService`: Blade + dompdf, timbrado, QR (chillerlan), rodapé, preview com marca; finalizar (guarda path + sha256)
- [x] 2.4 Sanitizador de HTML do conteúdo (lista branca)
- [x] 2.5 `AtaIaService`: File API + generateContent Gemini, 5 prompts, timeout, 503 sem chave
- [x] 2.6 Policy (escopo por org_unit, sigilo) e auditoria de todas as ações
- [x] 2.7 Controllers, Requests, Resources e rotas (incluindo a validação pública sem auth)

## 3. Backend — testes
- [x] 3.1 Isolamento de tenant
- [x] 3.2 Ciclo de vida: 409 ao editar em rascunho/finalizada; finalizar exige rascunho + assinaturas
- [x] 3.3 Assinatura repetida → 409; pendentes excluem quem assinou
- [x] 3.4 Numeração por secretaria/ano sem reaproveitamento
- [x] 3.5 Sigilo e escopo por secretaria (403/mascaramento)
- [x] 3.6 PDF: preview não guarda; finalização guarda e o hash confere; validação pública (sigilosa sem título)
- [x] 3.7 IA com `Http::fake` (sucesso, sem chave, erro do provedor)
- [x] 3.8 Auditoria registrada

## 4. Frontend (`apps/web-client/src/modules/ata`, `@sysgov/ui`)
- [x] 4.1 Painel: indicadores (total, rascunhos, finalizadas, sigilosas), lista com filtros e status
- [x] 4.2 Nova ata: tipo, secretaria, data, local, cidade, redator, participantes (Pessoas + avulso), sigilosa
- [x] 4.3 Editor: barra de formatação, digitação por voz, Assistente IA (modal de gravação, 5 modos, aviso LGPD)
- [x] 4.4 Ações conforme o padrão de ata: Salvar rascunho (confirma o travamento), Assinar (só pendentes, signature pad), Preview PDF, Imprimir, Finalizar e salvar PDF
- [x] 4.5 Cadastros: tipos de ata e configuração de secretaria (sigla e timbrado)
- [x] 4.6 Auditoria (`ata.audit`)
- [x] 4.7 Página pública de validação
- [x] 4.8 Regenerar o registry offline; typecheck e vitest

## 5. Entrega
- [x] 5.1 phpunit (container, ver memória), phpstan, front verdes
- [x] 5.2 Conferência no navegador (criar → rascunho → assinar → finalizar → validar)
- [ ] 5.3 PR no sys_ricardo e PR no saas-sysgov do time (varredura de segredos: repo público)
