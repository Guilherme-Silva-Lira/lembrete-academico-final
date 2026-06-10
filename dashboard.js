const elements = {};
const CURRENT_USER_KEY = "usuarioAtual";

function initDashboard() {
  ["listaAtividades", "pesquisa", "filtroDisciplina", "filtroPrioridade", "filtroStatus", "dataInicio", "dataFim", "ordenacao", "limparFiltros", "resultadoTexto", "alerta", "proximaEntrega", "totalAtividades", "pendentes", "atrasadas", "concluidas", "progressPercent", "progressBar", "progressText", "boasVindas", "logoutLink", "ativarNotificacoes", "exportarCsv", "exportarJson", "limparAtividades", "notificationStatus"].forEach((id) => {
    elements[id] = document.getElementById(id);
  });

  showCurrentUser();
  populateDisciplineFilter(getActivities());

  ["pesquisa", "filtroDisciplina", "filtroPrioridade", "filtroStatus", "dataInicio", "dataFim", "ordenacao"].forEach((id) => {
    elements[id].addEventListener("input", renderDashboard);
    elements[id].addEventListener("change", renderDashboard);
  });

  elements.listaAtividades.addEventListener("click", handleActivityAction);
  elements.limparFiltros.addEventListener("click", clearFilters);
  elements.logoutLink.addEventListener("click", () => localStorage.removeItem(CURRENT_USER_KEY));
  elements.ativarNotificacoes.addEventListener("click", enableNotifications);
  elements.exportarCsv.addEventListener("click", exportCsv);
  elements.exportarJson.addEventListener("click", exportJson);
  elements.limparAtividades.addEventListener("click", clearAllActivities);
  updateNotificationStatus();
  notifyDueActivities(getActivities());
  renderDashboard();
}

function showCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    if (user?.nome) {
      elements.boasVindas.textContent = `Olá, ${user.nome.split(" ")[0]}! Acompanhe seus prazos, prioridades e progresso acadêmico.`;
    }
  } catch {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

function populateDisciplineFilter(activities) {
  const selected = elements.filtroDisciplina.value || "todas";
  const disciplines = [...new Set(activities.map((item) => item.disciplina.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  elements.filtroDisciplina.innerHTML = [
    '<option value="todas">Todas</option>',
    ...disciplines.map((discipline) => `<option value="${escapeHtml(discipline)}">${escapeHtml(discipline)}</option>`)
  ].join("");

  elements.filtroDisciplina.value = disciplines.includes(selected) ? selected : "todas";
}

function clearFilters() {
  elements.pesquisa.value = "";
  elements.filtroDisciplina.value = "todas";
  elements.filtroPrioridade.value = "todas";
  elements.filtroStatus.value = "todos";
  elements.dataInicio.value = "";
  elements.dataFim.value = "";
  elements.ordenacao.value = "prioridade";
  renderDashboard();
}

function handleActivityAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "complete") completeActivity(id);
  if (button.dataset.action === "reopen") reopenActivity(id);
  if (button.dataset.action === "edit") editActivity(id);
  if (button.dataset.action === "delete") deleteActivity(id);
}

function renderDashboard() {
  const atividades = sortActivities(getActivities());
  saveActivities(atividades);
  populateDisciplineFilter(atividades);
  const filtradas = atividades.filter(matchesFilters);
  updateMetrics(atividades);
  updateNextDelivery(atividades);
  updateAlert(atividades);
  renderActivities(filtradas);
}

function sortActivities(atividades) {
  const order = elements.ordenacao?.value || "prioridade";
  return [...atividades].sort((a, b) => {
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
    if (order === "titulo") return a.titulo.localeCompare(b.titulo, "pt-BR");
    if (order === "data") return parseLocalDate(a.data) - parseLocalDate(b.data);
    const prioridade = priorityWeight(a.prioridade) - priorityWeight(b.prioridade);
    if (prioridade !== 0) return prioridade;
    return parseLocalDate(a.data) - parseLocalDate(b.data);
  });
}

function matchesFilters(atividade) {
  const query = elements.pesquisa.value.trim().toLowerCase();
  const discipline = elements.filtroDisciplina.value;
  const priority = elements.filtroPrioridade.value;
  const status = elements.filtroStatus.value;
  const start = elements.dataInicio.value;
  const end = elements.dataFim.value;
  const haystack = `${atividade.titulo} ${atividade.disciplina} ${atividade.descricao}`.toLowerCase();

  if (query && !haystack.includes(query)) return false;
  if (discipline !== "todas" && atividade.disciplina !== discipline) return false;
  if (priority !== "todas" && atividade.prioridade !== priority) return false;
  if (start && parseLocalDate(atividade.data) < parseLocalDate(start)) return false;
  if (end && parseLocalDate(atividade.data) > parseLocalDate(end)) return false;
  if (status === "pendente" && (atividade.concluida || isLate(atividade))) return false;
  if (status === "atrasada" && !isLate(atividade)) return false;
  if (status === "concluida" && !atividade.concluida) return false;
  return true;
}

function updateMetrics(atividades) {
  const total = atividades.length;
  const concluidas = atividades.filter((atividade) => atividade.concluida).length;
  const atrasadas = atividades.filter(isLate).length;
  const pendentes = atividades.filter((atividade) => !atividade.concluida).length;
  const percent = total ? Math.round((concluidas / total) * 100) : 0;
  elements.totalAtividades.textContent = total;
  elements.pendentes.textContent = pendentes;
  elements.atrasadas.textContent = atrasadas;
  elements.concluidas.textContent = concluidas;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressBar.setAttribute("aria-valuenow", String(percent));
  elements.progressText.textContent = total ? `${concluidas} de ${total} atividade(s) concluída(s).` : "Nenhuma atividade cadastrada.";
}

function updateNextDelivery(atividades) {
  const proxima = [...atividades].filter((atividade) => !atividade.concluida).sort((a, b) => parseLocalDate(a.data) - parseLocalDate(b.data))[0];
  if (!proxima) {
    elements.proximaEntrega.innerHTML = `<div class="alert alert-success mb-0">Nenhuma atividade pendente.</div>`;
    return;
  }
  const deadline = getDeadlineInfo(proxima);
  elements.proximaEntrega.innerHTML = `<h3 class="h5 mb-2">${escapeHtml(proxima.titulo)}</h3><p class="mb-1"><i class="bi bi-journal-text me-2 text-primary"></i>${escapeHtml(proxima.disciplina)}</p><p class="mb-2"><i class="bi bi-calendar2-week me-2 text-primary"></i>${formatDate(proxima.data)}</p><span class="deadline-badge ${deadline.className}"><i class="bi bi-${deadline.icon}"></i>${deadline.label}</span>`;
}

function updateAlert(atividades) {
  const atrasadas = atividades.filter(isLate).length;
  const hoje = atividades.filter((item) => !item.concluida && daysUntil(item.data) === 0).length;
  const amanha = atividades.filter((item) => !item.concluida && daysUntil(item.data) === 1).length;
  const alerts = [];

  if (atrasadas > 0) alerts.push(`<div class="alert alert-danger shadow-sm mb-2"><i class="bi bi-exclamation-triangle me-2"></i>Você possui <strong>${atrasadas}</strong> atividade(s) atrasada(s).</div>`);
  if (hoje > 0) alerts.push(`<div class="alert alert-warning shadow-sm mb-2"><i class="bi bi-alarm me-2"></i><strong>${hoje}</strong> atividade(s) vence(m) hoje.</div>`);
  if (amanha > 0) alerts.push(`<div class="alert alert-info shadow-sm mb-2"><i class="bi bi-calendar-event me-2"></i><strong>${amanha}</strong> atividade(s) vence(m) amanhã.</div>`);
  if (alerts.length === 0) alerts.push(`<div class="alert alert-success shadow-sm mb-0"><i class="bi bi-check2-circle me-2"></i>Você está em dia com suas atividades.</div>`);

  elements.alerta.innerHTML = alerts.join("");
}

function renderActivities(atividades) {
  elements.resultadoTexto.textContent = `${atividades.length} ${atividades.length === 1 ? "atividade encontrada" : "atividades encontradas"}.`;
  if (atividades.length === 0) {
    elements.listaAtividades.innerHTML = `<div class="empty-state"><i class="bi bi-inbox fs-1 text-secondary"></i><h3 class="h5 mt-3">Nenhuma atividade encontrada</h3><p class="text-secondary mb-3">Ajuste os filtros ou cadastre uma nova atividade.</p><a href="atividade.html" class="btn btn-primary">Cadastrar atividade</a></div>`;
    return;
  }
  elements.listaAtividades.innerHTML = atividades.map(activityCard).join("");
}

function activityCard(atividade) {
  const late = isLate(atividade);
  const status = atividade.concluida ? { label: "Concluída", className: "bg-success", icon: "check2-circle" } : late ? { label: "Atrasada", className: "bg-danger", icon: "exclamation-triangle" } : { label: "Em dia", className: "bg-primary", icon: "clock" };
  const deadline = getDeadlineInfo(atividade);
  const materialLink = atividade.link ? `<a class="btn btn-outline-info" href="${escapeHtml(atividade.link)}" target="_blank" rel="noopener noreferrer" title="Abrir material"><i class="bi bi-link-45deg"></i></a>` : "";
  const statusButton = atividade.concluida ? `<button class="btn btn-outline-light" type="button" title="Marcar como pendente" data-action="reopen" data-id="${atividade.id}"><i class="bi bi-arrow-counterclockwise"></i></button>` : `<button class="btn btn-success" type="button" title="Concluir" data-action="complete" data-id="${atividade.id}"><i class="bi bi-check-lg"></i></button>`;
  return `<article class="activity-card ${late ? "is-late" : ""} ${atividade.concluida ? "is-done" : ""}"><div class="d-flex justify-content-between gap-3 flex-wrap"><div class="flex-grow-1"><div class="d-flex align-items-center gap-2 flex-wrap mb-2"><h3 class="mb-0">${escapeHtml(atividade.titulo)}</h3><span class="badge badge-prioridade ${priorityClass(atividade.prioridade)}">${escapeHtml(atividade.prioridade)}</span><span class="badge ${status.className}"><i class="bi bi-${status.icon} me-1"></i>${status.label}</span></div><p class="text-secondary mb-3">${escapeHtml(atividade.descricao)}</p><div class="d-flex flex-wrap gap-3 text-secondary small mb-3"><span><i class="bi bi-journal-text me-1"></i><strong>Disciplina:</strong> ${escapeHtml(atividade.disciplina)}</span><span><i class="bi bi-calendar2-week me-1"></i><strong>Entrega:</strong> ${formatDate(atividade.data)}</span></div><span class="deadline-badge ${deadline.className}"><i class="bi bi-${deadline.icon}"></i>${deadline.label}</span></div><div class="action-buttons d-flex gap-2 align-items-start">${materialLink}${statusButton}<button class="btn btn-warning" type="button" title="Editar" data-action="edit" data-id="${atividade.id}"><i class="bi bi-pencil-square"></i></button><button class="btn btn-danger" type="button" title="Excluir" data-action="delete" data-id="${atividade.id}"><i class="bi bi-trash"></i></button></div></div></article>`;
}

function daysUntil(data) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseLocalDate(data) - todayDate()) / millisecondsPerDay);
}

