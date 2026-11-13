# Hardware de demonstração

## Controlador ESP32
- Placa ESP32 DevKit compatível.
- LEDs com resistências para representar autorizações rodoviárias (apenas bancada).
- Quatro sensores digitais de demonstração para linhas de paragem.
- Dois sensores digitais de ocupação ferroviária.
- Botão físico de rearme e fonte regulada de baixa tensão.

## Mapa GPIO ilustrativo do firmware principal
| Função | GPIO |
|---|---:|
| Indicadores de autorização N/E/S/O | 16/17/18/19 |
| Sensores de linha N/E/S/O | 32/33/25/26 |
| Sensores de ocupação ferroviária A/B | 27/14 |
| Botão de rearme supervisionado | 13 |

Os sensores são activos a LOW e usam INPUT_PULLUP. O botão de rearme tem de ser mantido premido durante dois segundos e só é aceite quando os sensores de ocupação e de linha indicam zona livre.

## LoRa opcional (nó/gateway separados)
Os exemplos usam um módulo SX1276/SX1278 compatível por SPI e dois ESP32 independentes.

| Sinal | GPIO de exemplo |
|---|---:|
| SCK | 21 |
| MISO | 22 |
| MOSI | 23 |
| NSS/CS | 5 |
| RESET | 4 |
| DIO0 | 35 |

Esta configuração é para um ESP32 DevKit dedicado ao rádio, não é automaticamente compatível com o mapa do controlador principal. GPIO 5 é um pino de arranque em algumas placas; verifica o efeito no boot. GPIO 35 é apenas entrada e pode receber DIO0. Confirma também tensão, pinagem, corrente, antena e frequência do módulo exacto.

O exemplo inicial usa 868 MHz; antes de transmitir, confirma as condições ANACOM/CEPT aplicáveis a frequência, canal, potência irradiada, duty-cycle e antena. A configuração deve ser ajustada à região e ao hardware.

## Limitações e segurança
Um sensor por linha de paragem apenas permite detectar uma activação candidata; não prova passagem nem direcção. Os dois sensores ferroviários não constituem detecção certificada de comboios. Não ligar cargas directamente aos GPIO; usar drivers, resistências e protecção eléctrica. Não aplicar 5 V aos GPIO.

**Nunca ligar este protótipo a sinalização ou equipamento ferroviário/rodoviário real.**