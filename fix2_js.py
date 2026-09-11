with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

js = js.replace("mpNavAdmin.hidden = !isAdmin;", "$('mpNavAdmin').hidden = !isAdmin;")

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
