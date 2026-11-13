# Arquitectura

O projecto é dividido em três blocos que, nesta versão, ainda funcionam de forma independente: controlador ESP32, API de registo e simulador de navegador.

## Controlador ESP32
O firmware implementa uma máquina de estados didáctica: `ALL_RED`, `ROAD_GREEN`, `RAIL_OCCUPIED`, `INCIDENT_HOLD` e `SENSOR_FAULT`. As quatro aproximações recebem autorização verde de forma sequencial, com um intervalo de vermelho integral entre fases. A activação de qualquer sensor ferroviário retira as autorizações rodoviárias. Uma activação de sensor de linha durante uma fase não autorizada gera um evento candidato e coloca o protótipo em retenção. As entradas digitais são activas a LOW e têm debounce por software.

As saídas são apenas LEDs de bancada que representam autorização verde. Não existem lâmpadas vermelhas/amarelas, interlocking, watchdog de hardware ou diagnóstico eléctrico certificado.

## Backend
FastAPI recebe e valida eventos, guarda-os em SQLite e pode encaminhá-los para um webhook configurado. Cada pedido abre e fecha a sua ligação à base de dados. A chave API é opcional, definida por variável de ambiente. O endpoint de saúde não exige autenticação.

## Simulador
O simulador desenha a intersecção em Canvas, controla automóveis e comboios através das setas, apresenta as fases, indicadores e histórico de eventos. Detecta cruzamento da linha de paragem com sinal não autorizado e conflitos geométricos simplificados. O estado `INCIDENT_HOLD` bloqueia a movimentação e exige rearme manual após a zona ficar livre.

O simulador não está ligado ao backend nem ao firmware. A sua física e lógica são demonstrativas e não constituem validação de segurança.