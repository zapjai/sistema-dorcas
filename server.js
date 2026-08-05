const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'dorcas_chave_secreta_ufms_digital';
const DATA_FILE = path.join(__dirname, 'dados.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Nodemailer com autenticação SMTP do Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || 'zapjai@gmail.com',
        pass: process.env.SMTP_PASS || 'iurt girk ccsx hryr'
    }
});

function geradorSenhaAleatoria() {
    return Math.random().toString(36).slice(-8);
}

// ============================================================
// CLASSES DE MODELOS EMBUTIDAS
// ============================================================

class Familia {
    constructor(id, nome, documento, endereco, telefone, necessitaCesta = true) {
        this.id = id;
        this.nome = nome;
        this.documento = documento;
        this.endereco = endereco;
        this.telefone = telefone;
        this.necessitaCesta = necessitaCesta;
    }

    getId() { return this.id; }
    getNomeResponsavel() { return this.nome; }

    getPerfilPublico() {
        const docMascarado = this.documento ? `***.${this.documento.slice(-6)}` : '***';
        return {
            id: this.id,
            nome: this.nome,
            documentoMascarado: docMascarado,
            telefone: this.telefone,
            necessitaCesta: this.necessitaCesta
        };
    }

    getDadosCompletosAutenticados() {
        return {
            id: this.id,
            nome: this.nome,
            documento: this.documento,
            endereco: this.endereco,
            telefone: this.telefone,
            necessitaCesta: this.necessitaCesta
        };
    }
}

class ItemEstoque {
    constructor(codigo, descricao, quantidadeEstoque, categoria) {
        this.codigo = codigo;
        this.descricao = descricao;
        this.quantidadeEstoque = quantidadeEstoque;
        this.categoria = categoria;
    }

    darBaixa(qtd) {
        if (qtd > this.quantidadeEstoque) {
            throw new Error(`Estoque insuficiente para ${this.descricao}. Disponível: ${this.quantidadeEstoque}`);
        }
        this.quantidadeEstoque -= qtd;
    }

    getResumoItem() {
        return `#${this.codigo} - ${this.descricao} (${this.quantidadeEstoque} UN)`;
    }
}

class Alimento extends ItemEstoque {
    constructor(codigo, descricao, quantidadeEstoque, dataValidade) {
        super(codigo, descricao, quantidadeEstoque, 'Alimento');
        this.dataValidade = dataValidade ? new Date(dataValidade) : null;
    }

    estaVencido() {
        if (!this.dataValidade) return false;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return this.dataValidade < hoje;
    }

    static calcularCestasBasicasDisponiveis(estoque) {
        const compAlimentos = {
            'Arroz 5kg': 1, 'Feijão 1kg': 2, 'Açúcar 2kg': 1, 'Óleo de Soja': 2,
            'Flocão': 1, 'Farofa': 1, 'Fubá': 1, 'Trigo': 2,
            'Macarrão Spaguetti': 1, 'Macarrão Parafuso': 1, 'Molho de Tomate': 2,
            'Bolacha Salgada': 1, 'Bolacha Doce': 1, 'Milho Pipoca': 1
        };

        const norm = (txt) => txt ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
        const alimentosValidos = estoque.filter(i => i.categoria === 'Alimento' && !i.estaVencido());

        let minCestas = Infinity;
        for (const [itemNome, qtdNecessaria] of Object.entries(compAlimentos)) {
            const palavraChave = norm(itemNome.split(' ')[0]);
            const qtdTotal = alimentosValidos
                .filter(i => norm(i.descricao).includes(palavraChave))
                .reduce((soma, i) => soma + i.quantidadeEstoque, 0);

            const cestas = Math.floor(qtdTotal / qtdNecessaria);
            if (cestas < minCestas) minCestas = cestas;
        }
        return minCestas === Infinity ? 0 : minCestas;
    }

