# Segurança, limites e privacidade

**Aviso:** este projecto não é adequado para controlar tráfego real. Não ligar a semáforos, barreiras, interlocking, circuitos de via ou comboios. A lógica não é fail-safe certificada, não tem redundância suficiente e não foi submetida a análise de perigos ou validação independente.

Uma detecção de infracção no protótipo coloca as autorizações rodoviárias em retenção (`INCIDENT_HOLD`). A libertação da zona não pode ser inferida apenas pelo fim da ocupação de um sensor: num sistema real exige confirmação por sistemas ferroviários certificados e procedimentos operacionais. Não se pode presumir que um comboio consiga parar instantaneamente.

O firmware incluído é uma máquina de estados didáctica com quatro fases de autorização, intervalo de vermelho integral, retenção por ocupação ferroviária, debounce de entradas e rearme manual. As saídas são LEDs de demonstração. Não existe watchdog de hardware, redundância de sensores, diagnóstico de circuito aberto/curto ou validação de segurança funcional.

O simulador executa uma lógica geométrica simples para demonstrar passagem pela linha de paragem, prioridade ferroviária e conflitos. Não é um modelo físico nem uma prova de que a lógica de segurança seria suficiente numa instalação real.

## ANPR e dados pessoais
A API aceita opcionalmente `plate_text` e `evidence_ref` enviados por um sistema externo. Não existe captura de vídeo, OCR de matrículas, reconhecimento facial ou identificação do condutor. Matrículas e imagens podem ser dados pessoais. Antes de qualquer implementação real, determinar fundamento jurídico, finalidade, necessidade e proporcionalidade; informar os titulares; limitar acesso e retenção; proteger dados em trânsito e em repouso; e avaliar a necessidade de uma AIPD ao abrigo do RGPD. As decisões sancionatórias exigem validação humana e processo legal adequado.

## Ensaios
Começar apenas com LEDs e sensores simulados numa bancada isolada. Documentar casos normais, falhas de sensor, perda de alimentação, curto-circuitos, entradas incoerentes e recuperação. Nunca testar em infraestrutura operacional.