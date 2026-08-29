-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: saas_sysgov
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounting_entries`
--

DROP TABLE IF EXISTS `accounting_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `entry_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entry_date` date NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount_cents` bigint unsigned NOT NULL,
  `status` enum('rascunho','confirmado','estornado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmado',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounting_entries_tenant_id_entry_number_unique` (`tenant_id`,`entry_number`),
  KEY `accounting_entries_created_by_foreign` (`created_by`),
  KEY `accounting_entries_tenant_id_entry_date_index` (`tenant_id`,`entry_date`),
  CONSTRAINT `accounting_entries_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `accounting_entries_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounting_entries`
--

LOCK TABLES `accounting_entries` WRITE;
/*!40000 ALTER TABLE `accounting_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounting_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounting_lines`
--

DROP TABLE IF EXISTS `accounting_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `entry_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `type` enum('debito','credito') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `memo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `accounting_lines_entry_id_foreign` (`entry_id`),
  KEY `accounting_lines_account_id_foreign` (`account_id`),
  KEY `accounting_lines_tenant_id_entry_id_index` (`tenant_id`,`entry_id`),
  KEY `accounting_lines_tenant_id_account_id_index` (`tenant_id`,`account_id`),
  CONSTRAINT `accounting_lines_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `accounting_lines_entry_id_foreign` FOREIGN KEY (`entry_id`) REFERENCES `accounting_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `accounting_lines_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounting_lines`
--