    static darBaixaCestaBasica(estoque, qtdCestas = 1) {
        const compAlimentos = {
            'Arroz 5kg': 1, 'Feijão 1kg': 2, 'Açúcar 2kg': 1, 'Óleo de Soja': 2,
            'Flocão': 1, 'Farofa': 1, 'Fubá': 1, 'Trigo': 2,
            'Macarrão Spaguetti': 1, 'Macarrão Parafuso': 1, 'Molho de Tomate': 2,
            'Bolacha Salgada': 1, 'Bolacha Doce': 1, 'Milho Pipoca': 1
        };

        const norm = (txt) => txt ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';

        for (const [itemNome, qtdPorCesta] of Object.entries(compAlimentos)) {
            let qtdNecessariaTotal = qtdPorCesta * qtdCestas;
            const palavraChave = norm(itemNome.split(' ')[0]);

            const lotesDisponiveis = estoque
                .filter(i => norm(i.categoria) === 'alimento' && norm(i.descricao).includes(palavraChave) && i.quantidadeEstoque > 0)
                .sort((a, b) => new Date(a.dataValidade) - new Date(b.dataValidade));

            for (const lote of lotesDisponiveis) {
                if (qtdNecessariaTotal <= 0) break;
                const qtdAbater = Math.min(lote.quantidadeEstoque, qtdNecessariaTotal);
                lote.darBaixa(qtdAbater);
                qtdNecessariaTotal -= qtdAbater;
            }
        }
    }
}

class CestaHigiene extends ItemEstoque {
    constructor(codigo, descricao, quantidadeEstoque) {
        super(codigo, descricao, quantidadeEstoque, 'Higiene');
    }

    static calcularCestasHigieneDisponiveis(estoque) {
        const compHigiene = {
            'Sabão em Barra': 1, 'Sabonete': 2, 'Creme Dental': 1, 'Papel Higiênico': 1
        };

        const norm = (txt) => txt ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
        const higieneValidos = estoque.filter(i => i.categoria === 'Higiene');

        let minCestas = Infinity;
        for (const [itemNome, qtdNecessaria] of Object.entries(compHigiene)) {
            const palavraChave = norm(itemNome.split(' ')[0]);
            const qtdTotal = higieneValidos
                .filter(i => norm(i.descricao).includes(palavraChave))
                .reduce((soma, i) => soma + i.quantidadeEstoque, 0);

            const cestas = Math.floor(qtdTotal / qtdNecessaria);
            if (cestas < minCestas) minCestas = cestas;
        }
        return minCestas === Infinity ? 0 : minCestas;
    }

    static darBaixaCestaHigiene(estoque, qtdCestas = 1) {
        const compHigiene = {
            'Sabão em Barra': 1, 'Sabonete': 2, 'Creme Dental': 1, 'Papel Higiênico': 1
        };

        const norm = (txt) => txt ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';

        for (const [itemNome, qtdPorCesta] of Object.entries(compHigiene)) {
            let qtdNecessariaTotal = qtdPorCesta * qtdCestas;
            const palavraChave = norm(itemNome.split(' ')[0]);

            const lotesDisponiveis = estoque
                .filter(i => norm(i.categoria) === 'higiene' && norm(i.descricao).includes(palavraChave) && i.quantidadeEstoque > 0);

            for (const lote of lotesDisponiveis) {
                if (qtdNecessariaTotal <= 0) break;
                const qtdAbater = Math.min(lote.quantidadeEstoque, qtdNecessariaTotal);
                lote.darBaixa(qtdAbater);
                qtdNecessariaTotal -= qtdAbater;
            }
        }
    }
}

class Roupa extends ItemEstoque {
    constructor(codigo, descricao, quantidadeEstoque, tamanho = 'M', genero = 'Unissex') {
        super(codigo, descricao, quantidadeEstoque, 'Roupa');
        this.tamanho = tamanho;
        this.genero = genero;
    }
}

// ============================================================
// DADOS INICIAIS
// ============================================================

let bancoVoluntarios = [
    { id: 1, nome: 'Jair Batista Gomes', email: 'jair@dorcas.org', senhaHash: bcrypt.hashSync('123456', 8), cargo: 'Administrador', ativo: true, requerTrocaSenha: false },
    { id: 2, nome: 'Karina Gomes', email: 'karina@dorcas.org', senhaHash: bcrypt.hashSync('123456', 8), cargo: 'Voluntário', ativo: true, requerTrocaSenha: false }
];

