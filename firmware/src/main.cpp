#include <Arduino.h>

// Protótipo didáctico. Não utilizar em sistemas ferroviários/rodoviários reais.
enum class State : uint8_t { ALL_RED, ROAD_N, ROAD_E, ROAD_S, ROAD_W, RAIL_ACTIVE, INCIDENT_HOLD, SENSOR_FAULT };

constexpr uint8_t ROAD_PINS[4] = {16, 17, 18, 19}; // LEDs de demonstração, não sinais reais
constexpr uint8_t STOP_PINS[4] = {32, 33, 25, 26}; // sensores de linha, activos a LOW
constexpr uint8_t RAIL_OCC_PINS[2] = {27, 14};     // ocupação via A/B, activos a LOW
constexpr uint8_t RESET_PIN = 13;                  // rearme manual supervisionado
constexpr uint32_t DEBOUNCE_MS = 40;
constexpr uint32_t ROAD_GREEN_MS = 8000;
constexpr uint32_t ALL_RED_MS = 2000;

State state = State::ALL_RED;
uint32_t stateSince = 0;
uint32_t lastLoop = 0;
bool violationLatched = false;

bool activeLow(uint8_t pin) { return digitalRead(pin) == LOW; }
bool railOccupied() { return activeLow(RAIL_OCC_PINS[0]) || activeLow(RAIL_OCC_PINS[1]); }
bool anyStopSensor() {
  for (uint8_t pin : STOP_PINS) if (activeLow(pin)) return true;
  return false;
}
void outputsOff() {
  for (uint8_t pin : ROAD_PINS) digitalWrite(pin, LOW);
}
void enter(State next) {
  outputsOff();
  state = next;
  stateSince = millis();
  Serial.printf("STATE=%u\n", static_cast<unsigned>(state));
}
void roadPhase(State next, uint8_t index) {
  outputsOff();
  digitalWrite(ROAD_PINS[index], HIGH);
  state = next;
  stateSince = millis();
}
void setup() {
  Serial.begin(115200);
  for (uint8_t pin : ROAD_PINS) { pinMode(pin, OUTPUT); digitalWrite(pin, LOW); }
  for (uint8_t pin : STOP_PINS) pinMode(pin, INPUT_PULLUP);
  for (uint8_t pin : RAIL_OCC_PINS) pinMode(pin, INPUT_PULLUP);
  pinMode(RESET_PIN, INPUT_PULLUP);
  enter(State::ALL_RED);
}
void loop() {
  const uint32_t now = millis();
  // Detecção simples de bloqueio do ciclo; não substitui watchdog de hardware.
  if (lastLoop && now - lastLoop > 1000) enter(State::SENSOR_FAULT);
  lastLoop = now;

  if (railOccupied() && state != State::RAIL_ACTIVE && state != State::INCIDENT_HOLD) {
    enter(State::ALL_RED);
  }
  if (anyStopSensor() && state == State::ALL_RED) {
    // Um sensor de linha activo durante ALL_RED é apenas um candidato a infracção.
    violationLatched = true;
    enter(State::INCIDENT_HOLD);
  }
  if (violationLatched && state != State::INCIDENT_HOLD) enter(State::INCIDENT_HOLD);

  if (Serial.available()) {
    const char c = Serial.read();
    if (c == 'F') enter(State::SENSOR_FAULT);
    if (c == 'V') { violationLatched = true; enter(State::INCIDENT_HOLD); }
  }

  switch (state) {
    case State::ALL_RED:
      if (!railOccupied() && now - stateSince >= ALL_RED_MS) roadPhase(State::ROAD_N, 0);
      break;
    case State::ROAD_N:
    case State::ROAD_E:
    case State::ROAD_S:
    case State::ROAD_W:
      if (railOccupied()) enter(State::ALL_RED);
      else if (now - stateSince >= ROAD_GREEN_MS) {
        const uint8_t next = (state == State::ROAD_N) ? 1 : (state == State::ROAD_E) ? 2 : (state == State::ROAD_S) ? 3 : 0;
        enter(State::ALL_RED);
        // A próxima fase só é autorizada após o intervalo ALL_RED.
        (void)next;
      }
      break;
    case State::RAIL_ACTIVE:
    case State::INCIDENT_HOLD:
    case State::SENSOR_FAULT:
      outputsOff();
      if (state == State::INCIDENT_HOLD && !railOccupied() && !anyStopSensor() && activeLow(RESET_PIN)) {
        // Rearme manual: manter premido; em produto real exigir procedimento supervisionado.
        violationLatched = false;
        enter(State::ALL_RED);
      }
      break;
  }
}
