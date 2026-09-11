import re

with open("maranatha.css", "r", encoding="utf-8") as f:
    css = f.read()

css = css.replace("background: rgba(13, 42, 4, 0.9);", "background: rgba(13, 42, 4, 0.85);")

with open("maranatha.css", "w", encoding="utf-8") as f:
    f.write(css)
