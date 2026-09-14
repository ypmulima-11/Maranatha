import os

for f in ['admin.css', 'members.css']:
    with open(f, 'r', encoding='utf-8') as file:
        css = file.read()
    
    # Fix the header color
    css = css.replace('.adm-h { background: var(--g9); color: #000; font-weight: 600; padding: 0 1.5rem; }',
                      '.adm-h { background: var(--g9); color: #fff; padding: 0 1.5rem; }')
    css = css.replace('.mp-h { background: var(--g9); color: #000; font-weight: 600; padding: 0 1.5rem; }',
                      '.mp-h { background: var(--g9); color: #fff; padding: 0 1.5rem; }')
                      
    css = css.replace('.mp-brand { display: flex; align-items: center; gap: 10px; color: #000; font-weight: 600; text-decoration: none; font-weight: 600; font-size: 16px; }',
                      '.mp-brand { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; }')

    with open(f, 'w', encoding='utf-8') as file:
        file.write(css)
        
print("Fixed header text colors")