function getDeadlineInfo(atividade) {
  if (atividade.concluida) return { label: "Atividade finalizada", className: "deadline-done", icon: "check2-circle" };

  const difference = daysUntil(atividade.data);

  if (difference < 0) {
    const days = Math.abs(difference);
    return { label: `Atrasada há ${days} ${days === 1 ? "dia" : "dias"}`, className: "deadline-late", icon: "exclamation-circle" };
  }
  if (difference === 0) return { label: "Entrega hoje", className: "deadline-soon", icon: "alarm" };
  if (difference === 1) return { label: "Entrega amanhã", className: "deadline-soon", icon: "alarm" };
  if (difference <= 3) return { label: `Faltam ${difference} dias`, className: "deadline-soon", icon: "hourglass-split" };
  return { label: `Faltam ${difference} dias`, className: "deadline-ok", icon: "calendar-check" };
}

function completeActivity(id) {
  const atividades = getActivities();
  const atividade = atividades.find((item) => item.id === Number(id));
  if (atividade) atividade.concluida = true;
  saveActivities(atividades);
  showToast("Atividade concluída com sucesso!");
  renderDashboard();
}

function reopenActivity(id) {
  const atividades = getActivities();
  const atividade = atividades.find((item) => item.id === Number(id));
  if (atividade) atividade.concluida = false;
  saveActivities(atividades);
  showToast("Atividade marcada como pendente.", "info");
  renderDashboard();
}