const estadoInicial = {
    familias: [
        { id: 1, nome: 'Daniela Weder Morinigo', doc: '2.581.604', endereco: 'Rua 14 de Julho, 5141', tel: '(67) 99893-0679', necessitaCesta: true },
        { id: 2, nome: 'Gislaine Aparecida Cordeiro', doc: '3.124.890', endereco: 'Av. Afonso Pena, 1200', tel: '(67) 99123-4567', necessitaCesta: true }
    ],
    estoque: [
        { codigo: 101, categoria: 'Alimento', descricao: 'Arroz 5kg', quantidadeEstoque: 10, dataValidade: '2026-11-20' },
        { codigo: 102, categoria: 'Alimento', descricao: 'Feijão 1kg', quantidadeEstoque: 20, dataValidade: '2026-09-15' },
        { codigo: 103, categoria: 'Alimento', descricao: 'Açúcar 2kg', quantidadeEstoque: 10, dataValidade: '2026-12-01' },
        { codigo: 104, categoria: 'Alimento', descricao: 'Óleo de Soja', quantidadeEstoque: 20, dataValidade: '2026-10-10' },
        { codigo: 105, categoria: 'Alimento', descricao: 'Flocão', quantidadeEstoque: 10, dataValidade: '2026-08-30' },
        { codigo: 106, categoria: 'Alimento', descricao: 'Farofa', quantidadeEstoque: 10, dataValidade: '2026-09-01' },
        { codigo: 107, categoria: 'Alimento', descricao: 'Fubá', quantidadeEstoque: 10, dataValidade: '2026-08-15' },
        { codigo: 108, categoria: 'Alimento', descricao: 'Trigo', quantidadeEstoque: 20, dataValidade: '2026-11-01' },
        { codigo: 109, categoria: 'Alimento', descricao: 'Macarrão Spaguetti', quantidadeEstoque: 10, dataValidade: '2027-01-01' },
        { codigo: 110, categoria: 'Alimento', descricao: 'Macarrão Parafuso', quantidadeEstoque: 10, dataValidade: '2027-01-01' },
        { codigo: 111, categoria: 'Alimento', descricao: 'Molho de Tomate', quantidadeEstoque: 20, dataValidade: '2026-12-30' },
        { codigo: 112, categoria: 'Alimento', descricao: 'Bolacha Salgada', quantidadeEstoque: 10, dataValidade: '2026-09-10' },
        { codigo: 113, categoria: 'Alimento', descricao: 'Bolacha Doce', quantidadeEstoque: 10, dataValidade: '2026-09-10' },
        { codigo: 114, categoria: 'Alimento', descricao: 'Milho Pipoca', quantidadeEstoque: 10, dataValidade: '2026-10-20' },
        { codigo: 201, categoria: 'Higiene', descricao: 'Sabão em Barra', quantidadeEstoque: 15 },
        { codigo: 202, categoria: 'Higiene', descricao: 'Sabonete', quantidadeEstoque: 30 },
        { codigo: 203, categoria: 'Higiene', descricao: 'Creme Dental', quantidadeEstoque: 15 },
        { codigo: 204, categoria: 'Higiene', descricao: 'Papel Higiênico', quantidadeEstoque: 15 },
        { codigo: 301, categoria: 'Roupa', descricao: 'Agasalho de Frio', quantidadeEstoque: 12, tamanho: 'G', genero: 'Masculino' }
    ],
    historico: [],
    historicoEspiritual: [],
    usuarios: bancoVoluntarios
};

let bancoFamilias = [];
let bancoEstoque = [];
let historicoAtendimentos = [];
let historicoEspiritual = [];

