const STORAGE_KEY = "portalIndicacoesDemo_v2";
const PROFILE_KEY = "portalIndicacoesProfile_v2";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let selectedImageData = "";
let toastTimeout;

// CARREGAR E SALVAR DADOS

function loadProtocols() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveProtocols(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// SEGURANÇA BÁSICA PARA EXIBIÇÃO DE TEXTO

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// AVISOS NA TELA

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3600);
}

// VERIFICAR SE O CADASTRO ESTÁ COMPLETO

function profileComplete(profile = loadProfile()) {
  return Boolean(
    profile.nome?.trim() &&
    profile.cep?.trim() &&
    profile.bairro?.trim() &&
    profile.rua?.trim() &&
    profile.numero?.trim() &&
    profile.telefone?.trim()
  );
}

// NAVEGAÇÃO ENTRE AS TELAS

function goToView(name) {
  const target = name === "perfil" ? "perfil" : name;

  // Exige cadastro antes de criar uma indicação.
  if (target === "nova" && !profileComplete()) {
    showToast("Para registrar uma indicação, faça seu cadastro primeiro.");
    goToView("perfil");
    return;
  }

  $$(".view").forEach((view) => {
    view.classList.toggle("hidden", view.id !== `view-${target}`);
  });

  $$(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === target);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (target === "protocolos") renderProtocols();
  if (target === "inicio") renderHome();
  if (target === "publicas") renderPublicProtocols();
  if (target === "nova") renderCitizenSummary();
}

$$("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    goToView(button.dataset.view);
  });
});

$("#profileButton").addEventListener("click", () => {
  goToView("perfil");
});

$("#profileQuick").addEventListener("click", () => {
  goToView("perfil");
});

// FORMATAÇÃO E STATUS DOS PROTOCOLOS

function formatDate(iso) {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function statusClass(status) {
  if (status === "Aceito") return "status-aceito";
  if (status === "Não aprovado") return "status-nao-aprovado";

  return "";
}

// MONTAR OS CARTÕES DE PROTOCOLO

function protocolMarkup(item, showDetails = true, publicView = false) {
  const location = [
    item.rua,
    item.numero ? `nº ${item.numero}` : "",
    item.bairro
  ].filter(Boolean).join(", ");

  return `
    <article class="protocol-item">
      <div>
        <div class="protocol-topline">
          <span class="protocol-id">
            ${escapeHTML(item.id)}
          </span>

          <span class="status ${statusClass(item.status)}">
            ${escapeHTML(item.status)}
          </span>
        </div>

        <h3>${escapeHTML(item.assunto)}</h3>

        <p>
          <strong>Local:</strong>
          ${escapeHTML(location || "Local não informado")}
        </p>

        ${
          publicView
            ? `<p><strong>Morador:</strong> Indicação comunitária</p>`
            : ""
        }

        ${
          showDetails
            ? `
              <div class="protocol-detail">
                <strong>Justificativa:</strong>
                <p>${escapeHTML(item.justificativa)}</p>

                ${
                  item.imageName
                    ? `<p><strong>Foto anexada:</strong> ${escapeHTML(item.imageName)}</p>`
                    : ""
                }

                ${
                  item.imageData && publicView
                    ? `
                      <img
                        class="public-photo"
                        src="${item.imageData}"
                        alt="Foto anexada à indicação"
                        loading="lazy"
                      >
                    `
                    : ""
                }
              </div>
            `
            : ""
        }
      </div>

      <div class="protocol-meta">
        <strong>Enviado em ${formatDate(item.data)}</strong>
        <span>Atualização: ${escapeHTML(item.status)}</span>
      </div>
    </article>
  `;
}

function emptyMarkup() {
  return `
    <div class="empty-state">
      <div class="empty-icon">▤</div>
      <h3>Nenhuma indicação encontrada</h3>
      <p>
        Quando houver indicações registradas,
        elas aparecerão aqui para acompanhamento.
      </p>
      <button class="button button-primary" data-view="nova">
        Registrar indicação
      </button>
    </div>
  `;
}

function bindViewButtons(root) {
  root.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      goToView(button.dataset.view);
    });
  });
}

