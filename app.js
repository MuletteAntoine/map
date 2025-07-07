Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyNDM0ODlkOS0xMDU4LTQ0YjUtYjJiZi04ZGYzOGRlZTgyNDgiLCJpZCI6MzEwMDI4LCJpYXQiOjE3NDkyNzY5Nzh9.2jvKodQGEAxFbZN-bn5VCY-XdX3eCEHf8iD7FUEU3uc';

let viewer;
let currentStep = 0;
let lampeActive = false;

const parcours = [
  { name: "Commissariat", position: Cesium.Cartesian3.fromDegrees(7.287922, 43.7120523, 30), pandaPage: "VideoCommissariat" },
  { name: "Bergerie", position: Cesium.Cartesian3.fromDegrees(7.3, 43.726111, 30), pandaPage: "VideoBergerie" },
  { name: "Palais de Justice", position: Cesium.Cartesian3.fromDegrees(7.273762, 43.696633, 30), pandaPage: "VideoPalaisJustice" }
];
const secondaires = [
  { name: "Maison des hauteurs", position: Cesium.Cartesian3.fromDegrees(7.27005, 43.72660, 80), message: "Pas de vidéo ici pour l’instant." },
  { name: "Banque", position: Cesium.Cartesian3.fromDegrees(7.26945, 43.69912, 30), message: "Rendez-vous d’abord au Commissariat !" },
  { name: "Boutique photo", position: Cesium.Cartesian3.fromDegrees(7.223, 43.671, 30), message: "Ce lieu sera accessible plus tard." }
];

const allPoints = [...parcours, ...secondaires];

async function initViewer() {
  // Création du viewer SANS terrainProvider (pour CesiumJS 1.111+)
  viewer = new Cesium.Viewer('cesiumContainer', {
    sceneMode: Cesium.SceneMode.SCENE2D,
    baseLayerPicker: false,
    timeline: false,
    animation: false,
    shouldAnimate: false,
    imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
  });

  // Application du terrain asynchrone
  try {
    const terrain = await Cesium.createWorldTerrainAsync();
    viewer.scene.setTerrain(terrain);
  } catch (error) {
    console.error("Erreur lors du chargement du terrain Cesium :", error);
  }

  // Configuration caméra et contrôles
  viewer.scene.screenSpaceCameraController.enableZoom = true;
  viewer.scene.screenSpaceCameraController.enableRotate = false;
  viewer.scene.screenSpaceCameraController.enableTilt = false;
  viewer.scene.screenSpaceCameraController.enableLook = false;
  viewer.scene.screenSpaceCameraController.enableTranslate = true;
  viewer.scene.screenSpaceCameraController.inertiaSpin = 0;
  viewer.scene.screenSpaceCameraController.inertiaZoom = 0;
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  viewer.selectedEntityChanged.addEventListener(() => { viewer.selectedEntity = undefined; });

  // Ajout des entités (balises)
  allPoints.forEach((point, idx) => {
    let isParcours = idx < parcours.length;
    let entity = viewer.entities.add({
      position: point.position,
      billboard: {
        image: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        scale: 0.06,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        color: isParcours && idx === currentStep ? Cesium.Color.RED : Cesium.Color.GRAY.withAlpha(0.7)
      },
      label: {
        text: point.name,
        font: '14pt monospace',
        fillColor: Cesium.Color.WHITE,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, -40)
      }
    });
    entity.idx = idx;
    entity.isParcours = isParcours;
    entity.pointData = point;
  });

  setupInteractions();
  startAnimation();
  updateBoussoles();
  updateQuests();
}

function updateBoussoles() {
  viewer.entities.values.forEach((entity) => {
    if (!entity.billboard) return;
    if (entity.isParcours && entity.idx === currentStep) {
      entity.billboard.color = Cesium.Color.RED;
    } else if (entity.isParcours && entity.idx < currentStep) {
      entity.billboard.color = Cesium.Color.LIGHTGRAY.withAlpha(0.7);
    } else {
      entity.billboard.color = Cesium.Color.GRAY.withAlpha(0.7);
    }
  });
}

function updateQuests() {
  const questPanel = document.getElementById('questPanel');
  let html = '';
  for (let i = 0; i < parcours.length; i++) {
    let quest = `Aller à <b>${parcours[i].name}</b>`;
    if (i < currentStep) {
      html += `<div style="color:#00aaff;opacity:0.7;text-decoration:line-through;">${quest} ✔️</div>`;
    } else if (i === currentStep) {
      html += `<div style="color:#ff6868;">${quest} (en cours)</div>`;
    }
  }
  questPanel.innerHTML = html;
}

