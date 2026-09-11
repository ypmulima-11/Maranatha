with open("members.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

# The first file ends at line 2961 (index 2960 is the last `})();`)
first_part = lines[:2961]

# Let's extract the tab logic from the very end of the file
tab_logic_start = 0
for i, line in enumerate(lines):
    if "DOMContentLoaded" in line:
        tab_logic_start = i
        break

tab_logic = lines[tab_logic_start:]

with open("members.js", "w", encoding="utf-8") as f:
    f.writelines(first_part)
    f.write("\n\n")
    f.writelines(tab_logic)
