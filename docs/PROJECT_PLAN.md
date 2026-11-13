# Plano de desenvolvimento e estado real

Este documento separa funcionalidades existentes de trabalho ainda por validar. Uma interface visível não significa que exista integração física ou validação operacional.

## 1. Simulador gráfico
- [x] Vista superior com quatro aproximações rodoviárias e duas vias ferroviárias desenhadas.
- [x] Painel de estado, fases indicativas, indicadores e registo de eventos.
- [x] Inserção de automóveis e comboios e controlo por teclado.
- [x] Pausa, reinício, simulação manual de incidente e rearme condicionado.
- [x] Detecção geométrica simplificada de cruzamento de linha de paragem e conflito com comboio.
- [x] Verificações de sintaxe JavaScript, IDs HTML e recursos locais.
- [ ] Trajectórias realistas, filas, aceleração/travagem calibradas e regras de circulação completas.
- [ ] Editor de cenários, sensores configuráveis, replay e modo de demonstração guiada.
- [ ] Ensaios automatizados de interacção em navegador real.

## 2. Controlador ESP32
- [x] Estrutura PlatformIO/Arduino.
- [x] Primeira máquina de estados com quatro fases rodoviárias e intervalo de vermelho integral.
- [x] Retenção rodoviária por ocupação ferroviária.
- [x] Debounce por software e rearme físico supervisionado por botão.
- [ ] Compilação PlatformIO e ensaio numa placa ESP32 real.
- [ ] Diagnóstico eléctrico de circuito aberto/curto e sensores redundantes.
- [ ] Watchdog de hardware/RTOS e recuperação validada após reset ou perda de alimentação.
- [ ] Comunicação autenticada com backend e testes de integração.

## 3. Sensores, câmaras e evidência
- [x] Campos de evento para texto de matrícula e referência de evidência fornecidos externamente.
- [ ] Drivers e calibração dos sensores físicos escolhidos.
- [ ] Integração de câmaras IP/RTSP e captura controlada de evidência.
- [ ] Pipeline ANPR com limiares de confiança, medição de precisão e revisão humana.
- [ ] Armazenamento de evidência cifrado, controlo de acesso e política de retenção.
- [ ] Não implementar reconhecimento facial nem inferir a identidade do condutor.

## 4. Backend e nuvem
- [x] API FastAPI, persistência SQLite e webhook opcional.
- [x] Validação dos pedidos, gestão de ligações SQLite e chave API opcional.
- [x] Estado de entrega do webhook exposto na resposta da API.
- [ ] Autenticação/autorização por utilizador e serviço, rotação de segredos e auditoria.
- [ ] Base de dados de produção, migrações, backups e recuperação.
- [ ] Armazenamento de imagens/ficheiros fora da base de dados.
- [ ] Fila de envio, repetição com backoff e monitorização do webhook.
- [ ] Painel web de consulta, pesquisa, exportação e gestão de eventos.
- [ ] Integração do simulador com API e testes de ponta a ponta.

## 5. Segurança, qualidade e entrega
- [x] Avisos de protótipo e documentação inicial de riscos.
- [x] Testes unitários da API e verificações estruturais do simulador.
- [x] Workflow de CI para testes backend, sintaxe JS, HTML/recursos e build PlatformIO.
- [ ] Análise formal de perigos, requisitos de segurança e validação independente.
- [ ] Avaliação RGPD e AIPD quando aplicável.
- [ ] Revisão técnica externa antes de qualquer uso operacional.

## Critério de conclusão
Só marcar uma função como concluída depois de existir implementação, teste reproduzível e evidência documentada. O projecto é um protótipo académico: não está certificado nem apto a controlar circulação real.