function setupInteractions() {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction(function (click) {
    const pickedObject = viewer.scene.pick(click.position);
    if (!Cesium.defined(pickedObject) || !pickedObject.id) return;
    const entity = pickedObject.id;
    if (entity.isParcours && entity.idx === currentStep) {
      window.parent.postMessage({ action: 'goToPage', page: entity.pointData.pandaPage }, '*');
      currentStep++;
      if (currentStep >= parcours.length) currentStep = parcours.length - 1;
      updateBoussoles();
      updateQuests();
    } else {
      showCustomAlert(entity.pointData.message || "Ce lieu n'est pas accessible pour l’instant.");
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  handler.setInputAction(function (movement) {
    const pickedObject = viewer.scene.pick(movement.endPosition);
    if (Cesium.defined(pickedObject) && pickedObject.id && (!pickedObject.id.isParcours || pickedObject.id.idx !== currentStep)) {
      showCustomAlert(pickedObject.id.pointData.message || "Ce lieu n'est pas accessible pour l’instant.");
    } else {
      hideCustomAlert();
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

function showCustomAlert(msg) {
  const alertBox = document.getElementById("customAlertBox");
  const alertContent = document.getElementById("customAlertContent");
  alertContent.innerHTML = msg;
  alertBox.style.display = "block";
  alertBox.onclick = () => { alertBox.style.display = "none"; };
}
function hideCustomAlert() {
  document.getElementById("customAlertBox").style.display = "none";
}

function startAnimation() {
  viewer.camera.setView({ destination: Cesium.Rectangle.fromDegrees(-10, 35, 15, 55) });
  const niceText = document.createElement('div');
  Object.assign(niceText.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '7vw', fontWeight: 'bold',
    color: 'white', textShadow: '2px 2px 10px black',
    zIndex: 11000, pointerEvents: 'none'
  });
  niceText.textContent = 'Nice';
  document.body.appendChild(niceText);
  setTimeout(() => {
    niceText.remove();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(7.265252, 43.7102, 2000),
      duration: 2.5,
      complete: () => {
        showIntroMessage();
        setTimeout(() => {
          lampeActive = true;
          updateBoussoles();
          updateQuests();
        }, 1000);
      }
    });
  }, 2500);
}

function showIntroMessage() {
  const intro = document.createElement('div');
  intro.id = 'introMessage';
  intro.innerHTML = `
    <div style="font-size:2em;font-weight:bold;">Regardez les trois vidéos pour découvrir Nice en entier !</div>
    <div style="margin-top:10px;">Pour avancer, suivez la boussole rouge qui pointe sur la prochaine étape.</div>
  `;
  Object.assign(intro.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    background: 'rgba(30,30,30,0.95)', color: '#fff',
    padding: '32px 48px', borderRadius: '16px',
    zIndex: 20050, textAlign: 'center'
  });
  document.body.appendChild(intro);
  setTimeout(() => { intro.remove(); }, 4500);
}

// Lampe torche réaliste (canvas)
const lampeCanvas = document.getElementById('lampeCanvas');
const ctx = lampeCanvas.getContext('2d');
function resizeCanvas() { lampeCanvas.width = window.innerWidth; lampeCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const radius = 300;
function isPointInLamp(screenPosition) {
  const centerX = lampeCanvas.width / 2, centerY = lampeCanvas.height / 2;
  const dx = screenPosition.x - centerX, dy = screenPosition.y - centerY;
  return (dx * dx + dy * dy) <= (radius * radius);
}

function drawLampeAndArrows() {
  if (!lampeActive) {
    ctx.clearRect(0, 0, lampeCanvas.width, lampeCanvas.height);
    requestAnimationFrame(drawLampeAndArrows);
    return;
  }
  const w = lampeCanvas.width, h = lampeCanvas.height, centerX = w / 2, centerY = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.97)';
  ctx.fillRect(0, 0, w, h);
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, 'rgba(200, 240, 255, 0.98)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  allPoints.forEach((point, idx) => {
    const windowPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, point.position);
    if (!windowPosition) return;
    if (isPointInLamp(windowPosition)) return;
    const isActive = idx === currentStep && idx < parcours.length;
    const color = isActive ? 'rgba(255, 40, 40, 0.95)' : 'rgba(120, 120, 120, 0.7)';
    const angle = Math.atan2(windowPosition.y - centerY, windowPosition.x - centerX);
    const arrowX = centerX + Math.cos(angle) * (radius + 30);
    const arrowY = centerY + Math.sin(angle) * (radius + 30);
    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-16, -10);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-12, 4);
    ctx.lineTo(-16, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (isActive) {
      ctx.save();
      ctx.translate(arrowX + 28, arrowY - 10);
      ctx.rotate(angle);
      ctx.font = "bold 22px Arial";
      ctx.fillStyle = "#FFD700";
      ctx.fillText("🔑", 0, 0);
      ctx.restore();
    }
  });

  requestAnimationFrame(drawLampeAndArrows);
}
drawLampeAndArrows();

initViewer();


