/**
 * SUPERCLASSE DOACAO - APLICATIVO DORCAS
 * Pilar de POO: ABSTRAÇÃO E HERANÇA
 */
class Doacao {
    constructor(codigo, descricao, quantidadeEstoque, categoria) {
        if (this.constructor === Doacao) {
            throw new Error("A classe abstrata 'Doacao' não pode ser instanciada diretamente.");
        }
        this.codigo = codigo;
        this.descricao = descricao;
        this.quantidadeEstoque = quantidadeEstoque;
        this.categoria = categoria;
    }

    // Método polimórfico
    darBaixa(quantidade) {
        if (quantidade <= 0) throw new Error("A quantidade de baixa deve ser maior que zero.");
        if (quantidade > this.quantidadeEstoque) {
            throw new Error(`Estoque insuficiente de ${this.descricao}. Disponível: ${this.quantidadeEstoque}, Solicitado: ${quantidade}`);
        }
        this.quantidadeEstoque -= quantidade;
        return true;
    }

    getResumoItem() {
        return `${this.descricao} [${this.categoria}] - Saldo: ${this.quantidadeEstoque}`;
    }
}

module.exports = Doacao;
