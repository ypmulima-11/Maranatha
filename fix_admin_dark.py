import os

with open('admin.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace root variables
old_root = """:root {
  --g9: #0d2a04;
  --g8: #173404;
  --g7: #22490b;
  --g6: #2f5c14;
  --au: #BA7517;
  --al: #FAC775;
  --bg: #f4f6ef;
  --card: #ffffff;
  --ink: #1e2a14;
  --mut: #5f6e51;
  --line: #dde4d2;
  --err: #b3261e;
  --ok: #1e7d32;
}"""
new_root = """:root {
  --g9: #07171a;
  --g8: #07171a;
  --g7: #0c262b;
  --g6: #11343a;
  --au: #fbbc05;
  --al: #fbbc05;
  --bg: #061d21;
  --card: #0c262b;
  --ink: #ffffff;
  --mut: #8ca3a7;
  --line: #11343a;
  --err: #ef4444;
  --ok: #22c55e;
}"""

if old_root in css:
    css = css.replace(old_root, new_root)
else:
    # Just in case the format is slightly different
    css = css.replace('--bg: #f4f6ef;', '--bg: #061d21;')
    css = css.replace('--card: #ffffff;', '--card: #0c262b;')
    css = css.replace('--ink: #1e2a14;', '--ink: #ffffff;')
    css = css.replace('--mut: #5f6e51;', '--mut: #8ca3a7;')
    css = css.replace('--line: #dde4d2;', '--line: #11343a;')
    css = css.replace('--au: #BA7517;', '--au: #fbbc05;')
    css = css.replace('--al: #FAC775;', '--al: #fbbc05;')
    css = css.replace('--g9: #0d2a04;', '--g9: #07171a;')

# Ensure login card uses the new colors nicely
css = css.replace('.glass-card {', '.glass-card { background: var(--card); border: 1px solid var(--line); color: var(--ink);')

with open('admin.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated admin.css with dark mode Punta theme")
