const USERS_KEY = "usuarios";
const CURRENT_USER_KEY = "usuarioAtual";
const REMEMBERED_EMAIL_KEY = "emailLembrado";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const cadastroForm = document.getElementById("cadastroForm");

  if (loginForm) initializeLogin(loginForm);
  if (cadastroForm) initializeRegistration(cadastroForm);
});

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function initializeLogin(form) {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("senha");
  const rememberInput = document.getElementById("remember");
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);

  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberInput.checked = true;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    emailInput.setCustomValidity("");
    passwordInput.setCustomValidity("");
    if (!validateBootstrapForm(form)) return;

    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;
    const user = getUsers().find((item) => item.email === email && item.senha === password);

    if (!user) {
      passwordInput.setCustomValidity("E-mail ou senha incorretos.");
      form.classList.add("was-validated");
      showToast("E-mail ou senha incorretos. Cadastre-se primeiro.", "danger");
      setTimeout(() => passwordInput.setCustomValidity(""), 800);
      return;
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ nome: user.nome, email: user.email }));
    if (rememberInput.checked) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

    showToast(`Bem-vindo, ${user.nome.split(" ")[0]}!`);
    setTimeout(() => { window.location.href = "dashboard.html"; }, 650);
  });
}

function initializeRegistration(form) {
  const nameInput = document.getElementById("nome");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("senha");
  const confirmInput = document.getElementById("confirmarSenha");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    emailInput.setCustomValidity("");
    confirmInput.setCustomValidity("");
    if (!validateBootstrapForm(form)) return;

    const email = normalizeEmail(emailInput.value);
    const users = getUsers();

    if (users.some((user) => user.email === email)) {
      emailInput.setCustomValidity("Este e-mail já está cadastrado.");
      form.classList.add("was-validated");
      showToast("Este e-mail já possui uma conta.", "warning");
      setTimeout(() => emailInput.setCustomValidity(""), 800);
      return;
    }

    if (passwordInput.value !== confirmInput.value) {
      confirmInput.setCustomValidity("As senhas não coincidem.");
      form.classList.add("was-validated");
      showToast("As senhas não coincidem.", "danger");
      setTimeout(() => confirmInput.setCustomValidity(""), 800);
      return;
    }

    users.push({
      id: Date.now(),
      nome: nameInput.value.trim(),
      email,
      senha: passwordInput.value
    });
    saveUsers(users);
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email);

    showToast("Cadastro realizado! Agora entre com sua conta.");
    setTimeout(() => { window.location.href = "index.html"; }, 850);
  });
}
