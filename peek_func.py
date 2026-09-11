with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

idx = js.find("$('pfOut')")
start = js.rfind("async", 0, idx)
if start == -1:
    start = js.rfind("constructor", 0, idx)
if start == -1:
    start = js.rfind("function", 0, idx)
if start == -1:
    start = js.rfind("  init", 0, idx)

print(js[start:idx])
