with open("members.css", "a", encoding="utf-8") as f:
    f.write("""

/* ---------- User Menu Dropdown ---------- */
.mp-user-menu-container {
  position: relative;
  display: inline-block;
}
.mp-user-avatar-btn {
  background: transparent;
  border: none;
  padding: 4px 8px 4px 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--txt);
  transition: background 0.2s;
  border-radius: 20px;
}
.mp-user-avatar-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}
.mp-avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--line);
  color: var(--txt);
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
}
.mp-avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--line);
}
.mp-user-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 8px;
  width: 160px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow: hidden;
}
.mp-user-dropdown button {
  background: transparent;
  border: none;
  color: var(--txt);
  padding: 12px 16px;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}
.mp-user-dropdown button:hover {
  background: rgba(255, 255, 255, 0.05);
}
.mp-user-dropdown hr {
  border: none;
  border-top: 1px solid var(--line);
  margin: 0;
}
""")
