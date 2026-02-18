let contas = JSON.parse(localStorage.getItem("contas")) || [];
let editIndex = null;
let dataAtual = new Date();

/* =========================
   SALVAR
========================= */
function salvar() {
  localStorage.setItem("contas", JSON.stringify(contas));
  renderizar();
}

/* =========================
   ADICIONAR CONTA
========================= */
function adicionarConta() {

  const nome = document.getElementById("nome").value.trim();
  const valorTotal = parseFloat(document.getElementById("valor").value);
  const data = document.getElementById("data").value;
  const parcelas = parseInt(document.getElementById("parcelas").value);
  const cor = document.getElementById("corConta").value;

  if (!nome || !valorTotal || !data || !parcelas) {
    alert("Preencha todos os campos!");
    return;
  }

  const dataBase = new Date(data);

  const valorBase = Math.floor((valorTotal / parcelas) * 100) / 100;
  const somaBase = valorBase * parcelas;
  const diferenca = parseFloat((valorTotal - somaBase).toFixed(2));

  for (let i = 0; i < parcelas; i++) {

    const novaData = new Date(dataBase);
    novaData.setMonth(dataBase.getMonth() + i);

    let valorParcela = valorBase;
    if (i === parcelas - 1) {
      valorParcela += diferenca;
    }

    contas.push({
      id: Date.now() + Math.random(),
      parcela: i + 1,
      totalParcelas: parcelas,
      nome: parcelas > 1 ? `${nome} (${i+1}/${parcelas})` : nome,
      valor: parseFloat(valorParcela.toFixed(2)),
      valorPago: 0,
      data: novaData.toISOString().split("T")[0],
      status: "pendente",
      cor: cor
    });
  }

  salvar();
  fecharModalCadastro();
}

/* =========================
   EDITAR
========================= */
function editar(index) {

  editIndex = index;
  const conta = contas[index];

  document.getElementById("editNome").value =
    conta.nome.replace(/\(\d+\/\d+\)/, "").trim();

  document.getElementById("editValor").value = conta.valor;
  document.getElementById("editData").value = conta.data;
  document.getElementById("editCor").value = conta.cor;

  document.getElementById("modal").style.display = "flex";
}

/* =========================
   SALVAR EDIÇÃO
========================= */
function salvarEdicao() {

  if (editIndex === null) return;

  const contaAtual = contas[editIndex];

  const novoNome = document.getElementById("editNome").value.trim();
  const novoValor = parseFloat(document.getElementById("editValor").value);
  const novaData = document.getElementById("editData").value;
  const novaCor = document.getElementById("editCor").value;

  if (!novoNome || !novoValor || !novaData) {
    alert("Preencha todos os campos!");
    return;
  }

  const nomeBaseAntigo =
    contaAtual.nome.replace(/\(\d+\/\d+\)/, "").trim();

  const totalParcelas = contaAtual.totalParcelas;

  const parcelasRelacionadas = contas.filter(conta => {
    const nomeBase =
      conta.nome.replace(/\(\d+\/\d+\)/, "").trim();
    return nomeBase === nomeBaseAntigo &&
           conta.totalParcelas === totalParcelas;
  });

  parcelasRelacionadas.sort((a, b) => a.parcela - b.parcela);

  const dataBase = new Date(novaData);

  parcelasRelacionadas.forEach((parcela, i) => {

    const novaDataParcela = new Date(dataBase);
    novaDataParcela.setMonth(dataBase.getMonth() + i);

    parcela.data =
      novaDataParcela.toISOString().split("T")[0];

    parcela.valor = novoValor;
    parcela.cor = novaCor;

    parcela.nome = parcela.totalParcelas > 1
      ? `${novoNome} (${parcela.parcela}/${parcela.totalParcelas})`
      : novoNome;
  });

  salvar();
  fecharModal();
}

/* =========================
   PAGAMENTO INTELIGENTE (COM REPASSE)
========================= */
function toggleStatus(index) {

  const conta = contas[index];

  const entrada = prompt(
    `Valor restante: R$ ${(conta.valor - (conta.valorPago || 0)).toFixed(2)}
    
Digite o valor que deseja pagar
ou escreva "não paguei" para resetar:`
  );

  if (!entrada) return;

  const texto = entrada.trim().toLowerCase();

  // 🔁 RESETAR
  if (texto === "não paguei" || texto === "nao paguei") {
    conta.valorPago = 0;
    conta.status = "pendente";
    salvar();
    return;
  }

  let pagamento = parseFloat(texto);
  if (isNaN(pagamento) || pagamento <= 0) return;

  const nomeBase =
    conta.nome.replace(/\(\d+\/\d+\)/, "").trim();

  // pegar todas parcelas do mesmo grupo
  const parcelasGrupo = contas
    .map((c, i) => ({ ...c, index: i }))
    .filter(c =>
      c.nome.replace(/\(\d+\/\d+\)/, "").trim() === nomeBase &&
      c.totalParcelas === conta.totalParcelas
    )
    .sort((a, b) => a.parcela - b.parcela);

  // aplicar pagamento sequencialmente
  for (let parcela of parcelasGrupo) {

    if (pagamento <= 0) break;

    let contaAtual = contas[parcela.index];

    let restante =
      contaAtual.valor - (contaAtual.valorPago || 0);

    if (restante <= 0) continue;

    if (pagamento >= restante) {
      contaAtual.valorPago = contaAtual.valor;
      contaAtual.status = "pago";
      pagamento -= restante;
    } else {
      contaAtual.valorPago =
        (contaAtual.valorPago || 0) + pagamento;
      contaAtual.status = "parcial";
      pagamento = 0;
    }
  }

  salvar();
}


