/* ==========================================================
   Lista de Tarefas com CRUDCRUD
   Métodos HTTP usados (todos suportados pela CRUDCRUD):
     GET    /tarefas        -> lista todas as tarefas
     POST   /tarefas        -> cria uma tarefa
     PUT    /tarefas/{_id}  -> atualiza uma tarefa (editar / concluir)
     DELETE /tarefas/{_id}  -> exclui uma tarefa
   A CRUDCRUD não oferece PATCH, por isso ele não é usado.
   ========================================================== */

const RECURSO = "tarefas";
const CHAVE_STORAGE = "crudcrud_endpoint";

let endpointBase = "";   // ex.: https://crudcrud.com/api/<codigo>
let tarefas = [];        // dados que vieram da API
let filtroAtual = "todas";

/* ---------- Elementos da página ---------- */
const formConexao = document.getElementById("form-conexao");
const inputEndpoint = document.getElementById("input-endpoint");
const btnConectar = document.getElementById("btn-conectar");
const statusConexao = document.getElementById("status-conexao");

const secaoTarefas = document.getElementById("secao-tarefas");
const formTarefa = document.getElementById("form-tarefa");
const inputTarefa = document.getElementById("input-tarefa");
const btnAtualizar = document.getElementById("btn-atualizar");
const listaEl = document.getElementById("lista");
const vazioEl = document.getElementById("vazio");
const contadorEl = document.getElementById("contador");
const mensagemEl = document.getElementById("mensagem");
const botoesFiltro = document.querySelectorAll(".filtro");

/* ---------- Utilidades ---------- */
function mostrarStatus(el, texto, tipo) {
  el.textContent = texto;
  el.className = "status " + (tipo || "");
}

function normalizarEndpoint(valor) {
  // Aceita o endpoint com ou sem "/" no final, ou colado já com "/tarefas"
  const m = valor.trim().match(/^https:\/\/crudcrud\.com\/api\/[a-z0-9]+/i);
  return m ? m[0] : null;
}

function urlRecurso(id) {
  return endpointBase + "/" + RECURSO + (id ? "/" + id : "");
}

/* Faz a requisição e trata erros. Algumas respostas (PUT/DELETE)
   podem vir sem corpo, então o JSON só é lido se existir texto. */
async function requisicao(url, opcoes) {
  let resposta;
  try {
    resposta = await fetch(url, opcoes);
  } catch (e) {
    throw new Error("Não foi possível falar com a API. Verifique sua internet.");
  }
  if (!resposta.ok) {
    let detalhe = "";
    try { detalhe = (await resposta.text()).slice(0, 120); } catch (e) {}
    throw new Error("A API respondeu com erro " + resposta.status + (detalhe ? ": " + detalhe : ""));
  }
  const texto = await resposta.text();
  return texto ? JSON.parse(texto) : null;
}

const CABECALHO_JSON = { "Content-Type": "application/json" };

/* ---------- Operações HTTP ---------- */
// GET: busca todas as tarefas
async function buscarTarefas() {
  const dados = await requisicao(urlRecurso(), { method: "GET" });
  return Array.isArray(dados) ? dados : [];
}

// POST: cria uma tarefa e devolve o objeto criado (com _id)
async function criarTarefa(titulo) {
  return requisicao(urlRecurso(), {
    method: "POST",
    headers: CABECALHO_JSON,
    body: JSON.stringify({ titulo: titulo, concluida: false })
  });
}

// PUT: atualiza a tarefa inteira (o _id vai na URL, não no corpo)
async function atualizarTarefa(tarefa, mudancas) {
  const novo = {
    titulo: mudancas.titulo !== undefined ? mudancas.titulo : tarefa.titulo,
    concluida: mudancas.concluida !== undefined ? mudancas.concluida : tarefa.concluida
  };
  await requisicao(urlRecurso(tarefa._id), {
    method: "PUT",
    headers: CABECALHO_JSON,
    body: JSON.stringify(novo)
  });
  return novo;
}

// DELETE: exclui a tarefa
async function excluirTarefa(id) {
  await requisicao(urlRecurso(id), { method: "DELETE" });
}

/* ---------- Conexão ---------- */
async function conectar(valor) {
  const base = normalizarEndpoint(valor);
  if (!base) {
    mostrarStatus(statusConexao, "Endpoint inválido. Use o formato https://crudcrud.com/api/seu-codigo", "erro");
    return;
  }
  btnConectar.disabled = true;
  mostrarStatus(statusConexao, "Conectando...", "info");
  endpointBase = base;
  try {
    tarefas = await buscarTarefas(); // GET para testar a conexão
    try { localStorage.setItem(CHAVE_STORAGE, base); } catch (e) {}
    inputEndpoint.value = base;
    mostrarStatus(statusConexao, "Conectado com sucesso! ✔", "ok");
    secaoTarefas.hidden = false;
    mostrarMensagem("", "");
    renderizar();
  } catch (e) {
    endpointBase = "";
    secaoTarefas.hidden = true;
    mostrarStatus(statusConexao, e.message, "erro");
  } finally {
    btnConectar.disabled = false;
  }
}

function mostrarMensagem(texto, tipo) {
  mostrarStatus(mensagemEl, texto, tipo);
}

/* ---------- Renderização ---------- */
function tarefasFiltradas() {
  if (filtroAtual === "pendentes") return tarefas.filter(t => !t.concluida);
  if (filtroAtual === "concluidas") return tarefas.filter(t => t.concluida);
  return tarefas;
}

