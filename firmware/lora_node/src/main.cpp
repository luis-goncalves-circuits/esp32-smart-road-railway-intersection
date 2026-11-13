#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>

#ifndef LORA_SCK_PIN
#error "Define LORA_SCK_PIN in platformio.ini"
#endif
#ifndef LORA_MISO_PIN
#error "Define LORA_MISO_PIN in platformio.ini"
#endif
#ifndef LORA_MOSI_PIN
#error "Define LORA_MOSI_PIN in platformio.ini"
#endif
#ifndef LORA_CS_PIN
#error "Define LORA_CS_PIN in platformio.ini"
#endif
#ifndef LORA_RESET_PIN
#error "Define LORA_RESET_PIN in platformio.ini"
#endif
#ifndef LORA_DIO0_PIN
#error "Define LORA_DIO0_PIN in platformio.ini"
#endif
#ifndef LORA_FREQUENCY_HZ
#error "Define an authorised LORA_FREQUENCY_HZ for your region"
#endif

constexpr uint32_t TX_INTERVAL_MS = 10000;
uint32_t lastTransmit = 0;
uint32_t sequenceNumber = 0;

void setup() {
  Serial.begin(115200);
  delay(300);
  SPI.begin(LORA_SCK_PIN, LORA_MISO_PIN, LORA_MOSI_PIN, LORA_CS_PIN);
  LoRa.setPins(LORA_CS_PIN, LORA_RESET_PIN, LORA_DIO0_PIN);

  if (!LoRa.begin(static_cast<long>(LORA_FREQUENCY_HZ))) {
    Serial.println("ERRO: modulo LoRa nao encontrado; verificar SPI, reset, antena e frequencia.");
    while (true) delay(1000);
  }

  LoRa.enableCrc();
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  Serial.println("LORA_NODE_READY");
}

void sendHeartbeat() {
  char payload[220];
  const int length = snprintf(
      payload, sizeof(payload),
      "{\"node\":\"ESP32-JUNCTION-01\",\"seq\":%lu,\"msg\":\"HEARTBEAT\",\"uptime_ms\":%lu,\"state\":\"DEMO_ONLY\"}",
      static_cast<unsigned long>(sequenceNumber++),
      static_cast<unsigned long>(millis()));

  if (length <= 0 || static_cast<size_t>(length) >= sizeof(payload)) {
    Serial.println("ERRO: payload excede o buffer.");
    return;
  }

  LoRa.beginPacket();
  LoRa.write(reinterpret_cast<const uint8_t *>(payload), static_cast<size_t>(length));
  const int result = LoRa.endPacket();

  Serial.printf("TX seq=%lu result=%d bytes=%d\n",
                static_cast<unsigned long>(sequenceNumber - 1), result, length);
}

void loop() {
  const uint32_t now = millis();
  if (now - lastTransmit >= TX_INTERVAL_MS) {
    lastTransmit = now;
    sendHeartbeat();
  }
}