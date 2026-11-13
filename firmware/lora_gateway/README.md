# Gateway LoRa ESP32

Projecto PlatformIO independente que recebe os pacotes enviados por firmware/lora_node/ e imprime payload, RSSI e SNR no monitor série.

Usa os mesmos parâmetros de rádio do nó transmissor. Revê a pinagem/frequência antes de alimentar os módulos. O gateway ainda não encaminha dados para a API ou para a nuvem; essa integração fica para uma fase posterior. Ver docs/LORA.md.