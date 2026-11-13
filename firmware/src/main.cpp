#include <Arduino.h>

// Protótipo de bancada. Não ligar a sinalização rodoviária ou ferroviária real.
enum class State : uint8_t {
  ALL_RED,
  ROAD_GREEN,
  RAIL_OCCUPIED,
  INCIDENT_HOLD,
  SENSOR_FAULT
};

constexpr uint8_t ROAD_GREEN_PINS[4] = {16, 17, 18, 19};
constexpr uint8_t STOP_SENSOR_PINS[4] = {32, 33, 25, 26};
constexpr uint8_t RAIL_SENSOR_PINS[2] = {27, 14};
constexpr uint8_t RESET_PIN = 13;

constexpr uint32_t SENSOR_DEBOUNCE_MS = 40;
constexpr uint32_t ROAD_GREEN_MS = 8000;
constexpr uint32_t ALL_RED_MS = 2000;
constexpr uint32_t RESET_HOLD_MS = 2000;

struct DebouncedInput {
  uint8_t pin = 0;
  bool rawActive = false;
  bool stableActive = false;
  uint32_t lastChange = 0;

  void begin(uint8_t gpio, uint32_t now) {
    pin = gpio;
    pinMode(pin, INPUT_PULLUP); // Sensores activos a LOW.
    rawActive = (digitalRead(pin) == LOW);
    stableActive = rawActive;
    lastChange = now;
  }

  // Devolve true apenas no flanco de activação já estabilizado.
  bool update(uint32_t now) {
    const bool sampledActive = (digitalRead(pin) == LOW);
    if (sampledActive != rawActive) {
      rawActive = sampledActive;
      lastChange = now;
    }
    if (rawActive != stableActive && (now - lastChange) >= SENSOR_DEBOUNCE_MS) {
      stableActive = rawActive;
      return stableActive;
    }
    return false;
  }

  bool active() const { return stableActive; }
};

State state = State::ALL_RED;
DebouncedInput stopSensors[4];
DebouncedInput railSensors[2];
uint8_t activeRoad = 0;
uint8_t nextRoad = 0;
uint32_t stateSince = 0;
uint32_t resetPressedSince = 0;

void allRoadSignalsOff() {
  for (uint8_t pin : ROAD_GREEN_PINS) digitalWrite(pin, LOW);
}

bool railOccupied() {
  return railSensors[0].active() || railSensors[1].active();
}

bool anyStopSensorActive() {
  for (const DebouncedInput &sensor : stopSensors) {
    if (sensor.active()) return true;
  }
  return false;
}

void enterState(State next, uint32_t now) {
  allRoadSignalsOff();
  state = next;
  stateSince = now;
  Serial.printf("STATE=%u\n", static_cast<unsigned>(state));
}

void enterRoadGreen(uint8_t road, uint32_t now) {
  allRoadSignalsOff();
  activeRoad = road % 4;
  digitalWrite(ROAD_GREEN_PINS[activeRoad], HIGH);
  state = State::ROAD_GREEN;
  stateSince = now;
  Serial.printf("ROAD_GREEN=%u\n", activeRoad);
}

void triggerIncident(uint8_t road, uint32_t now) {
  Serial.printf("STOP_LINE_EVENT road=%u\n", road);
  enterState(State::INCIDENT_HOLD, now);
}

void processSerialCommands(uint32_t now) {
  while (Serial.available() > 0) {
    const char command = static_cast<char>(Serial.read());
    if (command == 'F') {
      enterState(State::SENSOR_FAULT, now);
    } else if (command == 'V') {
      enterState(State::INCIDENT_HOLD, now);
    } else if (command == 'R') {
      Serial.println("RESET_REQUEST: use physical reset button after checking clear zone");
    }
  }
}

void processPhysicalReset(uint32_t now) {
  if (state != State::INCIDENT_HOLD && state != State::SENSOR_FAULT && state != State::RAIL_OCCUPIED) {
    resetPressedSince = 0;
    return;
  }
  const bool pressed = (digitalRead(RESET_PIN) == LOW);
  if (!pressed) {
    resetPressedSince = 0;
    return;
  }
  if (resetPressedSince == 0) resetPressedSince = now;
  if ((now - resetPressedSince) < RESET_HOLD_MS) return;

  if (!railOccupied() && !anyStopSensorActive() &&
      (state == State::INCIDENT_HOLD || state == State::SENSOR_FAULT || state == State::RAIL_OCCUPIED)) {
    nextRoad = (activeRoad + 1) % 4;
    enterState(State::ALL_RED, now);
    Serial.println("MANUAL_RESET_ACCEPTED");
  }
  resetPressedSince = 0;
}

void setup() {
  Serial.begin(115200);
  const uint32_t now = millis();

  for (uint8_t pin : ROAD_GREEN_PINS) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }
  for (uint8_t i = 0; i < 4; ++i) stopSensors[i].begin(STOP_SENSOR_PINS[i], now);
  for (uint8_t i = 0; i < 2; ++i) railSensors[i].begin(RAIL_SENSOR_PINS[i], now);
  pinMode(RESET_PIN, INPUT_PULLUP);

  enterState(State::ALL_RED, now);
  Serial.println("SMART_INTERSECTION_PROTO_START");
}

void loop() {
  const uint32_t now = millis();
  bool stopLineActivation[4] = {false, false, false, false};
  for (uint8_t i = 0; i < 4; ++i) stopLineActivation[i] = stopSensors[i].update(now);
  for (uint8_t i = 0; i < 2; ++i) railSensors[i].update(now);

  processSerialCommands(now);

  // A ocupação ferroviária retira imediatamente todas as autorizações rodoviárias.
  if (railOccupied() && state != State::INCIDENT_HOLD && state != State::SENSOR_FAULT) {
    enterState(State::RAIL_OCCUPIED, now);
  }

  // Um sensor de linha é apenas um detector de evento candidato; a confirmação
  // de passagem exige sensores adequados e validação da instalação.
  for (uint8_t road = 0; road < 4; ++road) {
    const bool notAuthorised = (state != State::ROAD_GREEN || road != activeRoad);
    if (stopLineActivation[road] && notAuthorised &&
        state != State::INCIDENT_HOLD && state != State::SENSOR_FAULT) {
      triggerIncident(road, now);
      break;
    }
  }

  processPhysicalReset(now);

  switch (state) {
    case State::ALL_RED:
      if (!railOccupied() && !anyStopSensorActive() && (now - stateSince) >= ALL_RED_MS) {
        enterRoadGreen(nextRoad, now);
      }
      break;

    case State::ROAD_GREEN:
      if (railOccupied()) {
        enterState(State::RAIL_OCCUPIED, now);
      } else if ((now - stateSince) >= ROAD_GREEN_MS) {
        nextRoad = (activeRoad + 1) % 4;
        enterState(State::ALL_RED, now);
      }
      break;

    case State::RAIL_OCCUPIED:
      allRoadSignalsOff();
      if (!railOccupied()) enterState(State::ALL_RED, now);
      break;

    case State::INCIDENT_HOLD:
    case State::SENSOR_FAULT:
      allRoadSignalsOff();
      break;
  }
}