const state = {
  selectedCard: localStorage.getItem("cardStudio.card") || "server",
  studio: null,
  layout: {},
  sampleData: {},
  renderTimer: null
};

const el = {
  cardList: document.getElementById("cardList"),
  statusText: document.getElementById("statusText"),
  previewTitle: document.getElementById("previewTitle"),
  previewImage: document.getElementById("previewImage"),
  updatedAt: document.getElementById("updatedAt"),
  renderButton: document.getElementById("renderButton"),
  saveLayoutButton: document.getElementById("saveLayoutButton"),
  saveDataButton: document.getElementById("saveDataButton"),
  downloadButton: document.getElementById("downloadButton"),
  layoutEditor: document.getElementById("layoutEditor"),
  dataEditor: document.getElementById("dataEditor"),
  quickControls: document.getElementById("quickControls"),
  presetList: document.getElementById("presetList"),
  guideToggle: document.getElementById("guideToggle"),
  designerToggle: document.getElementById("designerToggle"),
  autoSaveToggle: document.getElementById("autoSaveToggle"),
  guideOverlay: document.getElementById("guideOverlay"),
  designerOverlay: document.getElementById("designerOverlay"),
  layerList: document.getElementById("layerList"),
  selectedInspector: document.getElementById("selectedInspector"),
  previewStage: document.getElementById("previewStage"),
  assetUpload: document.getElementById("assetUpload"),
  uploadResult: document.getElementById("uploadResult")
};

const presets = {
  stream: [
    {
      name: "High Society Gold",
      description: "Original dark card with gold trim and red LIVE badge.",
      values: {
        "card.backgroundColor": "#180f07",
        "card.accentColor": "#f6c453",
        "card.borderColor": "#f6c453",
        "text.username.color": "#d0d4dc",
        "text.displayName.color": "#ffffff",
        "live.badgeColor": "#ef2b2d"
      }
    },
    {
      name: "Clean Dark",
      description: "Flatter charcoal style with softer contrast.",
      values: {
        "card.backgroundColor": "#070a10",
        "card.accentColor": "#d7a83c",
        "card.borderColor": "#d7a83c",
        "text.username.color": "#aeb6c4",
        "text.displayName.color": "#f5f7fb",
        "live.badgeColor": "#d62828"
      }
    },
    {
      name: "Neon Live",
      description: "Higher contrast preview for stream alerts.",
      values: {
        "card.backgroundColor": "#050914",
        "card.accentColor": "#ffcc4d",
        "card.borderColor": "#ffcc4d",
        "text.username.color": "#91cfff",
        "text.displayName.color": "#ffffff",
        "live.badgeColor": "#ff1744"
      }
    }
  ],
  server: [
    {
      name: "High Society Gold",
      description: "Default server dashboard colors.",
      values: {
        "card.accentColor": "#f6c453",
        "card.backgroundColor": "#050608",
        "topStreamer.usernameColor": "#aeb6c4",
        "topStreamer.displayNameColor": "#f6c453"
      }
    },
    {
      name: "Soft Dashboard",
      description: "Muted gold and lighter streamer text.",
      values: {
        "card.accentColor": "#d7a83c",
        "card.backgroundColor": "#090d14",
        "topStreamer.usernameColor": "#c5ccd8",
        "topStreamer.displayNameColor": "#f5d37a"
      }
    }
  ]
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "Request failed");
  return data;
}

function pretty(data) {
  return JSON.stringify(data, null, 2);
}

function setStatus(message) {
  el.statusText.textContent = message;
}

function activeCardDefinition() {
  return state.studio?.cards?.[state.selectedCard];
}

function renderCardButtons() {
  el.cardList.innerHTML = "";
  Object.entries(state.studio.cards || {}).forEach(([key, card]) => {
    const button = document.createElement("button");
    button.className = `card-button${key === state.selectedCard ? " active" : ""}`;
    button.textContent = card.label || key;
    button.addEventListener("click", () => selectCard(key));
    el.cardList.appendChild(button);
  });
}