function salvarDadosEmDisco() {
    try {
        const dadosParaSalvar = {
            familias: bancoFamilias.map(f => {
                const dados = (typeof f.getDadosCompletosAutenticados === 'function') ? f.getDadosCompletosAutenticados({ ativo: true }) : f;
                return { id: dados.id || f.id, nome: dados.nome || f.nome, doc: dados.documento || f.doc, endereco: dados.endereco || f.endereco, tel: dados.telefone || f.tel, necessitaCesta: dados.necessitaCesta !== undefined ? dados.necessitaCesta : true };
            }),
            estoque: bancoEstoque.map(i => ({
                codigo: i.codigo, categoria: i.categoria, descricao: i.descricao, quantidadeEstoque: i.quantidadeEstoque,
                dataValidade: i.dataValidade ? i.dataValidade.toISOString().split('T')[0] : null,
                tamanho: i.tamanho || null, genero: i.genero || null
            })),
            historico: Array.isArray(historicoAtendimentos) ? historicoAtendimentos : [],
            historicoEspiritual: Array.isArray(historicoEspiritual) ? historicoEspiritual : [],
            usuarios: bancoVoluntarios
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(dadosParaSalvar, null, 2), 'utf8');
    } catch (err) {
        console.error('[DORCAS ERRO] Falha ao salvar dados:', err);
    }
}

function carregarDadosDoDisco() {
    try {
        let dadosRaw;
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(estadoInicial, null, 2), 'utf8');
            dadosRaw = estadoInicial;
        } else {
            dadosRaw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }

        bancoFamilias = (dadosRaw.familias || []).map(f => new Familia(f.id, f.nome, f.doc || '000.000.000-00', f.endereco || 'Rua Padrão', f.tel, f.necessitaCesta));
        bancoEstoque = (dadosRaw.estoque || []).map(i => {
            if (i.categoria === 'Alimento') {
                return new Alimento(i.codigo, i.descricao, i.quantidadeEstoque, i.dataValidade);
            } else if (i.categoria === 'Higiene') {
                return new CestaHigiene(i.codigo, i.descricao, i.quantidadeEstoque);
            } else if (i.categoria === 'Roupa') {
                return new Roupa(i.codigo, i.descricao, i.quantidadeEstoque, i.tamanho, i.genero);
            }
        }).filter(Boolean);

        historicoAtendimentos = Array.isArray(dadosRaw.historico) ? dadosRaw.historico : [];
        historicoEspiritual = Array.isArray(dadosRaw.historicoEspiritual) ? dadosRaw.historicoEspiritual : [];
        if (Array.isArray(dadosRaw.usuarios) && dadosRaw.usuarios.length > 0) {
            bancoVoluntarios = dadosRaw.usuarios.map(u => ({
                id: u.id,
                nome: u.nome,
                email: u.email,
                senhaHash: u.senhaHash,
                cargo: u.cargo,
                ativo: u.ativo !== undefined ? u.ativo : true,
                requerTrocaSenha: u.requerTrocaSenha || false
            }));
        }
    } catch (err) {
        console.error('[DORCAS ERRO] Falha ao carregar dados:', err);
    }
}

carregarDadosDoDisco();

function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acesso negado: Faça login para acessar o sistema.' });
    }

    jwt.verify(token, SECRET_KEY, (err, usuario) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Sessão expirada. Faça login novamente.' });
        }
        req.usuario = usuario;
        next();
    });
}

// ============================================================
// ENDPOINTS DE AUTENTICAÇÃO E RECUPERAÇÃO DE SENHA
// ============================================================

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    const voluntario = bancoVoluntarios.find(v => v.email.toLowerCase() === email.toLowerCase());

    if (!voluntario || !bcrypt.compareSync(senha, voluntario.senhaHash)) {
        return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
    }

    if (voluntario.ativo === false) {
        return res.status(403).json({ success: false, message: 'Usuário desativado. Entre em contato com o administrador.' });
    }

    if (voluntario.requerTrocaSenha) {
        return res.json({
            success: true,
            requerTrocaSenha: true,
            email: voluntario.email,
            message: 'Senha temporária utilizada. Cadastre uma nova senha para continuar.'
        });
    }

    const token = jwt.sign(
        { id: voluntario.id, nome: voluntario.nome, email: voluntario.email, cargo: voluntario.cargo },
        SECRET_KEY,
        { expiresIn: '8h' }
    );

    res.json({
        success: true,
        requerTrocaSenha: false,
        token: token,
        usuario: { nome: voluntario.nome, email: voluntario.email, cargo: voluntario.cargo }
    });
});

