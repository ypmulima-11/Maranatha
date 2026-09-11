import re

with open("members.html", "r", encoding="utf-8") as f:
    html = f.read()

pattern = r'<button type="button" class="mp-btn small" id="mpOut" data-i18n="portal\.signout">Sign out</button>'
replacement = """<div class="mp-user-menu-container">
          <button type="button" class="mp-user-avatar-btn" id="mpUserMenuBtn">
            <span class="mp-avatar-initials" id="mpAvatarInitials"></span>
            <img src="" class="mp-avatar-img" id="mpAvatarImg" hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div class="mp-user-dropdown" id="mpUserDropdown" hidden>
            <button type="button" id="mpMenuProfile">Profile</button>
            <hr>
            <button type="button" id="mpMenuLogout">Log out</button>
          </div>
        </div>"""
html = re.sub(pattern, replacement, html)

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
