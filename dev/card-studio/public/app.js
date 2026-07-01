const state = {
  selectedCard: localStorage.getItem("cardStudio.card") || "server",
  studio: null,
  layout: {},
  sampleData: {}
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
  layoutEditor: document.getElementById("layoutEditor"),
  dataEditor: document.getElementById("dataEditor"),
  quickControls: document.getElementById("quickControls"),
  guideToggle: document.getElementById("guideToggle"),
  guideOverlay: document.getElementById("guideOverlay"),
  assetUpload: document.getElementById("assetUpload"),
  uploadResult: document.getElementById("uploadResult")
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

  const card = activeCardDefinition();
  el.previewTitle.textContent = card?.label || state.selectedCard;
}

async function renderPreview() {
  setStatus("Rendering...");
  const data = await requestJson(`/render?card=${state.selectedCard}&t=${Date.now()}`);
  el.previewImage.src = `/image/${data.outputName}?t=${Date.now()}`;
  el.updatedAt.textContent = new Date().toLocaleTimeString();
  setStatus(data.message || "Rendered.");
}

function parseEditor(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} JSON is invalid: ${error.message}`);
  }
}

async function saveLayout() {
  const layout = parseEditor(el.layoutEditor.value, "Layout");
  const data = await requestJson(`/api/layout?card=${state.selectedCard}`, {
    method: "POST",
    body: JSON.stringify({ layout })
  });
  state.layout = data.layout;
  el.layoutEditor.value = pretty(state.layout);
  buildQuickControls();
  setStatus("Layout saved.");
  await renderPreview();
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

function makeField(label, path, type = "number") {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const labelEl = document.createElement("label");
  labelEl.textContent = label;

  const input = document.createElement("input");
  input.type = type;
  input.value = getDeepValue(state.layout, path) ?? "";

  input.addEventListener("input", () => {
    const value = type === "number" ? Number(input.value) : type === "checkbox" ? input.checked : input.value;
    setDeepValue(state.layout, path, value);
    el.layoutEditor.value = pretty(state.layout);
  });

  if (type === "checkbox") input.checked = Boolean(getDeepValue(state.layout, path));

  wrapper.append(labelEl, input);
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
        makeField("Width", "card.width"),
        makeField("Height", "card.height"),
        makeField("Corner Radius", "card.cornerRadius"),
        makeField("Border Width", "card.borderWidth"),
        makeField("Border Color", "card.borderColor", "color"),
        makeField("Accent Color", "card.accentColor", "color")
      ]),
      makeGroup("Avatar", [
        makeField("Avatar Size", "avatar.size"),
        makeField("Avatar X", "avatar.x"),
        makeField("Avatar Y", "avatar.y"),
        makeField("Avatar Border", "avatar.borderWidth"),
        makeField("Avatar Border Color", "avatar.borderColor", "color")
      ]),
      makeGroup("Discord Username", [
        makeField("X", "text.username.x"),
        makeField("Y", "text.username.y"),
        makeField("Max Font", "text.username.maxSize"),
        makeField("Min Font", "text.username.minSize"),
        makeField("Color", "text.username.color", "color")
      ]),
      makeGroup("Server Nickname", [
        makeField("X", "text.displayName.x"),
        makeField("Y", "text.displayName.y"),
        makeField("Max Font", "text.displayName.maxSize"),
        makeField("Min Font", "text.displayName.minSize"),
        makeField("Color", "text.displayName.color", "color")
      ]),
      makeGroup("Live Indicator", [
        makeField("Enabled", "live.enabled", "checkbox"),
        makeField("X", "live.x"),
        makeField("Y", "live.y"),
        makeField("Text", "live.text", "text"),
        makeField("Badge Color", "live.badgeColor", "color"),
        makeField("Text Color", "live.textColor", "color")
      ], true),
      makeGroup("Info Boxes", [
        makeField("X", "infoBoxes.x"),
        makeField("First Y", "infoBoxes.firstY"),
        makeField("Second Y", "infoBoxes.secondY"),
        makeField("Channel Width", "infoBoxes.channelWidth"),
        makeField("Time Width", "infoBoxes.timeWidth"),
        makeField("Font Size", "infoBoxes.fontSize")
      ], true)
    );
    return;
  }

  el.quickControls.append(
    makeGroup("Card", [
      makeField("Width", "card.width"),
      makeField("Height", "card.height"),
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

function wireEvents() {
  el.renderButton.addEventListener("click", renderPreview);
  el.saveLayoutButton.addEventListener("click", () => saveLayout().catch((error) => setStatus(error.message)));
  el.saveDataButton.addEventListener("click", () => saveSampleData().catch((error) => setStatus(error.message)));
  el.guideToggle.addEventListener("change", () => el.guideOverlay.classList.toggle("visible", el.guideToggle.checked));
  el.guideOverlay.classList.toggle("visible", el.guideToggle.checked);
  el.assetUpload.addEventListener("change", () => {
    const file = el.assetUpload.files?.[0];
    if (file) uploadAsset(file).catch((error) => setStatus(error.message));
  });

  const events = new EventSource("/events");
  events.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.card === state.selectedCard && data.outputName) {
      el.previewImage.src = `/image/${data.outputName}?t=${Date.now()}`;
      el.updatedAt.textContent = new Date().toLocaleTimeString();
      setStatus(data.message || "Updated.");
    }
  };
}

async function init() {
  wireTabs();
  wireEvents();
  await loadStudio();
  await renderPreview();
}

init().catch((error) => setStatus(error.message));
