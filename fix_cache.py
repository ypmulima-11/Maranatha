import os

files = ["index.html", "about.html", "works.html", "events.html", "gallery.html", "team.html", "join.html", "members.html"]

for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    # Bump CSS version to bust cache
    content = content.replace('maranatha.css?v=23', 'maranatha.css?v=24')
    
    with open(f, "w", encoding="utf-8") as file:
        file.write(content)
        
print("Bumped CSS version to v=24")