function deleteActivity(id) {
  if (!confirm("Deseja excluir esta atividade?")) return;
  const atividades = getActivities().filter((atividade) => atividade.id !== Number(id));
  saveActivities(atividades);
  showToast("Atividade excluída.", "warning");
  renderDashboard();
}

function editActivity(id) {
  localStorage.setItem(EDIT_KEY, String(id));
  window.location.href = "atividade.html";
}

function clearAllActivities() {
  const atividades = getActivities();
  if (atividades.length === 0) {
    showToast("Não há atividades para limpar.", "info");
    return;
  }
  if (!confirm(`Tem certeza que deseja excluir todas as ${atividades.length} atividades? Esta ação não pode ser desfeita.`)) return;
  saveActivities([]);
  showToast("Todas as atividades foram excluídas.", "warning");
  renderDashboard();
}

function exportCsv() {
  const atividades = getActivities();
  if (atividades.length === 0) {
    showToast("Cadastre uma atividade antes de exportar.", "info");
    return;
  }
  const headers = ["Título", "Disciplina", "Data", "Prioridade", "Status", "Descrição", "Link"];
  const rows = atividades.map((item) => [item.titulo, item.disciplina, item.data, item.prioridade, item.concluida ? "Concluída" : "Pendente", item.descricao, item.link]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
  downloadFile(`atividades-${dateStamp()}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  showToast("Arquivo CSV exportado.");
}

function exportJson() {
  const atividades = getActivities();
  if (atividades.length === 0) {
    showToast("Cadastre uma atividade antes de exportar.", "info");
    return;
  }
  downloadFile(`atividades-${dateStamp()}.json`, JSON.stringify(atividades, null, 2), "application/json");
  showToast("Arquivo JSON exportado.");
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    showToast("Este navegador não oferece notificações.", "warning");
    return;
  }
  const permission = await Notification.requestPermission();
  updateNotificationStatus();
  if (permission === "granted") {
    showToast("Notificações ativadas!");
    notifyDueActivities(getActivities(), true);
  } else {
    showToast("Permissão de notificações não concedida.", "warning");
  }
}

function updateNotificationStatus() {
  if (!("Notification" in window)) {
    elements.notificationStatus.textContent = "Notificações indisponíveis neste navegador.";
    return;
  }
  const labels = { granted: "Notificações ativadas.", denied: "Notificações bloqueadas no navegador.", default: "Notificações desativadas." };
  elements.notificationStatus.textContent = labels[Notification.permission];
}

function notifyDueActivities(atividades, force = false) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const key = "ultimaNotificacaoAcademica";
  const today = dateStamp();
  if (!force && localStorage.getItem(key) === today) return;

  const urgent = atividades.filter((item) => !item.concluida && daysUntil(item.data) <= 1);
  if (urgent.length === 0) return;

  const atrasadas = urgent.filter(isLate).length;
  const proximas = urgent.length - atrasadas;
  new Notification("Lembrete Acadêmico", {
    body: `${atrasadas} atrasada(s) e ${proximas} entrega(s) para hoje ou amanhã.`,
    icon: "logo-icon.png"
  });
  localStorage.setItem(key, today);
}

document.addEventListener("DOMContentLoaded", initDashboard);