// ATUALIZAR A PÁGINA INICIAL

function renderHome() {
  const items = loadProtocols().sort(
    (a, b) => new Date(b.data) - new Date(a.data)
  );

  $("#statTotal").textContent = items.length;

  $("#statPending").textContent = items.filter(
    (item) => item.status === "Em espera"
  ).length;

  $("#statAccepted").textContent = items.filter(
    (item) => item.status === "Aceito"
  ).length;

  $("#recentList").innerHTML = items.length
    ? items.slice(0, 3).map((item) => protocolMarkup(item, false)).join("")
    : emptyMarkup();

  bindViewButtons($("#recentList"));
}

// MOSTRAR OS PROTOCOLOS

function renderProtocols() {
  const search = ($("#protocolSearch").value || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const status = $("#statusFilter").value;

  const items = loadProtocols()
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .filter((item) => {
      const text = `
        ${item.id}
        ${item.assunto}
        ${item.bairro}
        ${item.rua}
      `.toLocaleLowerCase("pt-BR");

      return (!search || text.includes(search)) &&
        (!status || item.status === status);
    });

  $("#allProtocols").innerHTML = items.length
    ? items.map((item) => protocolMarkup(item, true)).join("")
    : emptyMarkup();

  bindViewButtons($("#allProtocols"));
}

// ABA PÚBLICA: SOMENTE VISUALIZAÇÃO

function renderPublicProtocols() {
  const items = loadProtocols().sort(
    (a, b) => new Date(b.data) - new Date(a.data)
  );

  $("#publicProtocols").innerHTML = items.length
    ? items.map((item) => protocolMarkup(item, true, true)).join("")
    : `
      <div class="empty-state">
        <div class="empty-icon">▤</div>
        <h3>Ainda não há indicações públicas</h3>
        <p>
          As indicações registradas serão exibidas aqui para consulta.
        </p>
      </div>
    `;
}

// PESQUISA E FILTRO

$("#protocolSearch").addEventListener("input", renderProtocols);
$("#statusFilter").addEventListener("change", renderProtocols);

// CONTROLE DA FOTO

function resetImage() {
  selectedImageData = "";

  $("#foto").value = "";
  $("#imagePreview").src = "";

  $("#imagePreviewWrap").classList.add("hidden");
  $("#uploadBox .upload-label").classList.remove("hidden");

  $("#foto").required = true;
}

$("#foto").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Selecione um arquivo de imagem válido.");
    resetImage();
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showToast("A imagem deve ter no máximo 5 MB.");
    resetImage();
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    selectedImageData = String(reader.result || "");

    $("#imagePreview").src = selectedImageData;
    $("#fileName").textContent = file.name;

    $("#fileSize").textContent =
      `${(file.size / 1024 / 1024).toFixed(2)} MB`;

    $("#imagePreviewWrap").classList.remove("hidden");
    $("#uploadBox .upload-label").classList.add("hidden");
  };

  reader.onerror = () => {
    showToast("Não foi possível ler a imagem. Tente novamente.");
    resetImage();
  };

  reader.readAsDataURL(file);
});

$("#removeImage").addEventListener("click", resetImage);

// CONTADOR DE CARACTERES

$("#justificativa").addEventListener("input", () => {
  $("#charCount").textContent =
    `${$("#justificativa").value.length}/1500`;
});

// EXIBIR OS DADOS CADASTRADOS ANTES DA INDICAÇÃO

