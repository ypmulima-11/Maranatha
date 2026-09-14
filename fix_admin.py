import os

with open('admin.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace adm-body layout
css = css.replace('.adm-body { max-width: 1100px; margin: 0 auto; display: flex; gap: 2rem; padding: 2.5rem 1.5rem 4rem; }',
                  '.adm-body { max-width: none; margin: 0; display: flex; gap: 0; height: calc(100vh - 60px); overflow: hidden; }\n'
                  '.adm-side { width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; background: var(--card); border-right: 1px solid var(--line); padding: 2rem 1.5rem; overflow-y: auto; }\n'
                  '.adm-pane { flex: 1; padding: 2.5rem 3rem; overflow-y: auto; background: var(--bg); position: relative; }')

# Fix adm-side definition that already exists
css = css.replace('.adm-side { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; }', '')

# Remove max-width from header
css = css.replace('.adm-h-in {\n  max-width: 1100px; margin: 0 auto; height: 60px;',
                  '.adm-h-in {\n  max-width: none; margin: 0; height: 60px; padding: 0 1rem;')

with open('admin.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated admin.css layout")
