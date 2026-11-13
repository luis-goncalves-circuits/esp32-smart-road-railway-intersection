# Segurança, limites e privacidade

**Aviso:** este projecto não é adequado para controlar tráfego real. Não ligar a semáforos, barreiras, interlocking, circuitos de via ou comboios. A lógica não é fail-safe certificada, não tem redundância suficiente e não foi submetida a análise de perigos ou validação independente.

## Simulador
Os controlos manuais e automáticos do browser são uma demonstração. O interbloqueio didáctico bloqueia alguns verdes rodoviários quando existe prioridade ferroviária ou pedonal; não prova a segurança de uma instalação real. A simulação de comboios, veículos e peões não reproduz dinâmica de travagem, distâncias de segurança, tempos de reacção, falhas de hardware ou condições ambientais.

## ESP32 e sinais
O firmware é de bancada e as saídas representam apenas autorização verde com LEDs. Não existem lâmpadas completas de vermelho/amarelo/verde, saídas ferroviárias ou pedonais, watchdog de hardware, redundância suficiente, diagnóstico completo de circuito aberto/curto ou validação de segurança funcional. Uma activação isolada do sensor de linha não prova uma infracção real.

Uma detecção de infracção no protótipo coloca as autorizações rodoviárias em retenção. A libertação da zona não pode ser inferida apenas pelo fim de ocupação de um sensor; num sistema real exige confirmação por sistemas ferroviários certificados e procedimentos operacionais. Não se pode presumir que um comboio consiga parar instantaneamente.

## LoRa
Os exemplos LoRa são telemetria ponto-a-ponto experimental. O CRC detecta corrupção acidental mas não autentica nem cifra. Pacotes perdidos, atrasados, repetidos ou falsificados têm de ser tratados como falha de comunicação. **Não usar LoRa para interlocking, autorização de sinais, comando de comboios ou canal único de emergência.** Qualquer uso real exige análise de rádio, frequência/potência/duty-cycle autorizados, autenticação criptográfica e arquitectura de segurança independente.

## ANPR e dados pessoais
A API aceita opcionalmente plate_text e evidence_ref enviados por um sistema externo. Não existe captura de vídeo, OCR de matrículas, reconhecimento facial ou identificação do condutor. Matrículas e imagens podem ser dados pessoais. Antes de qualquer implementação real, determinar fundamento jurídico, finalidade, necessidade e proporcionalidade; informar os titulares; limitar acesso e retenção; proteger dados em trânsito e em repouso; e avaliar a necessidade de uma AIPD ao abrigo do RGPD. As decisões sancionatórias exigem validação humana e processo legal adequado.

## Ensaios
Começar apenas com LEDs e sensores simulados numa bancada isolada. Documentar casos normais, falhas de sensor, perda de alimentação, curto-circuitos, entradas incoerentes e recuperação. Nunca testar em infra-estrutura operacional.