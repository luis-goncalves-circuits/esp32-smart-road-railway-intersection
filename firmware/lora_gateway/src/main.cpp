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
  Serial.println("LORA_GATEWAY_READY");
}

void loop() {
  const int packetSize = LoRa.parsePacket();
  if (packetSize <= 0) return;

  String payload;
  payload.reserve(static_cast<unsigned int>(packetSize) + 1U);
  while (LoRa.available()) payload += static_cast<char>(LoRa.read());

  Serial.println("--- LORA RX ---");
  Serial.printf("RSSI: %d dBm | SNR: %.1f dB | bytes: %d\n",
                LoRa.packetRssi(), LoRa.packetSnr(), packetSize);
  Serial.println(payload);
}