function renderizar() {
  const visiveis = tarefasFiltradas();
  listaEl.innerHTML = "";

  visiveis.forEach(t => listaEl.appendChild(criarItem(t)));

  vazioEl.hidden = visiveis.length > 0;
  const total = tarefas.length;
  const feitas = tarefas.filter(t => t.concluida).length;
  contadorEl.textContent = total + (total === 1 ? " tarefa" : " tarefas") + " · " + feitas + " concluída(s)";
}

function criarItem(t) {
  const li = document.createElement("li");
  li.className = "item" + (t.concluida ? " concluida" : "");

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = !!t.concluida;
  check.title = "Marcar como concluída";
  check.addEventListener("change", () => alternarConcluida(t, check));

  const titulo = document.createElement("span");
  titulo.className = "titulo";
  titulo.textContent = t.titulo; // textContent evita injetar HTML

  const acoes = document.createElement("div");
  acoes.className = "acoes";

  const btnEditar = document.createElement("button");
  btnEditar.type = "button";
  btnEditar.className = "btn-icone";
  btnEditar.textContent = "Editar";
  btnEditar.addEventListener("click", () => entrarModoEdicao(li, t));

  const btnExcluir = document.createElement("button");
  btnExcluir.type = "button";
  btnExcluir.className = "btn-icone excluir";
  btnExcluir.textContent = "Excluir";
  btnExcluir.addEventListener("click", () => removerTarefa(t, btnExcluir));

  acoes.append(btnEditar, btnExcluir);
  li.append(check, titulo, acoes);
  return li;
}

function entrarModoEdicao(li, t) {
  li.innerHTML = "";

  const campo = document.createElement("input");
  campo.type = "text";
  campo.value = t.titulo;
  campo.maxLength = 120;

  const acoes = document.createElement("div");
  acoes.className = "acoes";

  const btnSalvar = document.createElement("button");
  btnSalvar.type = "button";
  btnSalvar.className = "btn-icone salvar";
  btnSalvar.textContent = "Salvar";

  const btnCancelar = document.createElement("button");
  btnCancelar.type = "button";
  btnCancelar.className = "btn-icone";
  btnCancelar.textContent = "Cancelar";

  btnSalvar.addEventListener("click", () => salvarEdicao(t, campo, btnSalvar));
  btnCancelar.addEventListener("click", renderizar);
  campo.addEventListener("keydown", e => {
    if (e.key === "Enter") salvarEdicao(t, campo, btnSalvar);
    if (e.key === "Escape") renderizar();
  });

  acoes.append(btnSalvar, btnCancelar);
  li.append(campo, acoes);
  campo.focus();
}

/* ---------- Ações dos botões ---------- */
async function adicionar(titulo) {
  mostrarMensagem("Salvando na API...", "info");
  try {
    const criada = await criarTarefa(titulo); // POST
    // A API devolve o objeto com _id; se vier vazio, busca a lista de novo (GET)
    if (criada && criada._id) tarefas.push(criada);
    else tarefas = await buscarTarefas();
    mostrarMensagem("Tarefa adicionada!", "ok");
    renderizar();
  } catch (e) {
    mostrarMensagem(e.message, "erro");
  }
}

async function alternarConcluida(t, check) {
  check.disabled = true;
  try {
    const novo = await atualizarTarefa(t, { concluida: check.checked }); // PUT
    t.concluida = novo.concluida;
    mostrarMensagem("", "");
  } catch (e) {
    mostrarMensagem(e.message, "erro");
  }
  renderizar();
}

async function salvarEdicao(t, campo, botao) {
  const texto = campo.value.trim();
  if (!texto) {
    mostrarMensagem("O texto da tarefa não pode ficar vazio.", "erro");
    return;
  }
  botao.disabled = true;
  try {
    const novo = await atualizarTarefa(t, { titulo: texto }); // PUT
    t.titulo = novo.titulo;
    mostrarMensagem("Tarefa atualizada!", "ok");
  } catch (e) {
    mostrarMensagem(e.message, "erro");
  }
  renderizar();
}

async function removerTarefa(t, botao) {
  if (!confirm("Excluir a tarefa \"" + t.titulo + "\"?")) return;
  botao.disabled = true;
  try {
    await excluirTarefa(t._id); // DELETE
    tarefas = tarefas.filter(x => x._id !== t._id);
    mostrarMensagem("Tarefa excluída.", "ok");
  } catch (e) {
    mostrarMensagem(e.message, "erro");
  }
  renderizar();
}

async function atualizarDaApi() {
  btnAtualizar.disabled = true;
  mostrarMensagem("Buscando dados na API...", "info");
  try {
    tarefas = await buscarTarefas(); // GET
    mostrarMensagem("Lista atualizada a partir da API.", "ok");
    renderizar();
  } catch (e) {
    mostrarMensagem(e.message, "erro");
  } finally {
    btnAtualizar.disabled = false;
  }
}

/* ---------- Eventos ---------- */
formConexao.addEventListener("submit", e => {
  e.preventDefault();
  conectar(inputEndpoint.value);
});

formTarefa.addEventListener("submit", e => {
  e.preventDefault();
  const titulo = inputTarefa.value.trim();
  if (!titulo) return;
  inputTarefa.value = "";
  adicionar(titulo);
});

btnAtualizar.addEventListener("click", atualizarDaApi);

botoesFiltro.forEach(btn => {
  btn.addEventListener("click", () => {
    filtroAtual = btn.dataset.filtro;
    botoesFiltro.forEach(b => b.classList.toggle("ativo", b === btn));
    renderizar();
  });
});

/* Reconecta automaticamente se o endpoint já foi usado neste navegador */
(function iniciar() {
  let salvo = "";
  try { salvo = localStorage.getItem(CHAVE_STORAGE) || ""; } catch (e) {}
  if (salvo) {
    inputEndpoint.value = salvo;
    conectar(salvo);
  }
})();
