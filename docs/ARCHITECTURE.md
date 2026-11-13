# Arquitectura

O projecto divide-se em controlador ESP32, API de eventos, simulador de navegador e uma ligação rádio LoRa experimental.

## Controlador ESP32
O firmware principal implementa uma máquina de estados didáctica com quatro fases rodoviárias e intervalos de vermelho integral, retenção por ocupação ferroviária, debounce e rearme físico. As saídas existentes são LEDs de demonstração que representam autorização verde; não são saídas completas de semáforos reais.

## Simulador
O simulador Canvas representa quatro aproximações rodoviárias, duas vias ferroviárias e quatro passadeiras. Os utilizadores podem controlar cada semáforo rodoviário, sinal ferroviário e sinal pedonal no modo manual, ou activar um ciclo automático demonstrativo. Inclui automóveis, dois comboios seleccionáveis, peões, pedidos de atravessamento, sensores simulados, registo de eventos e retenções por conflito.

A versão modular utiliza HTML/CSS/JavaScript separados. A versão standalone incorpora CSS e JavaScript num só ficheiro para execução local sem dependências adjacentes. A lógica é geométrica e didáctica; não substitui simulação ferroviária/rodoviária validada.

## Backend
FastAPI recebe e valida eventos, guarda-os em SQLite e pode encaminhá-los para um webhook configurado. A chave API é opcional por variável de ambiente. O simulador ainda não envia eventos para a API.

## LoRa
O painel do browser gera apenas pacotes demonstrativos. Dois projectos PlatformIO independentes implementam um transmissor ESP32/SX127x e um gateway receptor ESP32/SX127x. O emissor envia um heartbeat JSON; o gateway imprime o conteúdo, RSSI e SNR. Ainda não existe integração com os sensores do controlador principal ou encaminhamento do gateway para a API.

LoRa é usado apenas como telemetria experimental. O CRC não autentica nem cifra os pacotes. Não pode transportar permissões safety-critical, substituir interlocking, nem servir como canal único de emergência.