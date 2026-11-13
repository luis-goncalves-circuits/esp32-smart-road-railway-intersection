'use strict';

(() => {
  const canvas = document.getElementById('scene');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const $ = (id) => document.getElementById(id);
  const W = canvas.width;
  const H = canvas.height;
  const CONFLICT = { left: 350, right: 650, top: 190, bottom: 490 };
  const PHASES = ['N', 'E', 'S', 'O'];
  const SIGNAL_IDS = { N: 'sigN', E: 'sigE', S: 'sigS', O: 'sigW' };
  const PHASE_MS = 9000;
  const ALL_RED_MS = 1800;
  const TRAIN_WARNING_LEFT = 190;
  const TRAIN_WARNING_RIGHT = 810;
  const CAR_COLORS = ['#39b7d4', '#e8a34b', '#a58be8', '#ed6d79', '#65c68c'];

  let cars = [];
  let trains = [];
  let events = [];
  let selectedCar = 0;
  let phaseIndex = 0;
  let phaseStartedAt = 0;
  let allRedUntil = 0;
  let startedAt = 0;
  let lastFrameAt = 0;
  let paused = false;
  let incidentHold = false;
  let railApproachActive = false;
  let railOccupied = false;
  let previousRailPriority = false;

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = String(value);
  }

  function appendEvent(title, detail) {
    const event = { time: new Date().toLocaleTimeString('pt-PT'), title, detail };
    events.unshift(event);
    events = events.slice(0, 40);
    setText('eventCount', events.length);
    const list = $('eventLog');
    if (!list) return;
    list.replaceChildren();
    for (const item of events) {
      const li = document.createElement('li');
      const heading = document.createElement('strong');
      heading.textContent = item.time + ' · ' + item.title;
      const description = document.createElement('span');
      description.textContent = item.detail;
      li.append(heading, document.createElement('br'), description);
      list.append(li);
    }
    if (events.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Sem ocorrências nesta sessão.';
      list.append(li);
    }
  }

  function updateMetrics() {
    setText('carCount', cars.length);
    setText('trainCount', trains.length);
  }

  function createCar(approach = PHASES[cars.length % PHASES.length]) {
    const positions = {
      N: { x: 455, y: 105, vx: 0, vy: 0 },
      S: { x: 545, y: 575, vx: 0, vy: 0 },
      O: { x: 105, y: 325, vx: 0, vy: 0 },
      E: { x: 895, y: 355, vx: 0, vy: 0 }
    };
    const position = positions[approach] || positions.N;
    cars.push({
      id: String(Date.now()) + '-' + String(Math.random()),
      approach,
      x: position.x,
      y: position.y,
      vx: position.vx,
      vy: position.vy,
      color: CAR_COLORS[cars.length % CAR_COLORS.length],
      enteredIntersection: false
    });
    selectedCar = cars.length - 1;
    appendEvent('AUTOMÓVEL ADICIONADO', 'Veículo colocado na aproximação ' + approach + '.');
    updateMetrics();
  }

  function createTrain() {
    if (trains.length >= 2) {
      appendEvent('LIMITE DE COMBOIOS', 'A simulação permite até dois comboios em simultâneo.');
      return;
    }
    const fromWest = trains.length === 0;
    trains.push({
      x: fromWest ? -120 : W + 120,
      y: fromWest ? 270 : 410,
      vx: 0,
      length: 100,
      controlled: false
    });
    appendEvent('COMBOIO ADICIONADO', 'Comboio criado numa das duas vias ferroviárias.');
    updateMetrics();
  }

  function trainInWarningZone(train) {
    return train.x > TRAIN_WARNING_LEFT - train.length && train.x < TRAIN_WARNING_RIGHT + train.length;
  }

  function trainInCrossing(train) {
    return train.x + train.length / 2 > CONFLICT.left && train.x - train.length / 2 < CONFLICT.right;
  }

  function pointInsideConflict(x, y) {
    return x > CONFLICT.left && x < CONFLICT.right && y > CONFLICT.top && y < CONFLICT.bottom;
  }

  function triggerIncident(reason) {
    if (incidentHold) return;
    incidentHold = true;
    cars.forEach((car) => { car.vx = 0; car.vy = 0; });
    trains.forEach((train) => { train.vx = 0; });
    setText('systemState', 'INCIDENT_HOLD');
    $('systemState').style.color = 'var(--red)';
    setText('status', reason);
    $('stateTrack').style.background = 'var(--red)';
    $('sensorStop').textContent = 'INCIDENTE';
    $('sensorStop').style.color = 'var(--red)';
    $('rearmBtn').disabled = false;
    appendEvent('INCIDENTE DETECTADO', reason);
    updateSignals();
  }

  function rearm() {
    if (!incidentHold) return;
    if (railOccupied || railApproachActive || cars.some((car) => pointInsideConflict(car.x, car.y))) {
      setText('status', 'Não é possível rearmar: ainda existem veículos na zona de conflito.');
      appendEvent('REARME RECUSADO', 'A zona de conflito ainda não está livre.');
      return;
    }
    incidentHold = false;
    allRedUntil = performance.now() + ALL_RED_MS;
    $('systemState').style.color = 'var(--green)';
    setText('systemState', 'A CONFIRMAR ZONA LIVRE');
    setText('status', 'Rearme manual aceite. Mantém-se o vermelho integral antes do próximo ciclo.');
    $('stateTrack').style.background = 'var(--amber)';
    $('sensorStop').textContent = 'NORMAL';
    $('sensorStop').style.color = 'var(--green)';
    $('rearmBtn').disabled = true;
    appendEvent('REARME MANUAL', 'Zona verificada pelo operador da simulação.');
    updateSignals();
  }

  function updateSignals() {
    for (const approach of PHASES) {
      const signal = $(SIGNAL_IDS[approach]);
      if (!signal) continue;
      const green = !incidentHold && !railApproachActive && !railOccupied && performance.now() >= allRedUntil && PHASES[phaseIndex] === approach;
      signal.classList.toggle('active', green);
      signal.classList.toggle('red', !green);
    }
  }

  function isGreen(approach) {
    return !incidentHold && !railApproachActive && !railOccupied && performance.now() >= allRedUntil && PHASES[phaseIndex] === approach;
  }

  function updateRailStatus() {
    const nextOccupied = trains.some(trainInCrossing);
    const nextApproach = trains.some(trainInWarningZone);
    const nextPriority = nextOccupied || nextApproach;
    railOccupied = nextOccupied;
    railApproachActive = nextApproach;
    if (nextPriority !== previousRailPriority) {
      allRedUntil = performance.now() + ALL_RED_MS;
      appendEvent(nextPriority ? 'PRIORIDADE FERROVIÁRIA' : 'VIA FERROVIÁRIA LIVRE', nextPriority
        ? 'Detecção ferroviária activa; entradas rodoviárias bloqueadas.'
        : 'Comboios fora da zona de detecção; mantém-se o vermelho integral de segurança.');
      previousRailPriority = nextPriority;
    }
    setText('railState', railOccupied ? 'Comboio a ocupar a zona de cruzamento' : railApproachActive ? 'Comboio detectado na aproximação' : 'Via livre · sem comboio na zona');
    setText('sensorRail', railOccupied ? 'OCUPADA' : railApproachActive ? 'APROXIMAÇÃO' : 'LIVRE');
    $('railLamp').className = 'lamp ' + (railOccupied ? 'red' : railApproachActive ? 'amber' : 'green');
  }

  function updatePhase(now) {
    if (incidentHold || railApproachActive || railOccupied) return;
    if (now < allRedUntil) return;
    if (now - phaseStartedAt >= PHASE_MS) {
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      phaseStartedAt = now;
      allRedUntil = now + ALL_RED_MS;
      appendEvent('MUDANÇA DE FASE', 'Aproximação ' + PHASES[phaseIndex] + ' seleccionada; vermelho integral durante a transição.');
    }
  }

  function stopLineCrossed(car, nextX, nextY) {
    switch (car.approach) {
      case 'N': return car.y < 180 && nextY >= 180 && Math.abs(car.x - 455) < 42;
      case 'S': return car.y > 500 && nextY <= 500 && Math.abs(car.x - 545) < 42;
      case 'O': return car.x < 350 && nextX >= 350 && Math.abs(car.y - 325) < 42;
      case 'E': return car.x > 650 && nextX <= 650 && Math.abs(car.y - 355) < 42;
      default: return false;
    }
  }

  function moveCars(dt) {
    const seconds = dt / 1000;
    for (const car of cars) {
      if (car.vx === 0 && car.vy === 0) continue;
      const nextX = car.x + car.vx * seconds;
      const nextY = car.y + car.vy * seconds;
      if (!car.enteredIntersection && stopLineCrossed(car, nextX, nextY)) {
        if (!isGreen(car.approach)) {
          triggerIncident('Passagem pela linha de paragem da aproximação ' + car.approach + ' com sinal vermelho ou prioridade ferroviária activa.');
          return;
        }
        car.enteredIntersection = true;
        appendEvent('VEÍCULO AUTORIZADO', 'Veículo da aproximação ' + car.approach + ' entrou durante a fase verde.');
      }
      if (pointInsideConflict(nextX, nextY) && (railApproachActive || railOccupied)) {
        triggerIncident('Veículo rodoviário entrou na zona de conflito durante detecção ferroviária.');
        return;
      }
      car.x = nextX;
      car.y = nextY;
      if (car.x < -80 || car.x > W + 80 || car.y < -80 || car.y > H + 80) {
        car.vx = 0;
        car.vy = 0;
      }
    }
  }

  function detectCollision() {
    for (const car of cars) {
      if (!pointInsideConflict(car.x, car.y)) continue;
      for (const train of trains) {
        if (Math.abs(car.x - train.x) < 62 && Math.abs(car.y - train.y) < 34) {
          triggerIncident('Conflito espacial entre automóvel e comboio detectado na simulação.');
          return;
        }
      }
    }
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawRoad() {
    ctx.fillStyle = '#172a25';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#263541';
    ctx.fillRect(350, 0, 300, H);
    ctx.fillRect(0, 190, W, 300);
    ctx.fillStyle = '#31404a';
    ctx.fillRect(350, 190, 300, 300);

    ctx.strokeStyle = '#9baab2';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 15]);
    ctx.beginPath();
    ctx.moveTo(400, 0); ctx.lineTo(400, 190);
    ctx.moveTo(600, 0); ctx.lineTo(600, 190);
    ctx.moveTo(400, 490); ctx.lineTo(400, H);
    ctx.moveTo(600, 490); ctx.lineTo(600, H);
    ctx.moveTo(0, 240); ctx.lineTo(350, 240);
    ctx.moveTo(650, 240); ctx.lineTo(W, 240);
    ctx.moveTo(0, 440); ctx.lineTo(350, 440);
    ctx.moveTo(650, 440); ctx.lineTo(W, 440);
    ctx.stroke();
    ctx.setLineDash([]);

    // Duas vias ferroviárias paralelas, com carris e travessas.
    ctx.fillStyle = '#1b2b36';
    ctx.fillRect(0, 250, W, 42);
    ctx.fillRect(0, 388, W, 42);
    ctx.strokeStyle = '#e8bd70';
    ctx.lineWidth = 5;
    for (let x = 0; x < W; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, 251); ctx.lineTo(x + 18, 251);
      ctx.moveTo(x, 291); ctx.lineTo(x + 18, 291);
      ctx.moveTo(x, 389); ctx.lineTo(x + 18, 389);
      ctx.moveTo(x, 429); ctx.lineTo(x + 18, 429);
      ctx.stroke();
    }
    ctx.strokeStyle = '#a6b4bd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 260); ctx.lineTo(W, 260);
    ctx.moveTo(0, 282); ctx.lineTo(W, 282);
    ctx.moveTo(0, 398); ctx.lineTo(W, 398);
    ctx.moveTo(0, 420); ctx.lineTo(W, 420);
    ctx.stroke();

    ctx.fillStyle = '#e7edf0';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText('N', 485, 35);
    ctx.fillText('S', 485, 660);
    ctx.fillText('O', 20, 345);
    ctx.fillText('E', 965, 345);

    const stopMarkers = [
      { x: 455, y: 180, approach: 'N' },
      { x: 545, y: 500, approach: 'S' },
      { x: 350, y: 325, approach: 'O' },
      { x: 650, y: 355, approach: 'E' }
    ];
    for (const marker of stopMarkers) {
      ctx.fillStyle = isGreen(marker.approach) ? '#45cf91' : '#fa6670';
      ctx.beginPath(); ctx.arc(marker.x, marker.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dce6eb'; ctx.font = '10px system-ui';
      ctx.fillText('STOP', marker.x - 15, marker.y + (marker.approach === 'N' ? -15 : 23));
    }
    ctx.strokeStyle = incidentHold ? '#fa6670' : '#45cf91';
    ctx.lineWidth = 2;
    ctx.strokeRect(CONFLICT.left, CONFLICT.top, CONFLICT.right - CONFLICT.left, CONFLICT.bottom - CONFLICT.top);
  }

  function drawCar(car, index) {
    ctx.save();
    ctx.translate(car.x, car.y);
    const vertical = car.approach === 'N' || car.approach === 'S';
    if (vertical) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = car.color;
    roundedRect(-22, -11, 44, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#b8e8f2';
    ctx.fillRect(-9, -8, 16, 16);
    ctx.fillStyle = '#14212a';
    ctx.fillRect(-16, -14, 9, 4);
    ctx.fillRect(8, -14, 9, 4);
    ctx.fillRect(-16, 10, 9, 4);
    ctx.fillRect(8, 10, 9, 4);
    if (index === selectedCar) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-26, -16, 52, 32);
    }
    ctx.restore();
  }

  function drawTrain(train) {
    ctx.fillStyle = '#f2b632';
    roundedRect(train.x - 55, train.y - 16, 110, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#bce8f4';
    for (let i = 0; i < 3; i += 1) ctx.fillRect(train.x - 42 + i * 29, train.y - 10, 22, 13);
    ctx.fillStyle = '#17232d';
    ctx.beginPath();
    ctx.arc(train.x - 35, train.y + 16, 5, 0, Math.PI * 2);
    ctx.arc(train.x + 35, train.y + 16, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawRoad();
    trains.forEach(drawTrain);
    cars.forEach(drawCar);
    if (incidentHold) {
      ctx.fillStyle = 'rgba(250, 102, 112, 0.18)';
      ctx.fillRect(CONFLICT.left, CONFLICT.top, CONFLICT.right - CONFLICT.left, CONFLICT.bottom - CONFLICT.top);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px system-ui';
      ctx.fillText('INCIDENT HOLD', 405, 340);
    }
  }

  function updateTrain(dt) {
    if (paused || incidentHold) return;
    const seconds = dt / 1000;
    for (const train of trains) {
      train.x += train.vx * seconds;
      if (train.x < -180 || train.x > W + 180) {
        train.vx = 0;
        train.x = Math.max(-180, Math.min(W + 180, train.x));
      }
    }
  }

  function updateUptime(now) {
    const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    setText('uptime', minutes + ':' + seconds);
  }

  function updateSystemPanel() {
    if (incidentHold) return;
    const allRed = railApproachActive || railOccupied || performance.now() < allRedUntil;
    if (allRed) {
      $('systemState').textContent = railOccupied ? 'FERROVIA OCUPADA' : railApproachActive ? 'PRIORIDADE FERROVIÁRIA' : 'VERMELHO INTEGRAL';
      $('systemState').style.color = 'var(--amber)';
      $('stateTrack').style.background = 'var(--amber)';
      setText('status', railOccupied ? 'Comboio na zona de conflito. Entradas rodoviárias bloqueadas.' : railApproachActive ? 'Comboio detectado. A aguardar libertação da zona.' : 'Transição de segurança entre fases.');
    } else {
      $('systemState').textContent = 'FASE ' + PHASES[phaseIndex];
      $('systemState').style.color = 'var(--green)';
      $('stateTrack').style.background = 'var(--green)';
      setText('status', 'Circulação autorizada na aproximação ' + PHASES[phaseIndex] + '.');
    }
  }

  function attachEvents() {
    $('addCar').addEventListener('click', () => createCar());
    $('addTrain').addEventListener('click', createTrain);
    $('violation').addEventListener('click', () => triggerIncident('Infração simulada pelo operador. Todas as entradas são bloqueadas.'));
    $('reset').addEventListener('click', reset);
    $('rearmBtn').addEventListener('click', rearm);
    $('clearVehicles').addEventListener('click', () => {
      cars = [];
      trains = [];
      updateMetrics();
      appendEvent('VEÍCULOS REMOVIDOS', 'Todas as entidades foram removidas da pista.');
    });
    $('clearLog').addEventListener('click', () => {
      events = [];
      setText('eventCount', '0');
      $('eventLog').replaceChildren();
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Sem ocorrências nesta sessão.';
      $('eventLog').append(li);
    });
    $('pauseBtn').addEventListener('click', () => {
      paused = !paused;
      $('pauseBtn').textContent = paused ? '▶ Retomar' : 'Ⅱ Pausar';
      appendEvent(paused ? 'SIMULAÇÃO PAUSADA' : 'SIMULAÇÃO RETOMADA', 'Controlo manual do simulador.');
    });

    window.addEventListener('keydown', (event) => {
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (event.key === ' ') {
        event.preventDefault();
        $('pauseBtn').click();
        return;
      }
      if (event.key === 'Tab') {
        if (cars.length) {
          event.preventDefault();
          selectedCar = (selectedCar + 1) % cars.length;
        }
        return;
      }
      if (!arrows.includes(event.key)) return;
      event.preventDefault();
      if (paused || incidentHold) return;
      const vector = {
        ArrowUp: { x: 0, y: -150 },
        ArrowDown: { x: 0, y: 150 },
        ArrowLeft: { x: -150, y: 0 },
        ArrowRight: { x: 150, y: 0 }
      }[event.key];
      if (event.shiftKey) {
        const train = trains[trains.length - 1];
        if (!train) {
          appendEvent('SEM COMBOIO SELECCIONADO', 'Adicione primeiro um comboio para o controlar.');
          return;
        }
        if (vector.x !== 0) {
          train.vx = vector.x;
          train.controlled = true;
        }
        return;
      }
      const car = cars[selectedCar];
      if (car) {
        car.vx = vector.x;
        car.vy = vector.y;
      }
    });

    window.addEventListener('keyup', (event) => {
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrows.includes(event.key)) return;
      const vector = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }
      }[event.key];
      const train = trains[trains.length - 1];
      if (train && vector.x !== 0 && train.controlled) {
        train.vx = 0;
        train.controlled = false;
      }
      const car = cars[selectedCar];
      if (car) {
        if (vector.x !== 0 && Math.sign(car.vx) === vector.x) car.vx = 0;
        if (vector.y !== 0 && Math.sign(car.vy) === vector.y) car.vy = 0;
      }
    });
  }

  function safeFrame(now) {
    updateRailStatus();
    updatePhase(now);
    updateSystemPanel();
    updateSignals();
    const dt = lastFrameAt ? Math.min(50, now - lastFrameAt) : 0;
    lastFrameAt = now;
    if (!paused && !incidentHold) {
      updateTrain(dt);
      moveCars(dt);
      updateRailStatus();
      detectCollision();
    }
    updateSystemPanel();
    updateSignals();
    updateUptime(Date.now());
    draw();
    window.requestAnimationFrame(safeFrame);
  }

  function reset() {
    cars = [];
    trains = [];
    events = [];
    selectedCar = 0;
    phaseIndex = 0;
    phaseStartedAt = performance.now();
    allRedUntil = phaseStartedAt + ALL_RED_MS;
    startedAt = Date.now();
    incidentHold = false;
    paused = false;
    railApproachActive = false;
    railOccupied = false;
    previousRailPriority = false;
    $('pauseBtn').textContent = 'Ⅱ Pausar';
    $('systemState').textContent = 'VERMELHO INTEGRAL';
    $('systemState').style.color = 'var(--amber)';
    setText('status', 'Intervalo inicial de segurança antes da primeira fase.');
    $('stateTrack').style.background = 'var(--amber)';
    $('sensorStop').textContent = 'NORMAL';
    $('sensorStop').style.color = 'var(--green)';
    $('rearmBtn').disabled = true;
    appendEvent('SISTEMA INICIADO', 'Nova sessão de simulação.');
    createCar('N');
    createCar('O');
    updateMetrics();
  }

  attachEvents();
  reset();
  window.requestAnimationFrame(safeFrame);
})();