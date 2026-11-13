# Segurança, limites e privacidade

**Aviso:** este projecto não é adequado para controlar tráfego real. Não ligar a semáforos, barreiras, interlocking, circuitos de via ou comboios. A lógica não é fail-safe certificada, não tem redundância suficiente e não foi submetida a análise de perigos ou validação independente.

Uma infracção detectada deve, num sistema real, desencadear procedimentos definidos por uma análise de risco. Não se pode presumir que um comboio consiga parar instantaneamente. A libertação da zona exige confirmação por sistemas ferroviários certificados e procedimentos operacionais, não apenas uma leitura isolada de sensor.

## ANPR e dados pessoais
A API aceita opcionalmente `plate_text` e `evidence_ref` enviados por um sistema externo. Não existe captura de vídeo, OCR de matrículas, reconhecimento facial ou identificação do condutor. Matrículas e imagens podem ser dados pessoais. Antes de qualquer implementação real, determinar fundamento jurídico, finalidade, necessidade e proporcionalidade; informar os titulares; limitar acesso e retenção; proteger dados em trânsito e em repouso; e avaliar a necessidade de uma AIPD ao abrigo do RGPD. As decisões sancionatórias exigem validação humana e processo legal adequado.

## Ensaios
Começar apenas com LEDs e sensores simulados numa bancada isolada. Documentar casos normais, falhas de sensor, perda de alimentação, curto-circuitos, entradas incoerentes e recuperação. Nunca testar em infraestrutura operacional.
