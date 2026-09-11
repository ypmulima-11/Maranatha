import subprocess

result = subprocess.run(["git", "show", "11ac571:members.js"], capture_output=True, text=True, encoding="utf-8")
lines = result.stdout.splitlines()

# Find the second IIFE start
start_idx = 0
for i, line in enumerate(lines):
    if line.strip() == "(function () {" and i > 100:
        start_idx = i
        break

second_half = lines[start_idx:]

with open("members.js", "w", encoding="utf-8") as f:
    for line in second_half:
        f.write(line + "\n")
