# Local run

This repository is a notebook analysis with HTML charts and Tableau workbooks.

The original notebook is preserved. `run_local.py` creates and executes a compatible copy, using a downloaded dataset, numeric-only pandas correlation, and no automatic browser launch from Sweetviz.

The original CSV URL returns HTTP 404. The local CSV comes from this VAST 2019 MC1 mirror:
https://raw.githubusercontent.com/na399/VAST-Challenge-2019-MC1/master/data/mc1-reports-data.csv

From this directory in PowerShell:

```powershell
..\disaster-runtime\Scripts\python.exe -s run_local.py
..\disaster-runtime\Scripts\python.exe -s -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/Analysis.html for the executed analysis, `/Report.html` for the Sweetviz report, and `/Comparative_study.html` for the original Google chart (requires internet).

The runtime reuses installed Anaconda packages; `-s` avoids incompatible packages from the user site directory. Tableau workbooks need Tableau to open separately.
