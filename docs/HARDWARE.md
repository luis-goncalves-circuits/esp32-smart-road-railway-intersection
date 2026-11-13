# Hardware de demonstração

## Componentes
- Placa ESP32 DevKit compatível.
- LEDs com resistências para representar autorizações rodoviárias (apenas bancada).
- Quatro sensores digitais de demonstração para as linhas de paragem.
- Dois sensores digitais de ocupação ferroviária.
- Botão físico de rearme e fonte regulada de baixa tensão.

## Mapa GPIO ilustrativo
| Função | GPIO |
|---|---:|
| Indicadores de autorização N/E/S/O | 16/17/18/19 |
| Sensores de linha N/E/S/O | 32/33/25/26 |
| Sensores de ocupação ferroviária A/B | 27/14 |
| Botão de rearme supervisionado | 13 |

Os sensores no firmware são activos a LOW e usam `INPUT_PULLUP`. A leitura tem debounce por software. O botão de rearme tem de ser mantido premido durante dois segundos e só é aceite quando os sensores de ocupação e de linha indicam zona livre.

## Limitações de instrumentação
Um sensor por linha de paragem apenas permite detectar uma activação candidata. Não prova, por si só, que um veículo atravessou a linha nem determina o sentido de movimento. Para uma detecção fiável de passagem são necessários sensores redundantes/adequados, instalação calibrada e lógica validada. Os dois sensores ferroviários são combinados como indicação de ocupação; não constituem um sistema ferroviário de detecção de comboios certificado.

Os LEDs do protótipo representam apenas uma autorização verde. Saída desligada significa que o firmware não autoriza a circulação; não equivale a uma saída física de lâmpada vermelha/amarela.

Verificar a pinagem exacta da placa. Não aplicar 5 V directamente aos GPIO. Não ligar cargas directamente aos pinos; usar drivers, resistências, protecção eléctrica e alimentação apropriada. Os GPIO 34–39 de muitas variantes ESP32 são apenas entradas e não têm pull-up/pull-down interno.

**Nunca ligar este protótipo a sinalização ou equipamento ferroviário/rodoviário real.** Não foi implementado um watchdog de hardware nem diagnóstico eléctrico completo dos sensores.