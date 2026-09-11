with open("members.css", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_css = lines[928:]

with open("members.css", "w", encoding="utf-8") as f:
    f.writelines(new_css)
