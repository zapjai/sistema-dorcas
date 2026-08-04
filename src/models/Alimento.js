const Doacao = require('./Doacao');

const COMPOSICAO_CESTA_BASICA = {
    'Arroz 5kg': 1,
    'Feijão 1kg': 2,
    'Açúcar 2kg': 1,
    'Óleo de Soja': 2,
    'Flocão': 1,
    'Farofa': 1,
    'Fubá': 1,
    'Trigo': 2,
    'Macarrão Spaguetti': 1,
    'Macarrão Parafuso': 1,
    'Molho de Tomate': 2,
    'Bolacha Salgada': 1,
    'Bolacha Doce': 1,
    'Milho Pipoca': 1
};

// Palavras proibidas em Alimentos (Itens de Higiene / Limpeza)
const ITENS_HIGIENE_PROIBIDOS = ['sabao', 'sabonete', 'creme dental', 'dental', 'papel higienico', 'shampoo', 'condicionador', 'desodorante'];

function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

class Alimento extends Doacao {
    constructor(codigo, descricao, quantidadeEstoque, dataValidade) {
        // Validação de Triagem: Impede cadastrar item de Higiene como Alimento
        const descNorm = normalizarTexto(descricao);
        const ehItemHigiene = ITENS_HIGIENE_PROIBIDOS.some(item => descNorm.includes(item));

        if (ehItemHigiene) {
            throw new Error(`ERRO DE TRIAGEM: O item '${descricao}' pertence à categoria Higiene Pessoal e não pode ser cadastrado como Alimento.`);
        }

        super(codigo, descricao, quantidadeEstoque, 'Alimento');
        this.dataValidade = dataValidade ? new Date(dataValidade) : null;
    }

    estaVencido() {
        if (!this.dataValidade) return false;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return this.dataValidade < hoje;
    }

    static calcularCestasBasicasDisponiveis(bancoEstoque) {
        let menorQtdCestas = Infinity;

        const itensValidos = bancoEstoque.filter(item => 
            normalizarTexto(item.categoria) === 'alimento' && !item.estaVencido()
        );

        for (const [itemNome, qtdNecessaria] of Object.entries(COMPOSICAO_CESTA_BASICA)) {
            const nomeNorm = normalizarTexto(itemNome);
            const itemEstoque = itensValidos.find(i => normalizarTexto(i.descricao) === nomeNorm);
            const qtdDisponivel = itemEstoque ? itemEstoque.quantidadeEstoque : 0;
            
            const cestasPossiveis = Math.floor(qtdDisponivel / qtdNecessaria);
            if (cestasPossiveis < menorQtdCestas) {
                menorQtdCestas = cestasPossiveis;
            }
        }

        return menorQtdCestas === Infinity ? 0 : menorQtdCestas;
    }

    static darBaixaCestaBasica(bancoEstoque, quantidadeCestas) {
        const disponiveis = Alimento.calcularCestasBasicasDisponiveis(bancoEstoque);
        if (quantidadeCestas > disponiveis) {
            throw new Error(`Estoque insuficiente para montar ${quantidadeCestas} Cesta(s) Básica(s). Disponíveis: ${disponiveis}`);
        }

        for (const [itemNome, qtdNecessaria] of Object.entries(COMPOSICAO_CESTA_BASICA)) {
            const nomeNorm = normalizarTexto(itemNome);
            const itemEstoque = bancoEstoque.find(i => 
                normalizarTexto(i.categoria) === 'alimento' && 
                normalizarTexto(i.descricao) === nomeNorm && 
                !i.estaVencido()
            );
            if (itemEstoque) {
                itemEstoque.darBaixa(qtdNecessaria * quantidadeCestas);
            }
        }
        return true;
    }
}

module.exports = { Alimento, COMPOSICAO_CESTA_BASICA };