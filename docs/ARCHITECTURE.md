# Arquitectura

O protótipo separa três blocos: controlador embarcado ESP32, API de registo de eventos e simulador no navegador.

## Controlador
A máquina de estados usa ALL_RED como estado transitório restritivo, fases rodoviárias individuais e estados INCIDENT_HOLD/SENSOR_FAULT. A detecção de ocupação ferroviária impede a continuação de uma fase rodoviária. A implementação é didáctica e carece de temporização completa, diagnóstico redundante e validação formal.

## Backend
FastAPI recebe eventos, persiste-os em SQLite e pode encaminhá-los para um webhook configurado. A API não adquire vídeo nem executa OCR.

## Simulador
O simulador desenha a intersecção em Canvas e permite controlar veículos com o teclado. É independente do firmware e do backend nesta versão.
