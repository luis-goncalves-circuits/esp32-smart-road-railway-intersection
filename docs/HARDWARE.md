# Hardware de demonstração

## Componentes
- Placa ESP32 DevKit compatível.
- LEDs com resistências para representar estados (apenas bancada).
- Sensores digitais de demonstração para linhas de paragem.
- Dois sensores digitais para ocupação ferroviária simulada.
- Fonte regulada e cablagem de baixa tensão.

## Mapa GPIO ilustrativo
| Função | GPIO |
|---|---:|
| Indicadores N/E/S/W | 16/17/18/19 |
| Sensores de paragem N/E/S/W | 32/33/25/26 |
| Ocupação ferroviária A/B | 27/14 |
| Rearme | 13 |

Verificar a pinagem exacta da placa. Não aplicar tensão de 5 V directamente a GPIO. Não ligar cargas directamente aos pinos; usar drivers apropriados, resistências e protecção. Os GPIO 34–39 de muitas variantes ESP32 são apenas entradas e não têm pull-up/pull-down interno. O mapa acima é ilustrativo e deve ser revisto para a placa concreta.
