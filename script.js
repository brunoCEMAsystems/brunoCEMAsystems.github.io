// 1. CONFIGURAÇÃO DO BANCO DE DADOS
const supabaseUrl = "https://orqntyflqgnvslrpwfft.supabase.co";
const supabaseKey = "sb_publishable_jv3kIbTmNWn0rcErfz2FNQ_naG9Cmh7";

// Inicia a conexão
const banco = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. INICIALIZAÇÃO DO CARRINHO
// Tenta carregar o carrinho salvo no navegador, ou começa um vazio []
let carrinho = JSON.parse(localStorage.getItem("meu_carrinho")) || [];

// 3. FUNÇÃO PARA BUSCAR E DESENHAR OS PRODUTOS
async function carregarCatalogo() {
  let { data: produtos, error } = await banco.from("produtos").select("*");

  if (error) {
    console.error("Erro ao buscar dados:", error);
    return;
  }

  let vitrine = document.getElementById("vitrine");
  vitrine.innerHTML = ""; // Limpa a tela antes de desenhar

  produtos.forEach((item) => {
    let precoFormatado = Number(item.preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    let div = document.createElement("div");
    div.className = "card-produto";
    div.innerHTML = `
            <img src="${item.imagem_url}" width="150">
            <h3>${item.nome}</h3>
            <p class="preco-destaque">${precoFormatado}</p>
            <p class="uppercase">${item.categoria}</p>
            <p>Estoque: ${item.estoque}</p>
            <button class="btn-comprar" onclick="adicionarAoCarrinho('${item.nome}', ${item.preco})">
                Adicionar ao Carrinho
            </button>
        `;
    vitrine.appendChild(div);
  });
}

// 4. FUNÇÕES DO CARRINHO

// Adicionar item à lista
function adicionarAoCarrinho(nome, preco) {
  const item = { nome, preco };
  carrinho.push(item);
  atualizarCarrinho(); // Atualiza a interface e salva
}

// Atualizar a tela e o LocalStorage
function atualizarCarrinho() {
  const listaHtml = document.getElementById("lista-carrinho");
  const totalHtml = document.getElementById("valor-total");

  // Limpa o conteúdo atual da lista
  listaHtml.innerHTML = "";

  if (carrinho.length === 0) {
    listaHtml.innerHTML = "<p>Seu carrinho está vazio.</p>";
  }

  let somaTotal = 0;

  carrinho.forEach((item, index) => {
    somaTotal += item.preco;
    let li = document.createElement("li");
    li.innerText = `${item.nome} - R$ ${item.preco.toFixed(2)}`;
    listaHtml.appendChild(li);
  });

  // Atualiza o valor total formatado
  totalHtml.innerText = somaTotal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Salva no LocalStorage do navegador
  localStorage.setItem("meu_carrinho", JSON.stringify(carrinho));
}

// Limpar o carrinho
function esvaziarCarrinho() {
  if (confirm("Deseja realmente limpar o carrinho?")) {
    carrinho = [];
    atualizarCarrinho();
  }
}

// Finalizar Compra
function finalizarCompra() {
  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio!");
  } else {
    alert("Pedido finalizado com sucesso!");
    esvaziarCarrinho();
  }
}

// 5. EXECUÇÃO AO CARREGAR A PÁGINA
carregarCatalogo();
atualizarCarrinho();
