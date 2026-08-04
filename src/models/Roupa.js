const Doacao = require('./Doacao');

// Itens proibidos no cadastro de Roupas
const PALAVRAS_PROIBIDAS_ROUPA = [
    // Higiene
    'sabao', 'sabão', 'sabonete', 'creme dental', 'dental', 'papel higienico', 'papel higiênico', 'shampoo', 'desodorante',
    // Alimentos
    'arroz', 'feijao', 'feijão', 'açucar', 'acucar', 'oleo', 'óleo', 'flocao', 'flocão', 'farofa', 'fuba', 'fubá', 'trigo', 'macarrao', 'macarrão', 'molho', 'bolacha', 'milho'
];

function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * SUBCLASSE ROUPA - APLICATIVO DORCAS
 * Pilares de POO: HERANÇA e POLIMORFISMO
 */
class Roupa extends Doacao {
    constructor(codigo, descricao, quantidadeEstoque, tamanho, genero) {
        // Validação de Triagem (POO): Impede que itens de Higiene ou Alimentos entrem em Roupa
        const descNorm = normalizarTexto(descricao);
        const ehItemInvalido = PALAVRAS_PROIBIDAS_ROUPA.some(item => descNorm.includes(item));

        if (ehItemInvalido) {
            throw new Error(`ERRO DE TRIAGEM: O item '${descricao}' não é uma peça de vestuário e não pode ser cadastrado em Roupa.`);
        }

        super(codigo, descricao, quantidadeEstoque, 'Roupa');
        this.tamanho = tamanho;
        this.genero = genero;
    }

    darBaixa(quantidade) {
        console.log(`[LOG TRIAGEM] Baixa de Vestuário - Tamanho: ${this.tamanho}, Gênero: ${this.genero}`);
        return super.darBaixa(quantidade);
    }

    getResumoItem() {
        return `${this.descricao} (Tam: ${this.tamanho} / ${this.genero}) - Saldo: ${this.quantidadeEstoque}`;
    }
}

module.exports = Roupa;
