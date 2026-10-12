"""Run a compatible copy of the original notebook and export its results."""
import os
import sys
from pathlib import Path

import nbformat
from jupyter_client import KernelManager
from nbclient import NotebookClient
from nbconvert import HTMLExporter

root = Path(__file__).resolve().parent
os.chdir(root)
notebook = nbformat.read(root / "ISTE_782_project.ipynb", as_version=4)
for cell in notebook.cells:
    if cell.cell_type != "code":
        continue
    cell.source = cell.source.replace("!pip install sweetviz", "# Sweetviz installed in the local runtime.")
    cell.source = cell.source.replace(
        "https://raw.githubusercontent.com/niranjana1997/ISTE-782-Vast-Challenge-2019/main/mc1-reports-data.csv",
        "mc1-reports-data.csv",
    )
    cell.source = cell.source.replace("df.corr()", "df.corr(numeric_only=True)")
    cell.source = cell.source.replace("show_html('Report.html')", "show_html('Report.html', open_browser=False)")
    cell.outputs = []
    cell.execution_count = None

nbformat.write(notebook, root / "ISTE_782_local.ipynb")
manager = KernelManager(kernel_name="python3")
manager.kernel_spec.argv = [sys.executable, "-s", "-m", "ipykernel_launcher", "-f", "{connection_file}"]
print("Executing all notebook cells...", flush=True)
NotebookClient(notebook, km=manager, timeout=600, resources={"metadata": {"path": str(root)}}).execute()
nbformat.write(notebook, root / "ISTE_782_local.ipynb")
html, _ = HTMLExporter().from_notebook_node(notebook)
(root / "Analysis.html").write_text(html, encoding="utf-8")
print("Success: ISTE_782_local.ipynb, Analysis.html, Report.html", flush=True)