async function selectCard(card) {
  state.selectedCard = card;
  localStorage.setItem("cardStudio.card", card);
  renderCardButtons();
  await loadLayout();
  await renderPreview();
  window.dispatchEvent(new CustomEvent("cardstudio:layout-loaded"));
}

async function loadStudio() {
  const data = await requestJson("/api/studio");
  state.studio = data;
  state.sampleData = data.sampleData || {};
  el.dataEditor.value = pretty(state.sampleData);

  if (!state.studio.cards[state.selectedCard]) {
    state.selectedCard = state.studio.config.defaultCard || Object.keys(state.studio.cards)[0];
  }

  renderCardButtons();
  await loadLayout();
}

async function loadLayout() {
  const data = await requestJson(`/api/layout?card=${state.selectedCard}`);
  state.layout = data.layout || {};
  el.layoutEditor.value = pretty(state.layout);
  buildQuickControls();
  buildPresetControls();

  const card = activeCardDefinition();
  el.previewTitle.textContent = card?.label || state.selectedCard;
  window.dispatchEvent(new CustomEvent("cardstudio:layout-loaded"));
}

async function renderPreview() {
  setStatus("Rendering...");
  const data = await requestJson(`/render?card=${state.selectedCard}&t=${Date.now()}`);
  const imageUrl = `/image/${data.outputName}?t=${Date.now()}`;
  el.previewImage.src = imageUrl;
  el.downloadButton.href = imageUrl;
  el.downloadButton.download = data.outputName || `${state.selectedCard}.png`;
  el.updatedAt.textContent = new Date().toLocaleTimeString();
  setStatus(data.message || "Rendered.");
  window.dispatchEvent(new CustomEvent("cardstudio:rendered"));
}

function scheduleRender() {
  clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(async () => {
    try {
      if (el.autoSaveToggle?.checked) {
        await saveLayout({ quiet: true });
      } else {
        await renderPreview();
      }
    } catch (error) {
      setStatus(error.message);
    }
  }, 450);
}

