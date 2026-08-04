-- ============================================================
-- BANCO DE DADOS RELACIONAL - SISTEMA DE GESTÃO SOLIDÁRIA (DORCAS)
-- Suporte a Cestas Básicas, Cestas de Higiene e Itens Avulsos
-- ============================================================

DROP TABLE IF EXISTS Atendimento_Recibo;
DROP TABLE IF EXISTS Estoque_Doacao;
DROP TABLE IF EXISTS Voluntario;
DROP TABLE IF EXISTS Familia;

-- 1. Tabela de Famílias Assistidas (LGPD & Proteção de Dados Sensíveis)
CREATE TABLE Familia (
    id_familia SERIAL PRIMARY KEY,
    nome_responsavel VARCHAR(120) NOT NULL,
    doc_identificacao VARCHAR(20) NOT NULL UNIQUE,
    endereco VARCHAR(200) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    necessita_cesta BOOLEAN DEFAULT TRUE,
    observacoes_vulnerabilidade TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Voluntários / Operadores
CREATE TABLE Voluntario (
    id_voluntario SERIAL PRIMARY KEY,
    nome_voluntario VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    cargo VARCHAR(50) DEFAULT 'Voluntário',
    ativo BOOLEAN DEFAULT TRUE
);

-- 3. Tabela de Estoque de Itens Individuais (Alimento, Higiene e Roupa)
CREATE TABLE Estoque_Doacao (
    codigo_item SERIAL PRIMARY KEY,
    tipo_categoria VARCHAR(20) NOT NULL CHECK (tipo_categoria IN ('Alimento', 'Higiene', 'Roupa')),
    descricao_produto VARCHAR(120) NOT NULL,
    quantidade_disponivel INT NOT NULL CHECK (quantidade_disponivel >= 0),
    data_validade DATE NULL,             -- Preenchido para Alimentos
    tamanho_vestuario VARCHAR(10) NULL,  -- Preenchido para Roupas (P, M, G, GG, Infantil)
    genero_vestuario VARCHAR(20) NULL    -- Masculino, Feminino, Infantil, Unissex
);

-- 4. Tabela de Atendimentos e Emissão de Recibos (Cestas ou Itens Avulsos)
CREATE TABLE Atendimento_Recibo (
    id_atendimento SERIAL PRIMARY KEY,
    id_familia INT NOT NULL REFERENCES Familia(id_familia) ON DELETE RESTRICT,
    id_voluntario INT NOT NULL REFERENCES Voluntario(id_voluntario) ON DELETE RESTRICT,
    
    -- Tipo do atendimento: 'CESTA_BASICA', 'CESTA_HIGIENE' ou 'AVULSO'
    tipo_entrega VARCHAR(30) NOT NULL CHECK (tipo_entrega IN ('CESTA_BASICA', 'CESTA_HIGIENE', 'AVULSO')),
    
    -- Opcional (preenchido apenas se a entrega for de item 'AVULSO')
    codigo_item INT NULL REFERENCES Estoque_Doacao(codigo_item) ON DELETE RESTRICT,
    
    quantidade_entregue INT NOT NULL CHECK (quantidade_entregue > 0),
    data_atendimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT
);

-- Índices de Otimização
CREATE INDEX idx_familia_nome ON Familia(nome_responsavel);
CREATE INDEX idx_estoque_categoria ON Estoque_Doacao(tipo_categoria);
CREATE INDEX idx_estoque_validade ON Estoque_Doacao(data_validade);
CREATE INDEX idx_atendimento_tipo ON Atendimento_Recibo(tipo_entrega);

-- ============================================================
-- DADOS DE TESTE (SEED DATA) - SISTEMA DORCAS
-- ============================================================

-- 1. Inserir Famílias Assistidas
INSERT INTO Familia (nome_responsavel, doc_identificacao, endereco, telefone, necessita_cesta, observacoes_vulnerabilidade) VALUES
('Daniela Weder Morinigo', '2.581.604', 'Rua 14 de Julho, 5141', '(67) 99893-0679', TRUE, 'Família monoparental com 3 filhos pequenos.'),
('Gislaine Aparecida Cordeiro', '3.124.890', 'Av. Afonso Pena, 1200', '(67) 99123-4567', TRUE, 'Responsável desempregada.'),
('Carlos Eduardo Santos', '4.891.203', 'Rua Bahia, 850', '(67) 98111-2233', TRUE, 'Gestante na família.'),
('Maria da Silva Oliveira', '1.954.321', 'Rua Ceará, 302', '(67) 99988-7766', FALSE, 'Atendida esporadicamente com roupas.');

-- 2. Inserir Voluntários / Operadores do Sistema
INSERT INTO Voluntario (nome_voluntario, email, senha_hash, cargo, ativo) VALUES
('Jair Batista Gomes', 'jair.ti@msgas.com.br', '$2a$12$eImiTXuWVxfM37uY4JANjOL.88T1pP12345678901234567890123', 'Administrador', TRUE),
('Karina Gomes', 'karina.voluntaria@dorcas.org', '$2a$12$eImiTXuWVxfM37uY4JANjOL.88T1pP12345678901234567890123', 'Voluntário', TRUE);

-- 3. Inserir Itens no Estoque (Alimentos, Higiene Pessoal e Vestuário)

-- 3.1 Alimentos (Suficientes para compor Cestas Básicas)
INSERT INTO Estoque_Doacao (tipo_categoria, descricao_produto, quantidade_disponivel, data_validade) VALUES
('Alimento', 'Arroz 5kg', 10, '2026-11-20'),
('Alimento', 'Feijão 1kg', 20, '2026-09-15'),
('Alimento', 'Açúcar 2kg', 10, '2026-12-01'),
('Alimento', 'Óleo de Soja', 20, '2026-10-10'),
('Alimento', 'Flocão', 10, '2026-08-30'),
('Alimento', 'Farofa', 10, '2026-09-01'),
('Alimento', 'Fubá', 10, '2026-08-15'),
('Alimento', 'Trigo', 20, '2026-11-01'),
('Alimento', 'Macarrão Spaguetti', 10, '2027-01-01'),
('Alimento', 'Macarrão Parafuso', 10, '2027-01-01'),
('Alimento', 'Molho de Tomate', 20, '2026-12-30'),
('Alimento', 'Bolacha Salgada', 10, '2026-09-10'),
('Alimento', 'Bolacha Doce', 10, '2026-09-10'),
('Alimento', 'Milho Pipoca', 10, '2026-10-20');

-- 3.2 Higiene Pessoal (Suficientes para compor Cestas de Higiene)
INSERT INTO Estoque_Doacao (tipo_categoria, descricao_produto, quantidade_disponivel) VALUES
('Higiene', 'Sabão em Barra', 15),
('Higiene', 'Sabonete', 30),
('Higiene', 'Creme Dental', 15),
('Higiene', 'Papel Higiênico', 15);

-- 3.3 Roupas / Vestuário
INSERT INTO Estoque_Doacao (tipo_categoria, descricao_produto, quantidade_disponivel, tamanho_vestuario, genero_vestuario) VALUES
('Roupa', 'Agasalho de Frio', 12, 'G', 'Masculino'),
('Roupa', 'Calça Jeans Infantil', 8, 'Infantil', 'Infantil'),
('Roupa', 'Camiseta Feminina', 15, 'M', 'Feminino');

-- 4. Inserir Histórico de Atendimentos / Recibos
INSERT INTO Atendimento_Recibo (id_familia, id_voluntario, tipo_entrega, codigo_item, quantidade_entregue, observacoes) VALUES
(1, 1, 'CESTA_BASICA', NULL, 1, 'Entrega de Cesta Básica Completa referente ao mês de Julho.'),
(2, 2, 'CESTA_HIGIENE', NULL, 1, 'Entrega de Cesta de Higiene Completa.'),
(4, 1, 'AVULSO', 21, 2, 'Entrega de 2 camisetas femininas avulsas.');