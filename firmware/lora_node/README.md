# Nó LoRa ESP32

Projecto PlatformIO independente para um ESP32 com módulo SX1276/SX1278 compatível. Envia um heartbeat JSON de 10 em 10 segundos.

1. Confirma o rádio, pinagem e antena.
2. Revê a configuração de pinos e frequência em platformio.ini.
3. Confirma os requisitos legais de frequência, potência e duty-cycle aplicáveis.
4. Executa pio run, depois pio run -t upload.
5. Abre o monitor série a 115200 baud.

O exemplo não lê sensores nem comanda sinais; é apenas um transmissor de teste. Ver docs/LORA.md na raiz do repositório.