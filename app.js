const STORAGE_KEY = "atividades";
const EDIT_KEY = "editarId";
const THEME_KEY = "temaPreferido";

applySavedTheme();
document.addEventListener("DOMContentLoaded", createThemeToggle);

function getActivities() {
  try {
    const atividades = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return atividades.map(normalizeActivity);
  } catch {
    return [];
  }
}

function saveActivities(atividades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atividades.map(normalizeActivity)));
}

function normalizeActivity(atividade) {
  return {
    id: Number(atividade.id) || Date.now(),
    titulo: atividade.titulo || "Sem título",
    disciplina: atividade.disciplina || "Sem disciplina",
    data: atividade.data || new Date().toISOString().slice(0, 10),
    prioridade: normalizePriority(atividade.prioridade),
    descricao: atividade.descricao || "Sem descrição.",
    link: normalizeLink(atividade.link),
    concluida: atividade.concluida === true
  };
}

function normalizePriority(prioridade) {
  const value = String(prioridade || "").trim().toLowerCase();
  if (value.includes("alta")) return "Alta";
  if (value.includes("m") || value.includes("dia")) return "Média";
  return "Baixa";
}

function normalizeLink(link) {
  const value = String(link || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function parseLocalDate(value) {
  return new Date(`${value}T00:00:00`);
}

function todayDate() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function formatDate(value) {
  if (!value) return "Sem data";
  return parseLocalDate(value).toLocaleDateString("pt-BR");
}

function isLate(atividade) {
  return !atividade.concluida && parseLocalDate(atividade.data) < todayDate();
}

function priorityWeight(prioridade) {
  return { Alta: 1, Média: 2, Baixa: 3 }[normalizePriority(prioridade)] || 4;
}

function priorityClass(prioridade) {
  return { Alta: "prioridade-alta", Média: "prioridade-media", Baixa: "prioridade-baixa" }[normalizePriority(prioridade)] || "prioridade-baixa";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message, variant = "success") {
  const container = document.getElementById("toastContainer");
  if (!container || !window.bootstrap) {
    alert(message);
    return;
  }
  const toast = document.createElement("div");
  toast.className = `toast text-bg-${variant}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button></div>`;
  container.appendChild(toast);
  const instance = new bootstrap.Toast(toast, { delay: 2600 });
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  instance.show();
}

function validateBootstrapForm(form) {
  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    return false;
  }
  return true;
}

function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  document.documentElement.setAttribute("data-bs-theme", saved);
}

function createThemeToggle() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn theme-toggle";
  button.setAttribute("aria-label", "Alternar tema claro e escuro");
  button.title = "Alternar tema";
  button.addEventListener("click", toggleTheme);
  document.body.appendChild(button);
  updateThemeButton(button);
}

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-bs-theme", next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeButton(document.querySelector(".theme-toggle"));
}

function updateThemeButton(button) {
  if (!button) return;
  const dark = document.documentElement.getAttribute("data-bs-theme") === "dark";
  button.innerHTML = `<i class="bi bi-${dark ? "sun" : "moon-stars"}"></i>`;
}