function renderCitizenSummary() {
  const profile = loadProfile();
  const summary = $("#citizenSummary");

  if (!profileComplete(profile)) {
    summary.innerHTML = `
      <p>
        Para registrar uma indicação, preencha primeiro seu cadastro
        com nome, CEP, bairro, rua, número e telefone.
      </p>

      <button
        type="button"
        class="button button-outline"
        data-view="perfil"
      >
        Cadastrar meus dados
      </button>
    `;

    bindViewButtons(summary);
    return;
  }

  summary.innerHTML = `
    <p>
      <strong>Cadastro identificado:</strong>
      ${escapeHTML(profile.nome)} · ${escapeHTML(profile.telefone)}
    </p>

    <p>
      ${escapeHTML(profile.rua)}, nº ${escapeHTML(profile.numero)}
      — ${escapeHTML(profile.bairro)}, CEP ${escapeHTML(profile.cep)}
    </p>

    <button type="button" class="text-button" data-view="perfil">
      Atualizar cadastro
    </button>
  `;

  bindViewButtons(summary);
}

// ENVIAR NOVA INDICAÇÃO

$("#indicationForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = event.currentTarget;

  if (!profileComplete()) {
    showToast("Faça seu cadastro antes de enviar a indicação.");
    goToView("perfil");
    return;
  }

  if (!form.reportValidity()) return;

  if (!selectedImageData) {
    showToast("A foto é obrigatória. Selecione uma imagem antes de enviar.");
    $("#foto").focus();
    return;
  }

  const file = $("#foto").files[0];

  if (!file || file.size > MAX_FILE_SIZE) {
    showToast("Escolha uma imagem válida de até 5 MB.");
    return;
  }

  const profile = loadProfile();
  const items = loadProtocols();
  const now = new Date();

  const protocol = {
    id: `IND-${now.getFullYear()}-${String(Date.now()).slice(-6)}`,
    data: now.toISOString(),
    assunto: $("#assunto").value.trim(),
    rua: $("#localRua").value.trim(),
    numero: $("#localNumero").value.trim(),
    bairro: $("#localBairro").value.trim(),
    justificativa: $("#justificativa").value.trim(),
    imageName: file.name,
    imageData: selectedImageData,
    status: "Em espera",
    citizenName: profile.nome
  };

  items.unshift(protocol);

  try {
    saveProtocols(items);
  } catch {
    showToast("Não foi possível salvar. Tente uma imagem menor.");
    return;
  }

  form.reset();
  resetImage();

  $("#charCount").textContent = "0/1500";

  renderHome();
  renderCitizenSummary();

  showToast(`Indicação registrada! Protocolo: ${protocol.id}`);

  goToView("protocolos");
});

// CARREGAR O CADASTRO DO CIDADÃO

function populateProfile() {
  const profile = loadProfile();

  ["nome", "cep", "bairro", "rua", "numero", "telefone"].forEach((key) => {
    const field = $("#" + key);

    if (field) {
      field.value = profile[key] || "";
    }
  });

  $("#welcomeLabel").textContent = profile.nome
    ? `Olá, ${profile.nome.split(" ")[0]}`
    : "Área do cidadão";
}

// SALVAR O CADASTRO

$("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!event.currentTarget.reportValidity()) return;

  const profile = {
    nome: $("#nome").value.trim(),
    cep: $("#cep").value.trim(),
    bairro: $("#bairro").value.trim(),
    rua: $("#rua").value.trim(),
    numero: $("#numero").value.trim(),
    telefone: $("#telefone").value.trim()
  };

  saveProfile(profile);

  populateProfile();
  renderCitizenSummary();

  showToast("Cadastro salvo neste navegador.");

  goToView("nova");
});

// FORMATAR O CEP

$("#cep").addEventListener("input", (event) => {
  let value = event.target.value.replace(/\D/g, "").slice(0, 8);

  if (value.length > 5) {
    value = value.slice(0, 5) + "-" + value.slice(5);
  }

  event.target.value = value;
});

// INICIALIZAÇÃO DO SITE

populateProfile();
renderHome();
renderCitizenSummary();