/* =========================
   REMOVER
========================= */
function remover(index) {
  if (confirm("Deseja remover esta conta?")) {
    contas.splice(index, 1);
    salvar();
  }
}

/* =========================
   APAGAR POR NOME
========================= */
function apagarContaPorNome() {

  if (contas.length === 0) {
    alert("Não há contas cadastradas.");
    return;
  }

  const nomeDigitado = prompt("Digite o nome EXATO da conta que deseja apagar:");
  if (!nomeDigitado) return;

  const nomeBusca = nomeDigitado.trim().toLowerCase();

  const contasEncontradas = contas.filter(conta => {
    const nomeBase =
      conta.nome.replace(/\(\d+\/\d+\)/, "").trim().toLowerCase();
    return nomeBase === nomeBusca;
  });

  if (contasEncontradas.length === 0) {
    alert("Nenhuma conta encontrada com esse nome.");
    return;
  }

  if (!confirm(`Foram encontradas ${contasEncontradas.length} conta(s). Deseja apagar?`))
    return;

  contas = contas.filter(conta => {
    const nomeBase =
      conta.nome.replace(/\(\d+\/\d+\)/, "").trim().toLowerCase();
    return nomeBase !== nomeBusca;
  });

  salvar();
}

/* =========================
   RENDERIZAR
========================= */
function renderizar() {

  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  const busca = document.getElementById("busca").value.toLowerCase();
  const filtro = document.getElementById("filtroStatus").value;

  let totalPendentes = 0;
  let totalPagas = 0;

  contas.forEach((conta, index) => {

    if (!conta.nome.toLowerCase().includes(busca)) return;
    if (filtro !== "todas" && conta.status !== filtro) return;

    const valorPago = conta.valorPago || 0;
    const restante = conta.valor - valorPago;

    if (restante > 0)
      totalPendentes += restante;

    if (valorPago > 0)
      totalPagas += valorPago;

    const div = document.createElement("div");
    div.className = "item";

    div.style.borderLeft = `6px solid ${conta.cor}`;

    if (conta.status === "pago") {
      div.style.backgroundColor = "#2ecc7115";
    } else if (conta.status === "parcial") {
      div.style.backgroundColor = "#f39c1215";
      div.classList.add("parcial");
    } else {
      div.style.backgroundColor = hexToRGBA(conta.cor, 0.08);
    }

    div.innerHTML = `
      <div>
        <strong>${conta.nome}</strong><br>
        💰 Total: R$ ${conta.valor.toFixed(2)}<br>
        ${valorPago > 0 ? `💳 Pago: R$ ${valorPago.toFixed(2)}<br>` : ""}
        ${restante > 0 ? `🧾 Restante: R$ ${restante.toFixed(2)}<br>` : ""}
        📅 ${conta.data}
      </div>
      <div>
        <button onclick="toggleStatus(${index})">💵</button>
        <button onclick="editar(${index})">✏</button>
        <button onclick="remover(${index})">🗑</button>
      </div>
    `;

    lista.appendChild(div);
  });

  document.getElementById("totalPendentes").textContent =
    "R$ " + totalPendentes.toFixed(2);

  document.getElementById("totalPagas").textContent =
    "R$ " + totalPagas.toFixed(2);

  gerarCalendario();
}

/* =========================
   HEX → RGBA
========================= */
function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* =========================
   CALENDÁRIO
========================= */
function mudarMes(valor) {
  dataAtual.setMonth(dataAtual.getMonth() + valor);
  gerarCalendario();
}

function gerarCalendario() {

  const calendario = document.getElementById("calendario");
  const mesAno = document.getElementById("mesAno");

  calendario.innerHTML = "";

  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  mesAno.textContent =
    dataAtual.toLocaleString("pt-BR", { month: "long" }) +
    " " + ano;

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  for (let i = 0; i < primeiroDia; i++) {
    calendario.innerHTML += "<div></div>";
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {

    const dataFormatada =
      `${ano}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

    const temConta =
      contas.some(c => c.data === dataFormatada);

    calendario.innerHTML += `
      <div class="dia ${temConta ? "temConta" : ""}">
        ${dia}
      </div>
    `;
  }
}

/* =========================
   MODAIS
========================= */
function abrirModalCadastro() {
  document.getElementById("modalCadastro").style.display = "flex";
}

function fecharModalCadastro() {
  document.getElementById("modalCadastro").style.display = "none";
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
}

/* =========================
   MODO ESCURO
========================= */
window.addEventListener("DOMContentLoaded", () => {

  const toggleTema = document.getElementById("toggleTema");
  const temaSalvo = localStorage.getItem("tema");

  if (temaSalvo === "escuro") {
    document.body.classList.add("dark");
    toggleTema.textContent = "☀️";
  }

  toggleTema.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      localStorage.setItem("tema", "escuro");
      toggleTema.textContent = "☀️";
    } else {
      localStorage.setItem("tema", "claro");
      toggleTema.textContent = "🌙";
    }

  });

});

/* =========================
   INICIAR
========================= */
renderizar();
