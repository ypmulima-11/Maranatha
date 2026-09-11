with open("members.css", "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = 0
for i, line in enumerate(lines):
    if line.strip() == ":root {" and i > 100:
        start_idx = i
        break

second_half = lines[start_idx:]

with open("members.css", "w", encoding="utf-8") as f:
    f.writelines(second_half)
