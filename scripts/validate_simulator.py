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


def main():
    html_path = SIMULATOR / "index.html"
    js_path = SIMULATOR / "app.js"
    html = html_path.read_text(encoding="utf-8")
    javascript = js_path.read_text(encoding="utf-8")

    inspector = DocumentInspector()
    inspector.feed(html)
    inspector.close()

    if len(inspector.ids) != len(set(inspector.ids)):
        raise SystemExit("HTML inválido: existem atributos id duplicados.")

    missing_assets = [asset for asset in inspector.local_assets if not (SIMULATOR / asset).is_file()]
    if missing_assets:
        raise SystemExit(f"Recursos locais em falta: {missing_assets}")

    referenced_ids = set(re.findall(r"\$\(['\"]([^'\"]+)['\"]\)", javascript))
    missing_ids = sorted(referenced_ids - set(inspector.ids))
    if missing_ids:
        raise SystemExit(f"Elementos HTML referidos no JavaScript mas inexistentes: {missing_ids}")

    if '<html lang="pt-PT">' not in html:
        raise SystemExit('O documento deve declarar lang="pt-PT".')

    print(f"Verificação estrutural HTML: OK ({len(inspector.ids)} IDs, {len(inspector.local_assets)} recursos locais).")


if __name__ == "__main__":
    main()