import os

with open('members.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace root variables
css = css.replace('--bg: #f4f6ef;', '--bg: #061d21;')
css = css.replace('--card: #ffffff;', '--card: #0c262b;')
css = css.replace('--ink: #1e2a14;', '--ink: #ffffff;')
css = css.replace('--mut: #5f6e51;', '--mut: #8ca3a7;')
css = css.replace('--line: #dde4d2;', '--line: #11343a;')
css = css.replace('--au: #BA7517;', '--au: #fbbc05;')
css = css.replace('--al: #FAC775;', '--al: #fbbc05;')
css = css.replace('--g9: #0d2a04;', '--g9: #07171a;')

with open('members.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated members.css with dark mode Punta theme")
