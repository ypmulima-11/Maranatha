with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

idx = js.find("resType === 'off_campus'")
if idx != -1:
    print(js[idx:idx+1500])
