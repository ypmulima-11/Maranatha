import os

files = ["index.html", "about.html", "works.html", "events.html", "gallery.html", "team.html", "join.html", "members.html", "admin.html"]

for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    # Bump CSS version to bust cache
    content = content.replace('maranatha.css?v=24', 'maranatha.css?v=25')
    content = content.replace('admin.css?v=3', 'admin.css?v=4')
    content = content.replace('members.css?v=23', 'members.css?v=24')
    content = content.replace('maranatha.css?v=23', 'maranatha.css?v=25') # Just in case
    
    with open(f, "w", encoding="utf-8") as file:
        file.write(content)
        
print("Bumped CSS version to v=25")
