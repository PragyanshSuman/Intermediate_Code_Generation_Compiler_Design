-- ============================================================
--  Compiler Design — Intermediate Code Generation
--  Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS compiler_icg
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE compiler_icg;

-- ─── Sessions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          INT          NOT NULL AUTO_INCREMENT,
  expression  TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ─── Three Address Code ───────────────────────────────────
CREATE TABLE IF NOT EXISTS three_address_code (
  id          INT          NOT NULL AUTO_INCREMENT,
  session_id  INT          NOT NULL,
  step        INT          NOT NULL,
  result      VARCHAR(50)  NOT NULL,
  op1         VARCHAR(50)  NOT NULL,
  operator    VARCHAR(10)  NOT NULL,
  op2         VARCHAR(50)  DEFAULT NULL,
  tac_string  VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_tac_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Quadruples ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quadruples (
  id          INT          NOT NULL AUTO_INCREMENT,
  session_id  INT          NOT NULL,
  step        INT          NOT NULL,
  operator    VARCHAR(10)  NOT NULL,
  arg1        VARCHAR(50)  NOT NULL,
  arg2        VARCHAR(50)  DEFAULT '-',
  result      VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_quad_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Triples ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS triples (
  id          INT          NOT NULL AUTO_INCREMENT,
  session_id  INT          NOT NULL,
  step        INT          NOT NULL,
  operator    VARCHAR(10)  NOT NULL,
  arg1        VARCHAR(50)  NOT NULL,
  arg2        VARCHAR(50)  DEFAULT '-',
  PRIMARY KEY (id),
  CONSTRAINT fk_triple_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Indirect Triples ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS indirect_triples (
  id            INT NOT NULL AUTO_INCREMENT,
  session_id    INT NOT NULL,
  pointer_index INT NOT NULL,
  triple_index  INT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_ind_triple_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Tokens ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id          INT          NOT NULL AUTO_INCREMENT,
  session_id  INT          NOT NULL,
  token_index INT          NOT NULL,
  type        VARCHAR(50)  NOT NULL,
  value       VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_token_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Optimized TAC ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS optimized_tac (
  id          INT          NOT NULL AUTO_INCREMENT,
  session_id  INT          NOT NULL,
  step        INT          NOT NULL,
  result      VARCHAR(50)  NOT NULL,
  op1         VARCHAR(50)  NOT NULL,
  operator    VARCHAR(10)  NOT NULL,
  op2         VARCHAR(50)  DEFAULT NULL,
  tac_string  VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_opt_tac_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Assembly Code ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assembly_code (
  id          INT          NOT NULL AUTO_INCREMENT,
  session_id  INT          NOT NULL,
  line_index  INT          NOT NULL,
  instruction VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_assembly_session
    FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
