import re

with open("members.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Remove it from .mp-welcome
menu_container_regex = r'<div class="mp-user-menu-container">[\s\S]*?<button type="button" id="mpMenuLogout">Log out</button>\s*</div>\s*</div>'
html = re.sub(menu_container_regex, '', html)

# 2. Add it to <nav> wrapper
nav_regex = r'(<div class="nl">[\s\S]*?<a href="join\.html" class="nc-cta" data-i18n="nav\.join">Join Us</a>\s*</div>)\s*(<button class="nm-btn" id="nmBtn" aria-label="Open menu" aria-expanded="false">\s*<span></span><span></span><span></span>\s*</button>)'

wrapper = """<div style="display:flex; align-items:center; gap: 1rem;">
      \\1
      <div class="mp-user-menu-container" id="globalUserMenu" style="display:none;">
        <button type="button" class="mp-user-avatar-btn" id="mpUserMenuBtn">
          <span class="mp-avatar-initials" id="mpAvatarInitials"></span>
          <img src="" class="mp-avatar-img" id="mpAvatarImg" style="display:none;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="mp-user-dropdown" id="mpUserDropdown" style="display:none;">
          <button type="button" id="mpMenuProfile">Profile</button>
          <hr>
          <button type="button" id="mpMenuLogout">Log out</button>
        </div>
      </div>
      \\2
    </div>"""

html = re.sub(nav_regex, wrapper, html)

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
