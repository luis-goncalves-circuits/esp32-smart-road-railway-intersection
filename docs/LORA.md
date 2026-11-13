# Comunicação LoRa

## Objectivo
O LoRa permite enviar telemetria de baixo débito entre o controlador ESP32 e um gateway remoto. É adequado para estados, alarmes e diagnósticos não críticos; não deve ser o canal que autoriza a circulação de comboios, abre barreiras ou muda semáforos operacionais.

## Arquitectura proposta
1. **Nó ESP32:** lê estados/sensores e envia pacotes LoRa.
2. **Gateway ESP32:** recebe pacotes, valida o formato e envia a telemetria para um servidor por Wi-Fi/Ethernet/MQTT/HTTPS.
3. **Backend:** persiste eventos e apresenta-os no dashboard.

O simulador de navegador inclui um painel de pacotes demonstrativos. O indicador RSSI/SNR e os pacotes apresentados no navegador são simulados; não existe transmissão de rádio a partir do computador.

## Projectos PlatformIO de exemplo
Existem dois projectos independentes:
- `firmware/lora_node/` — transmissor de heartbeat.
- `firmware/lora_gateway/` — receptor que apresenta payload, RSSI e SNR no monitor série.

Em ambos:
~~~bash
cd firmware/lora_node
pio run
pio run -t upload
pio device monitor
~~~
Repete no gateway, com o segundo ESP32 ligado ao computador.

A biblioteca utilizada é `sandeepmistry/LoRa`. O exemplo usa módulos baseados em SX1276/SX1278 compatíveis. Confirma o modelo de rádio, a tensão de alimentação (muitos módulos são 3,3 V), a antena e a pinagem.

## Pinos de exemplo ESP32 DevKit
| Sinal SPI/radio | GPIO de exemplo |
|---|---:|
| SCK | 21 |
| MISO | 22 |
| MOSI | 23 |
| NSS/CS | 5 |
| RESET | 4 |
| DIO0 | 35 |

Esta é apenas uma proposta para um ESP32 DevKit dedicado ao nó LoRa. GPIO 5 é um pino de arranque em algumas variantes; valida o arranque da tua placa. GPIO 35 é apenas entrada, o que é adequado a um sinal DIO0 de saída do módulo. Se integrares o rádio no controlador principal, revê o mapa de GPIO e evita conflitos com sensores e indicadores. Não assumas que a pinagem é universal.

## Frequência e regras de rádio
O exemplo está configurado inicialmente para 868 MHz, mas isso não significa que qualquer canal, potência, antena ou ciclo de transmissão seja automaticamente permitido. Antes de transmitir em Portugal, verifica a faixa SRD/CEPT aplicável, as condições ANACOM em vigor, potência irradiada, canal, duty-cycle/tempo de ocupação e requisitos da antena. Usa apenas parâmetros autorizados para o módulo e para o local. LoRa ponto-a-ponto não é o mesmo que LoRaWAN.

## Formato de mensagem
Os exemplos enviam JSON curto com `node`, `seq`, `msg`, `uptime_ms` e `state`. Para a integração completa, acrescenta estados discretos sem matrícula ou imagem, por exemplo:
~~~json
{
  "node": "ESP32-JUNCTION-01",
  "seq": 1042,
  "msg": "SENSOR_STATUS",
  "rail_a_occupied": false,
  "rail_b_occupied": true,
  "incident": false
}
~~~

O número sequencial permite detectar mensagens perdidas ou repetidas. Em produção, acrescenta timestamp sincronizado, identificação do dispositivo, autenticação criptográfica, protecção contra repetição, gestão/rotação de chaves, monitorização de perda de ligação e política de retransmissão.

## Segurança e privacidade
- O CRC da biblioteca detecta corrupção acidental; **não autentica o remetente nem cifra o conteúdo**.
- Não transmitas matrículas, imagens, nomes ou outros dados pessoais por este exemplo.
- Para uso real, usa autenticação/MAC ou cifra autenticada com chaves geridas com segurança.
- Perda de rádio, pacote atrasado, repetido ou falsificado nunca pode autorizar um movimento.
- Não uses LoRa como interlocking, circuito de via, autorização de sinal verde ou canal único de paragem de emergência.
- A demonstração deve permanecer isolada de equipamento operacional.