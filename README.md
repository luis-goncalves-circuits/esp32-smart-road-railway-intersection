# ESP32 Smart Road–Railway Intersection

Protótipo académico de um cruzamento com quatro aproximações rodoviárias e duas vias ferroviárias. O repositório reúne simulador gráfico, firmware ESP32, API de eventos e documentação técnica.

## Estrutura
- `simulator/` — interface HTML/CSS/JavaScript, simulador 2D e ilustrações SVG.
- `firmware/` — firmware Arduino para ESP32, gerido por PlatformIO.
- `backend/` — API FastAPI, persistência SQLite e testes.
- `docs/` — arquitectura, hardware, segurança, fluxogramas e plano de desenvolvimento.
- `scripts/` — verificações estruturais do simulador.

## Executar o simulador
**Para abrir directamente com duplo clique, descarregue `simulator/standalone.html`.** É um ficheiro autónomo: inclui HTML, CSS, JavaScript e ilustrações, sem depender de pastas adjacentes. No GitHub, abra [simulator/standalone.html](simulator/standalone.html), carregue em **Raw** e guarde o ficheiro com a extensão `.html`.

A página `simulator/index.html` é a versão modular e depende de `style.css`, `app.js` e dos SVG em `assets/`. Não descarregue apenas esse HTML. Para executar a versão modular localmente, extraia o repositório completo e, a partir da raiz, execute:

~~~bash
python -m http.server 5500 --directory simulator
~~~

Abra `http://127.0.0.1:5500` num navegador moderno. O simulador é autónomo nesta versão; ainda não envia eventos para o backend.

Controlos:
- Setas: conduzir o automóvel seleccionado.
- `Shift` + `←` ou `→`: mover o comboio seleccionado.
- `Tab`: seleccionar o automóvel seguinte.
- `Espaço`: pausar ou retomar.
- Botões no ecrã: adicionar veículos, simular uma infracção, limpar veículos, rearmar e reiniciar.

A lógica de fases, detecção de linha de paragem e colisões é simplificada e serve apenas para demonstração. Não é um simulador físico validado.

## Executar o backend
Em `backend/`:

~~~bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app:app --reload
~~~

A API fica em `http://127.0.0.1:8000`; a documentação interactiva fica em `/docs`.

Variáveis opcionais:
- `DB_PATH`: caminho da base de dados SQLite (predefinição `events.db`).
- `API_KEY`: chave exigida nos endpoints `/events` através do cabeçalho `X-API-Key`.
- `CLOUD_WEBHOOK_URL` e `CLOUD_WEBHOOK_TOKEN`: encaminhamento opcional para um webhook.
- `CORS_ORIGINS`: origens HTTP permitidas, separadas por vírgulas.

## Testes e verificações
A partir da raiz:

~~~bash
python -m pip install -r backend/requirements.txt
python -m pytest -q backend/tests
node --check simulator/app.js
python scripts/validate_simulator.py
~~~

A integração contínua executa estes testes e tenta compilar o firmware com PlatformIO em cada push para `main` e em Pull Requests.

## Compilar o firmware
Instale o PlatformIO e execute:

~~~bash
pio run
pio run -t upload
pio device monitor
~~~

O mapa de GPIO é ilustrativo. Confirme o modelo exacto da placa e a cablagem antes de ligar sensores.

## Estado e limitações
A API guarda eventos em SQLite e pode encaminhá-los para um webhook. O simulador e o backend ainda não estão ligados entre si. A integração com câmaras IP, captura de vídeo e ANPR não está implementada; os campos de matrícula e evidência da API só aceitam dados fornecidos por um sistema externo. Não existe reconhecimento facial nem identificação automática do condutor. A persistência de imagens, o painel de consulta de ocorrências e a integração com um fornecedor de nuvem continuam por desenvolver.

O estado detalhado está em [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).

## Segurança
**Não utilizar para controlar estradas, passagens de nível, sinalização ferroviária, barreiras, interlocking ou comboios reais.** Este projecto não é certificado, redundante nem validado para segurança funcional. Uma travagem de comboio não é instantânea. Qualquer uso operacional exigiria engenharia de segurança, análise formal de perigos, interfaces certificadas, validação independente e aprovação do operador e das autoridades.

Matrículas e imagens podem ser dados pessoais. Qualquer implementação de ANPR exige fundamento jurídico, transparência, minimização, retenção limitada, medidas de segurança e revisão humana.