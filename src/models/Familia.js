/**
 * CLASSE FAMILIA - APLICATIVO DORCAS
 * Pilar de POO: ENCAPSULAMENTO (Proteção de dados sensíveis e Direitos Humanos)
 */
class Familia {
    #idFamilia;
    #nomeResponsavel;
    #docIdentificacao;
    #endereco;
    #telefone;
    #necessitaCesta;

    constructor(idFamilia, nomeResponsavel, docIdentificacao, endereco, telefone, necessitaCesta = true) {
        this.#idFamilia = idFamilia;
        this.#nomeResponsavel = nomeResponsavel;
        this.#docIdentificacao = docIdentificacao;
        this.#endereco = endereco;
        this.#telefone = telefone;
        this.#necessitaCesta = necessitaCesta;
    }

    getId() { return this.#idFamilia; }
    getNomeResponsavel() { return this.#nomeResponsavel; }
    getTelefone() { return this.#telefone; }
    getNecessitaCesta() { return this.#necessitaCesta; }

    // Oculta documento e endereço para exibição geral
    getPerfilPublico() {
        return {
            id: this.#idFamilia,
            nome: this.#nomeResponsavel,
            necessitaCesta: this.#necessitaCesta,
            documentoMascarado: this.#docIdentificacao.replace(/.(?=.{4})/g, "*"),
            telefone: this.#telefone
        };
    }

    // Acesso completo restrito a operadores autenticados
    getDadosCompletosAutenticados(usuarioAutenticado) {
        if (!usuarioAutenticado || !usuarioAutenticado.ativo) {
            throw new Error("Acesso negado: Requer autenticação para acessar dados pessoais sensíveis.");
        }
        return {
            id: this.#idFamilia,
            nome: this.#nomeResponsavel,
            documento: this.#docIdentificacao,
            endereco: this.#endereco,
            telefone: this.#telefone,
            necessitaCesta: this.#necessitaCesta
        };
    }
}

module.exports = Familia;
