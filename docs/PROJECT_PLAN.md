# Plano de desenvolvimento e estado real

Este documento separa o que já existe do que ainda precisa de implementação. Uma pasta ou interface visual não significa que uma função esteja tecnicamente concluída.

## 1. Simulador gráfico
- [x] Vista superior do cruzamento com quatro aproximações e duas vias ferroviárias.
- [x] Painel de estado, fases indicativas, indicadores e registo de eventos.
- [x] Inserção de automóveis e comboios.
- [x] Controlos por teclado, pausa, reinício e simulação manual de incidente.
- [x] Elementos gráficos SVG para automóvel, comboio, câmara e ESP32.
- [ ] Modelo cinemático realista, trajectórias de viragem e gestão de filas.
- [ ] Detecção automática de colisões e conflitos de trajectória.
- [ ] Cenários configuráveis, editor de sensores e modo de demonstração guiada.
- [ ] Testes automatizados do simulador e acessibilidade completa.

## 2. Controlador ESP32
- [x] Estrutura PlatformIO e exemplo inicial de máquina de estados.
- [ ] Máquina de estados completa, determinística e revista.
- [ ] Temporização correcta de todas as fases N/E/S/O, amarelo e vermelho integral.
- [ ] Debounce, diagnóstico de circuito aberto/curto e estados de falha definidos.
- [ ] Watchdog real e recuperação segura após reset/perda de alimentação.
- [ ] Protocolo de comunicação autenticado com o backend.
- [ ] Testes unitários/simulação de entradas e ensaios em bancada.

## 3. Sensores, câmaras e evidência
- [x] Interface conceptual e campos de evento na API.
- [ ] Drivers reais para sensores escolhidos e respectiva calibração.
- [ ] Integração de câmaras IP/RTSP com gestão segura de credenciais.
- [ ] Pipeline ANPR com avaliação de precisão, confiança e revisão humana.
- [ ] Armazenamento de evidência cifrado, controlo de acesso e política de retenção.
- [ ] Não implementar identificação facial nem inferir a identidade do condutor.

## 4. Backend e nuvem
- [x] API FastAPI, persistência SQLite e webhook opcional.
- [ ] Autenticação e autorização por utilizador/serviço, rotação de segredos e auditoria.
- [ ] Base de dados de produção, migrações, backups e recuperação.
- [ ] Armazenamento de imagens/ficheiros fora da base de dados.
- [ ] Fila de envio, repetição com backoff e monitorização de falhas de webhook.
- [ ] Painel web de consulta, pesquisa, exportação e gestão de eventos.
- [ ] Integração do simulador com a API e testes de ponta a ponta.

## 5. Segurança, qualidade e entrega
- [x] Avisos de protótipo e documentação inicial de riscos.
- [ ] Análise formal de perigos e requisitos de segurança.
- [ ] Matriz de testes, cobertura, CI e revisão de código.
- [ ] Avaliação RGPD, fundamento jurídico, AIPD quando aplicável e processo de exercício de direitos.
- [ ] Validação independente por especialistas e entidades competentes antes de qualquer uso real.

## Critério de conclusão
Só marcar uma função como concluída depois de existir implementação, teste reproduzível e evidência documentada. O projecto actual é um protótipo académico; não está certificado nem apto a controlar circulação real.
