with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

start_idx = js.find("$('mpProfile').innerHTML = '';")
if start_idx != -1:
    end_idx = js.find("});", start_idx) + 3
    if end_idx != -1:
        # Include the newline
        end_idx += 1
        js = js[:start_idx] + js[end_idx:]

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
