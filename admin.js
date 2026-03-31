// 1. CONFIGURAÇÃO DO BANCO (Igual fizemos na Fase 1)
const supabaseUrl = "https://orqntyflqgnvslrpwfft.supabase.co";
const supabaseKey = "sb_publishable_jv3kIbTmNWn0rcErfz2FNQ_naG9Cmh7";
const banco = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. FUNÇÃO DE CADASTRO
async function cadastrarProduto() {
  // Captura os valores digitados no HTML
  let nomeProduto = document.getElementById("input-nome").value;
  let precoProduto = document.getElementById("input-preco").value;
  let nomeCategoria = document.getElementById("input-categoria").value;
  let imagemProduto = document.getElementById("input-imagem").value;
  let aviso = document.getElementById("mensagem-aviso");

  // Validação de segurança básica
  if (nomeProduto === "" || precoProduto === "") {
    aviso.innerText = "Preencha todos os campos!";
    aviso.style.color = "red";
    return;
  }

  aviso.innerText = "Salvando na nuvem...";
  aviso.style.color = "blue";

  // Envia o comando INSERT para a tabela 'produtos' no Supabase
  let { error } = await banco.from("produtos").insert([
    {
      nome: nomeProduto,
      preco: precoProduto,
      categoria: nomeCategoria,
      imagem_url: imagemProduto,
    },
  ]);

  // Verifica se deu erro ou se foi sucesso
  if (error) {
    aviso.innerText = "Erro ao salvar: " + error.message;
    aviso.style.color = "red";
  } else {
    aviso.innerText = "Produto cadastrado com sucesso!";
    aviso.style.color = "green";

    // Limpa as caixas de texto para o próximo cadastro
    document.getElementById("input-nome").value = "";
    document.getElementById("input-preco").value = "";
    document.getElementById("input-categoria").value = "";
    document.getElementById("input-imagem").value = "";
  }
}

async function deletarProduto() {
  let nomeProduto = document.getElementById("input-nome").value;
  let aviso = document.getElementById("delete-aviso");

  if (nomeProduto === "") {
    aviso.innerText = "Preencha o nome do produto que você quer deletar";
    aviso.style.color = "red";
  }

  // Comando DELETE: Filtra pelo nome do produto
  const { error } = await banco
    .from("produtos")
    .delete()
    .eq("nome", nomeProduto);

  if (error) {
    aviso.innerText = "Erro ao salvar: " + error.message;
    aviso.style.color = "red";
  } else {
    aviso.innerText = "Produto deletado com sucesso!";
    aviso.style.color = "green";
  }
}

async function loginUsuario() {
  let nomeUser = document.getElementById("input-user").value;
  let senhaUser = document.getElementById("input-senha").value;

  const { error } = await banco
    .from("usuarios")
    .select("*")
    .eq("usuario", nomeUser)
    .eq("senha", senhaUser)
    .single();

  if (error) {
    alert("Usuário ou senha incorretos!");
    console.error("Erro na autenticação:", error?.message);
  } else {
    window.location.href = "admin.html";
  }
}
