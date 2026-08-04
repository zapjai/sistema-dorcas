const Doacao = require('./Doacao');

// Lista de palavras proibidas para evitar que alimentos entrem em Higiene
const ITENS_ALIMENTOS_PROIBIDOS = [
    'arroz', 'feijao', 'feijão', 'açucar', 'acucar', 'oleo', 'óleo', 
    'flocao', 'flocão', 'farofa', 'fuba', 'fubá', 'trigo', 
    'macarrao', 'macarrão', 'molho', 'bolacha', 'milho'
];

// Palavras-chave necessárias para compor a Cesta de Higiene
const COMPOSICAO_CESTA_HIGIENE = [
    { chave: 'sabao', nomeExibicao: 'Sabão em Barra', qtdNecessaria: 1 },
    { chave: 'sabonete', nomeExibicao: 'Sabonete', qtdNecessaria: 2 },
    { chave: 'creme dental', nomeExibicao: 'Creme Dental', qtdNecessaria: 1 },
    { chave: 'papel', nomeExibicao: 'Papel Higiênico', qtdNecessaria: 1 }
];

function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

class CestaHigiene extends Doacao {
    constructor(codigo, descricao, quantidadeEstoque) {
        // Validação de Triagem (POO): Bloqueia itens alimentícios cadastrados em Higiene
        const descNorm = normalizarTexto(descricao);
        const ehItemAlimento = ITENS_ALIMENTOS_PROIBIDOS.some(item => descNorm.includes(item));

        if (ehItemAlimento) {
            throw new Error(`ERRO DE TRIAGEM: O item '${descricao}' pertence à categoria Alimento e não pode ser cadastrado em Higiene Pessoal.`);
        }

        super(codigo, descricao, quantidadeEstoque, 'Higiene');
    }

    static calcularCestasHigieneDisponiveis(bancoEstoque) {
        let menorQtdCestas = Infinity;

        // Filtra itens de Higiene
        const itensHigiene = bancoEstoque.filter(item => 
            normalizarTexto(item.categoria).includes('higiene')
        );

        for (const comp of COMPOSICAO_CESTA_HIGIENE) {
            const chaveNorm = normalizarTexto(comp.chave);
            
            // Soma todos os produtos do estoque que contenham a palavra-chave
            const qtdTotalItem = itensHigiene
                .filter(i => normalizarTexto(i.descricao).includes(chaveNorm))
                .reduce((soma, i) => soma + i.quantidadeEstoque, 0);

            const cestasPossiveis = Math.floor(qtdTotalItem / comp.qtdNecessaria);

            if (cestasPossiveis < menorQtdCestas) {
                menorQtdCestas = cestasPossiveis;
            }
        }

        return menorQtdCestas === Infinity ? 0 : menorQtdCestas;
    }

    static darBaixaCestaHigiene(bancoEstoque, quantidadeCestas) {
        const disponiveis = CestaHigiene.calcularCestasHigieneDisponiveis(bancoEstoque);
        if (quantidadeCestas > disponiveis) {
            throw new Error(`Estoque insuficiente para montar ${quantidadeCestas} Cesta(s) de Higiene. Disponíveis: ${disponiveis}`);
        }

        for (const comp of COMPOSICAO_CESTA_HIGIENE) {
            const chaveNorm = normalizarTexto(comp.chave);
            let qtdParaAbater = comp.qtdNecessaria * quantidadeCestas;

            const itensCorrespondentes = bancoEstoque.filter(i => 
                normalizarTexto(i.categoria).includes('higiene') && 
                normalizarTexto(i.descricao).includes(chaveNorm)
            );

            for (const item of itensCorrespondentes) {
                if (qtdParaAbater <= 0) break;
                const abate = Math.min(item.quantidadeEstoque, qtdParaAbater);
                item.darBaixa(abate);
                qtdParaAbater -= abate;
            }
        }
        return true;
    }
}

module.exports = { CestaHigiene, COMPOSICAO_CESTA_HIGIENE };