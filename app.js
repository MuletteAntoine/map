Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyNDM0ODlkOS0xMDU4LTQ0YjUtYjJiZi04ZGYzOGRlZTgyNDgiLCJpZCI6MzEwMDI4LCJpYXQiOjE3NDkyNzY5Nzh9.2jvKodQGEAxFbZN-bn5VCY-XdX3eCEHf8iD7FUEU3uc';

const parcours = [
  { 
    name: "Commissariat", 
    position: Cesium.Cartesian3.fromDegrees(7.287922, 43.7120523, 30), 
    url: "https://viewer.pandasuite.com/Xgs22JPm?wid=53ce8bc9a1c90ba10004cd",
    questMessage: "Aller au commissariat"
  },
  { 
    name: "Bergerie", 
    position: Cesium.Cartesian3.fromDegrees(7.3, 43.726111, 30), 
    url: "https://viewer.pandasuite.com/Xgs22JPm?wid=6542e888449f7cc8000544",
    questMessage: "Aller à la bergerie"
  },
  { 
    name: "Palais de Justice", 
    position: Cesium.Cartesian3.fromDegrees(7.273762, 43.696633, 30), 
    url: "https://viewer.pandasuite.com/Xgs22JPm?wid=6542e888449f7cc8000541",
    questMessage: "Aller au palais de justice"
  }

];
const secondaires = [
  { name: "Maison des hauteurs", position: Cesium.Cartesian3.fromDegrees(7.27005, 43.72660, 80), message: "Les braqueurs s’y cachaient, mais la voisine nous a déjà alertés." },
  { name: "Banque", position: Cesium.Cartesian3.fromDegrees(7.26945, 43.69912, 30), message: "Les braqueurs sont déjà passés, aucune trace ADN n’a été retrouvée." },
  { name: "Boutique photo", position: Cesium.Cartesian3.fromDegrees(7.223, 43.671, 30), message: "Les braqueurs ont tenté d’y vendre un lingot d’or, mais le vendeur nous a déjà contactés." }
];
const allPoints = [...parcours, ...secondaires];
let currentStep = 0;
let lampeActive = false;

// --- Initialisation CesiumJS ---
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: Cesium.createWorldTerrain(),
  imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
  baseLayerPicker: false,
  sceneMode: Cesium.SceneMode.SCENE2D,
  timeline: false,
  animation: false,
  shouldAnimate: false,
});
viewer.scene.screenSpaceCameraController.enableZoom = true;
viewer.scene.screenSpaceCameraController.enableRotate = false;
viewer.scene.screenSpaceCameraController.enableTilt = false;
viewer.scene.screenSpaceCameraController.enableLook = false;
viewer.scene.screenSpaceCameraController.enableTranslate = true;
viewer.scene.screenSpaceCameraController.inertiaSpin = 0;
viewer.scene.screenSpaceCameraController.inertiaZoom = 0;
viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
viewer.selectedEntityChanged.addEventListener(() => { viewer.selectedEntity = undefined; });

// --- Ajout des entités (balises) ---
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

// --- Interactions ---
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(function (click) {
  const pickedObject = viewer.scene.pick(click.position);
  if (!Cesium.defined(pickedObject) || !pickedObject.id) return;
  const entity = pickedObject.id;

  if (entity.isParcours) {
    if (entity.idx === currentStep) {
      // Étape en cours : on ouvre la vidéo
      openVideoOverlay(parcours[currentStep].url);
    } else if (entity.idx < currentStep) {
      // Étape déjà faite
      showCustomAlert("Vous êtes déjà passé par là.");
    } else {
      // Étape pas encore accessible
      showCustomAlert("Ce lieu n'est pas accessible pour l'instant.");
    }
  } else {
    // Bâtiment secondaire : message personnalisé ou défaut
    showCustomAlert(entity.pointData.message || "Ce lieu n'est pas accessible pour l’instant.");
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// --- Boussoles et quêtes ---
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
    let quest = parcours[i].questMessage;
    if (i < currentStep) {
      html += `<div style="color:#00aaff;opacity:0.7;text-decoration:line-through;">${quest} ✔️</div>`;
    } else if (i === currentStep) {
      html += `<div style="color:#ff6868;">${quest} (en cours)</div>`;
    }
  }
  questPanel.innerHTML = html;
}
updateBoussoles();
updateQuests();

// --- Alertes personnalisées ---
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

// --- Animation d’intro ---
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
// --- Message de fin ---
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
startAnimation();
function showEndMessage() {
  const endDiv = document.createElement('div');
  endDiv.id = 'endMessage';
  endDiv.innerHTML = `
    <div style="font-size:2.5em;font-weight:bold;">🎉 Bravo, tu as terminé toutes les quêtes ! 🎉</div>
    <div style="margin-top:18px;font-size:1.3em;">Merci d’avoir exploré Nice.<br>Tu peux retourner à accueil.</div>
  `;
  Object.assign(endDiv.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(30,30,30,0.97)',
    color: '#fff',
    padding: '40px 60px',
    borderRadius: '18px',
    zIndex: 30000,
    textAlign: 'center',
    boxShadow: '0 4px 32px #000a',
    cursor: 'pointer'
  });
  endDiv.onclick = () => endDiv.remove();
  document.body.appendChild(endDiv);
  setTimeout(() => {
    if (document.body.contains(endDiv)) endDiv.remove();
  }, 7000);
}

// --- Lampe torche (canvas) ---
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

// --- Vidéo overlay ---
function openVideoOverlay(url) {
  const overlay = document.getElementById('videoOverlay');
  const iframe = document.getElementById('videoIframe');
  overlay.style.display = 'flex';
  iframe.src = url;
  document.body.style.overflow = 'hidden';
}
document.getElementById('closeVideo').onclick = function() {
  document.getElementById('videoOverlay').style.display = 'none';
  document.getElementById('videoIframe').src = '';
  document.body.style.overflow = '';
  if (currentStep < parcours.length) {
    currentStep++;
    updateBoussoles();
    updateQuests();
    if (currentStep === parcours.length) {
      showEndMessage();
    }
  }
};


// --- Boutons UI ---
document.getElementById('btnRecenter').onclick = () => {
  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(7.265252, 43.7102, 2000), duration: 2.5 });
};
document.getElementById('btnFullscreen').onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
};

