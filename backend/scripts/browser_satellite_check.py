"""Headless Edge integration check; isolated live-check DB, real HTTP and image requests."""
import asyncio
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path
import httpx
import websockets

backend = Path(__file__).resolve().parents[1]
project = backend.parent
live = json.loads((backend/"live-check-result.json").read_text())
if live["status"] != "COMPLETED":
    raise RuntimeError("Run a successful live_satellite_check.py first.")
output = Path(live["output_directory"])/"browser"
output.mkdir(exist_ok=True)
environment = dict(os.environ, DATABASE_URL="sqlite:///" + (Path(live["output_directory"])/"live.db").as_posix(),
                   SENTINELAID_DEBUG="false", VITE_API_BASE_URL="/api/v1", VITE_IMAGE_BASE_URL="/api/v1", VITE_PROXY_TARGET="http://127.0.0.1:8011")
processes = []
logs = []
def launch(args, cwd):
    log = (output / ("process-" + str(len(logs)) + ".log")).open("w")
    logs.append(log)
    proc = subprocess.Popen(args, cwd=cwd, env=environment, stdout=log, stderr=log,
                            creationflags=subprocess.CREATE_NO_WINDOW)
    processes.append(proc)
    return proc
def ready(url):
    for _ in range(100):
        try:
            if httpx.get(url, timeout=1).status_code == 200: return
        except Exception: pass
        time.sleep(.2)
    raise RuntimeError("Test server failed to start: " + url)

async def check():
    backend_process = launch([sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8011", "--host", "127.0.0.1"], backend)
    launch(["node", "node_modules/vite/bin/vite.js", "--port", "5177", "--host", "127.0.0.1", "--strictPort"], project/"sentinelaid")
    ready("http://127.0.0.1:8011/health")
    ready("http://127.0.0.1:5177")
    launch([r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "--headless", "--disable-gpu",
            "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=9227",
            "--user-data-dir=" + str(output/"edge-profile"), "about:blank"], project)
    ready("http://127.0.0.1:9227/json")
    tabs = httpx.get("http://127.0.0.1:9227/json").json()
    tab = next(tab for tab in tabs if tab["type"] == "page")
    async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=20_000_000) as ws:
        count = 0
        async def call(method, params=None):
            nonlocal count
            count += 1
            await ws.send(json.dumps({"id": count, "method": method, "params": params or {}}))
            while True:
                result = json.loads(await asyncio.wait_for(ws.recv(), timeout=15))
                if result.get("id") == count:
                    if "error" in result: raise RuntimeError(str(result["error"]))
                    return result.get("result", {})
        async def evaluate(expression):
            response = await call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
            if response.get("exceptionDetails"):
                raise RuntimeError(str(response["exceptionDetails"]))
            return response.get("result", {}).get("value")
        async def wait_for(expression):
            for _ in range(200):
                value = await evaluate(expression)
                if value: return value
                await asyncio.sleep(.2)
            raise AssertionError("Browser condition did not become true: " + expression)
        await call("Emulation.setDeviceMetricsOverride", {"width":1366, "height":900, "deviceScaleFactor":1, "mobile":False})
        await call("Page.navigate", {"url":"http://127.0.0.1:5177/command/satellite"})
        await wait_for("document.body.innerText.includes('TARGET OPERATION')")
        # Change the selected operation using React's native input event.
        await evaluate("""(() => { const el = document.querySelector('main label input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, 'LIVE-CHECK'); el.dispatchEvent(new Event('input', {bubbles:true})); return true; })()""")
        await wait_for("document.querySelector('main tbody')?.innerText.includes('S2B_MSIL2A')")
        await evaluate("Array.from(document.querySelectorAll('main button')).find(b => b.textContent.trim() === 'Select').click()")
        await wait_for("Array.from(document.querySelectorAll('main img')).some(i => i.complete && i.naturalWidth > 0)")
        await evaluate("Array.from(document.querySelectorAll('main button')).find(b => b.textContent === 'Analyze pixels').click()")
        await wait_for("document.querySelector('main').innerText.includes('km') && document.querySelector('main').innerText.includes('water pixels /')")
        image_count = await evaluate("Array.from(document.querySelectorAll('main img')).filter(i => i.complete && i.naturalWidth > 0 && i.src.includes('/api/')).length")
        assert image_count >= 2, "Both real RGB and mask image URLs must load through Vite."
        assert await evaluate("!!document.querySelector('.leaflet-container')")
        shot = await call("Page.captureScreenshot", {"format":"png", "captureBeyondViewport":True})
        (output/"satellite-working.png").write_bytes(base64.b64decode(shot["data"]))
        backend_process.terminate()
        backend_process.wait(timeout=10)
        await evaluate("Array.from(document.querySelectorAll('main button')).find(b => b.textContent.includes('Refresh registered')).click()")
        await wait_for("!!document.querySelector('main [role=alert]')")
        error = await evaluate("document.querySelector('main [role=alert]').textContent")
        assert not await evaluate("document.querySelector('main [role=status]')?.textContent.includes('completed')")
        shot = await call("Page.captureScreenshot", {"format":"png", "captureBeyondViewport":True})
        (output/"satellite-backend-offline.png").write_bytes(base64.b64decode(shot["data"]))
        report = {"status":"PASSED", "real_api_images_loaded":image_count,
                  "polygon_map_rendered":True, "backend_offline_error":error, "artifacts":str(output)}
        (backend/"browser-check-result.json").write_text(json.dumps(report,indent=2))
        print(json.dumps(report,indent=2))
try:
    asyncio.run(asyncio.wait_for(check(), timeout=120))
finally:
    for process in reversed(processes):
        if process.poll() is None:
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
            try: process.wait(timeout=10)
            except subprocess.TimeoutExpired: process.kill()
    for log in logs: log.close()
