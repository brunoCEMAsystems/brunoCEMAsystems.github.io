//==========FUNÇÃO PARA CADASTRAR PRODUTO==========//

const supabaseUrl = "https://orqntyflqgnvslrpwfft.supabase.co";
const supabaseKey = "sb_publishable_jv3kIbTmNWn0rcErfz2FNQ_naG9Cmh7";
const banco = window.supabase.createClient(supabaseUrl, supabaseKey);

async function cadastrarProduto() {
  let nomeProduto = document.getElementById("input-nome").value;
  let precoProduto = document.getElementById("input-preco").value;
  let estoqueProduto = document.getElementById("input-estoque").value;
  let nomeCategoria = document.getElementById("input-categoria").value;
  let imagemProduto = document.getElementById("input-imagem").value;
  let aviso = document.getElementById("mensagem-aviso");

  if (nomeProduto === "" || precoProduto === "") {
    aviso.innerText = "Preencha todos os campos!";
    aviso.style.color = "red";
    return;
  }

  aviso.innerText = "Salvando na nuvem...";
  aviso.style.color = "blue";

  let { error } = await banco.from("produtos").insert([
    {
      nome: nomeProduto,
      preco: precoProduto,
      estoque: estoqueProduto,
      categoria: nomeCategoria,
      imagem_url: imagemProduto,
    },
  ]);

  if (error) {
    aviso.innerText = "Erro ao salvar: " + error.message;
    aviso.style.color = "red";
  } else {
    aviso.innerText = "Produto cadastrado com sucesso!";
    aviso.style.color = "green";

    document.getElementById("input-nome").value = "";
    document.getElementById("input-preco").value = "";
    document.getElementById("input-estoque").value = "";
    document.getElementById("input-categoria").value = "";
    document.getElementById("input-imagem").value = "";
  }
}

//==========FUNÇÃO PARA DELETAR PRODUTO===========//

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

    document.getElementById("input-nome").value = "";
    document.getElementById("delete-aviso").value = "";
  }
}

//==========FUNÇÃO PARA LOGIN==========//

async function loginUsuario() {
  let nomeUser = document.getElementById("input-user").value;
  let senhaUser = document.getElementById("input-senha").value;

  const { error } = await banco
    .from("usuarios")
    .select("*")
    .eq("usuario", nomeUser) //Usuário: sa
    .eq("senha", senhaUser) // Senha: 1234
    .single();

  if (error) {
    alert("Usuário ou senha incorretos!");
    console.error("Erro na autenticação:", error?.message);
  } else {
    window.location.href = "admin.html";
  }
}

//==========FUNÇÃO PARA CADASTRAR CLIENTE==========//

async function cadastrarCliente() {
  let nomeCliente = document.getElementById("nome-cliente").value;
  let emailCliente = document.getElementById("email-cliente").value;
  let cpfCliente = document.getElementById("cpf-cliente").value;
  let telefoneCliente = document.getElementById("telefone-cliente").value;
  let nascimentoCliente = document.getElementById("nascimento-cliente").value;
  let avisoCliente = document.getElementById("mensagem-cliente");

  if (nomeCliente === "" || nascimentoCliente === "" || cpfCliente === "") {
    avisoCliente.innerText = "Preencha o nome, CPF e a data de nascimento!";
    avisoCliente.style.color = "red";
    return;
  }

  avisoCliente.innerText = "Salvando na nuvem...";
  avisoCliente.style.color = "blue";

  const { error } = await banco.from("clientes").insert([
    {
      nome: nomeCliente,
      email: emailCliente,
      cpf_cnpj: cpfCliente,
      telefone: telefoneCliente,
      data_nascimento: nascimentoCliente,
    },
  ]);

  if (error) {
    avisoCliente.innerText = "Erro ao salvar: " + error.message;
    avisoCliente.style.color = "red";
  } else {
    avisoCliente.innerText = "Cliente cadastrado com sucesso!";
    avisoCliente.style.color = "green";

    document.getElementById("nome-cliente").value = "";
    document.getElementById("email-cliente").value = "";
    document.getElementById("cpf-cliente").value = "";
    document.getElementById("telefone-cliente").value = "";
    document.getElementById("nascimento-cliente").value = "";
    document.getElementById("mensagem-cliente").value = "";
  }
}
