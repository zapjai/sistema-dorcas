document.addEventListener('DOMContentLoaded', () => {
    verificarSessao();
});

let cacheEstoque = [];
let cacheFamilias = [];
let carrinhoRoupas = [];

function getHeadersAuth() {
    const token = localStorage.getItem('dorcas_jwt_token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function verificarSessao() {
    const token = localStorage.getItem('dorcas_jwt_token');
    if (!token) { exibirTelaLogin(); return; }

    try {
        const res = await fetch('/api/me', { headers: getHeadersAuth() });
        const data = await res.json();
        if (data.success) {
            const labelUser = document.getElementById('labelNomeUsuario');
            if (labelUser) labelUser.innerText = `${data.usuario.nome} (${data.usuario.cargo})`;
            exibirPainelApp();
            carregarEstoque();
            buscarFamilias();
            carregarHistorico();
            carregarRelatorioFaltantes();
            carregarAssistenciaEspiritual();
            carregarUsuarios();
        } else { fazerLogout(); }
    } catch (err) { fazerLogout(); }
}

function alternarFormEsqueciSenha(exibirEsqueci) {
    const formLogin = document.getElementById('formLogin');
    const formEsqueci = document.getElementById('formEsqueciSenha');
    const msgDiv = document.getElementById('msgLogin');
    if (msgDiv) msgDiv.innerText = '';

    if (exibirEsqueci) {
        formLogin?.classList.add('hidden');
        formEsqueci?.classList.remove('hidden');
    } else {
        formEsqueci?.classList.add('hidden');
        formLogin?.classList.remove('hidden');
    }
}

async function solicitarNovaSenha(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('esqueciEmail').value;
    const msgDiv = document.getElementById('msgLogin');

    try {
        const res = await fetch('/api/esqueci-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        exibirMensagem(msgDiv, data.message, data.success);
    } catch (err) {
        exibirMensagem(msgDiv, "Erro de conexão com o servidor.", false);
    }
}

async function realizarLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    const msgDiv = document.getElementById('msgLogin');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('dorcas_jwt_token', data.token);
            verificarSessao();
        } else { exibirMensagem(msgDiv, data.message, false); }
    } catch (err) { exibirMensagem(msgDiv, "Erro de conexão com o servidor.", false); }
}

function fazerLogout() {
    localStorage.removeItem('dorcas_jwt_token');
    exibirTelaLogin();
}

function exibirTelaLogin() {
    document.getElementById('screenLogin')?.classList.remove('hidden');
    document.getElementById('screenApp')?.classList.add('hidden');
}

function exibirPainelApp() {
    document.getElementById('screenLogin')?.classList.add('hidden');
    document.getElementById('screenApp')?.classList.remove('hidden');
}

function alternarAba(nomeAba) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const abaAlvo = document.getElementById(`aba-${nomeAba}`);
    if (abaAlvo) abaAlvo.classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(nomeAba)) btn.classList.add('active');
    });

    if (nomeAba === 'historico') carregarHistorico();
    else if (nomeAba === 'relatorio') carregarRelatorioFaltantes();
    else if (nomeAba === 'estoque' || nomeAba === 'operacoes') carregarEstoque();
    else if (nomeAba === 'espiritual') carregarAssistenciaEspiritual();
    else if (nomeAba === 'cadastros') carregarUsuarios(); // CARREGA A LISTA DE USUÁRIOS NA ABA UNIFICADA
}

// ============================================================
// GESTÃO DE USUÁRIOS
// ============================================================

