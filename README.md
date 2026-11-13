# ESP32 Smart Road–Railway Intersection

Protótipo académico de um cruzamento com quatro aproximações rodoviárias, duas vias ferroviárias e quatro travessias pedonais. Reúne simulador gráfico, firmware ESP32, API de eventos e exemplos de telemetria LoRa.

## Estrutura
- simulator/ — simulador 2D modular e versão autónoma num único HTML.
- firmware/ — controlador ESP32 e projectos LoRa independentes (nó e gateway).
- backend/ — API FastAPI, persistência SQLite e testes.
- docs/ — arquitectura, hardware, segurança, LoRa, fluxogramas e plano.
- scripts/ — validações do HTML e recursos locais.

## Simulador
### Abrir com duplo clique
Descarrega simulator/standalone.html através de Raw no GitHub e guarda-o como smart-junction.html. É autónomo: contém HTML, CSS, JavaScript e desenho do cenário. Não precisa de ficheiros adjacentes.

### Versão modular
Extrai o repositório completo e executa, a partir da raiz:
~~~bash
python -m http.server 5500 --directory simulator
~~~
Abre http://127.0.0.1:5500 no navegador.

### Controlos da simulação
- Modo manual: controlo individual dos quatro semáforos rodoviários (vermelho/amarelo/verde), dois sinais ferroviários (parar/marcha) e quatro sinais pedonais (não atravessar/atravessar).
- Modo automático: ciclo rodoviário sequencial demonstrativo, com amarelo e intervalo de vermelho integral.
- Automóveis: adiciona automóveis e conduz o seleccionado com as setas; Tab selecciona o seguinte.
- Comboios: são apresentados dois comboios, um por via. Selecciona a via A/B; usa Shift + setas esquerda/direita para mover o comboio depois de autorizar o respectivo sinal ferroviário.
- Peões: os quatro botões de pedido colocam pedidos em fila. No modo manual, coloca os sinais rodoviários em vermelho e depois autoriza a passadeira pretendida.
- Sensores: alterna a ocupação das vias A/B e os sensores de linha de paragem.
- LoRa: envia um pacote JSON demonstrativo e apresenta RSSI/SNR simulados. O browser não transmite rádio.
- Espaço: pausa/retoma; a paragem de emergência coloca o simulador em retenção, o rearme exige verificação, e o registo pode ser exportado para CSV.

Os interbloqueios do simulador recusam verdes rodoviários perante prioridade ferroviária/pedonal e impedem a marcha ferroviária quando a zona está ocupada. São regras didácticas, não lógica certificada.

## Backend
Em backend/:
~~~bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app:app --reload
~~~
API em http://127.0.0.1:8000; documentação interactiva em /docs.

Variáveis opcionais: DB_PATH, API_KEY, CLOUD_WEBHOOK_URL, CLOUD_WEBHOOK_TOKEN e CORS_ORIGINS.

## Firmware ESP32
Na raiz:
~~~bash
pio run
pio run -t upload
pio device monitor
~~~
O mapa GPIO é ilustrativo e tem de ser adaptado à placa e à cablagem reais.

## LoRa físico: nó + gateway
Existem dois projectos PlatformIO separados; precisam de dois ESP32 e dois módulos SX1276/SX1278 compatíveis.

~~~bash
cd firmware/lora_node
pio run
pio run -t upload
~~~
Repete em firmware/lora_gateway/ com o segundo ESP32. Ambos usam configuração inicial de 868 MHz e uma pinagem de exemplo; revê frequência, pinos, antenas, potência e duty-cycle de acordo com o módulo, a placa e as regras ANACOM/CEPT aplicáveis. Ver docs/LORA.md.

O nó envia um heartbeat demonstrativo e o gateway apresenta payload, RSSI e SNR. A integração deste rádio com os sensores do controlador principal e com o backend ainda não está feita.

## Testes
~~~bash
python -m pip install -r backend/requirements.txt
python -m pytest -q backend/tests
node --check simulator/app.js
python scripts/validate_simulator.py
~~~
O workflow GitHub Actions executa testes da API, verificações do simulador e builds PlatformIO do controlador e dos exemplos LoRa.

## Estado e limitações
A simulação tem controlo manual/automático de sinais rodoviários, ferroviários e pedonais, veículos, sensores simulados e pacote LoRa demonstrativo. Ainda faltam trajectórias/física realistas, detecção de conflitos validada, integração do simulador com a API, drivers físicos calibrados, ANPR, armazenamento de evidências, dashboard de ocorrências e encaminhamento do gateway para a nuvem.

## Segurança
**Não utilizar para controlar estradas, passagens de nível, sinalização ferroviária, barreiras, interlocking ou comboios reais.** O projecto não é certificado, redundante nem validado para segurança funcional. Uma travagem de comboio não é instantânea. LoRa é apenas telemetria e nunca deve ser usado como interlocking ou canal único de autorização/paragem. Qualquer uso operacional exigiria engenharia de segurança, análise formal de perigos, interfaces certificadas, validação independente e aprovação do operador e das autoridades.

Matrículas e imagens podem ser dados pessoais. Não existe captura de vídeo, OCR ANPR, reconhecimento facial ou identificação automática do condutor nesta versão.