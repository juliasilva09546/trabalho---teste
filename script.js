
const STORAGE_KEY = "portalIndicacoesDemo_v1";
const PROFILE_KEY = "portalIndicacoesProfile_v1";
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

// PROTEÇÃO DE TEXTO EXIBIDO NA PÁGINA

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// MENSAGENS NA TELA

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3600);
}

// NAVEGAÇÃO ENTRE AS PÁGINAS

function goToView(name) {
  const target = name === "perfil" ? "perfil" : name;

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

  if (target === "protocolos") {
    renderProtocols();
  }

  if (target === "inicio") {
    renderHome();
  }
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

// DATA DO PROTOCOLO

function formatDate(iso) {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

// CLASSE VISUAL DE CADA STATUS

function statusClass(status) {
  if (status === "Aceito") {
    return "status-aceito";
  }

  if (status === "Não aprovado") {
    return "status-nao-aprovado";
  }

  return "";
}

// MONTAR O CARTÃO DO PROTOCOLO

function protocolMarkup(item, showDetails = true) {
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
          <strong>Secretaria:</strong>
          ${escapeHTML(item.secretaria)}
        </p>

        <p>
          <strong>Local:</strong>
          ${escapeHTML(location)}
        </p>

        ${showDetails ? `
          <div class="protocol-detail">
            <strong>Justificativa:</strong>
            ${escapeHTML(item.justificativa)}

            ${item.imageName ? `
              <p>
                <strong>Foto anexada:</strong>
                ${escapeHTML(item.imageName)}
              </p>
            ` : ""}
          </div>
        ` : ""}
      </div>

      <div class="protocol-meta">
        <strong>Enviado em ${formatDate(item.data)}</strong>
        <span>Atualização: ${escapeHTML(item.status)}</span>
      </div>
    </article>
  `;
}

// QUANDO AINDA NÃO EXISTEM PROTOCOLOS

function emptyMarkup() {
  return `
    <div class="empty-state">
      <div class="empty-icon">▤</div>

      <h3>Nenhuma indicação encontrada</h3>

      <p>
        Quando você registrar uma indicação,
        ela aparecerá aqui para acompanhamento.
      </p>

      <button class="button button-primary" data-view="nova">
        Registrar indicação
      </button>
    </div>
  `;
}

// ATUALIZAR A PÁGINA INICIAL

function renderHome() {
  const items = loadProtocols().sort(
    (a, b) => new Date(b.data) - new Date(a.data)
  );

  $("#statTotal").textContent = items.length;

  $("#statPending").textContent = items.filter(
    item => item.status === "Em espera"
  ).length;

  $("#statAccepted").textContent = items.filter(
    item => item.status === "Aceito"
  ).length;

  $("#recentList").innerHTML = items.length
    ? items.slice(0, 3).map(item => protocolMarkup(item, false)).join("")
    : emptyMarkup();

  $("#recentList").querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      goToView(button.dataset.view);
    });
  });
}

// PESQUISA E FILTRO DOS PROTOCOLOS

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
        ${item.secretaria}
      `.toLocaleLowerCase("pt-BR");

      return (
        (!search || text.includes(search)) &&
        (!status || item.status === status)
      );
    });

  $("#allProtocols").innerHTML = items.length
    ? items.map(item => protocolMarkup(item, true)).join("")
    : emptyMarkup();

  $("#allProtocols").querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      goToView(button.dataset.view);
    });
  });
}

$("#protocolSearch").addEventListener("input", renderProtocols);
$("#statusFilter").addEventListener("change", renderProtocols);

// SELEÇÃO E VALIDAÇÃO DA FOTO

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

// CONTADOR DE CARACTERES DA JUSTIFICATIVA

$("#justificativa").addEventListener("input", () => {
  $("#charCount").textContent =
    `${$("#justificativa").value.length}/1500`;
});

// CRIAR E REGISTRAR UMA NOVA INDICAÇÃO

$("#indicationForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.reportValidity()) {
    return;
  }

  if (!selectedImageData) {
    showToast(
      "A foto é obrigatória. Selecione uma imagem antes de enviar."
    );

    $("#foto").focus();
    return;
  }

  const file = $("#foto").files[0];

  if (!file || file.size > MAX_FILE_SIZE) {
    showToast("Escolha uma imagem válida de até 5 MB.");
    return;
  }

  const items = loadProtocols();
  const now = new Date();

  const protocol = {
    id: `IND-${now.getFullYear()}-${String(Date.now()).slice(-6)}`,
    data: now.toISOString(),

    secretaria: $("#secretaria").value,
    assunto: $("#assunto").value.trim(),

    rua: $("#rua").value.trim(),
    numero: $("#numero").value.trim(),
    bairro: $("#bairro").value.trim(),

    justificativa: $("#justificativa").value.trim(),

    imageName: file.name,
    imageData: selectedImageData,

    status: "Em espera"
  };

  items.unshift(protocol);

  try {
    saveProtocols(items);
  } catch (error) {
    showToast(
      "Não foi possível salvar. A imagem pode ser grande para " +
      "o armazenamento local; tente uma imagem menor."
    );
    return;
  }

  form.reset();
  resetImage();

  $("#charCount").textContent = "0/1500";

  renderHome();

  showToast(`Indicação registrada! Protocolo: ${protocol.id}`);

  goToView("protocolos");
});

// PERFIL DO CIDADÃO

function populateProfile() {
  const profile = loadProfile();

  $("#nome").value = profile.nome || "";
  $("#email").value = profile.email || "";
  $("#telefone").value = profile.telefone || "";

  $("#welcomeLabel").textContent = profile.nome
    ? `Olá, ${profile.nome.split(" ")[0]}`
    : "Área do cidadão";
}

$("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!event.currentTarget.reportValidity()) {
    return;
  }

  const profile = {
    nome: $("#nome").value.trim(),
    email: $("#email").value.trim(),
    telefone: $("#telefone").value.trim()
  };

  saveProfile(profile);
  populateProfile();

  showToast("Perfil atualizado neste navegador.");
});

// INICIALIZAÇÃO DO PORTAL

populateProfile();
renderHome();
