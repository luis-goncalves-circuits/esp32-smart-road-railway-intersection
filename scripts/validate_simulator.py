from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SIMULATOR = ROOT / "simulator"


class DocumentInspector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.local_assets = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            self.ids.append(attributes["id"])
        for key in ("src", "href"):
            value = attributes.get(key, "")
            if value and not value.startswith(("http://", "https://", "#", "data:")):
                self.local_assets.append(value)


def inspect_html(path: Path, javascript: str, standalone: bool = False) -> int:
    html = path.read_text(encoding="utf-8")
    inspector = DocumentInspector()
    inspector.feed(html)
    inspector.close()

    if len(inspector.ids) != len(set(inspector.ids)):
        raise SystemExit(f"{path.name}: existem atributos id duplicados.")

    if '<html lang="pt-PT">' not in html:
        raise SystemExit(f'{path.name}: falta lang="pt-PT".')

    referenced_ids = set(re.findall(r"\$\(['\"]([^'\"]+)['\"]\)", javascript))
    missing_ids = sorted(referenced_ids - set(inspector.ids))
    if missing_ids:
        raise SystemExit(f"{path.name}: IDs usados no JavaScript mas inexistentes: {missing_ids}")

    missing_assets = [asset for asset in inspector.local_assets if not (SIMULATOR / asset).is_file()]
    if missing_assets:
        raise SystemExit(f"{path.name}: recursos locais em falta: {missing_assets}")

    if standalone:
        if inspector.local_assets:
            raise SystemExit("standalone.html não pode depender de recursos locais externos.")
        if "<style>" not in html or "<script>" not in html:
            raise SystemExit("standalone.html deve incorporar CSS e JavaScript.")
    return len(inspector.ids)


def main():
    modular_html = SIMULATOR / "index.html"
    standalone_html = SIMULATOR / "standalone.html"
    javascript = (SIMULATOR / "app.js").read_text(encoding="utf-8")

    if not (SIMULATOR / "style.css").is_file():
        raise SystemExit("Falta simulator/style.css.")
    if not (SIMULATOR / "app.js").is_file():
        raise SystemExit("Falta simulator/app.js.")

    modular_ids = inspect_html(modular_html, javascript)
    standalone_ids = inspect_html(standalone_html, javascript, standalone=True)

    modular = modular_html.read_text(encoding="utf-8")
    standalone = standalone_html.read_text(encoding="utf-8")
    stylesheet = (SIMULATOR / "style.css").read_text(encoding="utf-8")
    required_ids = {
        "emergencyStop",
        "exportLog",
        "clearVehicles",
        "addTrainA",
        "addTrainB",
        "rearmBtn",
        "sensorA",
        "sensorB",
        "sendLora",
    }
    missing_required_ids = sorted(required_ids - set(re.findall(r'\\bid="([^"]+)"', modular)))
    if missing_required_ids:
        raise SystemExit(f"Controlos essenciais em falta: {missing_required_ids}")
    if javascript not in standalone or stylesheet not in standalone:
        raise SystemExit("standalone.html não corresponde aos ficheiros modulares actuais.")

    required_controls = {
        "road signals": len(re.findall(r'data-road="', modular)) == 12,
        "rail signals": len(re.findall(r'data-rail="', modular)) == 4,
        "pedestrian requests": len(re.findall(r'data-ped-request="', modular)) == 4,
        "pedestrian signal aspects": len(re.findall(r'data-ped-state="', modular)) == 8,
        "stop-line sensors": len(re.findall(r'data-stop-sensor="', modular)) == 4,
    }
    failed = [name for name, passed in required_controls.items() if not passed]
    if failed:
        raise SystemExit(f"Controlos em falta/incompletos: {failed}")

    print(
        "Validação do simulador: OK "
        f"({modular_ids} IDs modulares, {standalone_ids} IDs autónomos, "
        f"{len(required_controls)} grupos de controlos)."
    )


if __name__ == "__main__":
    main()