# ESP32 Smart Road–Railway Intersection

Protótipo académico de cruzamento inteligente com quatro aproximações rodoviárias e duas vias ferroviárias. O objectivo é estudar a coordenação de tráfego, a detecção de eventos e a interacção entre firmware, API e simulador.

## Módulos
- **Firmware:** ESP32 com PlatformIO/Arduino e máquina de estados inicial.
- **Simulador:** interface gráfica 2D com vista superior, automóveis, comboios, estados de sinalização, indicadores, registo de eventos e controlos por teclado.
- **Backend:** API FastAPI com persistência SQLite e encaminhamento opcional por webhook.
- **Documentação:** arquitectura, hardware, segurança, fluxogramas e plano de desenvolvimento.

## Executar o simulador
Abrir `simulator/index.html` num navegador moderno. Não requer instalação.
- Setas: orientar e conduzir o automóvel seleccionado.
- `Shift` + setas: controlar o comboio.
- `Tab`: seleccionar outro automóvel.
- `Espaço`: pausar/retomar.
- Os botões permitem adicionar veículos, simular uma infracção e reiniciar.

Os SVG em `simulator/assets` são ilustrações locais usadas pela interface.

## Executar o backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```
API: `http://127.0.0.1:8000`; documentação: `/docs`. Para execução com Docker: `docker compose up --build`.

## Compilar o firmware
Instalar PlatformIO e executar:
```bash
pio run
pio run -t upload
pio device monitor
```
Verificar e adaptar o mapa de GPIO ao modelo exacto da placa antes de ligar qualquer componente.

## Estado do projecto
A branch principal `main` contém a estrutura e a primeira versão dos módulos. O simulador recebeu uma interface gráfica ampliada e elementos SVG. Ainda faltam funcionalidades importantes: simulação física e gestão de conflitos, máquina de estados de firmware completa, integração de sensores/câmaras, ANPR, ligação do simulador à API, autenticação robusta, armazenamento de evidência e testes automatizados/CI. O estado detalhado está em [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).

## Limite de segurança
**Não utilizar para controlar estradas, passagens de nível, sinalização ferroviária, barreiras, interlocking ou comboios reais.** Não é um sistema certificado, redundante ou validado para segurança funcional. Uma travagem de comboio não é instantânea. Qualquer aplicação operacional exigiria engenharia de segurança, análise formal de perigos, interfaces certificadas, validação independente e aprovação do operador e das autoridades.

Matrículas e imagens podem ser dados pessoais. Não existe reconhecimento facial nem identificação automática do condutor. Qualquer implementação de ANPR exige fundamento jurídico, transparência, minimização, retenção limitada, segurança e revisão humana.