LOCK TABLES `accounting_lines` WRITE;
/*!40000 ALTER TABLE `accounting_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounting_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aditivos_contratuais`
--

DROP TABLE IF EXISTS `aditivos_contratuais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aditivos_contratuais` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `contrato_id` bigint unsigned NOT NULL,
  `numero` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_cents` bigint unsigned NOT NULL,
  `percentual_acumulado` decimal(5,2) NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `aditivos_contratuais_contrato_id_foreign` (`contrato_id`),
  KEY `aditivos_contratuais_tenant_id_contrato_id_index` (`tenant_id`,`contrato_id`),
  CONSTRAINT `aditivos_contratuais_contrato_id_foreign` FOREIGN KEY (`contrato_id`) REFERENCES `contratos_licitacao` (`id`) ON DELETE CASCADE,
  CONSTRAINT `aditivos_contratuais_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aditivos_contratuais`
--

LOCK TABLES `aditivos_contratuais` WRITE;
/*!40000 ALTER TABLE `aditivos_contratuais` DISABLE KEYS */;
/*!40000 ALTER TABLE `aditivos_contratuais` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `module` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `before` json DEFAULT NULL,
  `after` json DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prev_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  KEY `audit_logs_tenant_id_created_at_index` (`tenant_id`,`created_at`),
  KEY `audit_logs_hash_prev_hash_index` (`hash`,`prev_hash`),
  CONSTRAINT `audit_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (56,131,133,'org','unit.created','OrgUnit #30 (Gabinete do Prefeito — MUNICIPIO DE ARAUCARIA)',NULL,'{\"id\": 30, \"code\": \"GAB\", \"name\": \"Gabinete do Prefeito — MUNICIPIO DE ARAUCARIA\", \"path\": \"30\", \"type\": \"raiz\", \"level\": 1, \"order\": 1, \"acronym\": \"GAB\", \"metadata\": {\"seeded_by\": \"SYSGOV Onboarding Engine\", \"description\": \"Órgão executivo superior da administração municipal.\"}, \"is_active\": true, \"parent_id\": null, \"tenant_id\": 131, \"created_at\": \"2026-08-27T17:58:05.000000Z\", \"updated_at\": \"2026-08-27T17:58:05.000000Z\"}','::1','curl/8.21.0','81e339a44f34ba85df17409653cc86d43423aebf077d629fff543c5b828940eb',NULL,'2026-08-27 17:58:05'),(57,131,133,'org','unit.created','OrgUnit #31 (Secretaria Municipal de Administração)',NULL,'{\"id\": 31, \"code\": \"SMA\", \"name\": \"Secretaria Municipal de Administração\", \"path\": \"30.31\", \"type\": \"secretaria\", \"level\": 2, \"order\": 1, \"acronym\": \"SMA\", \"metadata\": {\"description\": \"Gestão administrativa, patrimônio e compras públicas.\"}, \"is_active\": true, \"parent_id\": 30, \"tenant_id\": 131, \"created_at\": \"2026-08-27T17:58:07.000000Z\", \"updated_at\": \"2026-08-27T17:58:07.000000Z\"}','::1','curl/8.21.0','9d25896d14568703abab44fa0175746590e1aab19ee42dbdf99942ea18b214e4','81e339a44f34ba85df17409653cc86d43423aebf077d629fff543c5b828940eb','2026-08-27 17:58:07'),(58,131,133,'org','unit.created','OrgUnit #32 (Secretaria Municipal de Finanças & Planejamento)',NULL,'{\"id\": 32, \"code\": \"SMF\", \"name\": \"Secretaria Municipal de Finanças & Planejamento\", \"path\": \"30.32\", \"type\": \"secretaria\", \"level\": 2, \"order\": 2, \"acronym\": \"SMF\", \"metadata\": {\"description\": \"Execução orçamentária, contabilidade e arrecadação.\"}, \"is_active\": true, \"parent_id\": 30, \"tenant_id\": 131, \"created_at\": \"2026-08-27T17:58:07.000000Z\", \"updated_at\": \"2026-08-27T17:58:07.000000Z\"}','::1','curl/8.21.0','c9b7dfbe869b2d94110c75499e9f22c5c37612e2b842c3a97b552b10ac0dc49e','9d25896d14568703abab44fa0175746590e1aab19ee42dbdf99942ea18b214e4','2026-08-27 17:58:07'),(59,131,133,'org','onboarding.seeded','Tenant #131 (MUNICIPIO DE ARAUCARIA)',NULL,'{\"root_id\": 30, \"sec_admin_id\": 31, \"sec_financas_id\": 32}','::1','curl/8.21.0','d781dd744aa645319938b59e100daafc0815ce0c5d3bc7d057253d71a161590e','c9b7dfbe869b2d94110c75499e9f22c5c37612e2b842c3a97b552b10ac0dc49e','2026-08-27 17:58:07'),(60,130,132,'admin','updated','tenant:131','{\"id\": 131, \"uf\": \"PR\", \"city\": \"Araucária\", \"cnae\": null, \"cnpj\": \"76216686000110\", \"name\": \"MUNICIPIO DE ARAUCARIA\", \"plan\": \"profissional\", \"slug\": \"araucaria-pr\", \"type\": \"prefeitura\", \"domain\": null, \"status\": \"active\", \"modules\": [], \"website\": null, \"settings\": {\"title\": \"Portal de Gestão\", \"subtitle\": \"Prefeitura de Araucária\", \"customLogoUrl\": \"\", \"customPrimaryColor\": \"#1351b4\", \"hideProviderBranding\": false}, \"max_users\": 50, \"created_at\": \"2026-08-27T12:00:48.000000Z\", \"updated_at\": \"2026-08-27T12:00:48.000000Z\", \"contact_email\": null, \"setup_fee_cents\": 0, \"storage_limit_mb\": 5120, \"monthly_fee_cents\": 0, \"custom_domain_enabled\": false, \"custom_domain_fee_cents\": 0}','{\"id\": 131, \"uf\": \"PR\", \"city\": \"Araucária\", \"cnae\": null, \"cnpj\": \"76216686000110\", \"name\": \"MUNICIPIO DE ARAUCARIA\", \"plan\": \"profissional\", \"slug\": \"araucaria-pr\", \"type\": \"prefeitura\", \"domain\": null, \"status\": \"active\", \"modules\": [{\"id\": 75, \"name\": \"Organograma\", \"alias\": \"org\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 75, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Estrutura hierárquica municipal (gabinete, secretarias, departamentos).\", \"monthly_fee_cents\": 14900}, {\"id\": 79, \"name\": \"Usuários & Acessos\", \"alias\": \"users\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 79, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Gestão de usuários e papéis do tenant.\", \"monthly_fee_cents\": 9900}, {\"id\": 80, \"name\": \"Módulo Pedagógico\", \"alias\": \"pedagogico\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 80, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Gestão escolar e pedagógica.\", \"monthly_fee_cents\": 19900}, {\"id\": 82, \"name\": \"Gestão de Cemitérios\", \"alias\": \"cemiterios\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 82, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Administração de cemitérios e sepultamentos.\", \"monthly_fee_cents\": 14900}], \"website\": null, \"settings\": {\"title\": \"Portal de Gestão\", \"subtitle\": \"Prefeitura de Araucária\", \"customLogoUrl\": \"\", \"customPrimaryColor\": \"#1351b4\", \"hideProviderBranding\": false}, \"max_users\": 50, \"created_at\": \"2026-08-27T12:00:48.000000Z\", \"updated_at\": \"2026-08-27T12:00:48.000000Z\", \"contact_email\": null, \"setup_fee_cents\": 0, \"storage_limit_mb\": 5120, \"monthly_fee_cents\": 0, \"custom_domain_enabled\": false, \"custom_domain_fee_cents\": 0}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','c0aa2cb5ce26c62289591cca81b6aa443d2bf00026b6b0f684918134cd9373eb','d781dd744aa645319938b59e100daafc0815ce0c5d3bc7d057253d71a161590e','2026-08-27 18:00:07'),(61,130,132,'admin','user.created','User #136',NULL,'{\"id\": 136, \"name\": \"Carlos Fernando Gomes\", \"email\": \"cfgfernando@gmail.com\", \"is_active\": true, \"created_at\": \"2026-08-29T14:47:14.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T14:47:14.000000Z\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','41a1d950b4fbdbe27f51c4d16ed6c64d63aaf30b9f3f80343a06c61b77afc445','c0aa2cb5ce26c62289591cca81b6aa443d2bf00026b6b0f684918134cd9373eb','2026-08-29 14:47:14'),(62,131,133,'tenant','access.user_updated','User #134',NULL,'{\"tenant_id\": 131}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','ccb7e62bedb59f0e2427f13523c64e87441c50a145ed4e5e1c74df1140c172ae','41a1d950b4fbdbe27f51c4d16ed6c64d63aaf30b9f3f80343a06c61b77afc445','2026-08-29 15:08:39'),(63,130,132,'admin','analyst.created','Analyst #137',NULL,'{\"email\": \"analista01@teste.com\", \"assigned_by\": 132}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','1399dc77fa80bcf1d22b69431fb83ef35db899b36d6282e03dc01477485087e1','ccb7e62bedb59f0e2427f13523c64e87441c50a145ed4e5e1c74df1140c172ae','2026-08-29 15:14:50'),(64,130,132,'admin','analyst.tenant_assigned','Analyst #137 / Tenant #131',NULL,'{\"id\": 6, \"user_id\": 137, \"can_read\": true, \"can_write\": false, \"tenant_id\": 131, \"created_at\": \"2026-08-29T15:15:24.000000Z\", \"expires_at\": null, \"updated_at\": \"2026-08-29T15:15:24.000000Z\", \"assigned_by\": 132}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','a16853eccb573e569cbb23f790d0e1da6fc2921da145fa3f07167ecd55c00ca6','1399dc77fa80bcf1d22b69431fb83ef35db899b36d6282e03dc01477485087e1','2026-08-29 15:15:24'),(65,130,132,'admin','user.updated','User #137','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T15:14:50.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T15:14:50.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','18dde22c096fc4144d902adbe0c629cba129599e0f2075ec6906bcf20fe65ae7','a16853eccb573e569cbb23f790d0e1da6fc2921da145fa3f07167ecd55c00ca6','2026-08-29 15:16:07'),(66,130,132,'admin','role.updated','Role #906','{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}','{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\", \"permissions\": [{\"id\": 2965, \"name\": \"Visualizar Usuários SYSTRAT\", \"slug\": \"users.systrat.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2965}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2966, \"name\": \"Criar Usuários SYSTRAT\", \"slug\": \"users.systrat.create\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2966}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2967, \"name\": \"Atualizar Usuários SYSTRAT\", \"slug\": \"users.systrat.update\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2967}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2968, \"name\": \"Excluir Usuários SYSTRAT\", \"slug\": \"users.systrat.delete\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2968}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2969, \"name\": \"Visualizar Usuários de Tenants\", \"slug\": \"users.tenant.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2969}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2970, \"name\": \"Criar Admin Inicial do Tenant\", \"slug\": \"users.tenant.create\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2970}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2971, \"name\": \"Convidar Usuários\", \"slug\": \"users.invite\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2971}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2972, \"name\": \"Desativar Usuários\", \"slug\": \"users.deactivate\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2972}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2973, \"name\": \"Resetar Senha de Usuários\", \"slug\": \"users.reset_password\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2973}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2974, \"name\": \"Visualizar Roles\", \"slug\": \"roles.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2974}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2975, \"name\": \"Criar Roles\", \"slug\": \"roles.create\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2975}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2976, \"name\": \"Atualizar Roles\", \"slug\": \"roles.update\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2976}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2977, \"name\": \"Excluir Roles\", \"slug\": \"roles.delete\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2977}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:50.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:50.000000Z\"}, {\"id\": 2978, \"name\": \"Atribuir Roles\", \"slug\": \"roles.assign\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2978}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2979, \"name\": \"Gerenciar Usuários do Tenant (web-client)\", \"slug\": \"users.manage\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2979}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2980, \"name\": \"Gerenciar Analistas de Suporte\", \"slug\": \"analyst.manage\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2980}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2981, \"name\": \"Visualizar Tenants\", \"slug\": \"admin.tenants.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2981}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2982, \"name\": \"Gerenciar Tenants\", \"slug\": \"admin.tenants.manage\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2982}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2983, \"name\": \"Visualizar Usuários (legado)\", \"slug\": \"admin.users.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2983}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2984, \"name\": \"Gerenciar Usuários (legado)\", \"slug\": \"admin.users.manage\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2984}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2985, \"name\": \"Visualizar Roles (legado)\", \"slug\": \"admin.roles.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2985}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2986, \"name\": \"Gerenciar Roles (legado)\", \"slug\": \"admin.roles.manage\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2986}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2987, \"name\": \"Visualizar Módulos\", \"slug\": \"admin.modules.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2987}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2988, \"name\": \"Gerenciar Módulos\", \"slug\": \"admin.modules.manage\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2988}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2989, \"name\": \"Visualizar Menus\", \"slug\": \"admin.menus.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2989}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2990, \"name\": \"Gerenciar Menus\", \"slug\": \"admin.menus.manage\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2990}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2991, \"name\": \"Visualizar Auditoria\", \"slug\": \"admin.audit.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2991}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2992, \"name\": \"Visualizar Monitoramento\", \"slug\": \"admin.monitoring.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2992}, \"module\": \"admin\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2993, \"name\": \"Visualizar Contratos\", \"slug\": \"contracts.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2993}, \"module\": \"contracts\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2994, \"name\": \"Criar Contratos\", \"slug\": \"contracts.create\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2994}, \"module\": \"contracts\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2995, \"name\": \"Atualizar Contratos\", \"slug\": \"contracts.update\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2995}, \"module\": \"contracts\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2996, \"name\": \"Aprovar Contratos\", \"slug\": \"contracts.approve\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2996}, \"module\": \"contracts\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2997, \"name\": \"Excluir Contratos\", \"slug\": \"contracts.delete\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2997}, \"module\": \"contracts\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2998, \"name\": \"Exportar Contratos\", \"slug\": \"contracts.export\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2998}, \"module\": \"contracts\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 2999, \"name\": \"Visualizar Financeiro\", \"slug\": \"finance.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 2999}, \"module\": \"finance\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3000, \"name\": \"Criar Lançamentos\", \"slug\": \"finance.create\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3000}, \"module\": \"finance\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3001, \"name\": \"Aprovar Financeiro\", \"slug\": \"finance.approve\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3001}, \"module\": \"finance\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3002, \"name\": \"Efetuar Pagamentos\", \"slug\": \"finance.pay\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3002}, \"module\": \"finance\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3003, \"name\": \"Conciliar Financeiro\", \"slug\": \"finance.reconcile\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3003}, \"module\": \"finance\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3004, \"name\": \"Exportar Financeiro\", \"slug\": \"finance.export\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3004}, \"module\": \"finance\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3005, \"name\": \"Visualizar Licitações\", \"slug\": \"procurement.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3005}, \"module\": \"procurement\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3006, \"name\": \"Criar Licitações\", \"slug\": \"procurement.create\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3006}, \"module\": \"procurement\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3007, \"name\": \"Aprovar Licitações\", \"slug\": \"procurement.approve\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3007}, \"module\": \"procurement\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3008, \"name\": \"Visualizar Documentos\", \"slug\": \"documents.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3008}, \"module\": \"documents\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3009, \"name\": \"Upload de Documentos\", \"slug\": \"documents.upload\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3009}, \"module\": \"documents\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3010, \"name\": \"Gerenciar Documentos\", \"slug\": \"documents.manage\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3010}, \"module\": \"documents\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3011, \"name\": \"Visualizar Painel Geral\", \"slug\": \"dashboard.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3011}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3012, \"name\": \"Visualizar Organograma\", \"slug\": \"org.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3012}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3013, \"name\": \"Criar Unidades Organizacionais\", \"slug\": \"org.create\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3013}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3014, \"name\": \"Atualizar Unidades Organizacionais\", \"slug\": \"org.update\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3014}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3015, \"name\": \"Excluir Unidades Organizacionais\", \"slug\": \"org.delete\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3015}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3016, \"name\": \"Mover Unidades Organizacionais\", \"slug\": \"org.move\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3016}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3017, \"name\": \"Vincular Usuários a Unidades\", \"slug\": \"org.user.link\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3017}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3018, \"name\": \"Desvincular Usuários de Unidades\", \"slug\": \"org.user.unlink\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3018}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3019, \"name\": \"Visualizar Módulo Pedagógico\", \"slug\": \"pedagogico.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3019}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3020, \"name\": \"Visualizar Recursos Humanos\", \"slug\": \"rh.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3020}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}, {\"id\": 3021, \"name\": \"Visualizar Gestão de Cemitérios\", \"slug\": \"cemiterios.view\", \"pivot\": {\"role_id\": 906, \"permission_id\": 3021}, \"module\": \"modules\", \"tenant_id\": null, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\"}]}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','5742d186c0685edf67792cf63a1ffc24d0181ddee30ef50c654276a78e47cafc','18dde22c096fc4144d902adbe0c629cba129599e0f2075ec6906bcf20fe65ae7','2026-08-29 15:17:18'),(67,130,132,'admin','updated','tenant:131','{\"id\": 131, \"uf\": \"PR\", \"city\": \"Araucária\", \"cnae\": null, \"cnpj\": \"76216686000110\", \"name\": \"MUNICIPIO DE ARAUCARIA\", \"plan\": \"profissional\", \"slug\": \"araucaria-pr\", \"type\": \"prefeitura\", \"domain\": null, \"status\": \"active\", \"modules\": [{\"id\": 74, \"name\": \"Painel Geral\", \"alias\": \"dashboard\", \"pivot\": {\"enabled\": 1, \"settings\": null, \"module_id\": 74, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Visão geral, KPIs e indicadores do município.\", \"monthly_fee_cents\": 0}, {\"id\": 75, \"name\": \"Organograma\", \"alias\": \"org\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 75, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 14900}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Estrutura hierárquica municipal (gabinete, secretarias, departamentos).\", \"monthly_fee_cents\": 14900}, {\"id\": 76, \"name\": \"Licitações & Compras\", \"alias\": \"procurement\", \"pivot\": {\"enabled\": 1, \"settings\": null, \"module_id\": 76, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 29900}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Pregões, processo licitatório e salas de lances.\", \"monthly_fee_cents\": 29900}, {\"id\": 77, \"name\": \"Contratos & Aditivos\", \"alias\": \"contracts\", \"pivot\": {\"enabled\": 1, \"settings\": null, \"module_id\": 77, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 24900}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Gestão de contratos, aditivos, medições e pagamentos.\", \"monthly_fee_cents\": 24900}, {\"id\": 78, \"name\": \"Execução Financeira\", \"alias\": \"finance\", \"pivot\": {\"enabled\": 1, \"settings\": null, \"module_id\": 78, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 29900}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Receitas, despesas, empenhos e conciliação.\", \"monthly_fee_cents\": 29900}, {\"id\": 79, \"name\": \"Usuários & Acessos\", \"alias\": \"users\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 79, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 9900}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Gestão de usuários e papéis do tenant.\", \"monthly_fee_cents\": 9900}, {\"id\": 80, \"name\": \"Módulo Pedagógico\", \"alias\": \"pedagogico\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 80, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 19900}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Gestão escolar e pedagógica.\", \"monthly_fee_cents\": 19900}, {\"id\": 81, \"name\": \"Recursos Humanos / Folha\", \"alias\": \"rh\", \"pivot\": {\"enabled\": 1, \"settings\": null, \"module_id\": 81, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 24900}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"RH, folha de pagamento e frequência.\", \"monthly_fee_cents\": 24900}, {\"id\": 82, \"name\": \"Gestão de Cemitérios\", \"alias\": \"cemiterios\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 82, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 14900}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Administração de cemitérios e sepultamentos.\", \"monthly_fee_cents\": 14900}], \"website\": null, \"settings\": {\"title\": \"Portal de Gestão\", \"subtitle\": \"Prefeitura de Araucária\", \"customLogoUrl\": \"\", \"customPrimaryColor\": \"#1351b4\", \"hideProviderBranding\": false}, \"max_users\": 50, \"created_at\": \"2026-08-27T12:00:48.000000Z\", \"updated_at\": \"2026-08-27T12:00:48.000000Z\", \"contact_email\": null, \"setup_fee_cents\": 0, \"storage_limit_mb\": 5120, \"monthly_fee_cents\": 0, \"custom_domain_enabled\": false, \"custom_domain_fee_cents\": 0}','{\"id\": 131, \"uf\": \"PR\", \"city\": \"Araucária\", \"cnae\": null, \"cnpj\": \"76216686000110\", \"name\": \"MUNICIPIO DE ARAUCARIA\", \"plan\": \"enterprise\", \"slug\": \"araucaria-pr\", \"type\": \"prefeitura\", \"domain\": null, \"status\": \"active\", \"modules\": [{\"id\": 74, \"name\": \"Painel Geral\", \"alias\": \"dashboard\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 74, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Visão geral, KPIs e indicadores do município.\", \"monthly_fee_cents\": 0}, {\"id\": 75, \"name\": \"Organograma\", \"alias\": \"org\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 75, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Estrutura hierárquica municipal (gabinete, secretarias, departamentos).\", \"monthly_fee_cents\": 14900}, {\"id\": 76, \"name\": \"Licitações & Compras\", \"alias\": \"procurement\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 76, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Pregões, processo licitatório e salas de lances.\", \"monthly_fee_cents\": 29900}, {\"id\": 77, \"name\": \"Contratos & Aditivos\", \"alias\": \"contracts\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 77, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Gestão de contratos, aditivos, medições e pagamentos.\", \"monthly_fee_cents\": 24900}, {\"id\": 78, \"name\": \"Execução Financeira\", \"alias\": \"finance\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 78, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Receitas, despesas, empenhos e conciliação.\", \"monthly_fee_cents\": 29900}, {\"id\": 79, \"name\": \"Usuários & Acessos\", \"alias\": \"users\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 79, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Gestão de usuários e papéis do tenant.\", \"monthly_fee_cents\": 9900}, {\"id\": 80, \"name\": \"Módulo Pedagógico\", \"alias\": \"pedagogico\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 80, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Gestão escolar e pedagógica.\", \"monthly_fee_cents\": 19900}, {\"id\": 81, \"name\": \"Recursos Humanos / Folha\", \"alias\": \"rh\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 81, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"RH, folha de pagamento e frequência.\", \"monthly_fee_cents\": 24900}, {\"id\": 82, \"name\": \"Gestão de Cemitérios\", \"alias\": \"cemiterios\", \"pivot\": {\"enabled\": 1, \"settings\": \"[]\", \"module_id\": 82, \"tenant_id\": 131, \"trial_ends_at\": null, \"monthly_fee_cents\": 0}, \"enabled\": true, \"metadata\": null, \"created_at\": \"2026-08-27T12:00:03.000000Z\", \"updated_at\": \"2026-08-27T12:00:03.000000Z\", \"description\": \"Administração de cemitérios e sepultamentos.\", \"monthly_fee_cents\": 14900}], \"website\": null, \"settings\": {\"title\": \"Portal de Gestão\", \"subtitle\": \"Prefeitura de Araucária\", \"customLogoUrl\": \"\", \"customPrimaryColor\": \"#1351b4\", \"hideProviderBranding\": false}, \"max_users\": 50, \"created_at\": \"2026-08-27T12:00:48.000000Z\", \"updated_at\": \"2026-08-29T15:19:40.000000Z\", \"contact_email\": null, \"setup_fee_cents\": 0, \"storage_limit_mb\": 5120, \"monthly_fee_cents\": 0, \"custom_domain_enabled\": false, \"custom_domain_fee_cents\": 0}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','4872e588c3e656be8976a1bc72a5e614d87c1537f415a62a87f1f8c822dc13a0','5742d186c0685edf67792cf63a1ffc24d0181ddee30ef50c654276a78e47cafc','2026-08-29 15:19:40'),(68,130,132,'admin','tenant.provisioned','Tenant #132',NULL,'{\"modules\": [\"dashboard\"], \"mrr_cents\": 0, \"tenant_id\": 132}','::1','curl/8.21.0','eda740e47629495d194de4bb194bca72a2bb230bf6b63e6ff6515a6f5987d860','4872e588c3e656be8976a1bc72a5e614d87c1537f415a62a87f1f8c822dc13a0','2026-08-29 15:41:19'),(69,130,132,'admin','status_changed','tenant:131','{\"id\": 131, \"uf\": \"PR\", \"city\": \"Araucária\", \"cnae\": null, \"cnpj\": \"76216686000110\", \"name\": \"MUNICIPIO DE ARAUCARIA\", \"plan\": \"enterprise\", \"slug\": \"araucaria-pr\", \"type\": \"prefeitura\", \"domain\": null, \"status\": \"active\", \"website\": null, \"settings\": {\"title\": \"Portal de Gestão\", \"subtitle\": \"Prefeitura de Araucária\", \"customLogoUrl\": \"\", \"customPrimaryColor\": \"#1351b4\", \"hideProviderBranding\": false}, \"max_users\": 50, \"created_at\": \"2026-08-27T12:00:48.000000Z\", \"updated_at\": \"2026-08-29T15:19:40.000000Z\", \"contact_email\": null, \"setup_fee_cents\": 0, \"storage_limit_mb\": 5120, \"monthly_fee_cents\": 0, \"custom_domain_enabled\": false, \"custom_domain_fee_cents\": 0}','{\"reason\": null, \"status\": \"active\"}','::1','curl/8.21.0','3becd50e3f3e45969b1361aa6c9a430446cf8f6dc772d75310b73db53ae5193f','eda740e47629495d194de4bb194bca72a2bb230bf6b63e6ff6515a6f5987d860','2026-08-29 15:41:54'),(70,130,132,'admin','deleted','tenant:132','{\"id\": 132, \"uf\": null, \"city\": null, \"cnae\": null, \"cnpj\": \"00000000000001\", \"name\": \"Teste\", \"plan\": \"professional\", \"slug\": \"teste\", \"type\": \"prefeitura\", \"domain\": null, \"status\": \"active\", \"website\": null, \"settings\": [], \"max_users\": 50, \"created_at\": \"2026-08-29T15:41:19.000000Z\", \"updated_at\": \"2026-08-29T15:41:19.000000Z\", \"contact_email\": null, \"setup_fee_cents\": 0, \"storage_limit_mb\": 10240, \"monthly_fee_cents\": 0, \"custom_domain_enabled\": false, \"custom_domain_fee_cents\": 0}',NULL,'::1','curl/8.21.0','37bfad6d1a7bbac3c841a73c8107a510494474cf3e8579c8257940457386fb42','3becd50e3f3e45969b1361aa6c9a430446cf8f6dc772d75310b73db53ae5193f','2026-08-29 15:41:55'),(71,130,132,'admin','user.reactivated','User #137','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T15:14:50.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"is_active\": true}','::1','curl/8.21.0','864a98aa56bb4fd5e3eeedbdf3e0707860b87eb9e5a6b001ee381fff70f32356','37bfad6d1a7bbac3c841a73c8107a510494474cf3e8579c8257940457386fb42','2026-08-29 15:50:34'),(72,130,132,'admin','role.deleted','Role #919','{\"id\": 919, \"name\": \"Auditor\", \"slug\": \"auditor\", \"scope\": \"tenant\", \"is_system\": false, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:52.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:52.000000Z\", \"description\": \"Acesso a auditoria e visualização de todos os módulos\"}',NULL,'::1','curl/8.21.0','a7b8c99bcbcf202bbff9baca9eeed5cf04e6dddefabda8487859238cd2d02a67','864a98aa56bb4fd5e3eeedbdf3e0707860b87eb9e5a6b001ee381fff70f32356','2026-08-29 16:07:43'),(73,130,132,'admin','role.created','Role #920',NULL,'{\"id\": 920, \"name\": \"Role Teste\", \"slug\": \"role-teste\", \"scope\": \"systrat\", \"is_system\": false, \"created_at\": \"2026-08-29T16:07:43.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-29T16:07:43.000000Z\"}','::1','curl/8.21.0','82a3f4004c6a0d1922449151e915546694b3575f616d1f430bea338eb5a19f01','a7b8c99bcbcf202bbff9baca9eeed5cf04e6dddefabda8487859238cd2d02a67','2026-08-29 16:07:43'),(74,130,132,'admin','user.deactivated','User #133','{\"id\": 133, \"name\": \"Administrador da Prefeitura de Araucária\", \"email\": \"admin@araucaria.pr.gov.br\", \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-27T12:00:48.000000Z\", \"is_systrat\": false, \"updated_at\": \"2026-08-27T12:00:48.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"reason\": \"teste outro usuario\", \"is_active\": false}','::1','curl/8.21.0','d6dcd54945846301218da7be1e0886de2c3ae4974d05fdb30b251b961a000070','82a3f4004c6a0d1922449151e915546694b3575f616d1f430bea338eb5a19f01','2026-08-29 16:17:02'),(75,130,132,'admin','user.reactivated','User #133','{\"id\": 133, \"name\": \"Administrador da Prefeitura de Araucária\", \"email\": \"admin@araucaria.pr.gov.br\", \"api_token\": null, \"is_active\": false, \"avatar_url\": null, \"created_at\": \"2026-08-27T12:00:48.000000Z\", \"is_systrat\": false, \"updated_at\": \"2026-08-29T16:17:02.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"is_active\": true}','::1','curl/8.21.0','3821e97716a327ca68057082b1f7e8eb720fefe07b6d58c2a982223a28361863','d6dcd54945846301218da7be1e0886de2c3ae4974d05fdb30b251b961a000070','2026-08-29 16:17:16'),(76,131,137,'tenant','access.user_created','User #138',NULL,'{\"modules\": [], \"tenant_id\": 131}','::1','curl/8.21.0','50a63968a84bc20dfc7f4cc3547375dcaaa2810f8afcf9820b57d293c1151faa','3821e97716a327ca68057082b1f7e8eb720fefe07b6d58c2a982223a28361863','2026-08-29 17:18:08'),(77,130,132,'admin','user.updated','User #137','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:15:38.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:15:38.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','ff173bde1a5bb93cc2b97ca508f74ecf5ce014c76a205d2264f3a79204e51351','50a63968a84bc20dfc7f4cc3547375dcaaa2810f8afcf9820b57d293c1151faa','2026-08-29 17:21:10'),(78,130,132,'admin','user.updated','User #137','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:15:38.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:15:38.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','29312570d364602917e7c042171b9bc303a61047340d13d7d0f90979842ce890','ff173bde1a5bb93cc2b97ca508f74ecf5ce014c76a205d2264f3a79204e51351','2026-08-29 17:24:56'),(79,130,132,'admin','user.updated','User #137','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:15:38.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:30:07.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','::1','curl/8.21.0','b6f2e81f001f04f7daece3a8224ed4b8927dd1e8d5c2a9b1e29b18bd72814e63','29312570d364602917e7c042171b9bc303a61047340d13d7d0f90979842ce890','2026-08-29 17:30:07'),(80,130,132,'admin','user.updated','User #137','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:30:07.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:33:21.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','56dc7cc8729cb2fa61ba9ee5a2b32c0396e5fddad0a7b90a5e1a371ece4e2749','b6f2e81f001f04f7daece3a8224ed4b8927dd1e8d5c2a9b1e29b18bd72814e63','2026-08-29 17:33:21'),(81,130,132,'admin','user.updated','User #137','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T17:33:21.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','{\"id\": 137, \"name\": \"Analista_01\", \"email\": \"analista01@teste.com\", \"roles\": [{\"id\": 906, \"name\": \"Analista de Suporte\", \"slug\": \"support_analyst\", \"pivot\": {\"role_id\": 906, \"user_id\": 137}, \"scope\": \"systrat\", \"is_system\": true, \"tenant_id\": 130, \"created_at\": \"2026-08-27T11:59:51.000000Z\", \"guard_name\": \"web\", \"updated_at\": \"2026-08-27T11:59:51.000000Z\", \"description\": \"Acessa apenas os tenants liberados (carteira de clientes) — auditado\"}], \"api_token\": null, \"is_active\": true, \"avatar_url\": null, \"created_at\": \"2026-08-29T15:14:50.000000Z\", \"is_systrat\": true, \"updated_at\": \"2026-08-29T22:22:27.000000Z\", \"mfa_enabled\": false, \"mfa_confirmed_at\": null, \"email_verified_at\": null, \"is_platform_admin\": false}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','aee96a19f364ac276a41b9ab5b30525266b428d1958f15ecfbd98a742551e49f','56dc7cc8729cb2fa61ba9ee5a2b32c0396e5fddad0a7b90a5e1a371ece4e2749','2026-08-29 22:22:27'),(82,130,132,'admin','status_changed','tenant:131','{\"id\": 131, \"uf\": \"PR\", \"city\": \"Araucária\", \"cnae\": null, \"cnpj\": \"76216686000110\", \"name\": \"MUNICIPIO DE ARAUCARIA\", \"plan\": \"enterprise\", \"slug\": \"araucaria-pr\", \"type\": \"prefeitura\", \"domain\": null, \"status\": \"active\", \"website\": null, \"settings\": {\"title\": \"Portal de Gestão\", \"subtitle\": \"Prefeitura de Araucária\", \"customLogoUrl\": \"\", \"customPrimaryColor\": \"#1351b4\", \"hideProviderBranding\": false}, \"max_users\": 50, \"created_at\": \"2026-08-27T12:00:48.000000Z\", \"updated_at\": \"2026-08-29T15:19:40.000000Z\", \"contact_email\": null, \"setup_fee_cents\": 0, \"storage_limit_mb\": 5120, \"monthly_fee_cents\": 0, \"custom_domain_enabled\": false, \"custom_domain_fee_cents\": 0}','{\"reason\": null, \"status\": \"active\"}','::1','curl/8.21.0','1fa3c67aade25dfaadc63c5f8f80f0d515fae4194811e7710c39da5a26df301c','aee96a19f364ac276a41b9ab5b30525266b428d1958f15ecfbd98a742551e49f','2026-08-29 22:28:45');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_commitments`
--

DROP TABLE IF EXISTS `budget_commitments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_commitments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `commitment_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `commitment_date` date NOT NULL,
  `supplier_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_cnpj` varchar(18) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expense_nature` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `function_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '04.122',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `settled_amount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `paid_amount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `status` enum('empenhado','liquidado_parcial','liquidado','pago','anulado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'empenhado',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_commitments_tenant_id_commitment_number_unique` (`tenant_id`,`commitment_number`),
  KEY `budget_commitments_tenant_id_commitment_date_index` (`tenant_id`,`commitment_date`),
  KEY `budget_commitments_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `budget_commitments_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_commitments`
--

LOCK TABLES `budget_commitments` WRITE;
/*!40000 ALTER TABLE `budget_commitments` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_commitments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_payments`
--

DROP TABLE IF EXISTS `budget_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `settlement_id` bigint unsigned NOT NULL,
  `payment_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `bank_account` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pago',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_payments_tenant_id_payment_number_unique` (`tenant_id`,`payment_number`),
  KEY `budget_payments_settlement_id_foreign` (`settlement_id`),
  KEY `budget_payments_tenant_id_settlement_id_index` (`tenant_id`,`settlement_id`),
  CONSTRAINT `budget_payments_settlement_id_foreign` FOREIGN KEY (`settlement_id`) REFERENCES `budget_settlements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_payments_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_payments`
--

LOCK TABLES `budget_payments` WRITE;
/*!40000 ALTER TABLE `budget_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_settlements`
--

DROP TABLE IF EXISTS `budget_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_settlements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `commitment_id` bigint unsigned NOT NULL,
  `settlement_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `settlement_date` date NOT NULL,
  `invoice_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'liquidado',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_settlements_tenant_id_settlement_number_unique` (`tenant_id`,`settlement_number`),
  KEY `budget_settlements_commitment_id_foreign` (`commitment_id`),
  KEY `budget_settlements_tenant_id_commitment_id_index` (`tenant_id`,`commitment_id`),
  CONSTRAINT `budget_settlements_commitment_id_foreign` FOREIGN KEY (`commitment_id`) REFERENCES `budget_commitments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_settlements_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_settlements`
--

LOCK TABLES `budget_settlements` WRITE;
/*!40000 ALTER TABLE `budget_settlements` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_units`
--

DROP TABLE IF EXISTS `budget_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_units` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `management_unit_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_units_tenant_id_code_unique` (`tenant_id`,`code`),
  KEY `budget_units_management_unit_id_foreign` (`management_unit_id`),
  KEY `budget_units_tenant_id_management_unit_id_index` (`tenant_id`,`management_unit_id`),
  CONSTRAINT `budget_units_management_unit_id_foreign` FOREIGN KEY (`management_unit_id`) REFERENCES `management_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_units_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_units`
--

LOCK TABLES `budget_units` WRITE;
/*!40000 ALTER TABLE `budget_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chart_of_accounts`
--

DROP TABLE IF EXISTS `chart_of_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chart_of_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` enum('ativo','passivo','vpd','vpa','orcamentario_despesa','orcamentario_receita','controle_devedor','controle_credor') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nature` enum('devedora','credora') COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` tinyint unsigned NOT NULL DEFAULT '1',
  `is_synthetic` tinyint(1) NOT NULL DEFAULT '0',
  `parent_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chart_of_accounts_tenant_id_code_unique` (`tenant_id`,`code`),
  KEY `chart_of_accounts_parent_id_foreign` (`parent_id`),
  KEY `chart_of_accounts_tenant_id_account_type_index` (`tenant_id`,`account_type`),
  CONSTRAINT `chart_of_accounts_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chart_of_accounts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chart_of_accounts`
--

LOCK TABLES `chart_of_accounts` WRITE;
/*!40000 ALTER TABLE `chart_of_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `chart_of_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contract_addenda`
--

DROP TABLE IF EXISTS `contract_addenda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_addenda` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `contract_id` bigint unsigned NOT NULL,
  `number` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `effective_at` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contract_addenda_tenant_id_contract_id_number_unique` (`tenant_id`,`contract_id`,`number`),
  KEY `contract_addenda_contract_id_foreign` (`contract_id`),
  CONSTRAINT `contract_addenda_contract_id_foreign` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contract_addenda_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contract_addenda`
--

LOCK TABLES `contract_addenda` WRITE;
/*!40000 ALTER TABLE `contract_addenda` DISABLE KEYS */;
/*!40000 ALTER TABLE `contract_addenda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contract_attachments`
--

DROP TABLE IF EXISTS `contract_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `contract_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` bigint unsigned NOT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contract_attachments_contract_id_foreign` (`contract_id`),
  KEY `contract_attachments_uploaded_by_foreign` (`uploaded_by`),
  KEY `contract_attachments_tenant_id_contract_id_index` (`tenant_id`,`contract_id`),
  CONSTRAINT `contract_attachments_contract_id_foreign` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contract_attachments_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contract_attachments_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contract_attachments`
--

LOCK TABLES `contract_attachments` WRITE;
/*!40000 ALTER TABLE `contract_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `contract_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contract_history`
--

DROP TABLE IF EXISTS `contract_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `contract_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `before` json DEFAULT NULL,
  `after` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contract_history_contract_id_foreign` (`contract_id`),
  KEY `contract_history_user_id_foreign` (`user_id`),
  KEY `contract_history_tenant_id_contract_id_created_at_index` (`tenant_id`,`contract_id`,`created_at`),
  CONSTRAINT `contract_history_contract_id_foreign` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contract_history_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contract_history_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contract_history`
--

LOCK TABLES `contract_history` WRITE;
/*!40000 ALTER TABLE `contract_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `contract_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contracts`
--

DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `number` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'termo_contrato',
  `supplier_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_cnpj` varchar(18) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_id` bigint unsigned DEFAULT NULL,
  `inspector_id` bigint unsigned DEFAULT NULL,
  `starts_at` date NOT NULL,
  `ends_at` date NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `total_addenda_amount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `max_addenda_percent` decimal(5,2) NOT NULL DEFAULT '25.00',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `renewal_rule` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancellation_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contracts_tenant_id_number_unique` (`tenant_id`,`number`),
  KEY `contracts_tenant_id_ends_at_index` (`tenant_id`,`ends_at`),
  KEY `contracts_manager_id_foreign` (`manager_id`),
  KEY `contracts_inspector_id_foreign` (`inspector_id`),
  KEY `contracts_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `contracts_tenant_id_contract_type_index` (`tenant_id`,`contract_type`),
  CONSTRAINT `contracts_inspector_id_foreign` FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contracts_manager_id_foreign` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contracts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contracts`
--

LOCK TABLES `contracts` WRITE;
/*!40000 ALTER TABLE `contracts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contracts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contratos_licitacao`
--

DROP TABLE IF EXISTS `contratos_licitacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contratos_licitacao` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `licitacao_id` bigint unsigned DEFAULT NULL,
  `numero` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fornecedor_id` bigint unsigned NOT NULL,
  `valor_inicial_cents` bigint unsigned NOT NULL,
  `vigencia_inicio` date NOT NULL,
  `vigencia_fim` date NOT NULL,
  `garantia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gestor_id` bigint unsigned DEFAULT NULL,
  `fiscal_id` bigint unsigned DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vigente',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contratos_licitacao_licitacao_id_foreign` (`licitacao_id`),
  KEY `contratos_licitacao_fornecedor_id_foreign` (`fornecedor_id`),
  KEY `contratos_licitacao_gestor_id_foreign` (`gestor_id`),
  KEY `contratos_licitacao_fiscal_id_foreign` (`fiscal_id`),
  KEY `contratos_licitacao_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `contratos_licitacao_fiscal_id_foreign` FOREIGN KEY (`fiscal_id`) REFERENCES `users` (`id`),
  CONSTRAINT `contratos_licitacao_fornecedor_id_foreign` FOREIGN KEY (`fornecedor_id`) REFERENCES `licitacao_participantes` (`id`),
  CONSTRAINT `contratos_licitacao_gestor_id_foreign` FOREIGN KEY (`gestor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `contratos_licitacao_licitacao_id_foreign` FOREIGN KEY (`licitacao_id`) REFERENCES `licitacoes` (`id`),
  CONSTRAINT `contratos_licitacao_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contratos_licitacao`
--

LOCK TABLES `contratos_licitacao` WRITE;
/*!40000 ALTER TABLE `contratos_licitacao` DISABLE KEYS */;
/*!40000 ALTER TABLE `contratos_licitacao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_tenant_id_code_unique` (`tenant_id`,`code`),
  KEY `departments_organization_id_foreign` (`organization_id`),
  KEY `departments_tenant_id_organization_id_index` (`tenant_id`,`organization_id`),
  CONSTRAINT `departments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `departments_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `occurred_at` date NOT NULL,
  `due_at` date DEFAULT NULL,
  `paid_at` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `contract_id` bigint unsigned DEFAULT NULL,
  `budget_unit_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expenses_tenant_id_occurred_at_index` (`tenant_id`,`occurred_at`),
  KEY `expenses_contract_id_foreign` (`contract_id`),
  KEY `expenses_budget_unit_id_foreign` (`budget_unit_id`),
  KEY `expenses_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `expenses_budget_unit_id_foreign` FOREIGN KEY (`budget_unit_id`) REFERENCES `budget_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `expenses_contract_id_foreign` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `expenses_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `occurred_at` date NOT NULL,
  `due_at` date DEFAULT NULL,
  `paid_at` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `contract_id` bigint unsigned DEFAULT NULL,
  `budget_unit_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoices_tenant_id_occurred_at_index` (`tenant_id`,`occurred_at`),
  KEY `invoices_contract_id_foreign` (`contract_id`),
  KEY `invoices_budget_unit_id_foreign` (`budget_unit_id`),
  KEY `invoices_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `invoices_budget_unit_id_foreign` FOREIGN KEY (`budget_unit_id`) REFERENCES `budget_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_contract_id_foreign` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `licitacao_lances`
--

DROP TABLE IF EXISTS `licitacao_lances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `licitacao_lances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `licitacao_id` bigint unsigned NOT NULL,
  `participante_id` bigint unsigned NOT NULL,
  `valor_cents` bigint unsigned NOT NULL,
  `ordem` int NOT NULL,
  `lancado_em` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `licitacao_lances_licitacao_id_foreign` (`licitacao_id`),
  KEY `licitacao_lances_participante_id_foreign` (`participante_id`),
  KEY `licitacao_lances_tenant_id_licitacao_id_ordem_index` (`tenant_id`,`licitacao_id`,`ordem`),
  CONSTRAINT `licitacao_lances_licitacao_id_foreign` FOREIGN KEY (`licitacao_id`) REFERENCES `licitacoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `licitacao_lances_participante_id_foreign` FOREIGN KEY (`participante_id`) REFERENCES `licitacao_participantes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `licitacao_lances_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licitacao_lances`
--

LOCK TABLES `licitacao_lances` WRITE;
/*!40000 ALTER TABLE `licitacao_lances` DISABLE KEYS */;
/*!40000 ALTER TABLE `licitacao_lances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `licitacao_pareceres`
--

DROP TABLE IF EXISTS `licitacao_pareceres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `licitacao_pareceres` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `licitacao_id` bigint unsigned NOT NULL,
  `parecerista_id` bigint unsigned NOT NULL,
  `aprovado_por` bigint unsigned DEFAULT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parecer` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rascunho',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `licitacao_pareceres_licitacao_id_foreign` (`licitacao_id`),
  KEY `licitacao_pareceres_parecerista_id_foreign` (`parecerista_id`),
  KEY `licitacao_pareceres_aprovado_por_foreign` (`aprovado_por`),
  KEY `licitacao_pareceres_tenant_id_licitacao_id_index` (`tenant_id`,`licitacao_id`),
  KEY `licitacao_pareceres_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `licitacao_pareceres_aprovado_por_foreign` FOREIGN KEY (`aprovado_por`) REFERENCES `users` (`id`),
  CONSTRAINT `licitacao_pareceres_licitacao_id_foreign` FOREIGN KEY (`licitacao_id`) REFERENCES `licitacoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `licitacao_pareceres_parecerista_id_foreign` FOREIGN KEY (`parecerista_id`) REFERENCES `users` (`id`),
  CONSTRAINT `licitacao_pareceres_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licitacao_pareceres`
--

LOCK TABLES `licitacao_pareceres` WRITE;
/*!40000 ALTER TABLE `licitacao_pareceres` DISABLE KEYS */;
/*!40000 ALTER TABLE `licitacao_pareceres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `licitacao_participantes`
--

DROP TABLE IF EXISTS `licitacao_participantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `licitacao_participantes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `licitacao_id` bigint unsigned NOT NULL,
  `razao_social` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cnpj` varchar(14) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'convidado',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `licitacao_participantes_tenant_id_licitacao_id_cnpj_unique` (`tenant_id`,`licitacao_id`,`cnpj`),
  KEY `licitacao_participantes_licitacao_id_foreign` (`licitacao_id`),
  CONSTRAINT `licitacao_participantes_licitacao_id_foreign` FOREIGN KEY (`licitacao_id`) REFERENCES `licitacoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `licitacao_participantes_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licitacao_participantes`
--

LOCK TABLES `licitacao_participantes` WRITE;
/*!40000 ALTER TABLE `licitacao_participantes` DISABLE KEYS */;
/*!40000 ALTER TABLE `licitacao_participantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `licitacao_precos`
--

DROP TABLE IF EXISTS `licitacao_precos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `licitacao_precos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `licitacao_id` bigint unsigned NOT NULL,
  `tipo_fonte` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fornecedor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_cents` bigint unsigned NOT NULL,
  `url_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'valida',
  `motivo_outlier` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `licitacao_precos_licitacao_id_foreign` (`licitacao_id`),
  KEY `licitacao_precos_tenant_id_licitacao_id_index` (`tenant_id`,`licitacao_id`),
  CONSTRAINT `licitacao_precos_licitacao_id_foreign` FOREIGN KEY (`licitacao_id`) REFERENCES `licitacoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `licitacao_precos_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licitacao_precos`
--

LOCK TABLES `licitacao_precos` WRITE;
/*!40000 ALTER TABLE `licitacao_precos` DISABLE KEYS */;
/*!40000 ALTER TABLE `licitacao_precos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `licitacoes`
--

DROP TABLE IF EXISTS `licitacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `licitacoes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `org_unit_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `homologador_id` bigint unsigned DEFAULT NULL,
  `numero` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modalidade` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `objeto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `criterio_julgamento` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `regime_execucao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_estimado_cents` bigint unsigned NOT NULL DEFAULT '0',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rascunho',
  `fase_interna` json DEFAULT NULL,
  `data_abertura` datetime DEFAULT NULL,
  `fundamento_legal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `licitacoes_tenant_id_numero_unique` (`tenant_id`,`numero`),
  KEY `licitacoes_org_unit_id_foreign` (`org_unit_id`),
  KEY `licitacoes_created_by_foreign` (`created_by`),
  KEY `licitacoes_homologador_id_foreign` (`homologador_id`),
  KEY `licitacoes_tenant_id_created_at_index` (`tenant_id`,`created_at`),
  KEY `licitacoes_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `licitacoes_tenant_id_modalidade_index` (`tenant_id`,`modalidade`),
  CONSTRAINT `licitacoes_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `licitacoes_homologador_id_foreign` FOREIGN KEY (`homologador_id`) REFERENCES `users` (`id`),
  CONSTRAINT `licitacoes_org_unit_id_foreign` FOREIGN KEY (`org_unit_id`) REFERENCES `org_units` (`id`),
  CONSTRAINT `licitacoes_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licitacoes`
--

LOCK TABLES `licitacoes` WRITE;
/*!40000 ALTER TABLE `licitacoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `licitacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `management_units`
--

DROP TABLE IF EXISTS `management_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `management_units` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `department_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `management_units_tenant_id_code_unique` (`tenant_id`,`code`),
  KEY `management_units_department_id_foreign` (`department_id`),
  KEY `management_units_tenant_id_department_id_index` (`tenant_id`,`department_id`),
  CONSTRAINT `management_units_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `management_units_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `management_units`
--

LOCK TABLES `management_units` WRITE;
/*!40000 ALTER TABLE `management_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `management_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `medicoes_contratuais`
--

DROP TABLE IF EXISTS `medicoes_contratuais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicoes_contratuais` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `contrato_id` bigint unsigned NOT NULL,
  `numero` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periodo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_cents` bigint unsigned NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'em_analise',
  `anexos` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `medicoes_contratuais_contrato_id_foreign` (`contrato_id`),
  KEY `medicoes_contratuais_tenant_id_contrato_id_index` (`tenant_id`,`contrato_id`),
  CONSTRAINT `medicoes_contratuais_contrato_id_foreign` FOREIGN KEY (`contrato_id`) REFERENCES `contratos_licitacao` (`id`) ON DELETE CASCADE,
  CONSTRAINT `medicoes_contratuais_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `medicoes_contratuais`
--

LOCK TABLES `medicoes_contratuais` WRITE;
/*!40000 ALTER TABLE `medicoes_contratuais` DISABLE KEYS */;
/*!40000 ALTER TABLE `medicoes_contratuais` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_groups`
--

DROP TABLE IF EXISTS `menu_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `menu_groups_slug_unique` (`slug`),
  KEY `menu_groups_tenant_id_order_index` (`tenant_id`,`order`),
  CONSTRAINT `menu_groups_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_groups`
--

LOCK TABLES `menu_groups` WRITE;
/*!40000 ALTER TABLE `menu_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `menu_group_id` bigint unsigned NOT NULL,
  `label` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `route` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shortcut` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `module_alias` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `menu_items_menu_group_id_foreign` (`menu_group_id`),
  KEY `menu_items_tenant_id_menu_group_id_order_index` (`tenant_id`,`menu_group_id`,`order`),
  CONSTRAINT `menu_items_menu_group_id_foreign` FOREIGN KEY (`menu_group_id`) REFERENCES `menu_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `menu_items_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2026_08_22_000000_create_sysgov_core_tables',1),(2,'2026_08_22_000001_create_personal_access_tokens_table',1),(3,'2026_08_22_000002_create_role_has_permissions_table',1),(4,'2026_08_22_000003_create_tenant_hierarchy_tables',1),(5,'2026_08_22_010000_create_contracts_table',1),(6,'2026_08_22_010001_create_contract_support_tables',1),(7,'2026_08_22_020000_create_finance_tables',1),(8,'2026_08_22_020001_upgrade_finance_tables',1),(9,'2026_08_23_000000_create_support_tickets_tables',1),(10,'2026_08_23_000001_upgrade_contracts_lifecycle_table',1),(11,'2026_08_23_010000_create_accounting_pcasp_tables',1),(12,'2026_08_23_010000_create_saas_contracts_tables',1),(13,'2026_08_23_010001_create_saas_contract_renewals_table',1),(14,'2026_08_23_010002_create_saas_invoices_table',1),(15,'2026_08_23_020000_create_menu_groups_and_items_tables',1),(16,'2026_08_23_205415_add_api_token_to_users_table',1),(17,'2026_08_24_000001_create_org_units_table',1),(18,'2026_08_24_000002_create_org_unit_user_table',1),(19,'2026_08_24_201340_create_licitacoes_table',1),(20,'2026_08_24_201341_create_procurement_artefatos_table',1),(21,'2026_08_24_201629_create_licitacao_precos_table',1),(22,'2026_08_24_201659_create_licitacao_participantes_table',1),(23,'2026_08_24_201700_create_licitacao_lances_table',1),(24,'2026_08_24_201822_create_contratos_licitacao_table',1),(25,'2026_08_24_201823_create_aditivos_contratuais_table',1),(26,'2026_08_24_201824_create_medicoes_contratuais_table',1),(27,'2026_08_24_201825_create_pagamentos_contratuais_table',1),(28,'2026_08_24_204241_create_licitacao_pareceres_table',1),(29,'2026_08_24_213035_add_slug_to_permissions_table',1),(30,'2026_08_24_213108_add_slug_to_roles_table',1),(31,'2026_08_24_220208_add_mfa_and_systrat_columns_to_users_table',1),(32,'2026_08_24_220216_create_user_invitations_table',1),(33,'2026_08_24_220222_add_scope_slug_system_to_roles_table',1),(34,'2026_08_24_220229_add_slug_to_permissions_table_v2',1),(35,'2026_08_24_220238_update_tenant_user_table_add_status_and_is_primary',1),(36,'2026_08_24_230000_add_hmac_chain_to_audit_logs',1),(37,'2026_08_24_231000_make_users_password_nullable',1),(38,'2026_08_25_000000_create_password_reset_tokens_table',1),(39,'2026_08_25_100000_add_provisioning_columns_to_tenants_modules',1),(40,'2026_08_25_200000_create_tenant_analyst_table',1),(41,'2026_08_25_210000_create_user_module_access_table',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alias` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `monthly_fee_cents` bigint unsigned NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `modules_name_unique` (`name`),
  UNIQUE KEY `modules_alias_unique` (`alias`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modules`
--

LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
INSERT INTO `modules` VALUES (74,'Painel Geral','dashboard',NULL,1,0,'Visão geral, KPIs e indicadores do município.','2026-08-27 12:00:03','2026-08-27 12:00:03'),(75,'Organograma','org',NULL,1,14900,'Estrutura hierárquica municipal (gabinete, secretarias, departamentos).','2026-08-27 12:00:03','2026-08-27 12:00:03'),(76,'Licitações & Compras','procurement',NULL,1,29900,'Pregões, processo licitatório e salas de lances.','2026-08-27 12:00:03','2026-08-27 12:00:03'),(77,'Contratos & Aditivos','contracts',NULL,1,24900,'Gestão de contratos, aditivos, medições e pagamentos.','2026-08-27 12:00:03','2026-08-27 12:00:03'),(78,'Execução Financeira','finance',NULL,1,29900,'Receitas, despesas, empenhos e conciliação.','2026-08-27 12:00:03','2026-08-27 12:00:03'),(79,'Usuários & Acessos','users',NULL,1,9900,'Gestão de usuários e papéis do tenant.','2026-08-27 12:00:03','2026-08-27 12:00:03'),(80,'Módulo Pedagógico','pedagogico',NULL,1,19900,'Gestão escolar e pedagógica.','2026-08-27 12:00:03','2026-08-27 12:00:03'),(81,'Recursos Humanos / Folha','rh',NULL,1,24900,'RH, folha de pagamento e frequência.','2026-08-27 12:00:03','2026-08-27 12:00:03'),(82,'Gestão de Cemitérios','cemiterios',NULL,1,14900,'Administração de cemitérios e sepultamentos.','2026-08-27 12:00:03','2026-08-27 12:00:03');
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `org_unit_user`
--

DROP TABLE IF EXISTS `org_unit_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_unit_user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `org_unit_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `role` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'membro',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `valid_from` date DEFAULT NULL,
  `valid_to` date DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_unit_user_tenant_id_org_unit_id_user_id_unique` (`tenant_id`,`org_unit_id`,`user_id`),
  KEY `org_unit_user_org_unit_id_foreign` (`org_unit_id`),
  KEY `org_unit_user_user_id_foreign` (`user_id`),
  KEY `org_unit_user_tenant_id_org_unit_id_index` (`tenant_id`,`org_unit_id`),
  KEY `org_unit_user_tenant_id_user_id_index` (`tenant_id`,`user_id`),
  KEY `org_unit_user_tenant_id_role_index` (`tenant_id`,`role`),
  KEY `org_unit_user_tenant_id_is_primary_index` (`tenant_id`,`is_primary`),
  CONSTRAINT `org_unit_user_org_unit_id_foreign` FOREIGN KEY (`org_unit_id`) REFERENCES `org_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `org_unit_user_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `org_unit_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `org_unit_user`
--

LOCK TABLES `org_unit_user` WRITE;
/*!40000 ALTER TABLE `org_unit_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `org_unit_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `org_units`
--

DROP TABLE IF EXISTS `org_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_units` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `acronym` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'secretaria',
  `level` int unsigned NOT NULL DEFAULT '1',
  `path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1',
  `order` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `inactivation_reason` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_units_tenant_id_code_unique` (`tenant_id`,`code`),
  UNIQUE KEY `org_units_tenant_id_parent_id_name_unique` (`tenant_id`,`parent_id`,`name`),
  KEY `org_units_parent_id_foreign` (`parent_id`),
  KEY `org_units_tenant_id_parent_id_index` (`tenant_id`,`parent_id`),
  KEY `org_units_tenant_id_path_index` (`tenant_id`,`path`),
  KEY `org_units_tenant_id_level_index` (`tenant_id`,`level`),
  KEY `org_units_tenant_id_is_active_index` (`tenant_id`,`is_active`),
  KEY `org_units_tenant_id_order_index` (`tenant_id`,`order`),
  CONSTRAINT `org_units_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `org_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `org_units_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `org_units`
--

LOCK TABLES `org_units` WRITE;
/*!40000 ALTER TABLE `org_units` DISABLE KEYS */;
INSERT INTO `org_units` VALUES (30,131,NULL,'Gabinete do Prefeito — MUNICIPIO DE ARAUCARIA','GAB','GAB','raiz',1,'30',1,1,NULL,'{\"seeded_by\": \"SYSGOV Onboarding Engine\", \"description\": \"Órgão executivo superior da administração municipal.\"}','2026-08-27 17:58:05','2026-08-27 17:58:05',NULL),(31,131,30,'Secretaria Municipal de Administração','SMA','SMA','secretaria',2,'30.31',1,1,NULL,'{\"description\": \"Gestão administrativa, patrimônio e compras públicas.\"}','2026-08-27 17:58:07','2026-08-27 17:58:07',NULL),(32,131,30,'Secretaria Municipal de Finanças & Planejamento','SMF','SMF','secretaria',2,'30.32',2,1,NULL,'{\"description\": \"Execução orçamentária, contabilidade e arrecadação.\"}','2026-08-27 17:58:07','2026-08-27 17:58:07',NULL);
/*!40000 ALTER TABLE `org_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizations_tenant_id_code_unique` (`tenant_id`,`code`),
  CONSTRAINT `organizations_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizations`
--

LOCK TABLES `organizations` WRITE;
/*!40000 ALTER TABLE `organizations` DISABLE KEYS */;
/*!40000 ALTER TABLE `organizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `outbox_events`
--

DROP TABLE IF EXISTS `outbox_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outbox_events` (
  `event_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_version` smallint unsigned NOT NULL DEFAULT '1',
  `tenant_id` bigint unsigned DEFAULT NULL,
  `payload` json NOT NULL,
  `status` enum('pending','processing','done','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `available_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL,
  `error` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`event_id`),
  KEY `outbox_events_tenant_id_status_available_at_index` (`tenant_id`,`status`,`available_at`),
  CONSTRAINT `outbox_events_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `outbox_events`
--

LOCK TABLES `outbox_events` WRITE;
/*!40000 ALTER TABLE `outbox_events` DISABLE KEYS */;
INSERT INTO `outbox_events` VALUES ('14159808-ca63-4963-b43a-d5751ac1269e','OrgUnitCreated',1,131,'{\"id\": 31, \"code\": \"SMA\", \"name\": \"Secretaria Municipal de Administração\", \"path\": \"30.31\", \"level\": 2, \"parent_id\": 30}','pending',0,'2026-08-27 17:58:07',NULL,NULL),('279cb0de-4ee4-41b8-a33c-4fc6b3bbec92','UserUpdated',1,130,'{\"id\": 137}','pending',0,'2026-08-29 17:30:07',NULL,NULL),('36d31907-2988-48f0-844b-0d03eeb3cee4','UserUpdated',1,130,'{\"id\": 137}','pending',0,'2026-08-29 17:21:10',NULL,NULL),('3b3a2273-a3ce-4290-9769-39da00c9b620','UserUpdated',1,130,'{\"id\": 137}','pending',0,'2026-08-29 15:16:07',NULL,NULL),('42dddc0f-d235-4c84-804d-57988f0ffaa7','UserUpdated',1,130,'{\"id\": 137}','pending',0,'2026-08-29 17:33:21',NULL,NULL),('55c4ec11-6a38-46ac-8cf7-f0b781c01b06','UserReactivated',1,130,'{\"id\": 133}','pending',0,'2026-08-29 16:17:16',NULL,NULL),('718e8d2f-520a-43e6-8661-8bc55c9a3207','tenant.provisioned',1,NULL,'{\"slug\": \"teste\", \"modules\": [\"dashboard\"], \"tenant_id\": 132}','pending',0,'2026-08-29 15:41:20',NULL,NULL),('7b45cc54-cd30-40d5-a62e-5433264f0c9f','UserUpdated',1,130,'{\"id\": 137}','pending',0,'2026-08-29 17:24:56',NULL,NULL),('995bfc86-e20e-4397-b2c8-66e780ef09b0','tenant.deleted',1,130,'{\"slug\": \"teste\", \"tenant_id\": 132}','pending',0,'2026-08-29 15:41:55',NULL,NULL),('c26df38b-0169-416b-a6a4-38ebfe98dc26','PasswordResetRequested',1,130,'{\"token\": \"tZ4BFoTbKwYcaIuATT2PjXYH9q9mBLhdKx7HDboEkPvnkw65IWE4ljMmbaDdssBa\", \"user_id\": 137, \"expires_at\": \"2026-08-29T16:50:34.790226Z\"}','pending',0,'2026-08-29 15:50:34',NULL,NULL),('c2ee753a-2bca-40f8-b07c-9f837b28f901','UserReactivated',1,130,'{\"id\": 137}','pending',0,'2026-08-29 15:50:34',NULL,NULL),('c3875e55-fb53-4145-a661-b5a0c7226636','OrgUnitCreated',1,131,'{\"id\": 30, \"code\": \"GAB\", \"name\": \"Gabinete do Prefeito — MUNICIPIO DE ARAUCARIA\", \"path\": \"30\", \"level\": 1, \"parent_id\": null}','pending',0,'2026-08-27 17:58:05',NULL,NULL),('c809d4f0-b65a-4c4c-b51a-9a5ab91b7892','OrgUnitCreated',1,131,'{\"id\": 32, \"code\": \"SMF\", \"name\": \"Secretaria Municipal de Finanças & Planejamento\", \"path\": \"30.32\", \"level\": 2, \"parent_id\": 30}','pending',0,'2026-08-27 17:58:07',NULL,NULL),('cb07b457-1501-4dab-93eb-1b77aab043ed','UserUpdated',1,130,'{\"id\": 137}','pending',0,'2026-08-29 22:22:27',NULL,NULL),('d3ab7f71-9464-41a1-bf88-03138eadb38a','UserCreated',1,130,'{\"id\": 136, \"email\": \"cfgfernando@gmail.com\"}','pending',0,'2026-08-29 14:47:14',NULL,NULL),('fde8aab5-cb39-4698-877d-9b98d03f80a0','UserDeactivated',1,130,'{\"id\": 133, \"reason\": \"teste outro usuario\"}','pending',0,'2026-08-29 16:17:02',NULL,NULL);
/*!40000 ALTER TABLE `outbox_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pagamentos_contratuais`
--

DROP TABLE IF EXISTS `pagamentos_contratuais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagamentos_contratuais` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `contrato_id` bigint unsigned NOT NULL,
  `nota_fiscal` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_cents` bigint unsigned NOT NULL,
  `data_vencimento` date NOT NULL,
  `data_pagamento` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pagamentos_contratuais_contrato_id_foreign` (`contrato_id`),
  KEY `pagamentos_contratuais_tenant_id_contrato_id_index` (`tenant_id`,`contrato_id`),
  CONSTRAINT `pagamentos_contratuais_contrato_id_foreign` FOREIGN KEY (`contrato_id`) REFERENCES `contratos_licitacao` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pagamentos_contratuais_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagamentos_contratuais`
--

LOCK TABLES `pagamentos_contratuais` WRITE;
/*!40000 ALTER TABLE `pagamentos_contratuais` DISABLE KEYS */;
/*!40000 ALTER TABLE `pagamentos_contratuais` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_reset_tokens_token_unique` (`token`),
  KEY `password_reset_tokens_email_index` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (4,'analista01@teste.com','08e0f7b421d66317b3e2285b1b27d555336ddadea35194c1d96faed46f295731','2026-08-29 16:50:34',NULL,'2026-08-29 15:50:34','2026-08-29 15:50:34');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web',
  `tenant_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_slug_unique` (`slug`),
  UNIQUE KEY `permissions_tenant_id_name_unique` (`tenant_id`,`name`),
  CONSTRAINT `permissions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3022 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (2965,'Visualizar Usuários SYSTRAT','users.systrat.view','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2966,'Criar Usuários SYSTRAT','users.systrat.create','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2967,'Atualizar Usuários SYSTRAT','users.systrat.update','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2968,'Excluir Usuários SYSTRAT','users.systrat.delete','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2969,'Visualizar Usuários de Tenants','users.tenant.view','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2970,'Criar Admin Inicial do Tenant','users.tenant.create','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2971,'Convidar Usuários','users.invite','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2972,'Desativar Usuários','users.deactivate','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2973,'Resetar Senha de Usuários','users.reset_password','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2974,'Visualizar Roles','roles.view','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2975,'Criar Roles','roles.create','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2976,'Atualizar Roles','roles.update','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2977,'Excluir Roles','roles.delete','admin','web',NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(2978,'Atribuir Roles','roles.assign','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2979,'Gerenciar Usuários do Tenant (web-client)','users.manage','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2980,'Gerenciar Analistas de Suporte','analyst.manage','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2981,'Visualizar Tenants','admin.tenants.view','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2982,'Gerenciar Tenants','admin.tenants.manage','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2983,'Visualizar Usuários (legado)','admin.users.view','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2984,'Gerenciar Usuários (legado)','admin.users.manage','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2985,'Visualizar Roles (legado)','admin.roles.view','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2986,'Gerenciar Roles (legado)','admin.roles.manage','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2987,'Visualizar Módulos','admin.modules.view','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2988,'Gerenciar Módulos','admin.modules.manage','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2989,'Visualizar Menus','admin.menus.view','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2990,'Gerenciar Menus','admin.menus.manage','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2991,'Visualizar Auditoria','admin.audit.view','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2992,'Visualizar Monitoramento','admin.monitoring.view','admin','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2993,'Visualizar Contratos','contracts.view','contracts','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2994,'Criar Contratos','contracts.create','contracts','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2995,'Atualizar Contratos','contracts.update','contracts','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2996,'Aprovar Contratos','contracts.approve','contracts','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2997,'Excluir Contratos','contracts.delete','contracts','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2998,'Exportar Contratos','contracts.export','contracts','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(2999,'Visualizar Financeiro','finance.view','finance','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3000,'Criar Lançamentos','finance.create','finance','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3001,'Aprovar Financeiro','finance.approve','finance','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3002,'Efetuar Pagamentos','finance.pay','finance','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3003,'Conciliar Financeiro','finance.reconcile','finance','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3004,'Exportar Financeiro','finance.export','finance','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3005,'Visualizar Licitações','procurement.view','procurement','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3006,'Criar Licitações','procurement.create','procurement','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3007,'Aprovar Licitações','procurement.approve','procurement','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3008,'Visualizar Documentos','documents.view','documents','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3009,'Upload de Documentos','documents.upload','documents','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3010,'Gerenciar Documentos','documents.manage','documents','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3011,'Visualizar Painel Geral','dashboard.view','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3012,'Visualizar Organograma','org.view','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3013,'Criar Unidades Organizacionais','org.create','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3014,'Atualizar Unidades Organizacionais','org.update','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3015,'Excluir Unidades Organizacionais','org.delete','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3016,'Mover Unidades Organizacionais','org.move','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3017,'Vincular Usuários a Unidades','org.user.link','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3018,'Desvincular Usuários de Unidades','org.user.unlink','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3019,'Visualizar Módulo Pedagógico','pedagogico.view','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3020,'Visualizar Recursos Humanos','rh.view','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(3021,'Visualizar Gestão de Cemitérios','cemiterios.view','modules','web',NULL,'2026-08-27 11:59:51','2026-08-27 11:59:51');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (6,'App\\Models\\User',133,'sysgov-web','0b85a08018d97535050f46023685a275900cb8cea17988eb687efda1c0f93e53','[\"api\"]',NULL,NULL,'2026-08-27 12:00:59','2026-08-27 12:00:59'),(7,'App\\Models\\User',133,'sysgov-web','f93b64aaf99376f0a3b4bcb2bc0b6be227b5479b62d8acef0e3aaa597331aef6','[\"api\"]',NULL,NULL,'2026-08-27 12:01:57','2026-08-27 12:01:57'),(8,'App\\Models\\User',133,'sysgov-web','4a7c27878929e1d23d0bdb5bb5986dc1bcf55f41ffd5d05d52246f5289269747','[\"api\"]',NULL,NULL,'2026-08-27 12:02:07','2026-08-27 12:02:07'),(9,'App\\Models\\User',133,'sysgov-web','7a51ecc8e18405bb4c6362ed9c7ad7d3a828be30d6376d018866976ca390efc8','[\"api\"]',NULL,NULL,'2026-08-27 12:12:13','2026-08-27 12:12:13'),(10,'App\\Models\\User',133,'sysgov-web','a513603238cb2dfa54c52029c68260a275d893fa72bc30fd2cea4f9f1e0f9942','[\"api\"]',NULL,NULL,'2026-08-27 17:47:17','2026-08-27 17:47:17'),(11,'App\\Models\\User',133,'sysgov-web','765c5633a27766bc087fc4e890d2e7a9c75f196cd78e73872457c64fc32e94bd','[\"api\"]',NULL,NULL,'2026-08-27 17:51:47','2026-08-27 17:51:47'),(12,'App\\Models\\User',133,'sysgov-web','dd772f9956bcc5300b7e541b11ac2ac81039db5c77f9bdc553d484502f33f6f3','[\"api\"]',NULL,NULL,'2026-08-27 17:52:49','2026-08-27 17:52:49'),(13,'App\\Models\\User',132,'sysgov-admin','1321dc88cb23573dce51833854c81877b322688815099db68e63f543b7a5a3aa','[\"api\"]',NULL,NULL,'2026-08-27 17:53:14','2026-08-27 17:53:14'),(14,'App\\Models\\User',133,'sysgov-web','92e7b53ba6d90170569929312985824f7e34c4e45cb47eea8d3b2ab3c5fe86a6','[\"api\"]','2026-08-27 19:37:35',NULL,'2026-08-27 17:56:24','2026-08-27 19:37:35'),(15,'App\\Models\\User',133,'sysgov-web','d9dd01c214972f89d33f1cf1d82035d0a2afb3e909fa080e58bc60ab59f7085f','[\"api\"]','2026-08-27 17:58:05',NULL,'2026-08-27 17:58:04','2026-08-27 17:58:05'),(16,'App\\Models\\User',133,'sysgov-web','1f4276c24e0fc73a124a484e31a7e384e9a579ef829efac4a1c987d36ac66033','[\"api\"]','2026-08-27 17:58:20',NULL,'2026-08-27 17:58:19','2026-08-27 17:58:20'),(17,'App\\Models\\User',133,'sysgov-web','4b6e86f67eef71b88d477add5aa7489404c5c1b45d9251712b739402842da0ee','[\"api\"]','2026-08-27 17:58:42',NULL,'2026-08-27 17:58:41','2026-08-27 17:58:42'),(18,'App\\Models\\User',132,'sysgov-admin','0233ddb243c8e7730f9c235d705ba48a75bca353d74c486afe63da56e392ef65','[\"api\"]',NULL,NULL,'2026-08-29 14:39:37','2026-08-29 14:39:37'),(19,'App\\Models\\User',132,'sysgov-admin','85d913cda52322fb692e6e81f59604fef6ad11f715d4d79c5d082b4ac9cd2dde','[\"api\"]',NULL,NULL,'2026-08-29 14:44:12','2026-08-29 14:44:12'),(20,'App\\Models\\User',133,'sysgov-web','851c489d7f4591dd18f3caf1e07cc722c3f5acea6a13952bc56882e05e804159','[\"api\"]',NULL,NULL,'2026-08-29 14:44:16','2026-08-29 14:44:16'),(21,'App\\Models\\User',133,'sysgov-web','e01f95320c0c3ad443bdf1a0e9245087a3ddb95a77c2e34e4142943f68264dfc','[\"api\"]','2026-08-29 14:48:27',NULL,'2026-08-29 14:45:41','2026-08-29 14:48:27'),(22,'App\\Models\\User',136,'sysgov-admin','08c90196927f8742761aa5ff919cd2f298f79a442e019824f48c0af044142630','[\"api\"]','2026-08-29 14:48:17',NULL,'2026-08-29 14:47:33','2026-08-29 14:48:17'),(23,'App\\Models\\User',133,'sysgov-web','958ba1541bc2aba89baf947496a8099199d84db46e86bd3460e7cc9fbcaa02c5','[\"api\"]',NULL,NULL,'2026-08-29 14:47:35','2026-08-29 14:47:35'),(24,'App\\Models\\User',133,'sysgov-web','78ad56461a7619e5e1c7d2516a232216bf5bc3662b5b2fa0df005e830af50fe3','[\"api\"]','2026-08-29 15:08:39',NULL,'2026-08-29 14:49:02','2026-08-29 15:08:39'),(25,'App\\Models\\User',133,'sysgov-web','be70bae28eec8c8a1590a489b3ec119b89513cea8dc77b69220869f0236a44c7','[\"api\"]',NULL,NULL,'2026-08-29 15:09:23','2026-08-29 15:09:23'),(26,'App\\Models\\User',137,'sysgov-web','743cefa9585ddb061e293364d08b9829170ed2f171bfadfa344b363e5e6856d6','[\"api\"]',NULL,NULL,'2026-08-29 15:15:32','2026-08-29 15:15:32'),(27,'App\\Models\\User',137,'sysgov-web','0b317cff275880df6ce176f2521edaf44144dfec6b64c912fe77549a48cde756','[\"api\"]',NULL,NULL,'2026-08-29 15:17:53','2026-08-29 15:17:53'),(28,'App\\Models\\User',133,'sysgov-web','726e7633a1b260eadcd994af287b3f2aea2736ba255990cc7d1c756d8611cab7','[\"api\"]','2026-08-29 15:19:56',NULL,'2026-08-29 15:19:52','2026-08-29 15:19:56'),(29,'App\\Models\\User',136,'sysgov-admin','f07254b935e0c163f1722d68599885a60fdd5676e9e7d64f82507f47134023bc','[\"api\"]','2026-08-29 15:39:06',NULL,'2026-08-29 15:38:53','2026-08-29 15:39:06'),(30,'App\\Models\\User',136,'sysgov-admin','4c3718a995b4e2cd1d9dfacc20c3f5d8d5a3ade2d4d89c7b8d1972f778f08892','[\"api\"]','2026-08-29 16:03:32',NULL,'2026-08-29 15:39:10','2026-08-29 16:03:32'),(31,'App\\Models\\User',133,'sysgov-web','a30945907bb2bc03b9da38823f603dfe2b67c8669a2e18968905b29046949960','[\"api\"]','2026-08-29 15:54:23',NULL,'2026-08-29 15:39:22','2026-08-29 15:54:23'),(32,'App\\Models\\User',132,'sysgov-admin','7b1916f5265cf0253ee6a2daf91343ca94269eac98ece907c2b1cc94f64dc29d','[\"api\"]','2026-08-29 15:40:36',NULL,'2026-08-29 15:40:32','2026-08-29 15:40:36'),(33,'App\\Models\\User',132,'sysgov-admin','bace96c619a94db6cb9778af010f20a1c6f9a6f8e8fb8eed25e01f0bb73c88d1','[\"api\"]','2026-08-29 15:41:19',NULL,'2026-08-29 15:41:19','2026-08-29 15:41:19'),(34,'App\\Models\\User',132,'sysgov-admin','7219a8b73405cf486bd4d7e36f908deba2bad7915bd06f349c642533a1725515','[\"api\"]','2026-08-29 15:41:55',NULL,'2026-08-29 15:41:53','2026-08-29 15:41:55'),(35,'App\\Models\\User',132,'sysgov-admin','57b945561e9b11f8b706aa5f1729b614020a532ecb42f4aaf12d734f4ec03322','[\"api\"]','2026-08-29 15:42:17',NULL,'2026-08-29 15:42:14','2026-08-29 15:42:17'),(36,'App\\Models\\User',132,'sysgov-admin','95d22c4d3afd8a0102e0b3975a7beee427bd788216c9af500dbce3c5c74a24aa','[\"api\"]','2026-08-29 15:44:23',NULL,'2026-08-29 15:44:19','2026-08-29 15:44:23'),(37,'App\\Models\\User',132,'sysgov-admin','69b1de633d07e6c369b303838a304f4c36270515d5009e4243bc690047ef3df2','[\"api\"]','2026-08-29 15:50:34',NULL,'2026-08-29 15:50:31','2026-08-29 15:50:34'),(38,'App\\Models\\User',132,'sysgov-admin','ce639258fa6c36e8538fee06c7c8933f57282a32d2dc099b38271d31c256ca74','[\"api\"]','2026-08-29 16:03:13',NULL,'2026-08-29 16:03:12','2026-08-29 16:03:13'),(39,'App\\Models\\User',136,'sysgov-admin','f3ed4f95dcf48dae725733e351e9dd68a716ec02a8281ac65594828f93900dbf','[\"api\"]','2026-08-29 16:16:53',NULL,'2026-08-29 16:03:33','2026-08-29 16:16:53'),(40,'App\\Models\\User',132,'sysgov-admin','7df6a5001f52ec83b7a142a50439d294f0f7ff36bc91574f714ac14a9edd688d','[\"api\"]','2026-08-29 16:07:30',NULL,'2026-08-29 16:07:30','2026-08-29 16:07:30'),(41,'App\\Models\\User',132,'sysgov-admin','e42d1dd23c93c6f4ac74b27dcca8633c7291ddfe1ffc7b4d20b98fd0d1c47ffd','[\"api\"]','2026-08-29 16:07:44',NULL,'2026-08-29 16:07:42','2026-08-29 16:07:44'),(42,'App\\Models\\User',132,'sysgov-admin','376ddd450e5194dabaa442f15549d17e0381dbad1b788e3436f59f0c5e4971cf','[\"api\"]','2026-08-29 16:08:04',NULL,'2026-08-29 16:08:03','2026-08-29 16:08:04'),(43,'App\\Models\\User',132,'sysgov-admin','f187af3f251ae1d1e4741fee007bfabe6d40dca0848f7ddfeee409838c1fbe89','[\"api\"]','2026-08-29 16:17:02',NULL,'2026-08-29 16:16:55','2026-08-29 16:17:02'),(44,'App\\Models\\User',136,'sysgov-admin','627f5351a5b84f0cb8cd3f1f675335bf3dfc451b1daba7883ab7d8bcc096b2a4','[\"api\"]','2026-08-29 16:17:42',NULL,'2026-08-29 16:16:56','2026-08-29 16:17:42'),(45,'App\\Models\\User',132,'sysgov-admin','e16f7ef740becafb1f25684ded512bc2794541d8f4ada8d4591631b9c1bcfe98','[\"api\"]','2026-08-29 16:17:16',NULL,'2026-08-29 16:17:14','2026-08-29 16:17:16'),(46,'App\\Models\\User',133,'sysgov-web','a1b5d7a47b6ebdec69dc4e0b6b57ab8459c40d651af4463dd8c4795f4077b2fd','[\"api\"]',NULL,NULL,'2026-08-29 16:20:07','2026-08-29 16:20:07'),(47,'App\\Models\\User',133,'sysgov-web','4d11096db82501b08eab6d920b57edaa06a13d14ec90169b8bd6641ae812b2dc','[\"api\"]','2026-08-29 16:36:31',NULL,'2026-08-29 16:25:41','2026-08-29 16:36:31'),(48,'App\\Models\\User',136,'sysgov-admin','e1a3b6316a271aa80a9c7514bea66e179faec885a8b11bffe8fe36c4384c4521','[\"api\"]','2026-08-29 16:36:22',NULL,'2026-08-29 16:25:51','2026-08-29 16:36:22'),(49,'App\\Models\\User',133,'sysgov-web','ef97d58adbd775ef99323f8a67131f4f608be85d47e3fc81453a11aa89ac37aa','[\"api\"]',NULL,NULL,'2026-08-29 16:36:37','2026-08-29 16:36:37'),(50,'App\\Models\\User',133,'sysgov-web','60efbc2badcaca56a8a478bfca0eb6a0a68f21a2126928e99180519b910ad130','[\"api\"]','2026-08-29 17:10:21',NULL,'2026-08-29 16:44:09','2026-08-29 17:10:21'),(51,'App\\Models\\User',136,'sysgov-admin','54eba1a73c85b435fe0c0506fae27bd4315ae38b4b68eba96c66c37128ea1d59','[\"api\"]','2026-08-29 16:44:21',NULL,'2026-08-29 16:44:17','2026-08-29 16:44:21'),(52,'App\\Models\\User',136,'sysgov-admin','371d97568a5e3348887878f93fdddc135202864c1ec0a93275e3966858965cee','[\"api\"]','2026-08-29 16:44:40',NULL,'2026-08-29 16:44:36','2026-08-29 16:44:40'),(53,'App\\Models\\User',132,'sysgov-admin','774542dcdad1386d48788c6073288363144fcb2035cc9aaf89884e0981248323','[\"api\"]','2026-08-29 17:10:19',NULL,'2026-08-29 16:45:33','2026-08-29 17:10:19'),(54,'App\\Models\\User',136,'sysgov-admin','2631f369780b205d9257bbae555de61da63f46111a0807ba33137ffee9b1a3ff','[\"api\"]','2026-08-29 16:51:53',NULL,'2026-08-29 16:51:52','2026-08-29 16:51:53'),(55,'App\\Models\\User',137,'sysgov-web','5cfcb8bed8a7237215f1e15ff779fdea043ca1b2f6624be06dde1295ffdfa1d1','[\"api\"]','2026-08-29 17:20:10',NULL,'2026-08-29 17:11:10','2026-08-29 17:20:10'),(56,'App\\Models\\User',137,'sysgov-web','31e4719a3705a52d7a1a54fe8eac1e7fc814451a931125d47922fe3efe54acc1','[\"api\"]','2026-08-29 17:25:52',NULL,'2026-08-29 17:16:20','2026-08-29 17:25:52'),(57,'App\\Models\\User',137,'sysgov-web','6e3dc896b37e42ec672b9cddda634fe3ef6549b3fb1f272e35d5a26b3d9edf83','[\"api\"]',NULL,NULL,'2026-08-29 17:22:13','2026-08-29 17:22:13'),(58,'App\\Models\\User',137,'sysgov-web','9a801d8b263b0973493f276e1bb2b4eb461199b024fe2d0a3085d782bc606028','[\"api\"]','2026-08-29 17:24:04',NULL,'2026-08-29 17:23:59','2026-08-29 17:24:04'),(59,'App\\Models\\User',132,'sysgov-admin','c5a5b1a21586852c7064b16950bdc99238b61f5410842dcada3d42dd05b35d96','[\"api\"]','2026-08-29 17:30:07',NULL,'2026-08-29 17:30:06','2026-08-29 17:30:07'),(60,'App\\Models\\User',137,'sysgov-web','66130a73521e87069670d610050e951d96b8e7bac095087b22715db77d79601d','[\"api\"]',NULL,NULL,'2026-08-29 17:30:08','2026-08-29 17:30:08'),(61,'App\\Models\\User',137,'sysgov-web','58bcb098a739e51ad3a48556db31aa7b1009a874ff5cabffb0b863625f56806c','[\"api\"]','2026-08-29 17:33:32',NULL,'2026-08-29 17:33:28','2026-08-29 17:33:32'),(62,'App\\Models\\User',133,'sysgov-web','9c2404f2017b88499f989e2cdb73eb027b66cbdc70a5927dcd70264a7255e337','[\"api\"]','2026-08-29 22:21:36',NULL,'2026-08-29 17:35:47','2026-08-29 22:21:36'),(63,'App\\Models\\User',136,'sysgov-admin','80776793f23d50ee0a63f1472f04b0832f18b13b18a05b7f2e1981fcfc4b988b','[\"api\"]',NULL,NULL,'2026-08-29 17:42:24','2026-08-29 17:42:24'),(64,'App\\Models\\User',137,'sysgov-web','393a575ef9aa2a936b171f826955af18bb953f0159a9c3871df1b210c8a13ac4','[\"api\"]','2026-08-29 22:23:07',NULL,'2026-08-29 22:22:54','2026-08-29 22:23:07'),(65,'App\\Models\\User',133,'sysgov-web','38e11682cffdb12c666473b143ed80095af9a0b4491c41c05fbbd601fed8575a','[\"api\"]',NULL,NULL,'2026-08-29 22:24:49','2026-08-29 22:24:49'),(66,'App\\Models\\User',133,'sysgov-web','12cb16c5e6b17822f8c3a4d2fcae9e3be7bd204718f2e9e82e5dc5d5d40d107e','[\"api\"]','2026-08-29 22:25:13',NULL,'2026-08-29 22:25:03','2026-08-29 22:25:13'),(67,'App\\Models\\User',132,'sysgov-admin','99e72811dddec0904fcd59029275172dd68bcff31c523abab56ec52d6127edc0','[\"api\"]','2026-08-29 22:28:45',NULL,'2026-08-29 22:28:42','2026-08-29 22:28:45'),(68,'App\\Models\\User',133,'sysgov-web','453ce24ebfe913bf8eca60e691177fb2968c34d50e09ddfc0b853b19f68c868a','[\"api\"]','2026-08-29 23:05:23',NULL,'2026-08-29 22:52:09','2026-08-29 23:05:23');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `procurement_artefatos`
--

DROP TABLE IF EXISTS `procurement_artefatos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `procurement_artefatos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `licitacao_id` bigint unsigned NOT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rascunho',
  `conteudo` json DEFAULT NULL,
  `aprovado_por` bigint unsigned DEFAULT NULL,
  `aprovado_em` datetime DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `procurement_artefatos_licitacao_id_foreign` (`licitacao_id`),
  KEY `procurement_artefatos_aprovado_por_foreign` (`aprovado_por`),
  KEY `procurement_artefatos_created_by_foreign` (`created_by`),
  KEY `procurement_artefatos_tenant_id_licitacao_id_tipo_index` (`tenant_id`,`licitacao_id`,`tipo`),
  CONSTRAINT `procurement_artefatos_aprovado_por_foreign` FOREIGN KEY (`aprovado_por`) REFERENCES `users` (`id`),
  CONSTRAINT `procurement_artefatos_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `procurement_artefatos_licitacao_id_foreign` FOREIGN KEY (`licitacao_id`) REFERENCES `licitacoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `procurement_artefatos_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `procurement_artefatos`
--

LOCK TABLES `procurement_artefatos` WRITE;
/*!40000 ALTER TABLE `procurement_artefatos` DISABLE KEYS */;
/*!40000 ALTER TABLE `procurement_artefatos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reconciliations`
--

DROP TABLE IF EXISTS `reconciliations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reconciliations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `reference` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `reconciled_at` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reconciliations_tenant_id_reference_unique` (`tenant_id`,`reference`),
  CONSTRAINT `reconciliations_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reconciliations`
--

LOCK TABLES `reconciliations` WRITE;
/*!40000 ALTER TABLE `reconciliations` DISABLE KEYS */;
/*!40000 ALTER TABLE `reconciliations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `revenues`
--

DROP TABLE IF EXISTS `revenues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `revenues` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `occurred_at` date NOT NULL,
  `due_at` date DEFAULT NULL,
  `paid_at` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `contract_id` bigint unsigned DEFAULT NULL,
  `budget_unit_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `revenues_tenant_id_occurred_at_index` (`tenant_id`,`occurred_at`),
  KEY `revenues_contract_id_foreign` (`contract_id`),
  KEY `revenues_budget_unit_id_foreign` (`budget_unit_id`),
  KEY `revenues_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `revenues_budget_unit_id_foreign` FOREIGN KEY (`budget_unit_id`) REFERENCES `budget_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `revenues_contract_id_foreign` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `revenues_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `revenues`
--

LOCK TABLES `revenues` WRITE;
/*!40000 ALTER TABLE `revenues` DISABLE KEYS */;
/*!40000 ALTER TABLE `revenues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_has_permissions`
--

DROP TABLE IF EXISTS `role_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_has_permissions` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `role_has_permissions_permission_id_foreign` (`permission_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_has_permissions`
--

LOCK TABLES `role_has_permissions` WRITE;
/*!40000 ALTER TABLE `role_has_permissions` DISABLE KEYS */;
INSERT INTO `role_has_permissions` VALUES (903,2965),(904,2965),(905,2965),(906,2965),(907,2965),(903,2966),(904,2966),(906,2966),(907,2966),(903,2967),(904,2967),(906,2967),(907,2967),(903,2968),(906,2968),(907,2968),(903,2969),(904,2969),(905,2969),(906,2969),(907,2969),(903,2970),(904,2970),(906,2970),(907,2970),(903,2971),(904,2971),(906,2971),(907,2971),(903,2972),(904,2972),(906,2972),(907,2972),(903,2973),(906,2973),(907,2973),(903,2974),(904,2974),(905,2974),(906,2974),(907,2974),(903,2975),(906,2975),(907,2975),(903,2976),(906,2976),(907,2976),(903,2977),(906,2977),(907,2977),(903,2978),(904,2978),(906,2978),(907,2978),(903,2979),(906,2979),(907,2979),(903,2980),(904,2980),(906,2980),(907,2980),(903,2981),(904,2981),(905,2981),(906,2981),(907,2981),(918,2981),(903,2982),(904,2982),(906,2982),(907,2982),(903,2983),(905,2983),(906,2983),(907,2983),(908,2983),(914,2983),(918,2983),(903,2984),(906,2984),(907,2984),(903,2985),(906,2985),(907,2985),(918,2985),(903,2986),(906,2986),(907,2986),(903,2987),(904,2987),(905,2987),(906,2987),(907,2987),(918,2987),(903,2988),(906,2988),(907,2988),(903,2989),(904,2989),(905,2989),(906,2989),(907,2989),(918,2989),(903,2990),(906,2990),(907,2990),(903,2991),(904,2991),(905,2991),(906,2991),(907,2991),(918,2991),(903,2992),(904,2992),(905,2992),(906,2992),(907,2992),(918,2992),(903,2993),(904,2993),(905,2993),(906,2993),(907,2993),(908,2993),(909,2993),(910,2993),(911,2993),(912,2993),(913,2993),(914,2993),(915,2993),(916,2993),(917,2993),(918,2993),(903,2994),(904,2994),(906,2994),(907,2994),(908,2994),(916,2994),(903,2995),(904,2995),(906,2995),(907,2995),(912,2995),(916,2995),(917,2995),(903,2996),(904,2996),(906,2996),(907,2996),(908,2996),(914,2996),(916,2996),(903,2997),(906,2997),(907,2997),(916,2997),(903,2998),(906,2998),(907,2998),(916,2998),(903,2999),(904,2999),(905,2999),(906,2999),(907,2999),(908,2999),(913,2999),(914,2999),(915,2999),(918,2999),(903,3000),(906,3000),(907,3000),(908,3000),(914,3000),(903,3001),(906,3001),(907,3001),(908,3001),(914,3001),(903,3002),(906,3002),(907,3002),(903,3003),(906,3003),(907,3003),(915,3003),(903,3004),(906,3004),(907,3004),(915,3004),(903,3005),(904,3005),(905,3005),(906,3005),(907,3005),(908,3005),(909,3005),(910,3005),(911,3005),(913,3005),(916,3005),(918,3005),(903,3006),(906,3006),(907,3006),(908,3006),(909,3006),(910,3006),(916,3006),(903,3007),(906,3007),(907,3007),(909,3007),(916,3007),(903,3008),(904,3008),(905,3008),(906,3008),(907,3008),(908,3008),(909,3008),(910,3008),(911,3008),(912,3008),(913,3008),(914,3008),(915,3008),(916,3008),(917,3008),(918,3008),(903,3009),(906,3009),(907,3009),(908,3009),(909,3009),(910,3009),(911,3009),(912,3009),(916,3009),(917,3009),(903,3010),(906,3010),(907,3010),(903,3011),(906,3011),(907,3011),(903,3012),(906,3012),(907,3012),(903,3013),(906,3013),(907,3013),(903,3014),(906,3014),(907,3014),(903,3015),(906,3015),(907,3015),(903,3016),(906,3016),(907,3016),(903,3017),(906,3017),(907,3017),(903,3018),(906,3018),(907,3018),(903,3019),(906,3019),(907,3019),(903,3020),(906,3020),(907,3020),(903,3021),(906,3021),(907,3021);
/*!40000 ALTER TABLE `role_has_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_user`
--

DROP TABLE IF EXISTS `role_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_user` (
  `role_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`user_id`),
  KEY `role_user_user_id_foreign` (`user_id`),
  CONSTRAINT `role_user_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_user`
--

LOCK TABLES `role_user` WRITE;
/*!40000 ALTER TABLE `role_user` DISABLE KEYS */;
INSERT INTO `role_user` VALUES (903,132),(903,136),(906,137),(913,138);
/*!40000 ALTER TABLE `role_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web',
  `tenant_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_tenant_id_name_unique` (`tenant_id`,`name`),
  UNIQUE KEY `roles_tenant_id_slug_unique` (`tenant_id`,`slug`),
  CONSTRAINT `roles_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=921 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (903,'Super Admin','super_admin','systrat',1,'Acesso total à plataforma SYSTRAT','web',130,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(904,'Administrador Operacional','admin_ops','systrat',1,'Opera o SaaS (gestão de tenants, contratos, suporte)','web',130,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(905,'Suporte Técnico','suporte','systrat',1,'Acesso somente leitura (RN-USR-002)','web',130,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(906,'Analista de Suporte','support_analyst','systrat',1,'Acessa apenas os tenants liberados (carteira de clientes) — auditado','web',130,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(907,'Administrador do Tenant','admin_tenant','tenant',1,'Todas as permissões dentro do tenant','web',130,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(908,'Gestor','gestor','tenant',1,'Gestão administrativa do tenant','web',130,'2026-08-27 11:59:51','2026-08-27 11:59:51'),(909,'Pregoeiro','pregoeiro','tenant',1,'Conduz licitações na modalidade pregão','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(910,'Requisitante','requisitante','tenant',1,'Solicita compras e serviços','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(911,'Parecerista','parecerista','tenant',1,'Emite pareceres técnicos e jurídicos','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(912,'Fiscal','fiscal','tenant',1,'Fiscalização de contratos','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(913,'Membro','membro','tenant',1,'Acesso básico aos módulos ativos do tenant','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(914,'Ordenador de Despesa','ordenador_despesa','tenant',0,'Pode aprovar despesas e contratos','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(915,'Contador','contador','tenant',0,'Acesso a financeiro e contabilidade','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(916,'Agente de Contratação','agente_contratacao','tenant',0,'Gestão completa de contratos e licitações','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(917,'Fiscal de Contrato (legado)','fiscal_contrato','tenant',0,'Fiscalização de contratos','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(918,'Consulta','consulta','tenant',0,'Acesso somente leitura aos módulos ativos','web',130,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(920,'Role Teste','role-teste','systrat',0,NULL,'web',NULL,'2026-08-29 16:07:43','2026-08-29 16:07:43');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_contract_adjustments`
--

DROP TABLE IF EXISTS `saas_contract_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_contract_adjustments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `saas_contract_id` bigint unsigned NOT NULL,
  `adjusted_at` date NOT NULL,
  `previous_fee_cents` bigint NOT NULL,
  `new_fee_cents` bigint NOT NULL,
  `indexer` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `index_value` decimal(10,6) DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `saas_contract_adjustments_saas_contract_id_index` (`saas_contract_id`),
  KEY `saas_contract_adjustments_adjusted_at_index` (`adjusted_at`),
  CONSTRAINT `saas_contract_adjustments_saas_contract_id_foreign` FOREIGN KEY (`saas_contract_id`) REFERENCES `saas_contracts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_contract_adjustments`
--

LOCK TABLES `saas_contract_adjustments` WRITE;
/*!40000 ALTER TABLE `saas_contract_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_contract_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_contract_renewals`
--

DROP TABLE IF EXISTS `saas_contract_renewals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_contract_renewals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `saas_contract_id` bigint unsigned NOT NULL,
  `renewed_at` date NOT NULL,
  `previous_ends_at` date NOT NULL,
  `new_ends_at` date NOT NULL,
  `monthly_fee_cents` bigint NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `saas_contract_renewals_saas_contract_id_index` (`saas_contract_id`),
  KEY `saas_contract_renewals_renewed_at_index` (`renewed_at`),
  CONSTRAINT `saas_contract_renewals_saas_contract_id_foreign` FOREIGN KEY (`saas_contract_id`) REFERENCES `saas_contracts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_contract_renewals`
--

LOCK TABLES `saas_contract_renewals` WRITE;
/*!40000 ALTER TABLE `saas_contract_renewals` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_contract_renewals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_contracts`
--

DROP TABLE IF EXISTS `saas_contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_contracts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  `starts_at` date NOT NULL,
  `ends_at` date NOT NULL,
  `monthly_fee_cents` bigint NOT NULL,
  `setup_fee_cents` bigint NOT NULL DEFAULT '0',
  `renewal_rule` json DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `cancellation_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saas_contracts_tenant_id_number_unique` (`tenant_id`,`number`),
  KEY `saas_contracts_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `saas_contracts_ends_at_index` (`ends_at`),
  CONSTRAINT `saas_contracts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_contracts`
--

LOCK TABLES `saas_contracts` WRITE;
/*!40000 ALTER TABLE `saas_contracts` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_contracts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_invoices`
--

DROP TABLE IF EXISTS `saas_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `saas_contract_id` bigint unsigned NOT NULL,
  `number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_month` date NOT NULL,
  `amount_cents` bigint NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `issued_at` date NOT NULL,
  `due_at` date NOT NULL,
  `paid_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saas_invoices_tenant_id_number_unique` (`tenant_id`,`number`),
  KEY `saas_invoices_saas_contract_id_foreign` (`saas_contract_id`),
  KEY `saas_invoices_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `saas_invoices_due_at_index` (`due_at`),
  KEY `saas_invoices_reference_month_index` (`reference_month`),
  CONSTRAINT `saas_invoices_saas_contract_id_foreign` FOREIGN KEY (`saas_contract_id`) REFERENCES `saas_contracts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saas_invoices_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_invoices`
--

LOCK TABLES `saas_invoices` WRITE;
/*!40000 ALTER TABLE `saas_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `requester_id` bigint unsigned NOT NULL,
  `assigned_to` bigint unsigned DEFAULT NULL,
  `ticket_number` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('duvida','suporte_tecnico','integracao_siconfi','white_label','reclamacao','outro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'suporte_tecnico',
  `priority` enum('baixa','media','alta','critica') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'media',
  `status` enum('aberto','em_analise','aguardando_cliente','resolvido','fechado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aberto',
  `sla_due_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `support_tickets_tenant_id_ticket_number_unique` (`tenant_id`,`ticket_number`),
  KEY `support_tickets_requester_id_foreign` (`requester_id`),
  KEY `support_tickets_assigned_to_foreign` (`assigned_to`),
  KEY `support_tickets_tenant_id_status_priority_index` (`tenant_id`,`status`,`priority`),
  KEY `support_tickets_tenant_id_created_at_index` (`tenant_id`,`created_at`),
  CONSTRAINT `support_tickets_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `support_tickets_requester_id_foreign` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_tickets_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_analyst`
--

DROP TABLE IF EXISTS `tenant_analyst`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_analyst` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `tenant_id` bigint unsigned NOT NULL,
  `assigned_by` bigint unsigned DEFAULT NULL,
  `can_read` tinyint(1) NOT NULL DEFAULT '1',
  `can_write` tinyint(1) NOT NULL DEFAULT '0',
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_analyst_user_id_tenant_id_unique` (`user_id`,`tenant_id`),
  KEY `tenant_analyst_assigned_by_foreign` (`assigned_by`),
  KEY `tenant_analyst_tenant_id_user_id_index` (`tenant_id`,`user_id`),
  CONSTRAINT `tenant_analyst_assigned_by_foreign` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tenant_analyst_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenant_analyst_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_analyst`
--

LOCK TABLES `tenant_analyst` WRITE;
/*!40000 ALTER TABLE `tenant_analyst` DISABLE KEYS */;
INSERT INTO `tenant_analyst` VALUES (6,137,131,132,1,0,NULL,'2026-08-29 15:15:24','2026-08-29 15:15:24');
/*!40000 ALTER TABLE `tenant_analyst` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_module`
--

DROP TABLE IF EXISTS `tenant_module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_module` (
  `tenant_id` bigint unsigned NOT NULL,
  `module_id` bigint unsigned NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `settings` json DEFAULT NULL,
  `monthly_fee_cents` bigint unsigned NOT NULL DEFAULT '0',
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`tenant_id`,`module_id`),
  KEY `tenant_module_module_id_foreign` (`module_id`),
  CONSTRAINT `tenant_module_module_id_foreign` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenant_module_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_module`
--

LOCK TABLES `tenant_module` WRITE;
/*!40000 ALTER TABLE `tenant_module` DISABLE KEYS */;
INSERT INTO `tenant_module` VALUES (131,74,1,'[]',0,NULL),(131,75,1,'[]',0,NULL),(131,76,1,'[]',0,NULL),(131,77,1,'[]',0,NULL),(131,78,1,'[]',0,NULL),(131,79,1,'[]',0,NULL),(131,80,1,'[]',0,NULL),(131,81,1,'[]',0,NULL),(131,82,1,'[]',0,NULL);
/*!40000 ALTER TABLE `tenant_module` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_user`
--

DROP TABLE IF EXISTS `tenant_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_user` (
  `tenant_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`tenant_id`,`user_id`),
  UNIQUE KEY `tenant_user_tenant_id_user_id_unique` (`tenant_id`,`user_id`),
  KEY `tenant_user_user_id_foreign` (`user_id`),
  KEY `tenant_user_role_id_foreign` (`role_id`),
  CONSTRAINT `tenant_user_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tenant_user_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenant_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_user`
--

LOCK TABLES `tenant_user` WRITE;
/*!40000 ALTER TABLE `tenant_user` DISABLE KEYS */;
INSERT INTO `tenant_user` VALUES (130,132,903,'active',1),(131,133,907,'active',1),(131,134,908,'active',1),(131,135,912,'active',1),(131,138,913,'active',0);
/*!40000 ALTER TABLE `tenant_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cnpj` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `domain` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('prefeitura','parceiro','interno') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','suspended','trial') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'trial',
  `plan` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'professional',
  `max_users` int unsigned NOT NULL DEFAULT '50',
  `storage_limit_mb` int unsigned NOT NULL DEFAULT '10240',
  `monthly_fee_cents` bigint unsigned NOT NULL DEFAULT '0',
  `setup_fee_cents` bigint unsigned NOT NULL DEFAULT '0',
  `custom_domain_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `custom_domain_fee_cents` bigint unsigned NOT NULL DEFAULT '0',
  `city` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uf` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cnae` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `settings` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenants_slug_unique` (`slug`),
  UNIQUE KEY `tenants_cnpj_unique` (`cnpj`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES (130,'SYSTRAT (Sistema)','systrat','00000000000000',NULL,'interno','active','professional',50,10240,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-27 11:59:50','2026-08-27 11:59:50'),(131,'MUNICIPIO DE ARAUCARIA','araucaria-pr','76216686000110',NULL,'prefeitura','active','enterprise',50,5120,0,0,0,0,'Araucária','PR',NULL,NULL,NULL,'{\"title\": \"Portal de Gestão\", \"subtitle\": \"Prefeitura de Araucária\", \"customLogoUrl\": \"\", \"customPrimaryColor\": \"#1351b4\", \"hideProviderBranding\": false}','2026-08-27 12:00:48','2026-08-29 15:19:40');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_messages`
--

DROP TABLE IF EXISTS `ticket_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `ticket_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_internal_note` tinyint(1) NOT NULL DEFAULT '0',
  `attachments` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ticket_messages_ticket_id_foreign` (`ticket_id`),
  KEY `ticket_messages_user_id_foreign` (`user_id`),
  KEY `ticket_messages_tenant_id_ticket_id_created_at_index` (`tenant_id`,`ticket_id`,`created_at`),
  CONSTRAINT `ticket_messages_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_messages_ticket_id_foreign` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_messages`
--

LOCK TABLES `ticket_messages` WRITE;
/*!40000 ALTER TABLE `ticket_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transfers`
--

DROP TABLE IF EXISTS `transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_cents` bigint unsigned NOT NULL,
  `occurred_at` date NOT NULL,
  `due_at` date DEFAULT NULL,
  `paid_at` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `contract_id` bigint unsigned DEFAULT NULL,
  `budget_unit_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `transfers_tenant_id_occurred_at_index` (`tenant_id`,`occurred_at`),
  KEY `transfers_contract_id_foreign` (`contract_id`),
  KEY `transfers_budget_unit_id_foreign` (`budget_unit_id`),
  KEY `transfers_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `transfers_budget_unit_id_foreign` FOREIGN KEY (`budget_unit_id`) REFERENCES `budget_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transfers_contract_id_foreign` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transfers_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transfers`
--

LOCK TABLES `transfers` WRITE;
/*!40000 ALTER TABLE `transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_invitations`
--

DROP TABLE IF EXISTS `user_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_invitations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invited_by` bigint unsigned NOT NULL,
  `expires_at` timestamp NOT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_invitations_token_unique` (`token`),
  KEY `user_invitations_invited_by_foreign` (`invited_by`),
  KEY `user_invitations_tenant_id_email_index` (`tenant_id`,`email`),
  KEY `user_invitations_token_index` (`token`),
  CONSTRAINT `user_invitations_invited_by_foreign` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`),
  CONSTRAINT `user_invitations_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_invitations`
--

LOCK TABLES `user_invitations` WRITE;
/*!40000 ALTER TABLE `user_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_module_access`
--

DROP TABLE IF EXISTS `user_module_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_module_access` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `tenant_id` bigint unsigned NOT NULL,
  `module_alias` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `org_unit_ids` json DEFAULT NULL,
  `can_manage_users` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_module_access_user_id_tenant_id_module_alias_unique` (`user_id`,`tenant_id`,`module_alias`),
  KEY `user_module_access_tenant_id_module_alias_index` (`tenant_id`,`module_alias`),
  CONSTRAINT `user_module_access_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_module_access_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_module_access`
--

LOCK TABLES `user_module_access` WRITE;
/*!40000 ALTER TABLE `user_module_access` DISABLE KEYS */;
INSERT INTO `user_module_access` VALUES (9,134,131,'dashboard','member','[32]',0,'2026-08-29 15:08:39','2026-08-29 15:08:39');
/*!40000 ALTER TABLE `user_module_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_systrat` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mfa_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mfa_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `mfa_confirmed_at` timestamp NULL DEFAULT NULL,
  `is_platform_admin` tinyint(1) NOT NULL DEFAULT '0',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_token` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_api_token_index` (`api_token`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (132,'Administrador SYSGOV','admin@sysgov.local',NULL,1,1,NULL,'$2y$12$0RARLCdVjwyou1LI3VAbkeRRxu1FYIR6wydiIYUh6zF4PsEo97Dwy',NULL,0,NULL,1,NULL,NULL,'2026-08-27 11:59:52','2026-08-27 11:59:52'),(133,'Administrador da Prefeitura de Araucária','admin@araucaria.pr.gov.br',NULL,0,1,NULL,'$2y$12$Oml0417sN6Or3TfO9kKk6.owE1P4xksUJK1RIVmZwoyoNKnNqHHm6',NULL,0,NULL,0,NULL,NULL,'2026-08-27 12:00:48','2026-08-29 16:17:16'),(134,'Usuário Teste','teste@araucaria.com',NULL,0,1,NULL,'$2y$12$FPg5eKGaoYL1UVTSPMB4Y.5NPL1kvrKIC4gsJCBXiElXlZmVdMP.q',NULL,0,NULL,0,NULL,NULL,'2026-08-27 12:00:49','2026-08-27 12:00:49'),(135,'Fiscal de Obras','fiscal.obras@araucaria.pr.gov.br',NULL,0,1,NULL,'$2y$12$9wZkvtbgxatV77.Po5I6xOzWpogObLvjnKo.gfpCf.L0iuHAUqBva',NULL,0,NULL,0,NULL,NULL,'2026-08-27 12:00:49','2026-08-27 12:00:49'),(136,'Carlos Fernando Gomes','cfgfernando@gmail.com',NULL,1,1,NULL,'$2y$12$g9HIvbHMY8HSaVyC7EqK9ePQ8jnKBZMDR1Xwtb0LhLrP9fgtwhSM.',NULL,0,NULL,0,NULL,NULL,'2026-08-29 14:47:14','2026-08-29 16:51:38'),(137,'Analista_01','analista01@teste.com',NULL,1,1,NULL,'$2y$12$SYhaUoFwjOf5jGERqINagudh5kmpWCpt9gN/3CvfjzVQ07HjRtCHG',NULL,0,NULL,0,NULL,NULL,'2026-08-29 15:14:50','2026-08-29 22:22:27'),(138,'Teste Analista','teste.analista@teste.gov',NULL,0,1,NULL,'$2y$12$W0s03zLeVY51nn0YTQC9eeBPmX0ivm4gjBDs4vkc/7v393GPYrpiq',NULL,0,NULL,0,NULL,NULL,'2026-08-29 17:18:08','2026-08-29 17:18:08');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'saas_sysgov'
--

--
-- Dumping routines for database 'saas_sysgov'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-29 20:06:49