async function carregarUsuarios() {
    try {
        const res = await fetch('/api/usuarios', { headers: getHeadersAuth() });
        const data = await res.json();
        const tbody = document.getElementById('tabelaUsuarios');
        if (!tbody) return;

        if (data.success && data.usuarios && data.usuarios.length > 0) {
            tbody.innerHTML = data.usuarios.map(u => `
                <tr>
                    <td><strong>${u.nome}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.cargo === 'Administrador' ? 'badge-cat-alimento' : 'badge-cat-roupa'}">${u.cargo}</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #888;">Nenhum usuário cadastrado.</td></tr>';
        }
    } catch (err) { console.error("Erro ao carregar usuários:", err); }
}

async function cadastrarUsuario(event) {
    if (event) event.preventDefault();
    const nome = document.getElementById('usrNome').value;
    const email = document.getElementById('usrEmail').value;
    const cargo = document.getElementById('usrCargo').value;
    const msgDiv = document.getElementById('msgCadUsuario');

    const res = await fetch('/api/usuarios/novo', {
        method: 'POST',
        headers: getHeadersAuth(),
        body: JSON.stringify({ nome, email, cargo })
    });
    const data = await res.json();

    if (data.success) {
        exibirMensagem(msgDiv, data.message, true);
        document.getElementById('formNovoUsuario').reset();
        carregarUsuarios();
    } else {
        exibirMensagem(msgDiv, data.message, false);
    }
}

// ============================================================
// OUTRAS FUNÇÕES DO SISTEMA
// ============================================================

function alternarCamposCategoria() {
    const cat = document.getElementById('cadCategoria').value;
    const campoValidade = document.getElementById('campoValidade');
    const camposRoupa = document.getElementById('camposRoupa');

    if (cat === 'Alimento') {
        campoValidade?.classList.remove('hidden');
        camposRoupa?.classList.add('hidden');
    } else if (cat === 'Roupa') {
        campoValidade?.classList.add('hidden');
        camposRoupa?.classList.remove('hidden');
    } else {
        campoValidade?.classList.add('hidden');
        camposRoupa?.classList.add('hidden');
    }
}

function alternarTipoEntrega() {
    const tipo = document.getElementById('selectTipoEntrega').value;
    const campoAvulso = document.getElementById('campoItemAvulso');
    const campoCarrinho = document.getElementById('painelCarrinhoRoupas');

    if (tipo === 'AVULSO') {
        campoAvulso?.classList.remove('hidden');
        campoCarrinho?.classList.add('hidden');
    } else if (tipo === 'CARRINHO_ROUPAS') {
        campoAvulso?.classList.add('hidden');
        campoCarrinho?.classList.remove('hidden');
        atualizarSelectRoupas();
    } else {
        campoAvulso?.classList.add('hidden');
        campoCarrinho?.classList.add('hidden');
    }
}

function atualizarSelectRoupas() {
    const select = document.getElementById('selectRoupaEstoque');
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecione a peça --</option>';

    cacheEstoque
        .filter(i => (i.categoria && i.categoria.toLowerCase().includes('roupa')) && i.quantidadeEstoque > 0)
        .forEach(i => {
            const detalhe = (i.tamanho && i.genero) ? `[Tam: ${i.tamanho} - ${i.genero}]` : '';
            select.innerHTML += `<option value="${i.codigo}">${i.descricao} ${detalhe} (${i.quantidadeEstoque} UN)</option>`;
        });
}

function adicionarAoCarrinho() {
    const select = document.getElementById('selectRoupaEstoque');
    const codigo = parseInt(select.value);
    const qtdInput = document.getElementById('qtdRoupaItem');
    const quantidade = parseInt(qtdInput.value) || 1;

    if (!codigo) { alert("Selecione uma peça de roupa!"); return; }

    const itemEstoque = cacheEstoque.find(i => i.codigo === codigo);
    if (!itemEstoque) return;

    if (quantidade > itemEstoque.quantidadeEstoque) {
        alert(`Quantidade indisponível em estoque! Máximo: ${itemEstoque.quantidadeEstoque} UN`);
        return;
    }

    const itemExistente = carrinhoRoupas.find(c => c.codigo === codigo);
    if (itemExistente) {
        if (itemExistente.quantidade + quantidade > itemEstoque.quantidadeEstoque) {
            alert(`Soma no carrinho excede estoque disponível (${itemEstoque.quantidadeEstoque} UN)`);
            return;
        }
        itemExistente.quantidade += quantidade;
    } else {
        carrinhoRoupas.push({
            codigo: itemEstoque.codigo,
            descricao: itemEstoque.descricao,
            tamanho: itemEstoque.tamanho || '-',
            genero: itemEstoque.genero || '-',
            quantidade: quantidade
        });
    }

    renderizarCarrinho();
}

function removerDoCarrinho(index) {
    carrinhoRoupas.splice(index, 1);
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const tbody = document.getElementById('tabelaCarrinho');
    if (!tbody) return;

    if (carrinhoRoupas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888;">Carrinho vazio</td></tr>';
        return;
    }

    tbody.innerHTML = carrinhoRoupas.map((item, index) => `
        <tr>
            <td><strong>${item.descricao}</strong><br><small>Tam: ${item.tamanho} (${item.genero})</small></td>
            <td><strong>${item.quantidade} UN</strong></td>
            <td><button type="button" class="btn" style="background:#e74c3c; color:#fff; padding:3px 8px; font-size:0.75rem;" onclick="removerDoCarrinho(${index})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');
}

async function carregarEstoque() {
    try {
        const res = await fetch('/api/estoque', { headers: getHeadersAuth() });
        const data = await res.json();
        if (data.success) {
            cacheEstoque = data.estoque;
            if (document.getElementById('totalCestasBasicas')) {
                document.getElementById('totalCestasBasicas').innerText = `${data.cestasBasicasDisponiveis} Cestas`;
            }
            renderizarTabelaEstoque(data.estoque);
            atualizarSelectEstoque(data.estoque);
            atualizarSelectRoupas();
        }
    } catch (err) { console.error("Erro ao carregar estoque:", err); }
}

function renderizarTabelaEstoque(estoque) {
    const tbody = document.getElementById('tabelaEstoque');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    estoque.forEach(item => {
        const tr = document.createElement('tr');
        let badgeCategoria = 'badge-cat-roupa';
        const catNorm = item.categoria ? item.categoria.toLowerCase() : '';

        if (catNorm.includes('alimento')) badgeCategoria = 'badge-cat-alimento';
        else if (catNorm.includes('higiene')) badgeCategoria = 'badge-cat-higiene';

        const detalheRoupa = (item.tamanho && item.genero) ? `Tam: ${item.tamanho} (${item.genero})` : (item.tamanho || '-');
        
        let colunaValidade = '-';
        if (catNorm.includes('alimento') && item.dataValidade) {
            const dataFmt = formatarData(item.dataValidade);

            if (item.statusVencimento === 'vencido') {
                colunaValidade = `<span class="badge badge-val-vencido" title="Produto Vencido!"><i class="fa-solid fa-triangle-exclamation"></i> Vencido (${dataFmt})</span>`;
            } else if (item.statusVencimento === 'alerta') {
                colunaValidade = `<span class="badge badge-val-alerta" title="Vence nos próximos 30 dias!"><i class="fa-solid fa-clock"></i> ${dataFmt} (Atenção)</span>`;
            } else {
                colunaValidade = `<span class="badge badge-val-ok">${dataFmt}</span>`;
            }
        }

        tr.innerHTML = `
            <td>#${item.codigo}</td>
            <td><span class="badge ${badgeCategoria}">${item.categoria}</span></td>
            <td><strong>${item.descricao}</strong></td>
            <td>${catNorm.includes('roupa') ? detalheRoupa : '-'}</td>
            <td>${colunaValidade}</td>
            <td><strong>${item.quantidadeEstoque} UN</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

async function buscarFamilias() {
    try {
        const busca = document.getElementById('inputBusca')?.value || '';
        const res = await fetch(`/api/familias?busca=${encodeURIComponent(busca)}`, { headers: getHeadersAuth() });
        const data = await res.json();
        if (data.success) {
            cacheFamilias = data.familias;
            renderizarListaFamilias(cacheFamilias);
            atualizarSelectFamilias(cacheFamilias);
            if (document.getElementById('totalFamilias')) {
                document.getElementById('totalFamilias').innerText = `${cacheFamilias.length} Cadastradas`;
            }
        }
    } catch (err) { console.error("Erro ao carregar famílias:", err); }
}

function renderizarListaFamilias(familias) {
    const container = document.getElementById('listaFamilias');
    if (!container) return;
    container.innerHTML = familias.map(f => `
        <div class="familia-item">
            <strong>${f.nome}</strong><br>
            <small>Doc: ${f.documentoMascarado} | Tel: ${f.telefone}</small>
        </div>
    `).join('');
}

async function carregarHistorico() {
    try {
        const res = await fetch('/api/atendimentos/historico', { headers: getHeadersAuth() });
        const data = await res.json();
        const tbody = document.getElementById('tabelaHistorico');
        if (!tbody) return;

        if (data.success && data.historico && data.historico.length > 0) {
            tbody.innerHTML = data.historico.map(r => `
                <tr>
                    <td><strong>#${r.idAtendimento}</strong></td>
                    <td>${r.dataAtendimento}</td>
                    <td>${r.familia}</td>
                    <td><strong>${r.itemEntregue}</strong></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">Nenhum atendimento registrado até o momento.</td></tr>';
        }
    } catch (err) { console.error("Erro ao carregar histórico:", err); }
}

async function carregarRelatorioFaltantes() {
    try {
        const res = await fetch('/api/estoque/faltantes', { headers: getHeadersAuth() });
        const data = await res.json();

        if (data.success) {
            const labelMeta = document.getElementById('labelMetaCestas');
            if (labelMeta) {
                labelMeta.innerText = `${data.metaCestas} Cestas Básicas Completa(s)`;
            }

            const tbodyUnificado = document.getElementById('tabelaFaltantesUnificado');
            if (tbodyUnificado) {
                if (!data.faltantes || data.faltantes.length === 0) {
                    tbodyUnificado.innerHTML = '<tr><td colspan="3" style="color:#27ae60; font-weight:bold;"><i class="fa-solid fa-circle-check"></i> Estoque perfeitamente equilibrado para montagem de cestas!</td></tr>';
                } else {
                    tbodyUnificado.innerHTML = data.faltantes.map(f => `
                        <tr>
                            <td><strong>${f.item}</strong></td>
                            <td>${f.qtdAtual} UN</td>
                            <td><span class="badge badge-val-vencido">Falta(m) ${f.faltanteParaUmaCesta} UN</span></td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (err) { console.error("Erro ao carregar relatório de faltantes:", err); }
}

async function carregarAssistenciaEspiritual() {
    try {
        const res = await fetch('/api/espiritual', { headers: getHeadersAuth() });
        const data = await res.json();
        const tbody = document.getElementById('tabelaEspiritual');
        if (!tbody) return;

        if (data.success && data.historicoEspiritual && data.historicoEspiritual.length > 0) {
            tbody.innerHTML = data.historicoEspiritual.map(r => `
                <tr>
                    <td>${r.dataHora}</td>
                    <td><strong>${r.familia}</strong></td>
                    <td>${r.atendente}</td>
                    <td>${r.tipoAssistencia}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">Nenhum atendimento espiritual registrado.</td></tr>';
        }
    } catch (err) { console.error("Erro ao carregar assistência espiritual:", err); }
}

async function registrarAssistenciaEspiritual(event) {
    if (event) event.preventDefault();
    const idFamilia = document.getElementById('selectFamiliaEspiritual').value;
    const atendente = document.getElementById('inputAtendenteEspiritual').value;
    const tipoAssistencia = document.getElementById('inputTipoEspiritual').value;
    const msgDiv = document.getElementById('msgEspiritual');

    const res = await fetch('/api/espiritual/novo', {
        method: 'POST',
        headers: getHeadersAuth(),
        body: JSON.stringify({ idFamilia, atendente, tipoAssistencia })
    });
    const data = await res.json();

    if (data.success) {
        exibirMensagem(msgDiv, data.message, true);
        document.getElementById('formAssistenciaEspiritual').reset();
        carregarAssistenciaEspiritual();
    } else { exibirMensagem(msgDiv, data.message, false); }
}

async function cadastrarFamilia(event) {
    if (event) event.preventDefault();
    const nome = document.getElementById('cadNome').value;
    const documento = document.getElementById('cadDoc').value;
    const endereco = document.getElementById('cadEndereco').value;
    const telefone = document.getElementById('cadTelefone').value;
    const msgDiv = document.getElementById('msgCadFamilia');

    const res = await fetch('/api/familias/novo', {
        method: 'POST',
        headers: getHeadersAuth(),
        body: JSON.stringify({ nome, documento, endereco, telefone, necessitaCesta: true })
    });
    const data = await res.json();

    if (data.success) {
        exibirMensagem(msgDiv, data.message, true);
        document.getElementById('formCadFamilia').reset();
        buscarFamilias();
    } else { exibirMensagem(msgDiv, data.message, false); }
}

async function cadastrarEstoque(event) {
    if (event) event.preventDefault();
    const categoria = document.getElementById('cadCategoria').value;
    const descricao = document.getElementById('cadDescricao').value;
    const quantidade = document.getElementById('cadQtd').value;
    const dataValidade = document.getElementById('cadValidade')?.value;
    const tamanho = document.getElementById('cadTamanho')?.value;
    const genero = document.getElementById('cadGenero')?.value;
    const msgDiv = document.getElementById('msgCadEstoque');

    const res = await fetch('/api/estoque/novo', {
        method: 'POST',
        headers: getHeadersAuth(),
        body: JSON.stringify({ categoria, descricao, quantidade, dataValidade, tamanho, genero })
    });
    const data = await res.json();

    if (data.success) {
        exibirMensagem(msgDiv, data.message, true);
        document.getElementById('formCadEstoque').reset();
        alternarCamposCategoria();
        carregarEstoque();
    } else { exibirMensagem(msgDiv, data.message, false); }
}

async function registrarBaixa(event) {
    if (event) event.preventDefault();
    const idFamilia = document.getElementById('selectFamilia').value;
    const tipoEntrega = document.getElementById('selectTipoEntrega').value;
    const codigoItem = document.getElementById('selectItemAvulso')?.value;
    const quantidade = document.getElementById('inputQuantidade')?.value;
    const msgDiv = document.getElementById('mensagemFeedback');

    if (tipoEntrega === 'CARRINHO_ROUPAS' && carrinhoRoupas.length === 0) {
        exibirMensagem(msgDiv, "Adicione pelo menos um item ao carrinho de roupas!", false);
        return;
    }

    const payload = {
        idFamilia,
        tipoEntrega,
        codigoItem,
        quantidade,
        itensCarrinho: tipoEntrega === 'CARRINHO_ROUPAS' ? carrinhoRoupas : []
    };

    const res = await fetch('/api/atendimentos/baixa', {
        method: 'POST',
        headers: getHeadersAuth(),
        body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
        exibirMensagem(msgDiv, data.message, true);
        document.getElementById('formBaixa').reset();
        carrinhoRoupas = [];
        renderizarCarrinho();
        alternarTipoEntrega();
        carregarEstoque();
        carregarHistorico();
        carregarRelatorioFaltantes();
    } else { exibirMensagem(msgDiv, data.message, false); }
}

function atualizarSelectEstoque(estoque) {
    const select = document.getElementById('selectItemAvulso') || document.getElementById('selectItem');
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecione um produto --</option>';
    estoque.filter(i => i.quantidadeEstoque > 0).forEach(i => {
        select.innerHTML += `<option value="${i.codigo}">${i.resumo}</option>`;
    });
}

function atualizarSelectFamilias(familias) {
    const selects = [document.getElementById('selectFamilia'), document.getElementById('selectFamiliaEspiritual')];
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- Selecione uma família --</option>';
        familias.forEach(f => select.innerHTML += `<option value="${f.id}">${f.nome}</option>`);
    });
}

function exibirMensagem(div, texto, sucesso) {
    if (!div) return;
    div.className = `feedback-msg ${sucesso ? 'feedback-success' : 'feedback-error'}`;
    div.innerHTML = `<i class="fa-solid ${sucesso ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> ${texto}`;
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    const partes = dataStr.split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function imprimirRelatorioAba() {
    window.print();
}