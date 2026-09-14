import os

files = ["index.html", "about.html", "works.html", "events.html", "gallery.html", "team.html", "join.html", "members.html"]

for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    # 1. Move footer into main
    if "</main>" in content and "<footer" in content:
        # Check if footer is already inside main
        main_end = content.find("</main>")
        footer_start = content.find("<footer")
        
        if footer_start > main_end:
            # Footer is outside main, let's move it
            footer_end = content.find("</footer>") + len("</footer>")
            footer_html = content[footer_start:footer_end]
            
            # Remove footer from original position
            content = content[:footer_start] + content[footer_end:]
            
            # Recalculate main_end because content length changed
            main_end = content.find("</main>")
            content = content[:main_end] + footer_html + "\n" + content[main_end:]
            
            with open(f, "w", encoding="utf-8") as file:
                file.write(content)
            print(f"Moved footer inside main in {f}")
        else:
            print(f"Footer already inside main or something else in {f}")