app.post('/api/redefinir-senha-definitiva', (req, res) => {
    const { email, novaSenha, confirmacaoSenha } = req.body;

    if (!novaSenha || novaSenha !== confirmacaoSenha) {
        return res.status(400).json({ success: false, message: 'As senhas informadas não conferem.' });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({ success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const voluntario = bancoVoluntarios.find(v => v.email.toLowerCase() === email.toLowerCase());
    if (!voluntario) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    voluntario.senhaHash = bcrypt.hashSync(novaSenha, 8);
    voluntario.requerTrocaSenha = false;
    salvarDadosEmDisco();

    res.json({ success: true, message: 'Senha atualizada com sucesso! Faça login com a nova senha.' });
});

app.post('/api/esqueci-senha', async (req, res) => {
    const { email } = req.body;
    const voluntario = bancoVoluntarios.find(v => v.email.toLowerCase() === email.toLowerCase());

    if (!voluntario) {
        return res.status(404).json({ success: false, message: 'E-mail não encontrado no cadastro do sistema.' });
    }

    if (voluntario.ativo === false) {
        return res.status(403).json({ success: false, message: 'Este usuário está desativado no sistema.' });
    }

    const senhaTemporaria = geradorSenhaAleatoria();
    voluntario.senhaHash = bcrypt.hashSync(senhaTemporaria, 8);
    voluntario.requerTrocaSenha = true;
    salvarDadosEmDisco();

    try {
        await transporter.sendMail({
            from: '"Aplicativo Dorcas" <zapjai@gmail.com>',
            to: voluntario.email,
            subject: 'Senha Temporária de Acesso - Aplicativo Dorcas',
            text: `Olá ${voluntario.nome},\n\nVocê solicitou a redefinição de sua senha.\n\nSua senha temporária é: ${senhaTemporaria}\n\nAcesse o sistema utilizando esta senha temporária e você será solicitado a cadastrar uma nova senha definitiva.`
        });

        res.json({ success: true, message: `Uma senha temporária foi enviada para ${voluntario.email}!` });
    } catch (err) {
        console.error('[DORCAS SMTP ERRO] Falha ao enviar e-mail:', err.message);
        console.log(`[DORCAS BACKUP] Senha temporária para ${voluntario.email}: ${senhaTemporaria}`);
        res.status(500).json({ success: false, message: 'Erro ao enviar o e-mail. Verifique o servidor SMTP.' });
    }
});

app.get('/api/me', autenticarToken, (req, res) => {
    res.json({ success: true, usuario: req.usuario });
});

// ============================================================
// ENDPOINTS DE GESTÃO DE FAMÍLIAS (INCLUINDO NOVO CADASTRO)
// ============================================================

app.get('/api/familias', autenticarToken, (req, res) => {
    const busca = req.query.busca ? req.query.busca.toLowerCase().trim() : '';
    let resultado = bancoFamilias;

    if (busca) {
        resultado = bancoFamilias.filter(f => f.nome.toLowerCase().includes(busca) || (f.documento && f.documento.includes(busca)));
    }

    res.json({ success: true, familias: resultado.map(f => f.getPerfilPublico()) });
});

app.post('/api/familias/novo', autenticarToken, (req, res) => {
    try {
        const { nome, documento, endereco, telefone } = req.body;

        if (!nome || !documento || !endereco || !telefone) {
            return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios da família.' });
        }

        const novaFamilia = new Familia(
            bancoFamilias.length + 1,
            nome,
            documento,
            endereco,
            telefone,
            true
        );

        bancoFamilias.push(novaFamilia);
        salvarDadosEmDisco();

        res.json({ success: true, message: `Família '${nome}' cadastrada com sucesso!`, familia: novaFamilia.getPerfilPublico() });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ============================================================
// ENDPOINTS DE GESTÃO DE USUÁRIOS
// ============================================================

app.get('/api/usuarios', autenticarToken, (req, res) => {
    const listaSanitizada = bancoVoluntarios.map(v => ({
        id: v.id,
        nome: v.nome,
        email: v.email,
        cargo: v.cargo,
        ativo: v.ativo !== undefined ? v.ativo : true
    }));
    res.json({ success: true, usuarios: listaSanitizada });
});

app.post('/api/usuarios/novo', autenticarToken, async (req, res) => {
    const { nome, email, cargo } = req.body;

    if (!nome || !email || !cargo) {
        return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
    }

    const emailExistente = bancoVoluntarios.find(v => v.email.toLowerCase() === email.toLowerCase());
    if (emailExistente) {
        return res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado no sistema.' });
    }

    const novaSenha = geradorSenhaAleatoria();
    const novoUsuario = {
        id: bancoVoluntarios.length + 1,
        nome,
        email,
        senhaHash: bcrypt.hashSync(novaSenha, 8),
        cargo,
        ativo: true,
        requerTrocaSenha: true
    };

    bancoVoluntarios.push(novoUsuario);
    salvarDadosEmDisco();

    try {
        await transporter.sendMail({
            from: '"Aplicativo Dorcas" <zapjai@gmail.com>',
            to: email,
            subject: 'Bem-vindo ao Aplicativo Dorcas - Seus Dados de Acesso',
            text: `Olá ${nome},\n\nVocê foi cadastrado como ${cargo} no Aplicativo Dorcas.\n\nSeus dados de acesso:\nE-mail: ${email}\nSenha Temporária: ${novaSenha}\n\nAcesse o sistema com esta senha temporária para cadastrar sua senha definitiva.`
        });

        res.json({ success: true, message: `Usuário '${nome}' cadastrado com sucesso! A senha foi enviada para ${email}.` });
    } catch (err) {
        console.error('[DORCAS SMTP ERRO] Falha ao enviar e-mail:', err.message);
        console.log(`[DORCAS BACKUP] Senha para ${email}: ${novaSenha}`);
        res.json({ success: true, message: `Usuário cadastrado! (Aviso: Falha no envio SMTP. Verifique o console do servidor).` });
    }
});

app.post('/api/usuarios/toggle-status', autenticarToken, (req, res) => {
    const { id } = req.body;
    const voluntario = bancoVoluntarios.find(v => v.id === parseInt(id));

    if (!voluntario) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    voluntario.ativo = !voluntario.ativo;
    salvarDadosEmDisco();

    res.json({ 
        success: true, 
        message: `Usuário '${voluntario.nome}' ${voluntario.ativo ? 'ativado' : 'desativado'} com sucesso!`,
        ativo: voluntario.ativo
    });
});

// ============================================================
// DEMAIS ENDPOINTS DO SISTEMA
// ============================================================

app.get('/api/estoque', autenticarToken, (req, res) => {
    const cestasAlimento = Alimento.calcularCestasBasicasDisponiveis(bancoEstoque);
    const cestasHigiene = CestaHigiene.calcularCestasHigieneDisponiveis(bancoEstoque);
    const cestasBasicasCompletas = Math.min(cestasAlimento, cestasHigiene);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limiteAlerta = new Date();
    limiteAlerta.setDate(hoje.getDate() + 30);

    const estoqueFormatado = bancoEstoque.map(item => {
        let statusVencimento = 'ok';
        if (item.categoria === 'Alimento' && item.dataValidade) {
            const dataVal = new Date(item.dataValidade);
            dataVal.setHours(0, 0, 0, 0);

            if (dataVal < hoje) {
                statusVencimento = 'vencido';
            } else if (dataVal <= limiteAlerta) {
                statusVencimento = 'alerta';
            }
        }

        return {
            codigo: item.codigo,
            descricao: item.descricao,
            quantidadeEstoque: item.quantidadeEstoque,
            categoria: item.categoria,
            resumo: item.getResumoItem(),
            tamanho: item.tamanho || null,
            genero: item.genero || null,
            dataValidade: item.dataValidade ? (item.dataValidade instanceof Date ? item.dataValidade.toISOString().split('T')[0] : item.dataValidade) : null,
            statusVencimento
        };
    });

    res.json({
        success: true,
        cestasBasicasDisponiveis: cestasBasicasCompletas,
        estoque: estoqueFormatado
    });
});

app.post('/api/estoque/novo', autenticarToken, (req, res) => {
    try {
        const { categoria, descricao, quantidade, dataValidade, tamanho, genero } = req.body;
        const qtd = parseInt(quantidade) || 1;

        if (!descricao || !categoria) {
            return res.status(400).json({ success: false, message: 'Categoria e Descrição são obrigatórias.' });
        }

        let novoItem;
        const novoCodigo = bancoEstoque.length > 0 ? Math.max(...bancoEstoque.map(i => i.codigo)) + 1 : 101;

        if (categoria === 'Alimento') {
            novoItem = new Alimento(novoCodigo, descricao, qtd, dataValidade);
        } else if (categoria === 'Higiene') {
            novoItem = new CestaHigiene(novoCodigo, descricao, qtd);
        } else if (categoria === 'Roupa') {
            novoItem = new Roupa(novoCodigo, descricao, qtd, tamanho, genero);
        }

        if (novoItem) {
            bancoEstoque.push(novoItem);
            salvarDadosEmDisco();
            res.json({ success: true, message: `Item '${descricao}' adicionado ao estoque!` });
        } else {
            res.status(400).json({ success: false, message: 'Categoria de estoque inválida.' });
        }
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.get('/api/estoque/faltantes', autenticarToken, (req, res) => {
    const compCompleta = {
        'Arroz 5kg': 1, 'Feijão 1kg': 2, 'Açúcar 2kg': 1, 'Óleo de Soja': 2,
        'Flocão': 1, 'Farofa': 1, 'Fubá': 1, 'Trigo': 2,
        'Macarrão Spaguetti': 1, 'Macarrão Parafuso': 1, 'Molho de Tomate': 2,
        'Bolacha Salgada': 1, 'Bolacha Doce': 1, 'Milho Pipoca': 1,
        'Sabão em Barra': 1, 'Sabonete': 2, 'Creme Dental': 1, 'Papel Higiênico': 1
    };

    const norm = (txt) => txt ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';

    const obterQtdTotalItem = (listaEstoque, itemNome) => {
        const nomeNorm = norm(itemNome);
        const palavrasChave = nomeNorm.split(' ');

        return listaEstoque.filter(i => {
            const descNorm = norm(i.descricao);
            if (palavrasChave.length > 1 && (nomeNorm.includes('bolacha') || nomeNorm.includes('macarrao'))) {
                return palavrasChave.every(p => descNorm.includes(p));
            }
            return descNorm.includes(palavrasChave[0]);
        }).reduce((soma, i) => soma + i.quantidadeEstoque, 0);
    };

    const itensValidos = bancoEstoque.filter(i => !i.estaVencido || !i.estaVencido());
    
    let maxCestasPossiveis = 0;
    for (const [itemNome, qtdNecessaria] of Object.entries(compCompleta)) {
        const qtdTotal = obterQtdTotalItem(itensValidos, itemNome);
        const cestasPossiveis = Math.floor(qtdTotal / qtdNecessaria);
        if (cestasPossiveis > maxCestasPossiveis) maxCestasPossiveis = cestasPossiveis;
    }

    const metaCestas = Math.max(maxCestasPossiveis, 1);
    const faltantes = [];

    for (const [itemNome, qtdNecessaria] of Object.entries(compCompleta)) {
        const qtdAtual = obterQtdTotalItem(itensValidos, itemNome);
        const qtdMeta = qtdNecessaria * metaCestas;
        if (qtdAtual < qtdMeta) {
            faltantes.push({
                item: itemNome,
                qtdAtual: qtdAtual,
                faltanteParaUmaCesta: qtdMeta - qtdAtual
            });
        }
    }

    res.json({ success: true, metaCestas, faltantes });
});

app.get('/api/atendimentos/historico', autenticarToken, (req, res) => {
    res.json({ success: true, historico: historicoAtendimentos || [] });
});

app.get('/api/espiritual', autenticarToken, (req, res) => {
    res.json({ success: true, historicoEspiritual: historicoEspiritual || [] });
});

app.post('/api/espiritual/novo', autenticarToken, (req, res) => {
    try {
        const { idFamilia, atendente, tipoAssistencia } = req.body;

        const familia = bancoFamilias.find(f => {
            const id = (typeof f.getId === 'function') ? f.getId() : f.id;
            return id === parseInt(idFamilia);
        });

        if (!familia) return res.status(404).json({ success: false, message: 'Família não encontrada.' });

        const nomeFamilia = (typeof familia.getNomeResponsavel === 'function') ? familia.getNomeResponsavel() : (familia.nome || 'Assistido');

        const novoRegistro = {
            id: historicoEspiritual.length + 1,
            dataHora: new Date().toLocaleString('pt-BR'),
            familia: nomeFamilia,
            atendente: atendente,
            tipoAssistencia: tipoAssistencia
        };

        historicoEspiritual.unshift(novoRegistro);
        salvarDadosEmDisco();

        res.json({ success: true, message: 'Assistência espiritual registrada com sucesso!', registro: novoRegistro });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/atendimentos/baixa', autenticarToken, (req, res) => {
    try {
        const { idFamilia, tipoEntrega, codigoItem, quantidade, itensCarrinho } = req.body;
        
        const familia = bancoFamilias.find(f => {
            const id = (typeof f.getId === 'function') ? f.getId() : f.id;
            return id === parseInt(idFamilia);
        });

        if (!familia) return res.status(404).json({ success: false, message: 'Família não encontrada.' });

        const nomeFamilia = (typeof familia.getNomeResponsavel === 'function') ? familia.getNomeResponsavel() : (familia.nome || 'Assistido');

        let descricaoAtendimento = '';

        if (tipoEntrega === 'CESTA_BASICA') {
            const qtdCestas = parseInt(quantidade) || 1;
            Alimento.darBaixaCestaBasica(bancoEstoque, qtdCestas);
            CestaHigiene.darBaixaCestaHigiene(bancoEstoque, qtdCestas);
            descricaoAtendimento = `${qtdCestas}x Cesta Básica Completa (Alimentos + Higiene)`;

        } else if (tipoEntrega === 'CARRINHO_ROUPAS') {
            if (!itensCarrinho || itensCarrinho.length === 0) {
                return res.status(400).json({ success: false, message: 'Carrinho de roupas vazio.' });
            }

            const descricoes = [];
            for (const itemC of itensCarrinho) {
                const itemEstoque = bancoEstoque.find(i => i.codigo === parseInt(itemC.codigo));
                if (itemEstoque) {
                    itemEstoque.darBaixa(parseInt(itemC.quantidade));
                    descricoes.push(`${itemC.quantidade}x ${itemEstoque.descricao} (Tam: ${itemEstoque.tamanho || 'Padrão'})`);
                }
            }
            descricaoAtendimento = `Vestuário: ${descricoes.join(', ')}`;

        } else if (tipoEntrega === 'AVULSO') {
            const qtd = parseInt(quantidade) || 1;
            const item = bancoEstoque.find(i => i.codigo === parseInt(codigoItem));
            if (!item) return res.status(404).json({ success: false, message: 'Item não encontrado.' });
            item.darBaixa(qtd);
            descricaoAtendimento = `${qtd}x ${item.descricao}`;
        }

        const recibo = {
            idAtendimento: historicoAtendimentos.length + 1,
            familia: nomeFamilia,
            itemEntregue: descricaoAtendimento,
            dataAtendimento: new Date().toLocaleString('pt-BR')
        };

        historicoAtendimentos.push(recibo);
        salvarDadosEmDisco();

        res.json({ success: true, message: `Baixa realizada com sucesso! Recibo #${recibo.idAtendimento} gerado.`, recibo });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => console.log(`[DORCAS] Servidor rodando em http://localhost:${PORT}`));