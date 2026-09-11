with open("members.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = 0
for i, line in enumerate(lines):
    if line.strip() == "(function () {" and i > 100:
        start_idx = i
        break

second_half = lines[start_idx:]

with open("members.js", "w", encoding="utf-8") as f:
    f.writelines(second_half)
