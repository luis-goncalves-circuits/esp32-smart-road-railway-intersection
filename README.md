# ESP32 Smart Road–Railway Intersection

Protótipo académico de controlo de um cruzamento rodoviário de quatro aproximações com atravessamento ferroviário de duas vias.

## O que inclui
- Firmware ESP32 (PlatformIO/Arduino) com máquina de estados restritiva, quatro fases rodoviárias, duas entradas de ocupação ferroviária e entradas para sensores de linha de paragem.
- API FastAPI para registo de eventos e encaminhamento opcional para um webhook externo.
- Simulador web local: condução de automóveis e comboio com as setas do teclado.
- Documentação de arquitectura, hardware, segurança e fluxogramas.

## Estrutura
```
firmware/       Firmware ESP32
backend/        API e testes
simulator/      Simulador HTML/CSS/JavaScript
docs/           Arquitectura, hardware, segurança e fluxogramas
platformio.ini
docker-compose.yml
```

## Arranque rápido
### Simulador
Abra `simulator/index.html` num navegador moderno. Use as setas para conduzir o automóvel seleccionado; use Shift + setas para controlar o comboio. Os controlos também estão descritos na página.

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```
API em `http://127.0.0.1:8000`; documentação interactiva em `/docs`.

### Firmware
Instale o PlatformIO, ligue uma placa ESP32 compatível e execute:
```bash
pio run
pio run -t upload
pio device monitor
```
Confirme e adapte os GPIOs em `firmware/src/main.cpp` ao hardware real antes de ligar sensores.

## Limitações importantes
Este repositório é um protótipo de ensino e simulação. Não é um sistema de sinalização rodoviária ou ferroviária certificado. **Não o ligue a semáforos reais, agulhas, barreiras, circuitos de via, interlocking ou material circulante.** A lógica apresentada não substitui uma análise de perigos, redundância, diagnóstico, SIL, validação independente ou aprovação do operador ferroviário e das autoridades.

A integração ANPR/câmaras não está implementada: a API apenas permite receber texto de matrícula e uma referência de evidência fornecidos por um sistema externo. Não existe reconhecimento facial nem identificação automática do condutor. A integração com um fornecedor de nuvem é opcional e depende da configuração de webhook. O simulador funciona autonomamente e ainda não comunica com a API.

## Segurança e privacidade
Ver `docs/SAFETY.md` antes de qualquer ensaio. Matrículas e imagens podem constituir dados pessoais; qualquer recolha real exige fundamento jurídico, informação aos titulares, minimização, controlo de acesso, retenção limitada e avaliação RGPD adequada.

## Estado de validação
O conteúdo foi colocado na branch `main`. A compilação PlatformIO, os testes automatizados, os ensaios em hardware e a integração de serviços externos têm de ser executados e confirmados separadamente; não são declarados como concluídos.
