with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

idx = js.find("Habari,")
print(repr(js[idx-50:idx+200]))
