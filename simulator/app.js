'use strict';

(() => {
  const canvas = document.getElementById('scene');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const $ = (id) => document.getElementById(id);
  const W = canvas.width;
  const H = canvas.height;
  const DIRS = ['N', 'E', 'S', 'O'];
  const DIR_NAMES = { N: 'Norte', E: 'Este', S: 'Sul', O: 'Oeste' };
  const SIGNAL_IDS = { N: 'roadNState', E: 'roadEState', S: 'roadSState', O: 'roadOState' };
  const PED_IDS = { N: 'pedNState', E: 'pedEState', S: 'pedSState', O: 'pedOState' };
  const PHASE_MS = 6500;
  const AMBER_MS = 1800;
  const ALL_RED_MS = 1400;
  const PED_WALK_MS = 4200;
  const CONFLICT = { left: 390, right: 710, top: 245, bottom: 550 };
  const RAIL_Y = { A: 320, B: 460 };
  const CAR_COLORS = ['#39b7d4', '#e8a34b', '#a58be8', '#ed6d79', '#65c68c', '#e2d46c'];

  let mode = 'manual';
  let paused = false;
  let incident = false;
  let cars = [];
  let trains = [];
  let pedestrians = [];
  let events = [];
  let roadSignals = { N: 'RED', E: 'RED', S: 'RED', O: 'RED' };
  let railSignals = { A: 'STOP', B: 'STOP' };
  let pedestrianSignals = { N: 'STOP', E: 'STOP', S: 'STOP', O: 'STOP' };
  let pedestrianRequests = { N: 0, E: 0, S: 0, O: 0 };
  let railSensors = { A: false, B: false };
  let stopSensors = { N: false, E: false, S: false, O: false };
  let selectedCar = 0;
  let selectedTrain = 'A';
  let autoRoadIndex = 0;
  let autoStage = 'GREEN';
  let autoStageAt = 0;
  let autoPedDirection = null;
  let autoPedUntil = 0;
  let startedAt = Date.now();
  let lastFrame = 0;
  let packetSequence = 0;
  let railPriority = false;
  let railOccupied = false;
  let roadTransitionUntil = 0;
  let pendingManualRoad = null;
  let railReadyAt = { A: 0, B: 0 };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const now = () => performance.now();
  const isPedWalking = () => DIRS.some((d) => pedestrianSignals[d] === 'WALK');
  const hasMovingTrain = () => trains.some((t) => Math.abs(t.speed) > 0.01);
  const trainNearCrossing = () => trains.some((t) => t.x > 175 && t.x < 925);
  const anyRailSensor = () => railSensors.A || railSensors.B || trains.some((t) => t.x > 390 && t.x < 710);
  const anyCarInConflict = () => cars.some((c) => c.x > CONFLICT.left && c.x < CONFLICT.right && c.y > CONFLICT.top && c.y < CONFLICT.bottom);
  const anyPedInMotion = () => pedestrians.length > 0;

  function addEvent(title, detail) {
    events.unshift({ time: new Date().toLocaleTimeString('pt-PT'), title, detail });
    events = events.slice(0, 60);
    $('eventCount').textContent = events.length;
    const list = $('eventLog');
    list.replaceChildren();
    if (!events.length) {
      const item = document.createElement('li');
      item.className = 'empty';
      item.textContent = 'Sem ocorrências nesta sessão.';
      list.append(item);
      return;
    }
    for (const event of events) {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      heading.textContent = event.time + ' · ' + event.title;
      const detail = document.createElement('span');
      detail.textContent = event.detail;
      item.append(heading, detail);
      list.append(item);
    }
  }

  function updateCounts() {
    $('carCount').textContent = cars.length;
    $('trainCount').textContent = trains.length;
    $('pedCount').textContent = pedestrians.length;
    $('pedRequests').textContent = Object.values(pedestrianRequests).reduce((a, b) => a + b, 0);
  }

  function allRoadRed() {
    for (const direction of DIRS) roadSignals[direction] = 'RED';
    pendingManualRoad = null;
    roadTransitionUntil = now() + ALL_RED_MS;
    refreshSignalPanels();
  }

  function allPedestrianStop() {
    for (const direction of DIRS) pedestrianSignals[direction] = 'STOP';
    refreshPedPanels();
  }

  function setSystemState(label, message, colour) {
    $('systemState').textContent = label;
    $('systemState').style.color = colour;
    $('status').textContent = message;
    $('stateTrack').style.background = colour;
  }

  function railIsBlockedForRoad() {
    return incident || railPriority || railOccupied || railSignals.A === 'GO' || railSignals.B === 'GO' ||
      railSensors.A || railSensors.B || trainNearCrossing();
  }

  function setRoadSignal(direction, aspect, source = 'manual') {
    if (!DIRS.includes(direction) || !['RED', 'AMBER', 'GREEN'].includes(aspect)) return false;
    if (source === 'manual' && mode !== 'manual') {
      addEvent('COMANDO IGNORADO', 'Muda primeiro para o modo manual.');
      return false;
    }
    if (incident && aspect !== 'RED') {
      addEvent('COMANDO BLOQUEADO', 'A retenção por incidente mantém todas as aproximações em vermelho.');
      return false;
    }
    if (aspect === 'GREEN') {
      if (railIsBlockedForRoad() || isPedWalking() || anyPedInMotion()) {
        addEvent('VERDE RECUSADO', 'Prioridade ferroviária ou passagem pedonal activa.');
        return false;
      }
      if (roadSignals[direction] === 'GREEN') return true;
      const wasAuthorised = DIRS.some((other) => roadSignals[other] !== 'RED');
      for (const other of DIRS) roadSignals[other] = 'RED';
      if (wasAuthorised || now() < roadTransitionUntil) {
        pendingManualRoad = direction;
        roadTransitionUntil = Math.max(roadTransitionUntil, now() + ALL_RED_MS);
        refreshSignalPanels();
        addEvent('VERMELHO INTEGRAL', 'Pedido de verde para ' + DIR_NAMES[direction] + ' em espera até terminar o intervalo de segurança.');
        return true;
      }
      pendingManualRoad = null;
      roadSignals[direction] = 'GREEN';
    } else if (aspect === 'AMBER') {
      pendingManualRoad = null;
      if (railIsBlockedForRoad() || isPedWalking()) {
        roadSignals[direction] = 'RED';
        addEvent('AMARELO RECUSADO', 'A prioridade ferroviária/pedonal mantém o sinal rodoviário em vermelho.');
        refreshSignalPanels();
        return false;
      }
      for (const other of DIRS) roadSignals[other] = 'RED';
      roadSignals[direction] = 'AMBER';
    } else {
      if (pendingManualRoad === direction) pendingManualRoad = null;
      const wasAuthorised = roadSignals[direction] !== 'RED';
      roadSignals[direction] = 'RED';
      if (wasAuthorised) roadTransitionUntil = Math.max(roadTransitionUntil, now() + ALL_RED_MS);
    }
    refreshSignalPanels();
    addEvent('SEMÁFORO RODOVIÁRIO', DIR_NAMES[direction] + ': ' + aspectName(aspect) + '.');
    return true;
  }

  function aspectName(aspect) {
    return aspect === 'GREEN' ? 'verde' : aspect === 'AMBER' ? 'amarelo' : 'vermelho';
  }

  function setRailSignal(track, state) {
    if (!['A', 'B'].includes(track) || !['STOP', 'GO'].includes(state)) return false;
    if (incident && state === 'GO') {
      addEvent('AUTORIZAÇÃO FERROVIÁRIA RECUSADA', 'Existe uma retenção por incidente.');
      return false;
    }
    if (state === 'GO') {
      if (anyCarInConflict() || isPedWalking() || anyPedInMotion()) {
        addEvent('AUTORIZAÇÃO FERROVIÁRIA RECUSADA', 'A zona de conflito não está livre de veículos/peões.');
        return false;
      }
      allRoadRed();
      allPedestrianStop();
      railReadyAt[track] = roadTransitionUntil;
    } else {
      railReadyAt[track] = 0;
    }
    railSignals[track] = state;
    for (const train of trains.filter((t) => t.track === track)) {
      if (state === 'STOP') train.speed = 0;
    }
    refreshRailPanels();
    refreshSignalPanels();
    addEvent('SINAL FERROVIÁRIO', 'Via ' + track + ': ' + (state === 'GO' ? 'marcha autorizada no simulador' : 'parar') + '.');
    return true;
  }

  function requestPedestrian(direction) {
    if (!DIRS.includes(direction)) return;
    pedestrianRequests[direction] = Math.min(8, pedestrianRequests[direction] + 1);
    $('ped' + direction + 'State').textContent = 'PEDIDO PENDENTE';
    $('ped' + direction + 'State').className = 'aspect-badge amber';
    updateCounts();
    addEvent('PEDIDO DE PEÃO', 'Botão de pedido accionado na passadeira ' + DIR_NAMES[direction] + '.');
    if (mode === 'auto') tryServePedestrian(now());
  }

  function startPedestrianWalk(direction, source = 'manual') {
    if (!DIRS.includes(direction)) return false;
    if (source === 'manual' && mode !== 'manual') {
      addEvent('COMANDO PEDONAL IGNORADO', 'No modo automático, o ciclo gere os pedidos.');
      return false;
    }
    if (incident || railIsBlockedForRoad() || DIRS.some((d) => roadSignals[d] !== 'RED') || now() < roadTransitionUntil || anyCarInConflict() || hasMovingTrain()) {
      addEvent('PASSADEIRA BLOQUEADA', 'Não é seguro autorizar peões: existe prioridade ferroviária, incidente ou veículo na zona.');
      return false;
    }
    allRoadRed();
    for (const key of DIRS) pedestrianSignals[key] = 'STOP';
    pedestrianSignals[direction] = 'WALK';
    const amount = Math.max(1, pedestrianRequests[direction]);
    pedestrianRequests[direction] = 0;
    for (let i = 0; i < Math.min(amount, 5); i += 1) {
      pedestrians.push({ direction, progress: i * 0.10, speed: 0.16 + Math.random() * 0.035 });
    }
    refreshPedPanels();
    refreshSignalPanels();
    addEvent('PASSADEIRA AUTORIZADA', 'Peões autorizados na travessia ' + DIR_NAMES[direction] + '.');
    updateCounts();
    return true;
  }

  function stopPedestrianWalk(direction) {
    if (!DIRS.includes(direction)) return;
    pedestrianSignals[direction] = 'STOP';
    refreshPedPanels();
    addEvent('PASSADEIRA FECHADA', 'Sinal pedonal ' + DIR_NAMES[direction] + ': não atravessar.');
  }

  function tryServePedestrian(timestamp) {
    if (incident || railIsBlockedForRoad() || anyCarInConflict() || anyPedInMotion()) return false;
    const direction = DIRS.find((d) => pedestrianRequests[d] > 0);
    if (!direction) return false;
    autoPedDirection = direction;
    autoPedUntil = timestamp + PED_WALK_MS;
    for (const d of DIRS) roadSignals[d] = 'RED';
    return startPedestrianWalk(direction, mode === 'auto' ? 'auto' : 'manual');
  }

  function setRailSensor(track, active) {
    railSensors[track] = Boolean(active);
    const button = $('sensor' + track);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'OCUPADA' : 'Livre';
    button.classList.toggle('on', active);
    if (active) {
      allRoadRed();
      allPedestrianStop();
      if (!incident) setSystemState('FERROVIA OCUPADA', 'Sensor manual da via ' + track + ' indica ocupação.', 'var(--amber)');
    }
    addEvent('SENSOR FERROVIÁRIO', 'Via ' + track + ': ' + (active ? 'ocupada' : 'livre') + '.');
    updateRailPriority();
  }

  function setStopSensor(direction, active) {
    stopSensors[direction] = Boolean(active);
    const button = document.querySelector('[data-stop-sensor="' + direction + '"]');
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'Activado' : 'Normal';
    button.classList.toggle('on', active);
    addEvent('SENSOR DE LINHA', DIR_NAMES[direction] + ': ' + (active ? 'activado' : 'normal') + '.');
    if (active && roadSignals[direction] !== 'GREEN') triggerIncident('Sensor de linha da aproximação ' + DIR_NAMES[direction] + ' activado com sinal não verde.');
  }

  function triggerIncident(reason) {
    if (incident) return;
    incident = true;
    allRoadRed();
    allPedestrianStop();
    railSignals.A = 'STOP';
    railSignals.B = 'STOP';
    trains.forEach((train) => { train.speed = 0; });
    cars.forEach((car) => { car.vx = 0; car.vy = 0; });
    refreshSignalPanels();
    refreshRailPanels();
    refreshPedPanels();
    $('rearmBtn').disabled = false;
    setSystemState('INCIDENT_HOLD', reason + ' Todas as autorizações ficam retidas até verificação manual.', 'var(--red)');
    addEvent('INCIDENTE / RETENÇÃO', reason);
  }

  function rearmIncident() {
    if (!incident) return;
    const trainStillNear = trains.some((train) => train.x > 175 && train.x < 925);
    const sensorStillOccupied = railSensors.A || railSensors.B;
    if (trainStillNear || sensorStillOccupied || anyCarInConflict() || anyPedInMotion()) {
      addEvent('REARME RECUSADO', 'Ainda existe ocupação na zona de conflito ou prioridade ferroviária.');
      setText('status', 'Não é possível rearmar: confirma que a zona está livre e que os sensores estão normalizados.');
      return;
    }
    incident = false;
    allRoadRed();
    $('rearmBtn').disabled = true;
    setSystemState('VERMELHO INTEGRAL', 'Retenção libertada manualmente. Mantém-se o intervalo de vermelho integral.', 'var(--amber)');
    addEvent('REARME MANUAL', 'Operador confirmou a zona livre no simulador.');
  }

  function refreshSignalPanels() {
    for (const d of DIRS) {
      const aspect = roadSignals[d];
      const badge = $(SIGNAL_IDS[d]);
      badge.textContent = aspectName(aspect).toUpperCase();
      badge.className = 'aspect-badge ' + aspect.toLowerCase();
      const signal = $('sig' + (d === 'O' ? 'W' : d));
      if (signal) {
        signal.classList.toggle('active', aspect === 'GREEN');
        signal.classList.toggle('amber-on', aspect === 'AMBER');
        signal.classList.toggle('red', aspect === 'RED');
      }
    }
  }

  function refreshRailPanels() {
    for (const track of ['A', 'B']) {
      const state = railSignals[track];
      const badge = $('rail' + track + 'State');
      if (badge) {
        badge.textContent = state === 'GO' ? 'MARCHA' : 'PARAR';
        badge.className = 'aspect-badge ' + (state === 'GO' ? 'green' : 'red');
      }
      const status = $('rail' + track + 'Status');
      if (status) status.textContent = railSensors[track] ? 'OCUPADA' : trains.some((t) => t.track === track && t.x > 300 && t.x < 800) ? 'COMBOIO NA ZONA' : 'LIVRE';
    }
  }

  function refreshPedPanels() {
    for (const d of DIRS) {
      const badge = $(PED_IDS[d]);
      const state = pedestrianSignals[d];
      const pending = pedestrianRequests[d] > 0;
      badge.textContent = state === 'WALK' ? 'ATRAVESSAR' : pending ? 'PEDIDO PENDENTE' : 'NÃO ATRAVESSAR';
      badge.className = 'aspect-badge ' + (state === 'WALK' ? 'green' : pending ? 'amber' : 'red');
    }
    updateCounts();
  }

  function updateRailPriority() {
    const physical = trains.some((t) => t.x > 175 && t.x < 925);
    railOccupied = anyRailSensor() || trains.some((t) => t.x > 370 && t.x < 730);
    const nextPriority = physical || railSensors.A || railSensors.B || railSignals.A === 'GO' || railSignals.B === 'GO';
    if (nextPriority && !railPriority) {
      allRoadRed();
      allPedestrianStop();
      if (!incident) setSystemState(railOccupied ? 'FERROVIA OCUPADA' : 'PRIORIDADE FERROVIÁRIA', 'Tráfego rodoviário e peões retidos enquanto a via ferroviária estiver autorizada/ocupada.', 'var(--amber)');
    }
    railPriority = nextPriority;
    $('railAStatus').textContent = railSensors.A ? 'OCUPADA' : trains.some((t) => t.track === 'A' && t.x > 300 && t.x < 800) ? 'COMBOIO NA ZONA' : 'LIVRE';
    $('railBStatus').textContent = railSensors.B ? 'OCUPADA' : trains.some((t) => t.track === 'B' && t.x > 300 && t.x < 800) ? 'COMBOIO NA ZONA' : 'LIVRE';
    $('conflictStatus').textContent = railOccupied || anyCarInConflict() || anyPedInMotion() ? 'OCUPADA' : 'LIVRE';
    $('conflictStatus').style.color = railOccupied || anyCarInConflict() || anyPedInMotion() ? 'var(--red)' : 'var(--green)';
    refreshRailPanels();
  }

  function createCar(direction = DIRS[cars.length % 4]) {
    const positions = {
      N: { x: 470, y: 65, vx: 0, vy: 0 },
      S: { x: 630, y: 695, vx: 0, vy: 0 },
      O: { x: 65, y: 365, vx: 0, vy: 0 },
      E: { x: 1035, y: 435, vx: 0, vy: 0 }
    };
    const p = positions[direction];
    cars.push({ id: cars.length + 1, direction, x: p.x, y: p.y, vx: 0, vy: 0, colour: CAR_COLORS[cars.length % CAR_COLORS.length], crossed: false });
    selectedCar = cars.length - 1;
    updateCounts();
    addEvent('AUTOMÓVEL ADICIONADO', 'Veículo na aproximação ' + DIR_NAMES[direction] + '.');
  }

  function createTrain(track) {
    if (trains.some((train) => train.track === track)) {
      selectedTrain = track;
      $('trainSelect').value = track;
      addEvent('COMBOIO JÁ EXISTE', 'A via ' + track + ' já tem um comboio. Foi seleccionado.');
      return;
    }
    const direction = track === 'A' ? 1 : -1;
    trains.push({ id: track, track, x: direction === 1 ? 90 : W - 90, y: RAIL_Y[track], speed: 0, direction });
    selectedTrain = track;
    $('trainSelect').value = track;
    updateCounts();
    refreshRailPanels();
    addEvent('COMBOIO INSERIDO', 'Comboio parado na via ' + track + '. Autoriza a marcha no sinal ferroviário.');
  }

  function createPedestrian(direction = DIRS[pedestrians.length % 4]) {
    if (pedestrianSignals[direction] !== 'WALK') {
      requestPedestrian(direction);
      return;
    }
    pedestrians.push({ direction, progress: Math.random() * 0.04, speed: 0.13 + Math.random() * 0.03 });
    updateCounts();
  }

  function pathForPedestrian(ped) {
    switch (ped.direction) {
      case 'N': return { x: 405 + 285 * ped.progress, y: 238 };
      case 'S': return { x: 695 - 285 * ped.progress, y: 556 };
      case 'O': return { x: 382, y: 548 - 300 * ped.progress };
      default: return { x: 718, y: 255 + 300 * ped.progress };
    }
  }

  function updatePedestrians(dt) {
    for (const ped of pedestrians) ped.progress += ped.speed * dt / 1000;
    const before = pedestrians.length;
    pedestrians = pedestrians.filter((ped) => ped.progress < 1);
    if (before !== pedestrians.length) {
      updateCounts();
      if (!anyPedInMotion()) {
        for (const d of DIRS) {
          if (pedestrianSignals[d] === 'WALK') pedestrianSignals[d] = 'STOP';
        }
        refreshPedPanels();
        addEvent('PASSADEIRA LIBERTADA', 'Todos os peões terminaram a travessia.');
        if (mode === 'auto') {
          autoPedDirection = null;
          autoStage = 'ALL_RED';
          autoStageAt = now();
        }
      }
    }
  }

  function applyPendingManualRoad(timestamp) {
    if (mode !== 'manual' || !pendingManualRoad || timestamp < roadTransitionUntil) return;
    if (railIsBlockedForRoad() || isPedWalking() || anyPedInMotion()) {
      pendingManualRoad = null;
      addEvent('VERDE CANCELADO', 'A prioridade ferroviária/pedonal impediu a activação do sinal.');
      return;
    }
    const direction = pendingManualRoad;
    pendingManualRoad = null;
    roadSignals[direction] = 'GREEN';
    refreshSignalPanels();
    addEvent('VERDE ACTIVADO', 'Intervalo de vermelho concluído na aproximação ' + DIR_NAMES[direction] + '.');
  }

  function updateAuto(timestamp) {
    if (mode !== 'auto' || incident) return;
    if (railPriority || railOccupied) {
      for (const d of DIRS) roadSignals[d] = 'RED';
      allPedestrianStop();
      refreshSignalPanels();
      return;
    }
    if (isPedWalking()) {
      allRoadRed();
      return;
    }
    const elapsed = timestamp - autoStageAt;
    if (autoStage === 'GREEN' && elapsed >= PHASE_MS) {
      roadSignals[DIRS[autoRoadIndex]] = 'AMBER';
      autoStage = 'AMBER';
      autoStageAt = timestamp;
      refreshSignalPanels();
      addEvent('CICLO AUTOMÁTICO', 'Amarelo na aproximação ' + DIR_NAMES[DIRS[autoRoadIndex]] + '.');
    } else if (autoStage === 'AMBER' && elapsed >= AMBER_MS) {
      allRoadRed();
      autoStage = 'ALL_RED';
      autoStageAt = timestamp;
    } else if (autoStage === 'ALL_RED' && elapsed >= ALL_RED_MS) {
      if (Object.values(pedestrianRequests).some((count) => count > 0)) {
        const d = DIRS.find((direction) => pedestrianRequests[direction] > 0);
        if (d) {
          startPedestrianWalk(d, 'auto');
          autoPedDirection = d;
          autoPedUntil = timestamp + PED_WALK_MS;
          autoStageAt = timestamp;
        }
      } else {
        autoRoadIndex = (autoRoadIndex + 1) % 4;
        roadSignals[DIRS[autoRoadIndex]] = 'GREEN';
        autoStage = 'GREEN';
        autoStageAt = timestamp;
        refreshSignalPanels();
        addEvent('CICLO AUTOMÁTICO', 'Verde na aproximação ' + DIR_NAMES[DIRS[autoRoadIndex]] + '.');
      }
    }
    if (autoPedDirection && timestamp >= autoPedUntil && !anyPedInMotion()) {
      stopPedestrianWalk(autoPedDirection);
      autoPedDirection = null;
      autoRoadIndex = (autoRoadIndex + 1) % 4;
      roadSignals[DIRS[autoRoadIndex]] = 'GREEN';
      autoStage = 'GREEN';
      autoStageAt = timestamp;
      refreshSignalPanels();
    }
  }

  function lineCrossed(car, nx, ny) {
    if (car.direction === 'N') return car.y < 220 && ny >= 220;
    if (car.direction === 'S') return car.y > 580 && ny <= 580;
    if (car.direction === 'O') return car.x < 385 && nx >= 385;
    return car.x > 715 && nx <= 715;
  }

  function moveCars(dt) {
    if (paused || incident) return;
    const seconds = dt / 1000;
    for (const car of cars) {
      if (car.vx === 0 && car.vy === 0) continue;
      const nx = clamp(car.x + car.vx * seconds, -100, W + 100);
      const ny = clamp(car.y + car.vy * seconds, -100, H + 100);
      if (!car.crossed && lineCrossed(car, nx, ny)) {
        if (roadSignals[car.direction] !== 'GREEN' || railPriority || isPedWalking()) {
          triggerIncident('Automóvel atravessou a linha de paragem ' + DIR_NAMES[car.direction] + ' sem autorização.');
          return;
        }
        car.crossed = true;
        addEvent('PASSAGEM AUTORIZADA', 'Automóvel atravessou a linha de paragem ' + DIR_NAMES[car.direction] + ' com verde.');
      }
      if (nx > CONFLICT.left && nx < CONFLICT.right && ny > CONFLICT.top && ny < CONFLICT.bottom && (railPriority || isPedWalking())) {
        triggerIncident('Veículo rodoviário entrou numa zona com prioridade ferroviária/pedonal.');
        return;
      }
      car.x = nx;
      car.y = ny;
      if (car.x <= -99 || car.x >= W + 99 || car.y <= -99 || car.y >= H + 99) {
        car.vx = 0;
        car.vy = 0;
      }
    }
  }

  function moveTrains(dt) {
    if (paused || incident) return;
    const seconds = dt / 1000;
    for (const train of trains) {
      if (Math.abs(train.speed) < 0.01) continue;
      if (railSignals[train.track] !== 'GO' || now() < railReadyAt[train.track]) {
        train.speed = 0;
        addEvent('COMBOIO RETIDO', 'A via ' + train.track + ' tem o sinal em PARAR.');
        continue;
      }
      if (anyCarInConflict() || isPedWalking() || anyPedInMotion()) {
        train.speed = 0;
        addEvent('COMBOIO RETIDO', 'A zona de conflito não está livre.');
        continue;
      }
      train.x += train.speed * seconds;
      if (train.x < -140 || train.x > W + 140) {
        train.x = train.x < 0 ? -140 : W + 140;
        train.speed = 0;
        addEvent('COMBOIO SAIU DA ZONA', 'A via ' + train.track + ' ficou sem comboio em movimento.');
      }
    }
  }

  function detectConflicts() {
    for (const car of cars) {
      if (car.x < CONFLICT.left || car.x > CONFLICT.right || car.y < CONFLICT.top || car.y > CONFLICT.bottom) continue;
      for (const train of trains) {
        if (Math.abs(car.x - train.x) < 92 && Math.abs(car.y - train.y) < 38) {
          triggerIncident('Conflito geométrico entre automóvel e comboio na simulação.');
          return;
        }
      }
    }
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y); ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r); ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function drawRoad() {
    ctx.fillStyle = '#172a25'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#263541'; ctx.fillRect(390, 0, 320, H); ctx.fillRect(0, 245, W, 305);
    ctx.fillStyle = '#31404a'; ctx.fillRect(390, 245, 320, 305);

    ctx.strokeStyle = '#9baab2'; ctx.lineWidth = 2; ctx.setLineDash([18, 15]); ctx.beginPath();
    ctx.moveTo(450, 0); ctx.lineTo(450, 245); ctx.moveTo(650, 0); ctx.lineTo(650, 245);
    ctx.moveTo(450, 550); ctx.lineTo(450, H); ctx.moveTo(650, 550); ctx.lineTo(650, H);
    ctx.moveTo(0, 295); ctx.lineTo(390, 295); ctx.moveTo(710, 295); ctx.lineTo(W, 295);
    ctx.moveTo(0, 500); ctx.lineTo(390, 500); ctx.moveTo(710, 500); ctx.lineTo(W, 500); ctx.stroke(); ctx.setLineDash([]);

    for (const y of [RAIL_Y.A, RAIL_Y.B]) {
      ctx.fillStyle = '#16242f'; ctx.fillRect(0, y - 25, W, 50);
      ctx.strokeStyle = '#d4a34c'; ctx.lineWidth = 4;
      for (let x = 0; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x + 18, y - 24); ctx.moveTo(x, y + 24); ctx.lineTo(x + 18, y + 24); ctx.stroke(); }
      ctx.strokeStyle = '#9caab2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, y - 13); ctx.lineTo(W, y - 13); ctx.moveTo(0, y + 13); ctx.lineTo(W, y + 13); ctx.stroke();
    }
    ctx.fillStyle = '#e4edf2'; ctx.font = 'bold 14px system-ui';
    ctx.fillText('VIA FERROVIÁRIA A', 20, RAIL_Y.A - 34); ctx.fillText('VIA FERROVIÁRIA B', 20, RAIL_Y.B - 34);
    ctx.fillText('N', 540, 30); ctx.fillText('S', 540, 744); ctx.fillText('O', 20, 395); ctx.fillText('E', 1065, 395);

    // Passadeiras: Norte e Sul atravessam os braços verticais; Este e Oeste os horizontais.
    for (let x = 405; x < 700; x += 18) { ctx.fillStyle = '#e7e9ec'; ctx.fillRect(x, 225, 10, 24); ctx.fillRect(x, 550, 10, 24); }
    for (let y = 258; y < 545; y += 18) { ctx.fillStyle = '#e7e9ec'; ctx.fillRect(375, y, 24, 10); ctx.fillRect(701, y, 24, 10); }

    // Linhas de paragem e semáforos rodoviários.
    const roadSignalsDraw = [
      { d: 'N', x: 770, y: 220 }, { d: 'S', x: 330, y: 585 },
      { d: 'O', x: 365, y: 210 }, { d: 'E', x: 735, y: 585 }
    ];
    for (const item of roadSignalsDraw) {
      ctx.fillStyle = '#e7edf0'; ctx.fillRect(item.x - 13, item.y - 2, 26, 4);
      drawTrafficSignal(item.x, item.y, roadSignals[item.d]);
      ctx.fillStyle = '#dce6eb'; ctx.font = '11px system-ui'; ctx.fillText(item.d, item.x - 4, item.y + 42);
    }

    // Sinais ferroviários das duas vias.
    drawRailSignal(130, RAIL_Y.A, railSignals.A);
    drawRailSignal(970, RAIL_Y.B, railSignals.B);
    drawPedSignal(745, 230, pedestrianSignals.N);
    drawPedSignal(350, 570, pedestrianSignals.S);
    drawPedSignal(370, 590, pedestrianSignals.O);
    drawPedSignal(730, 220, pedestrianSignals.E);

    ctx.strokeStyle = incident ? '#fa6670' : '#45cf91'; ctx.lineWidth = 2;
    ctx.strokeRect(CONFLICT.left, CONFLICT.top, CONFLICT.right - CONFLICT.left, CONFLICT.bottom - CONFLICT.top);
    if (incident) {
      ctx.fillStyle = 'rgba(250,102,112,0.2)'; ctx.fillRect(CONFLICT.left, CONFLICT.top, CONFLICT.right - CONFLICT.left, CONFLICT.bottom - CONFLICT.top);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px system-ui'; ctx.fillText('INCIDENT HOLD', 470, 405);
    }
  }

  function drawTrafficSignal(x, y, aspect) {
    ctx.fillStyle = '#111820'; roundRect(x - 13, y - 31, 26, 54, 7); ctx.fill();
    const colours = { RED: '#fa6670', AMBER: '#f3b84b', GREEN: '#45cf91' };
    const positions = [{ y: y - 21, key: 'RED' }, { y: y - 4, key: 'AMBER' }, { y: y + 13, key: 'GREEN' }];
    for (const p of positions) {
      ctx.beginPath(); ctx.fillStyle = p.key === aspect ? colours[p.key] : '#3c4a55'; ctx.arc(x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawRailSignal(x, y, state) {
    ctx.fillStyle = '#101820'; roundRect(x - 8, y - 35, 16, 30, 4); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = state === 'GO' ? '#45cf91' : '#fa6670'; ctx.arc(x, y - 25, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#778b99'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 18); ctx.stroke();
  }

  function drawPedSignal(x, y, state) {
    ctx.fillStyle = '#101820'; roundRect(x - 9, y - 14, 18, 28, 4); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = state === 'WALK' ? '#45cf91' : '#fa6670'; ctx.arc(x, y - 5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 7); ctx.moveTo(x, y + 2); ctx.lineTo(x - 4, y + 6); ctx.moveTo(x, y + 2); ctx.lineTo(x + 4, y + 6); ctx.stroke();
  }

  function drawCar(car, index) {
    ctx.save(); ctx.translate(car.x, car.y);
    if (car.direction === 'N' || car.direction === 'S') ctx.rotate(Math.PI / 2);
    ctx.fillStyle = car.colour; roundRect(-23, -12, 46, 24, 6); ctx.fill();
    ctx.fillStyle = '#b8e8f2'; ctx.fillRect(-9, -9, 17, 18);
    ctx.fillStyle = '#111820'; ctx.fillRect(-16, -15, 9, 4); ctx.fillRect(8, -15, 9, 4); ctx.fillRect(-16, 11, 9, 4); ctx.fillRect(8, 11, 9, 4);
    if (index === selectedCar) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-27, -16, 54, 32); }
    ctx.restore();
  }

  function drawTrain(train) {
    ctx.save(); ctx.translate(train.x, train.y); if (train.speed < 0) ctx.scale(-1, 1);
    for (let i = 0; i < 4; i += 1) {
      const x = -95 + i * 47;
      ctx.fillStyle = i === 0 ? '#f2b632' : '#d99f2d';
      roundRect(x, -17, 43, 34, 6); ctx.fill();
      ctx.fillStyle = '#bce8f4'; ctx.fillRect(x + 6, -11, 13, 11); ctx.fillRect(x + 24, -11, 13, 11);
      ctx.fillStyle = '#17232d'; ctx.beginPath(); ctx.arc(x + 10, 17, 4, 0, Math.PI * 2); ctx.arc(x + 33, 17, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (selectedTrain === train.track) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(train.x - 100, train.y - 22, 200, 44); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.fillText('COMBOIO ' + train.track, train.x - 35, train.y - 28);
  }

  function drawPedestrian(ped) {
    const point = pedPosition(ped);
    ctx.strokeStyle = '#f6f0ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(point.x, point.y - 7, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(point.x, point.y - 3); ctx.lineTo(point.x, point.y + 8); ctx.moveTo(point.x, point.y + 1); ctx.lineTo(point.x - 6, point.y + 5); ctx.moveTo(point.x, point.y + 1); ctx.lineTo(point.x + 6, point.y + 5); ctx.moveTo(point.x, point.y + 8); ctx.lineTo(point.x - 5, point.y + 14); ctx.moveTo(point.x, point.y + 8); ctx.lineTo(point.x + 5, point.y + 14); ctx.stroke();
  }

  function pedPosition(ped) {
    const p = ped.progress;
    if (ped.direction === 'N') return { x: 400 + p * 300, y: 236 };
    if (ped.direction === 'S') return { x: 700 - p * 300, y: 562 };
    if (ped.direction === 'O') return { x: 386, y: 555 - p * 300 };
    return { x: 714, y: 250 + p * 300 };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawRoad();
    trains.forEach(drawTrain);
    cars.forEach(drawCar);
    pedestrians.forEach(drawPedestrian);
  }

  function updateStatus() {
    if (incident) return;
    if (railOccupied || railPriority) {
      setSystemState(railOccupied ? 'FERROVIA OCUPADA' : 'PRIORIDADE FERROVIÁRIA', 'Sinais rodoviários e pedonais retidos por prioridade ferroviária.', 'var(--amber)');
    } else if (isPedWalking()) {
      setSystemState('PASSADEIRA ACTIVA', 'Peões autorizados a atravessar. Tráfego rodoviário retido.', 'var(--purple)');
    } else if (mode === 'manual') {
      const active = DIRS.find((d) => roadSignals[d] === 'GREEN' || roadSignals[d] === 'AMBER');
      setSystemState(active ? 'MANUAL · ' + DIR_NAMES[active].toUpperCase() : 'MANUAL · VERMELHO', active ? 'Comando manual activo na aproximação ' + DIR_NAMES[active] + '.' : 'Todas as aproximações rodoviárias estão em vermelho.', active ? (roadSignals[active] === 'GREEN' ? 'var(--green)' : 'var(--amber)') : 'var(--muted)');
    } else {
      const active = DIRS.find((d) => roadSignals[d] === 'GREEN' || roadSignals[d] === 'AMBER');
      setSystemState('AUTOMÁTICO · ' + (active ? DIR_NAMES[active].toUpperCase() : 'TRANSIÇÃO'), 'Ciclo automático demonstrativo.', 'var(--cyan)');
    }
  }

  function updateUptime() {
    const sec = Math.floor((Date.now() - startedAt) / 1000);
    $('uptime').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  }

  function transmitLora() {
    packetSequence += 1;
    const payload = {
      node: 'ESP32-JUNCTION-01',
      seq: packetSequence,
      timestamp: new Date().toISOString(),
      event: 'STATUS',
      mode,
      road: roadSignals,
      rail: railSignals,
      pedestrian: pedestrianSignals,
      occupancy: { railA: railSensors.A, railB: railSensors.B },
      counts: { cars: cars.length, trains: trains.length, pedestrians: pedestrians.length, pendingPedestrianRequests: Object.values(pedestrianRequests).reduce((a, b) => a + b, 0) },
      incident
    };
    $('loraLink').textContent = 'Pacote simulado';
    $('loraRssi').textContent = (-65 - Math.floor(Math.random() * 24)) + ' dBm';
    $('loraSnr').textContent = (4 + Math.floor(Math.random() * 8)) + ' dB';
    $('loraPackets').textContent = packetSequence;
    $('loraPayload').textContent = JSON.stringify(payload, null, 2);
    addEvent('LoRa TX SIMULADO', 'Pacote ' + packetSequence + ' preparado. Nenhuma transmissão RF foi efectuada.');
  }

  function bindControls() {
    document.querySelectorAll('[data-road][data-aspect]').forEach((button) => button.addEventListener('click', () => {
      setRoadSignal(button.dataset.road, button.dataset.aspect);
    }));
    document.querySelectorAll('[data-rail][data-state]').forEach((button) => button.addEventListener('click', () => {
      setRailSignal(button.dataset.rail, button.dataset.state);
    }));
    document.querySelectorAll('[data-ped-request]').forEach((button) => button.addEventListener('click', () => requestPedestrian(button.dataset.pedRequest)));
    document.querySelectorAll('[data-ped-state]').forEach((button) => button.addEventListener('click', () => {
      const direction = button.dataset.pedState;
      if (button.dataset.state === 'WALK') startPedestrianWalk(direction);
      else stopPedestrianWalk(direction);
    }));
    document.querySelectorAll('[data-stop-sensor]').forEach((button) => button.addEventListener('click', () => {
      const d = button.dataset.stopSensor;
      setStopSensor(d, !stopSensors[d]);
    }));
    $('sensorA').addEventListener('click', () => setRailSensor('A', !railSensors.A));
    $('sensorB').addEventListener('click', () => setRailSensor('B', !railSensors.B));
    $('addCar').addEventListener('click', () => createCar());
    $('addTrainA').addEventListener('click', () => createTrain('A'));
    $('addTrainB').addEventListener('click', () => createTrain('B'));
    $('addPed').addEventListener('click', () => createPedestrian());
    $('clearVehicles').addEventListener('click', () => {
      cars = []; pedestrians = []; trains = [];
      railSensors = { A: false, B: false };
      $('sensorA').setAttribute('aria-pressed', 'false'); $('sensorA').textContent = 'Livre'; $('sensorA').classList.remove('on');
      $('sensorB').setAttribute('aria-pressed', 'false'); $('sensorB').textContent = 'Livre'; $('sensorB').classList.remove('on');
      updateCounts(); refreshRailPanels(); addEvent('SIMULAÇÃO LIMPA', 'Veículos, comboios, peões e ocupações simuladas removidos.');
    });
    $('violation').addEventListener('click', () => triggerIncident('Infração simulada pelo operador.'));
    $('rearmBtn').addEventListener('click', rearmIncident);
    $('trainStop').addEventListener('click', () => {
      const train = trains.find((t) => t.track === selectedTrain);
      if (train) train.speed = 0;
      addEvent('COMANDO DE PARAGEM', 'Pedido de paragem ao comboio da via ' + selectedTrain + '.');
    });
    $('trainSelect').addEventListener('change', (event) => { selectedTrain = event.target.value; });
    $('pauseBtn').addEventListener('click', () => {
      paused = !paused;
      $('pauseBtn').textContent = paused ? '▶ Retomar' : 'Ⅱ Pausar';
      addEvent(paused ? 'SIMULAÇÃO PAUSADA' : 'SIMULAÇÃO RETOMADA', 'Estado do simulador alterado pelo operador.');
    });
    $('reset').addEventListener('click', reset);
    $('modeSelect').addEventListener('change', (event) => {
      mode = event.target.value;
      allRoadRed();
      allPedestrianStop();
      if (mode === 'auto') {
        autoRoadIndex = 3; autoStage = 'ALL_RED'; autoStageAt = now();
        refreshSignalPanels();
        addEvent('MODO AUTOMÁTICO', 'Ciclo sequencial demonstrativo activado após vermelho integral.');
      } else {
        addEvent('MODO MANUAL', 'Comandos individuais dos sinais disponíveis.');
      }
    });
    $('sendLora').addEventListener('click', transmitLora);
    $('clearLog').addEventListener('click', () => {
      events = [];
      $('eventCount').textContent = '0';
      $('eventLog').replaceChildren();
      const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Sem ocorrências nesta sessão.';
      $('eventLog').append(li);
    });

    window.addEventListener('keydown', (event) => {
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (event.key === ' ' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        event.preventDefault(); $('pauseBtn').click(); return;
      }
      if (event.key === 'Tab' && cars.length && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName)) {
        event.preventDefault(); selectedCar = (selectedCar + 1) % cars.length; return;
      }
      if (!arrows.includes(event.key) || paused || incident) return;
      event.preventDefault();
      if (event.shiftKey) {
        const train = trains.find((t) => t.track === selectedTrain);
        if (!train) { addEvent('SEM COMBOIO', 'Insere primeiro um comboio na via seleccionada.'); return; }
        if (railSignals[train.track] !== 'GO') { train.speed = 0; addEvent('COMBOIO RETIDO', 'Autoriza primeiro o sinal ferroviário da via ' + train.track + '.'); return; }
        if (now() < railReadyAt[train.track]) { train.speed = 0; addEvent('INTERVALO DE SEGURANÇA', 'Aguarda o fim do vermelho integral antes da marcha.'); return; }
        if (event.key === 'ArrowRight') train.speed = 125;
        if (event.key === 'ArrowLeft') train.speed = -125;
        return;
      }
      const car = cars[selectedCar];
      if (!car) return;
      const speed = 125;
      if (event.key === 'ArrowUp') { car.vx = 0; car.vy = -speed; }
      if (event.key === 'ArrowDown') { car.vx = 0; car.vy = speed; }
      if (event.key === 'ArrowLeft') { car.vx = -speed; car.vy = 0; }
      if (event.key === 'ArrowRight') { car.vx = speed; car.vy = 0; }
    });

    window.addEventListener('keyup', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      if (event.shiftKey || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const train = trains.find((t) => t.track === selectedTrain);
        if (train) train.speed = 0;
      }
      const car = cars[selectedCar];
      if (car) { car.vx = 0; car.vy = 0; }
    });
    window.addEventListener('blur', () => {
      cars.forEach((car) => { car.vx = 0; car.vy = 0; });
      trains.forEach((train) => { train.speed = 0; });
    });
  }

  function frame(timestamp) {
    const dt = lastFrame ? Math.min(60, timestamp - lastFrame) : 0;
    lastFrame = timestamp;
    if (!paused) updatePedestrians(dt);
    if (!paused && !incident) {
      updateRailPriority();
      applyPendingManualRoad(timestamp);
      updateAuto(timestamp);
      moveCars(dt);
      moveTrains(dt);
      detectConflicts();
      updateRailPriority();
      refreshRailPanels();
    }
    updateStatus();
    updateUptime();
    refreshSignalPanels();
    refreshPedPanels();
    draw();
    requestAnimationFrame(frame);
  }

  function reset() {
    paused = false; incident = false; cars = []; trains = []; pedestrians = []; events = [];
    roadSignals = { N: 'RED', E: 'RED', S: 'RED', O: 'RED' };
    railSignals = { A: 'STOP', B: 'STOP' };
    pedestrianSignals = { N: 'STOP', E: 'STOP', S: 'STOP', O: 'STOP' };
    pedestrianRequests = { N: 0, E: 0, S: 0, O: 0 };
    railSensors = { A: false, B: false };
    stopSensors = { N: false, E: false, S: false, O: false };
    selectedCar = 0; selectedTrain = 'A'; mode = $('modeSelect').value;
    autoRoadIndex = 3; autoStage = 'ALL_RED'; autoStageAt = now(); autoPedDirection = null; autoPedUntil = 0;
    railPriority = false; railOccupied = false; previousRailPriority = false; roadTransitionUntil = 0; pendingManualRoad = null; railReadyAt = { A: 0, B: 0 };
    startedAt = Date.now(); lastFrame = 0;
    $('pauseBtn').textContent = 'Ⅱ Pausar';
    $('rearmBtn').disabled = true;
    $('sensorA').setAttribute('aria-pressed', 'false'); $('sensorA').textContent = 'Livre'; $('sensorA').classList.remove('on');
    $('sensorB').setAttribute('aria-pressed', 'false'); $('sensorB').textContent = 'Livre'; $('sensorB').classList.remove('on');
    document.querySelectorAll('[data-stop-sensor]').forEach((button) => { button.setAttribute('aria-pressed', 'false'); button.textContent = 'Normal'; button.classList.remove('on'); });
    createTrain('A'); createTrain('B'); createCar('N'); createCar('O');
    allRoadRed();
    if (mode === 'auto') { autoRoadIndex = 3; autoStage = 'ALL_RED'; autoStageAt = now(); }
    refreshSignalPanels(); refreshRailPanels(); refreshPedPanels();
    setSystemState('MANUAL · VERMELHO', 'Todas as autorizações começam em vermelho.', 'var(--muted)');
    addEvent('SISTEMA INICIADO', 'Cruzamento reiniciado em modo manual.');
  }

  bindControls();
  reset();
  requestAnimationFrame(frame);
})();