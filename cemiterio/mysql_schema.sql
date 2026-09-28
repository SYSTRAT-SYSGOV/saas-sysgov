-- =====================================================================
-- SCRIPT DE CRIAÇÃO DE TABELAS E IMPORTAÇÃO - MYSQL 8.0+
-- Sistema de Gestão de Cemitérios - Dados migrados de Clipper/DBF
-- =====================================================================

-- 1. CRIAR BANCO
-- =====================================================================
CREATE DATABASE IF NOT EXISTS `cemiterios_migracao`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `cemiterios_migracao`;

-- 2. TABELAS DE REFERÊNCIA
-- =====================================================================

-- Cemitérios
CREATE TABLE `cemiterio` (
    `id` SMALLINT PRIMARY KEY,
    `codigo_legado` CHAR(2) NOT NULL UNIQUE,
    `nome` VARCHAR(100) NOT NULL,
    `ativo` BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

INSERT INTO `cemiterio` (`id`, `codigo_legado`, `nome`) VALUES
(1, '01', 'Cemitério Central'),
(2, '02', 'Cemitério Independência / Boqueirão');

-- Quadras
CREATE TABLE `quadra` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `cemiterio_id` SMALLINT NOT NULL,
    `codigo` VARCHAR(6) NOT NULL,
    `descricao` VARCHAR(200),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_quadra_cem_cod` (`cemiterio_id`, `codigo`),
    FOREIGN KEY (`cemiterio_id`) REFERENCES `cemiterio`(`id`)
) ENGINE=InnoDB;

-- Tipos de Lote
CREATE TABLE `tipo_lote` (
    `codigo` CHAR(1) PRIMARY KEY,
    `descricao` VARCHAR(50) NOT NULL,
    `perpetuo` BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB;

INSERT INTO `tipo_lote` (`codigo`, `descricao`, `perpetuo`) VALUES
('1', 'Comum (terra) - Concessão Temporária', FALSE),
('3', 'Gaveta/Perpétuo (concreto) - Perpetuidade', TRUE);

-- 3. LOTES
-- =====================================================================
CREATE TABLE `lote` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `quadra_id` INT NOT NULL,
    `codigo` VARCHAR(6) NOT NULL,
    `tipo_codigo` CHAR(1) NOT NULL,
    `gavetas` SMALLINT DEFAULT 1,
    `processo` VARCHAR(30),
    `validade` DATE,
    `legado_cemiterio` CHAR(2),
    `legado_quadra` VARCHAR(6),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_lote_quadra_cod` (`quadra_id`, `codigo`),
    FOREIGN KEY (`quadra_id`) REFERENCES `quadra`(`id`),
    FOREIGN KEY (`tipo_codigo`) REFERENCES `tipo_lote`(`codigo`)
) ENGINE=InnoDB;

CREATE INDEX `idx_lote_quadra` ON `lote`(`quadra_id`);
CREATE INDEX `idx_lote_validade` ON `lote`(`validade`);
CREATE INDEX `idx_lote_tipo` ON `lote`(`tipo_codigo`);

