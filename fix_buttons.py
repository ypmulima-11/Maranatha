import os

for f in ['admin.css', 'members.css']:
    with open(f, 'r', encoding='utf-8') as file:
        css = file.read()
    
    # Yellow background buttons should have dark text
    css = css.replace('color: #fff;', 'color: #000; font-weight: 600;')
    css = css.replace('color: white;', 'color: #000; font-weight: 600;')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(css)
        
print("Fixed button text colors")
