# Plano de desenvolvimento e estado real

Este documento distingue funcionalidades presentes de integrações e testes ainda pendentes.

## 1. Simulador gráfico
- [x] Vista superior com quatro aproximações rodoviárias, duas vias ferroviárias e quatro passadeiras.
- [x] Comboios desenhados nas vias A/B, com selecção, autorização ferroviária e movimento manual por teclado.
- [x] Controlo manual dos quatro semáforos rodoviários (vermelho/amarelo/verde).
- [x] Controlo manual dos dois sinais ferroviários (parar/marcha).
- [x] Controlo dos quatro sinais pedonais, pedidos de atravessamento e peões animados.
- [x] Modo automático demonstrativo para fases rodoviárias.
- [x] Simulação de sensores de ocupação ferroviária e linhas de paragem.
- [x] Registo de eventos, contadores, pausa, reinício, retenção e rearme.
- [x] Painel de telemetria LoRa simulada, com payload JSON, sequência, RSSI e SNR demonstrativos.
- [x] HTML autónomo (CSS e JavaScript incorporados) para abrir com duplo clique.
- [ ] Física calibrada, trajectórias de viragem, filas, interacção entre veículos e cenários editáveis.
- [ ] Colisões e conflitos verificados por testes de browser e cenários de referência.
- [ ] Testes automatizados de interacção em navegador real.

## 2. Controlador ESP32
- [x] Estrutura PlatformIO/Arduino.
- [x] Máquina de estados inicial com quatro fases e intervalo de vermelho integral.
- [x] Retenção rodoviária por ocupação ferroviária.
- [x] Debounce por software e rearme físico supervisionado.
- [ ] Compilação PlatformIO e ensaio numa placa real.
- [ ] Diagnóstico eléctrico de circuito aberto/curto, sensores redundantes e watchdog de hardware.
- [ ] Saídas físicas completas para vermelho/amarelo/verde rodoviário, sinais ferroviários e sinais pedonais.
- [ ] Comunicação autenticada e integração com backend.

## 3. Peões e sensores
- [x] Pedidos pedonais e estados WALK/STOP simulados.
- [x] Entradas simuladas para as quatro linhas de paragem e ocupação ferroviária A/B.
- [ ] Escolha, drivers e calibração de sensores físicos.
- [ ] Detecção redundante de peões, veículos e ocupação ferroviária.
- [ ] Medição de tempos de atravessamento e acessibilidade do desenho físico.

## 4. LoRa
- [x] Painel de pacotes demonstrativos no simulador.
- [x] Projecto PlatformIO de nó emissor ESP32/SX127x.
- [x] Projecto PlatformIO de gateway receptor ESP32/SX127x.
- [x] Formato de heartbeat JSON e leitura RSSI/SNR no gateway.
- [ ] Compilação e teste com dois módulos rádio físicos.
- [ ] Plano de frequência, potência, duty-cycle e antenas validado para a instalação.
- [ ] Autenticação criptográfica, anti-replay, acknowledgements e retransmissão.
- [ ] Integração da telemetria com sensores reais, API e backend.
- [ ] Não usar LoRa para interlocking ou autorização de movimentos safety-critical.

## 5. Câmaras, backend e nuvem
- [x] API FastAPI, SQLite, validação de eventos, chave API opcional e webhook.
- [ ] Captura de vídeo IP/RTSP e integração ANPR com avaliação de precisão e revisão humana.
- [ ] Armazenamento cifrado de evidências, controlo de acesso e retenção limitada.
- [ ] Dashboard web para pesquisar, consultar e exportar ocorrências.
- [ ] Integração do simulador e gateway LoRa com API/backend.
- [ ] Base de dados de produção, migrações, backups, auditoria e gestão de utilizadores.

## 6. Segurança, qualidade e entrega
- [x] Avisos de protótipo e documentação de limites/privacidade.
- [x] Testes API e verificações estruturais de HTML/recursos.
- [x] CI para testes API, sintaxe JS, validação do simulador e builds PlatformIO.
- [ ] Análise formal de perigos, requisitos, ensaios de falha e validação independente.
- [ ] Avaliação RGPD/AIPD quando aplicável.
- [ ] Revisão técnica externa antes de qualquer uso operacional.

## Critério de conclusão
Só marcar uma função como concluída depois de existir implementação, teste reproduzível e evidência documentada. O projecto é um protótipo académico: não está certificado nem apto a controlar circulação real.