-- 4. FUNCIONÁRIOS
-- =====================================================================
CREATE TABLE `funcionario` (
    `id` SMALLINT PRIMARY KEY,
    `nome` VARCHAR(150) NOT NULL,
    `rg` VARCHAR(30),
    `ativo` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. PEDREIROS
-- =====================================================================
CREATE TABLE `pedreiro` (
    `id` SMALLINT PRIMARY KEY,
    `nome` VARCHAR(150) NOT NULL,
    `rg` VARCHAR(30),
    `ativo` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. FALECIDOS
-- =====================================================================
CREATE TABLE `falecido` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `lote_id` BIGINT NOT NULL,
    `item_ordem` SMALLINT NOT NULL,
    `nome` VARCHAR(200) NOT NULL,
    `dt_nascimento` DATE,
    `dt_falecimento` DATE NOT NULL,
    `certidao_numero` VARCHAR(30),
    `dt_emissao_certidao` DATE,
    `cartorio` VARCHAR(200),
    `medico` VARCHAR(200),
    `causa_mortis` VARCHAR(500),
    `coveiro_id` SMALLINT,
    `pedreiro_id` SMALLINT,
    `excluido` BOOLEAN DEFAULT FALSE,
    `legado_cemiterio` CHAR(2),
    `legado_quadra` VARCHAR(6),
    `legado_lote` VARCHAR(6),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_falecido_lote_item` (`lote_id`, `item_ordem`),
    FOREIGN KEY (`lote_id`) REFERENCES `lote`(`id`),
    FOREIGN KEY (`coveiro_id`) REFERENCES `funcionario`(`id`),
    FOREIGN KEY (`pedreiro_id`) REFERENCES `pedreiro`(`id`)
) ENGINE=InnoDB;

CREATE INDEX `idx_falecido_lote` ON `falecido`(`lote_id`);
CREATE INDEX `idx_falecido_nome` ON `falecido`(`nome`);
CREATE INDEX `idx_falecido_dt_falecimento` ON `falecido`(`dt_falecimento`);
CREATE INDEX `idx_falecido_certidao` ON `falecido`(`certidao_numero`);

-- 7. RESPONSÁVEIS
-- =====================================================================
CREATE TABLE `responsavel` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `lote_id` BIGINT NOT NULL,
    `item_ordem` SMALLINT NOT NULL,
    `nome` VARCHAR(200) NOT NULL,
    `rg` VARCHAR(30),
    `cpf_cnpj` VARCHAR(18),
    `endereco` VARCHAR(200),
    `numero` VARCHAR(20),
    `complemento` VARCHAR(100),
    `cep` VARCHAR(10),
    `cidade` VARCHAR(100),
    `uf` CHAR(2),
    `telefone` VARCHAR(20),
    `celular` VARCHAR(20),
    `email` VARCHAR(150),
    `falecido_flag` BOOLEAN DEFAULT FALSE,
    `excluido` BOOLEAN DEFAULT FALSE,
    `legado_cemiterio` CHAR(2),
    `legado_quadra` VARCHAR(6),
    `legado_lote` VARCHAR(6),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`lote_id`) REFERENCES `lote`(`id`)
) ENGINE=InnoDB;

CREATE INDEX `idx_responsavel_lote` ON `responsavel`(`lote_id`);
CREATE INDEX `idx_responsavel_nome` ON `responsavel`(`nome`);
CREATE INDEX `idx_responsavel_cpf` ON `responsavel`(`cpf_cnpj`);

-- 8. SEGURANÇA
-- =====================================================================
CREATE TABLE `usuario_grupo` (
    `codigo` CHAR(4) PRIMARY KEY,
    `nome` VARCHAR(100) NOT NULL,
    `descricao` TEXT,
    `ativo` BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE `usuario` (
    `grupo_codigo` CHAR(4) NOT NULL,
    `codigo` CHAR(4) PRIMARY KEY,
    `nome` VARCHAR(150) NOT NULL,
    `nivel` CHAR(1),
    `observacao` VARCHAR(200),
    `senha_hash` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150),
    `ativo` BOOLEAN DEFAULT TRUE,
    `ultimo_login` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`grupo_codigo`) REFERENCES `usuario_grupo`(`codigo`)
) ENGINE=InnoDB;

CREATE TABLE `permissao` (
    `grupo_codigo` CHAR(4) NOT NULL,
    `tabela` VARCHAR(100) NOT NULL,
    `pode_incluir` BOOLEAN DEFAULT FALSE,
    `pode_alterar` BOOLEAN DEFAULT FALSE,
    `pode_excluir` BOOLEAN DEFAULT FALSE,
    `pode_consultar` BOOLEAN DEFAULT FALSE,
    `pode_relatorio` BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (`grupo_codigo`, `tabela`),
    FOREIGN KEY (`grupo_codigo`) REFERENCES `usuario_grupo`(`codigo`)
) ENGINE=InnoDB;

-- 9. LOG DE ERROS
-- =====================================================================
CREATE TABLE `log_erro` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `codigo_erro` VARCHAR(20),
    `tipo_mensagem` CHAR(1),
    `mensagem` TEXT NOT NULL,
    `ocorrido_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `usuario_codigo` CHAR(4),
    `modulo` VARCHAR(100)
) ENGINE=InnoDB;

CREATE INDEX `idx_log_erro_data` ON `log_erro`(`ocorrido_em`);

-- 10. TABELAS ESPECÍFICAS INDEPENDÊNCIA
-- =====================================================================
CREATE TABLE `lote_oba` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `cemiterio_legado` VARCHAR(10),
    `quadra_legado` VARCHAR(10),
    `lote_legado` VARCHAR(6),
    `lote_id` BIGINT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`lote_id`) REFERENCES `lote`(`id`)
) ENGINE=InnoDB;

CREATE INDEX `idx_oba_legado` ON `lote_oba`(`cemiterio_legado`, `quadra_legado`, `lote_legado`);

CREATE TABLE `lote_historico_validade` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `cemiterio_legado` VARCHAR(10),
    `quadra_legado` VARCHAR(10),
    `lote_legado` VARCHAR(6),
    `tipo` VARCHAR(10),
    `gavetas` SMALLINT,
    `processo` VARCHAR(30),
    `validade` DATE,
    `lote_id` BIGINT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`lote_id`) REFERENCES `lote`(`id`)
) ENGINE=InnoDB;

-- =====================================================================
-- COMANDOS LOAD DATA INFILE (MySQL)
-- =====================================================================
-- Pré-requisito: secure_file_priv = '' ou arquivo na pasta permitida
-- Coloque os CSVs em /var/lib/mysql-files/ ou configure secure_file_priv

-- Exemplo para LOTES Central:
-- LOAD DATA INFILE '/var/lib/mysql-files/Cemiterio Central/LOTES.csv'
-- INTO TABLE `lote`
-- CHARACTER SET utf8mb4
-- FIELDS TERMINATED BY ',' ENCLOSED BY '"'
-- LINES TERMINATED BY '\n'
-- IGNORE 1 LINES
-- (@cemiterio, @quadra, @lote, @tipo, @gavetas, @processo, @validade)
-- SET
--   `quadra_id` = (SELECT `id` FROM `quadra` WHERE `cemiterio_id`=1 AND `codigo`=@quadra),
--   `codigo` = @lote,
--   `tipo_codigo` = @tipo,
--   `gavetas` = NULLIF(@gavetas,''),
--   `processo` = NULLIF(@processo,''),
--   `validade` = NULLIF(@validade,''),
--   `legado_cemiterio` = @cemiterio,
--   `legado_quadra` = @quadra;

-- IMPORTANTE: Para importação completa com FKs, use o script Python import_csv_to_mysql.py
-- O LOAD DATA INFILE não resolve lookups de FK automaticamente.