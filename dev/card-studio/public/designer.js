(() => {
  const GRID_SIZE = 5;
  const NUDGE_SMALL = 1;
  const NUDGE_LARGE = 10;

  let selectedLayer = null;
  let dragState = null;
  let resizeState = null;

  const layerDefinitions = {
    stream: [
      {
        id: "avatar",
        label: "Avatar",
        path: "avatar",
        resizable: true,
        rect(layout) {
          const size = Number(layout.avatar?.size || 196);
          return {
            x: Number(layout.avatar?.x || 0),
            y: Number(layout.avatar?.y || 0),
            w: size,
            h: size
          };
        },
        update(layout, x, y) {
          layout.avatar ||= {};
          layout.avatar.x = Math.round(x);
          layout.avatar.y = Math.round(y);
        },
        resize(layout, width) {
          layout.avatar ||= {};
          const size = clamp(Math.round(width), 80, 260);
          layout.avatar.size = size;
        }
      },
      {
        id: "username",
        label: "Discord Username",
        path: "text.username",
        rect(layout) {
          return {
            x: Number(layout.text?.username?.x || 285),
            y: Number(layout.text?.username?.y || 104) - Number(layout.text?.username?.maxSize || 34),
            w: Number(layout.text?.maxWidth || 560),
            h: Number(layout.text?.username?.maxSize || 34) + 8
          };
        },
        update(layout, x, y) {
          layout.text ||= {};
          layout.text.username ||= {};
          layout.text.username.x = Math.round(x);
          layout.text.username.y = Math.round(y + Number(layout.text.username.maxSize || 34));
        }
      },
      {
        id: "displayName",
        label: "Server Nickname",
        path: "text.displayName",
        rect(layout) {
          return {
            x: Number(layout.text?.displayName?.x || 285),
            y: Number(layout.text?.displayName?.y || 154) - Number(layout.text?.displayName?.maxSize || 56),
            w: Number(layout.text?.maxWidth || 560),
            h: Number(layout.text?.displayName?.maxSize || 56) + 10
          };
        },
        update(layout, x, y) {
          layout.text ||= {};
          layout.text.displayName ||= {};
          layout.text.displayName.x = Math.round(x);
          layout.text.displayName.y = Math.round(y + Number(layout.text.displayName.maxSize || 56));
        }
      },
      {
        id: "live",
        label: "LIVE Badge",
        path: "live",
        rect(layout) {
          return {
            x: Number(layout.live?.x || 285),
            y: Number(layout.live?.y || 74),
            w: 110,
            h: 36
          };
        },
        update(layout, x, y) {
          layout.live ||= {};
          layout.live.x = Math.round(x);
          layout.live.y = Math.round(y);
        }
      },
      {
        id: "channelBox",
        label: "Voice Channel Box",
        path: "infoBoxes.firstY",
        resizable: true,
        rect(layout) {
          return {
            x: Number(layout.infoBoxes?.x || 285),
            y: Number(layout.infoBoxes?.firstY || 185),
            w: Number(layout.infoBoxes?.channelWidth || 300),
            h: Number(layout.infoBoxes?.height || 46)
          };
        },
        update(layout, x, y) {
          layout.infoBoxes ||= {};
          layout.infoBoxes.x = Math.round(x);
          layout.infoBoxes.firstY = Math.round(y);
        },
        resize(layout, width) {
          layout.infoBoxes ||= {};
          layout.infoBoxes.channelWidth = clamp(Math.round(width), 120, 600);
        }
      },
      {
        id: "timeBox",
        label: "Started Time Box",
        path: "infoBoxes.secondY",
        resizable: true,
        rect(layout) {
          return {
            x: Number(layout.infoBoxes?.x || 285),
            y: Number(layout.infoBoxes?.secondY || 242),
            w: Number(layout.infoBoxes?.timeWidth || 230),
            h: Number(layout.infoBoxes?.height || 46)
          };
        },
        update(layout, x, y) {
          layout.infoBoxes ||= {};
          layout.infoBoxes.x = Math.round(x);
          layout.infoBoxes.secondY = Math.round(y);
        },
        resize(layout, width) {
          layout.infoBoxes ||= {};
          layout.infoBoxes.timeWidth = clamp(Math.round(width), 120, 520);
        }
      }
    ],
    server: [
      {
        id: "serverCard",
        label: "Server Card Layout",
        path: "card",
        rect(layout) {
          return {
            x: 0,
            y: 0,
            w: Number(layout.card?.width || 1600),
            h: Number(layout.card?.height || 900)
          };
        },
        update() {}
      }
    ]
  };

  function studio() {
    return window.CardStudio;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function snap(value, size = GRID_SIZE) {
    return Math.round(value / size) * size;
  }

  function getLayers() {
    return layerDefinitions[studio()?.state?.selectedCard] || [];
  }

  function getLayoutSize() {
    const layout = studio().state.layout || {};
    return {
      w: Number(layout.card?.width || (studio().state.selectedCard === "server" ? 1600 : 900)),
      h: Number(layout.card?.height || (studio().state.selectedCard === "server" ? 900 : 360))
    };
  }

  function getPreviewMetrics() {
    const image = studio().el.previewImage;
    const stageRect = studio().el.previewStage.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const size = getLayoutSize();

    return {
      stageRect,
      imageRect,
      scaleX: imageRect.width / size.w,
      scaleY: imageRect.height / size.h,
      offsetX: imageRect.left - stageRect.left,
      offsetY: imageRect.top - stageRect.top
    };
  }

  function toScreenRect(rect) {
    const metrics = getPreviewMetrics();
    return {
      left: metrics.offsetX + rect.x * metrics.scaleX,
      top: metrics.offsetY + rect.y * metrics.scaleY,
      width: rect.w * metrics.scaleX,
      height: rect.h * metrics.scaleY
    };
  }

  function fromScreenDelta(dx, dy) {
    const metrics = getPreviewMetrics();
    return {
      x: dx / metrics.scaleX,
      y: dy / metrics.scaleY
    };
  }

  function commitLayoutLocally() {
    studio().el.layoutEditor.value = studio().pretty(studio().state.layout);
    studio().buildQuickControls();
    renderOverlay();
  }

  async function saveOrRender() {
    try {
      if (studio().el.autoSaveToggle?.checked) {
        await studio().saveLayout({ quiet: true });
      } else {
        await studio().renderPreview();
      }
    } catch (error) {
      studio().setStatus(error.message);
    }
  }

  function renderLayers() {
    const api = studio();
    if (!api?.el?.layerList) return;

    api.el.layerList.innerHTML = "";

    getLayers().forEach((layer) => {
      const button = document.createElement("button");
      button.className = `layer-button${selectedLayer?.id === layer.id ? " active" : ""}`;
      button.textContent = layer.label;
      button.addEventListener("click", () => selectLayer(layer.id));
      api.el.layerList.appendChild(button);
    });
  }

  function renderInspector() {
    const api = studio();
    if (!api?.el?.selectedInspector) return;

    if (!selectedLayer) {
      api.el.selectedInspector.textContent = "Choose a layer or click an overlay.";
      return;
    }

    const rect = selectedLayer.rect(api.state.layout || {});
    api.el.selectedInspector.innerHTML = `
      <strong>${selectedLayer.label}</strong>
      <div class="inspector-row">X <span>${Math.round(rect.x)}</span></div>
      <div class="inspector-row">Y <span>${Math.round(rect.y)}</span></div>
      <div class="inspector-row">W <span>${Math.round(rect.w)}</span></div>
      <div class="inspector-row">H <span>${Math.round(rect.h)}</span></div>
      <small>Drag to move. Use arrow keys to nudge. Hold Shift for 10px. Drag the corner dot to resize supported layers.</small>
    `;
  }

  function renderOverlay() {
    const api = studio();
    if (!api?.el?.designerOverlay) return;

    const overlay = api.el.designerOverlay;
    overlay.innerHTML = "";
    overlay.classList.toggle("disabled", !api.el.designerToggle?.checked);

    if (!api.el.designerToggle?.checked || !api.el.previewImage?.complete) {
      renderLayers();
      renderInspector();
      return;
    }

    getLayers().forEach((layer) => {
      const rect = layer.rect(api.state.layout || {});
      const screen = toScreenRect(rect);
      const box = document.createElement("button");
      box.className = `designer-box${selectedLayer?.id === layer.id ? " active" : ""}`;
      box.style.left = `${screen.left}px`;
      box.style.top = `${screen.top}px`;
      box.style.width = `${screen.width}px`;
      box.style.height = `${screen.height}px`;
      box.dataset.layerId = layer.id;
      box.innerHTML = `<span>${layer.label}</span>`;
      box.addEventListener("pointerdown", (event) => beginDrag(event, layer));
      box.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectLayer(layer.id);
      });

      if (layer.resizable) {
        const handle = document.createElement("i");
        handle.className = "resize-handle";
        handle.addEventListener("pointerdown", (event) => beginResize(event, layer));
        box.appendChild(handle);
      }

      overlay.appendChild(box);
    });

    renderLayers();
    renderInspector();
  }

  function selectLayer(layerId) {
    selectedLayer = getLayers().find((layer) => layer.id === layerId) || null;
    renderOverlay();
  }

  function beginDrag(event, layer) {
    if (!studio().el.designerToggle?.checked) return;

    event.preventDefault();
    event.stopPropagation();
    selectLayer(layer.id);

    const rect = layer.rect(studio().state.layout || {});
    dragState = {
      layer,
      startX: event.clientX,
      startY: event.clientY,
      originalX: rect.x,
      originalY: rect.y
    };

    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", endDrag, { once: true });
  }

  function onDragMove(event) {
    if (!dragState) return;

    const delta = fromScreenDelta(event.clientX - dragState.startX, event.clientY - dragState.startY);
    const nextX = Math.max(0, snap(dragState.originalX + delta.x));
    const nextY = Math.max(0, snap(dragState.originalY + delta.y));

    dragState.layer.update(studio().state.layout, nextX, nextY);
    studio().el.layoutEditor.value = studio().pretty(studio().state.layout);
    renderOverlay();
  }

  async function endDrag() {
    window.removeEventListener("pointermove", onDragMove);

    if (!dragState) return;
    dragState = null;

    await saveOrRender();
  }

  function beginResize(event, layer) {
    if (!layer.resizable || !studio().el.designerToggle?.checked) return;

    event.preventDefault();
    event.stopPropagation();
    selectLayer(layer.id);

    const rect = layer.rect(studio().state.layout || {});
    resizeState = {
      layer,
      startX: event.clientX,
      startY: event.clientY,
      originalW: rect.w,
      originalH: rect.h
    };

    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", endResize, { once: true });
  }

  function onResizeMove(event) {
    if (!resizeState) return;

    const delta = fromScreenDelta(event.clientX - resizeState.startX, event.clientY - resizeState.startY);
    const nextW = Math.max(20, snap(resizeState.originalW + delta.x));
    const nextH = Math.max(20, snap(resizeState.originalH + delta.y));
    const nextSize = resizeState.layer.id === "avatar" ? Math.max(nextW, nextH) : nextW;

    resizeState.layer.resize(studio().state.layout, nextSize);
    commitLayoutLocally();
  }

  async function endResize() {
    window.removeEventListener("pointermove", onResizeMove);

    if (!resizeState) return;
    resizeState = null;

    await saveOrRender();
  }

  async function nudgeSelected(event) {
    if (!selectedLayer || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

    event.preventDefault();

    const step = event.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
    const rect = selectedLayer.rect(studio().state.layout || {});
    let x = rect.x;
    let y = rect.y;

    if (event.key === "ArrowLeft") x -= step;
    if (event.key === "ArrowRight") x += step;
    if (event.key === "ArrowUp") y -= step;
    if (event.key === "ArrowDown") y += step;

    selectedLayer.update(studio().state.layout, Math.max(0, x), Math.max(0, y));
    commitLayoutLocally();
    studio().scheduleRender();
  }

  function initDesigner() {
    window.addEventListener("cardstudio:layout-loaded", renderOverlay);
    window.addEventListener("cardstudio:layout-saved", renderOverlay);
    window.addEventListener("cardstudio:rendered", renderOverlay);
    window.addEventListener("cardstudio:designer-toggle", renderOverlay);
    window.addEventListener("resize", renderOverlay);
    window.addEventListener("keydown", nudgeSelected);

    if (studio()?.el?.previewImage) {
      studio().el.previewImage.addEventListener("load", renderOverlay);
    }

    renderOverlay();
  }

  if (window.CardStudio) {
    initDesigner();
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(initDesigner, 0));
  }
})();
