with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

idx = js.find("makeItem(it) {")
print(js[idx:idx+1000])