function parseEditor(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} JSON is invalid: ${error.message}`);
  }
}

async function saveLayout(options = {}) {
  const layout = parseEditor(el.layoutEditor.value, "Layout");
  const data = await requestJson(`/api/layout?card=${state.selectedCard}`, {
    method: "POST",
    body: JSON.stringify({ layout })
  });
  state.layout = data.layout;
  el.layoutEditor.value = pretty(state.layout);
  buildQuickControls();
  buildPresetControls();
  if (!options.quiet) setStatus("Layout saved.");
  await renderPreview();
  window.dispatchEvent(new CustomEvent("cardstudio:layout-saved"));
}

async function saveSampleData() {
  const sampleData = parseEditor(el.dataEditor.value, "Sample data");
  const data = await requestJson("/api/sample-data", {
    method: "POST",
    body: JSON.stringify({ sampleData })
  });
  state.sampleData = data.sampleData;
  el.dataEditor.value = pretty(state.sampleData);
  setStatus("Sample data saved.");
  await renderPreview();
}

function setDeepValue(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  while (parts.length > 1) {
    const part = parts.shift();
    cursor[part] ||= {};
    cursor = cursor[part];
  }
  cursor[parts[0]] = value;
}

function getDeepValue(target, path) {
  return path.split(".").reduce((cursor, part) => cursor?.[part], target);
}

function makeField(label, path, type = "number", options = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const labelEl = document.createElement("label");
  labelEl.textContent = label;

  const input = document.createElement("input");
  input.type = type;

  if (type === "range") {
    input.min = options.min ?? 0;
    input.max = options.max ?? 1000;
    input.step = options.step ?? 1;
  }

  const value = getDeepValue(state.layout, path);
  if (type === "checkbox") {
    input.checked = Boolean(value);
  } else {
    input.value = value ?? "";
  }

  const valueLabel = document.createElement("span");
  valueLabel.className = "field-value";
  valueLabel.textContent = type === "checkbox" ? (input.checked ? "On" : "Off") : input.value;

  input.addEventListener("input", () => {
    const nextValue = type === "number" || type === "range"
      ? Number(input.value)
      : type === "checkbox"
        ? input.checked
        : input.value;

    setDeepValue(state.layout, path, nextValue);
    valueLabel.textContent = type === "checkbox" ? (input.checked ? "On" : "Off") : input.value;
    el.layoutEditor.value = pretty(state.layout);
    scheduleRender();
  });

  wrapper.append(labelEl, input, valueLabel);
  return wrapper;
}

function makeGroup(title, fields, full = false) {
  const group = document.createElement("div");
  group.className = `control-group${full ? " full" : ""}`;
  const h3 = document.createElement("h3");
  h3.textContent = title;
  group.appendChild(h3);
  fields.forEach((field) => group.appendChild(field));
  return group;
}

function buildQuickControls() {
  el.quickControls.innerHTML = "";

  if (state.selectedCard === "stream") {
    el.quickControls.append(
      makeGroup("Card Layout", [
        makeField("Width", "card.width", "number"),
        makeField("Height", "card.height", "number"),
        makeField("Corner Radius", "card.cornerRadius", "range", { min: 0, max: 60 }),
        makeField("Border Width", "card.borderWidth", "range", { min: 0, max: 12 }),
        makeField("Border Color", "card.borderColor", "color"),
        makeField("Accent Color", "card.accentColor", "color")
      ]),
      makeGroup("Avatar", [
        makeField("Avatar Size", "avatar.size", "range", { min: 80, max: 240 }),
        makeField("Avatar X", "avatar.x", "range", { min: 0, max: 300 }),
        makeField("Avatar Y", "avatar.y", "range", { min: 0, max: 220 }),
        makeField("Avatar Border", "avatar.borderWidth", "range", { min: 0, max: 14 }),
        makeField("Avatar Border Color", "avatar.borderColor", "color")
      ]),
      makeGroup("Discord Username", [
        makeField("X", "text.username.x", "range", { min: 0, max: 760 }),
        makeField("Y", "text.username.y", "range", { min: 40, max: 260 }),
        makeField("Max Font", "text.username.maxSize", "range", { min: 12, max: 52 }),
        makeField("Min Font", "text.username.minSize", "range", { min: 8, max: 30 }),
        makeField("Color", "text.username.color", "color")
      ]),
      makeGroup("Server Nickname", [
        makeField("X", "text.displayName.x", "range", { min: 0, max: 760 }),
        makeField("Y", "text.displayName.y", "range", { min: 60, max: 280 }),
        makeField("Max Font", "text.displayName.maxSize", "range", { min: 18, max: 80 }),
        makeField("Min Font", "text.displayName.minSize", "range", { min: 10, max: 42 }),
        makeField("Color", "text.displayName.color", "color")
      ]),
      makeGroup("Live Indicator", [
        makeField("Enabled", "live.enabled", "checkbox"),
        makeField("X", "live.x", "range", { min: 0, max: 760 }),
        makeField("Y", "live.y", "range", { min: 20, max: 260 }),
        makeField("Text", "live.text", "text"),
        makeField("Badge Color", "live.badgeColor", "color"),
        makeField("Text Color", "live.textColor", "color")
      ], true),
      makeGroup("Info Boxes", [
        makeField("X", "infoBoxes.x", "range", { min: 0, max: 760 }),
        makeField("First Y", "infoBoxes.firstY", "range", { min: 100, max: 320 }),
        makeField("Second Y", "infoBoxes.secondY", "range", { min: 120, max: 330 }),
        makeField("Channel Width", "infoBoxes.channelWidth", "range", { min: 120, max: 500 }),
        makeField("Time Width", "infoBoxes.timeWidth", "range", { min: 120, max: 420 }),
        makeField("Font Size", "infoBoxes.fontSize", "range", { min: 12, max: 34 })
      ], true)
    );
    return;
  }

  el.quickControls.append(
    makeGroup("Card", [
      makeField("Width", "card.width", "number"),
      makeField("Height", "card.height", "number"),
      makeField("Accent Color", "card.accentColor", "color"),
      makeField("Background", "card.backgroundColor", "color")
    ], true),
    makeGroup("Top Streamer", [
      makeField("Show Discord Username", "topStreamer.showDiscordUsername", "checkbox"),
      makeField("Show Display Name", "topStreamer.showDisplayName", "checkbox"),
      makeField("Username Color", "topStreamer.usernameColor", "color"),
      makeField("Display Name Color", "topStreamer.displayNameColor", "color")
    ], true)
  );
}

function buildPresetControls() {
  el.presetList.innerHTML = "";
  const cardPresets = presets[state.selectedCard] || [];

  if (!cardPresets.length) {
    el.presetList.innerHTML = `<p class="muted">No presets configured for this card yet.</p>`;
    return;
  }

  cardPresets.forEach((preset) => {
    const card = document.createElement("button");
    card.className = "preset-card";
    card.innerHTML = `<strong>${preset.name}</strong><span>${preset.description}</span>`;
    card.addEventListener("click", async () => {
      Object.entries(preset.values).forEach(([path, value]) => setDeepValue(state.layout, path, value));
      el.layoutEditor.value = pretty(state.layout);
      buildQuickControls();
      await saveLayout();
    });
    el.presetList.appendChild(card);
  });
}

async function uploadAsset(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const data = await requestJson("/api/upload", {
    method: "POST",
    body: JSON.stringify({ fileName: file.name, dataUrl })
  });

  el.uploadResult.innerHTML = `
    <strong>Uploaded:</strong><br>
    <code>${data.path}</code><br>
    <img src="${data.url}" style="max-width:220px;margin-top:12px;border-radius:10px;"><br>
    <button data-apply-upload="stream-avatar">Use as Stream Avatar</button>
    <button data-apply-upload="server-streamer-avatar">Use as Server Top Streamer Avatar</button>
    <button data-apply-upload="game-art">Use as Game Art</button>
  `;

  el.uploadResult.querySelectorAll("[data-apply-upload]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = button.dataset.applyUpload;
      if (target === "stream-avatar") state.sampleData.stream.member.avatarURL = data.path;
      if (target === "server-streamer-avatar") state.sampleData.server.topStreamer.avatarURL = data.path;
      if (target === "game-art") state.sampleData.server.game.thumbnail = data.path;
      el.dataEditor.value = pretty(state.sampleData);
      await saveSampleData();
    });
  });
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    });
  });
}

function exposeStudioApi() {
  window.CardStudio = {
    state,
    el,
    getDeepValue,
    setDeepValue,
    pretty,
    saveLayout,
    renderPreview,
    scheduleRender,
    setStatus,
    buildQuickControls
  };
}

function wireEvents() {
  el.renderButton.addEventListener("click", renderPreview);
  el.saveLayoutButton.addEventListener("click", () => saveLayout().catch((error) => setStatus(error.message)));
  el.saveDataButton.addEventListener("click", () => saveSampleData().catch((error) => setStatus(error.message)));
  el.guideToggle.addEventListener("change", () => el.guideOverlay.classList.toggle("visible", el.guideToggle.checked));
  el.designerToggle?.addEventListener("change", () => window.dispatchEvent(new CustomEvent("cardstudio:designer-toggle")));
  el.guideOverlay.classList.toggle("visible", el.guideToggle.checked);
  el.assetUpload.addEventListener("change", () => {
    const file = el.assetUpload.files?.[0];
    if (file) uploadAsset(file).catch((error) => setStatus(error.message));
  });

  const events = new EventSource("/events");
  events.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.card === state.selectedCard && data.outputName) {
      const imageUrl = `/image/${data.outputName}?t=${Date.now()}`;
      el.previewImage.src = imageUrl;
      el.downloadButton.href = imageUrl;
      el.downloadButton.download = data.outputName;
      el.updatedAt.textContent = new Date().toLocaleTimeString();
      setStatus(data.message || "Updated.");
      window.dispatchEvent(new CustomEvent("cardstudio:rendered"));
    }
  };
}

async function init() {
  exposeStudioApi();
  wireTabs();
  wireEvents();
  await loadStudio();
  await renderPreview();
}

init().catch((error) => setStatus(error.message));
