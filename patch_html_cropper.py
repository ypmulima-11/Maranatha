import re

with open("members.html", "r", encoding="utf-8") as f:
    html = f.read()

# Add cropperjs
head_idx = html.find("</head>")
if head_idx != -1:
    cropper_tags = '\n  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css">\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"></script>\n'
    html = html[:head_idx] + cropper_tags + html[head_idx:]

# Add Crop Modal
body_end_idx = html.find("</body>")
if body_end_idx != -1:
    crop_modal = """
<div id="cropModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; flex-direction:column; align-items:center; justify-content:center;">
  <div style="background:var(--card); border: 1px solid var(--line); padding:20px; border-radius:12px; width:90%; max-width:500px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    <h3 style="margin-bottom:15px;">Crop Profile Picture</h3>
    <div style="max-height:60vh; overflow:hidden; margin-bottom: 20px; background:#000;">
      <img id="cropImage" style="max-width:100%; display:block;">
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button type="button" class="mp-btn" id="cropCancel">Cancel</button>
      <button type="button" class="mp-btn on" id="cropSave" style="background:var(--au); color:#fff;">Crop & Save</button>
    </div>
  </div>
</div>
"""
    html = html[:body_end_idx] + crop_modal + html[body_end_idx:]

# Modify pfAvatar field to include preview and delete
avatar_field = """<label class="mp-field"><span>Profile Picture (optional)</span>
                  <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <img id="pfAvatarPreview" style="width:50px; height:50px; border-radius:50%; object-fit:cover; display:none; border:1px solid rgba(255,255,255,0.2);">
                    <button type="button" class="mp-btn small danger" id="pfAvatarDelete" style="display:none;">Remove</button>
                  </div>
                  <input type="file" id="pfAvatar" accept="image/*">
                </label>"""
html = re.sub(r'<label class="mp-field"><span>Profile Picture \(optional\)</span>\s*<input type="file" id="pfAvatar" accept="image/\*">\s*</label>', avatar_field, html)

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
