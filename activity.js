document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formAtividade");
  const dataInput = document.getElementById("data");
  const corrigirDataBtn = document.getElementById("corrigirDataBtn");
  const manterDataBtn = document.getElementById("manterDataBtn");
  const modalElement = document.getElementById("confirmarDataModal");
  const dataModal = modalElement && window.bootstrap ? new bootstrap.Modal(modalElement) : null;
  const editarId = Number(localStorage.getItem(EDIT_KEY));
  const atividades = getActivities();
  const atividadeEditada = atividades.find((atividade) => atividade.id === editarId);
  let dataAnteriorConfirmada = "";
  let salvarDepoisDaConfirmacao = false;

  if (editarId && atividadeEditada) {
    document.getElementById("tituloPagina").textContent = "Editar atividade";
    document.title = "Editar atividade | Sistema de Lembrete Acadêmico";
    fillForm(atividadeEditada);
    if (isPastDate(atividadeEditada.data)) dataAnteriorConfirmada = atividadeEditada.data;
  } else if (editarId) {
    localStorage.removeItem(EDIT_KEY);
  }

  dataInput.addEventListener("change", () => {
    if (isPastDate(dataInput.value) && dataAnteriorConfirmada !== dataInput.value) {
      abrirConfirmacaoData(false);
    }
  });

  corrigirDataBtn.addEventListener("click", () => {
    dataAnteriorConfirmada = "";
    salvarDepoisDaConfirmacao = false;
    dataInput.value = "";
    dataModal.hide();
    dataInput.focus();
  });

  manterDataBtn.addEventListener("click", () => {
    dataAnteriorConfirmada = dataInput.value;
    dataModal.hide();
    showToast("Data anterior confirmada.", "warning");
    if (salvarDepoisDaConfirmacao) salvarAtividade();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateBootstrapForm(form)) return;

    if (isPastDate(dataInput.value) && dataAnteriorConfirmada !== dataInput.value) {
      abrirConfirmacaoData(true);
      return;
    }

    salvarAtividade();
  });

  function abrirConfirmacaoData(salvarDepois) {
    salvarDepoisDaConfirmacao = salvarDepois;
    if (dataModal) {
      dataModal.show();
      return;
    }

    const continuar = confirm("A data escolhida é anterior à data de hoje. Deseja continuar mesmo assim?");
    if (continuar) {
      dataAnteriorConfirmada = dataInput.value;
      if (salvarDepoisDaConfirmacao) salvarAtividade();
    } else {
      dataInput.value = "";
      dataInput.focus();
    }
  }

  function salvarAtividade() {
    const atividade = {
      id: atividadeEditada ? atividadeEditada.id : Date.now(),
      titulo: document.getElementById("titulo").value.trim(),
      disciplina: document.getElementById("disciplina").value.trim(),
      data: dataInput.value,
      prioridade: document.getElementById("prioridade").value,
      descricao: document.getElementById("descricao").value.trim(),
      link: normalizeLink(document.getElementById("link").value),
      concluida: atividadeEditada ? atividadeEditada.concluida : false
    };

    const atualizadas = atividadeEditada
      ? atividades.map((item) => item.id === atividadeEditada.id ? atividade : item)
      : [...atividades, atividade];

    saveActivities(atualizadas);
    localStorage.removeItem(EDIT_KEY);
    showToast("Atividade salva com sucesso!");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 650);
  }
});

function isPastDate(data) {
  return data && parseLocalDate(data) < todayDate();
}

function fillForm(atividade) {
  document.getElementById("titulo").value = atividade.titulo;
  document.getElementById("disciplina").value = atividade.disciplina;
  document.getElementById("data").value = atividade.data;
  document.getElementById("prioridade").value = atividade.prioridade;
  document.getElementById("descricao").value = atividade.descricao;
  document.getElementById("link").value = atividade.link || "";
}

