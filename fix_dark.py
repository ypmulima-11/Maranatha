import os

with open('maranatha.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace root variables
old_root = """:root {
  --g9: #0d2a04; --g8: #173404; --g7: #27500A; --g6: #3B6D11;
  --g5: #639922; --g3: #97C459; --g1: #C0DD97; --g0: #EAF3DE;
  --au: #BA7517; --al: #FAC775; --ap: #FAEEDA;
  --tx: #1a1a1a; --tm: #4a5a3a; --ts: #5f6e51;
}"""
new_root = """:root {
  --g9: #07171a; --g8: #07171a; --g7: #0c262b; --g6: #11343a;
  --g5: #16434a; --g3: #1b515a; --g1: #8ca3a7; --g0: #061d21;
  --au: #fbbc05; --al: #fbbc05; --ap: rgba(251, 188, 5, 0.1);
  --tx: #ffffff; --tm: #8ca3a7; --ts: #5a7478;
  --bg: #061d21;
  --card: #0c262b;
  --line: #11343a;
}"""

css = css.replace(old_root, new_root)
css = css.replace('body { font-family: \'DM Sans\', sans-serif; color: var(--tx); background: #fff; overflow-x: hidden; }',
                  'body { font-family: \'DM Sans\', sans-serif; color: var(--tx); background: var(--bg); overflow-x: hidden; }')

# In the dashboard desktop layout I appended earlier, I need to make sure the colors apply perfectly.
# Find the dashboard block at the end and replace it to be 100% Punta.
dashboard_start = css.find('/* =========================================================================')
if dashboard_start != -1:
    css = css[:dashboard_start]

# Append the full Punta Dashboard CSS 
punta_css = """
/* =========================================================================
   PUNTA DASHBOARD LAYOUT FOR DESKTOP
   ========================================================================= */
@media (min-width: 992px) {
  html { scroll-padding-top: 20px; }
  
  body {
    display: grid !important;
    grid-template-columns: 270px 1fr 340px !important; /* Left Nav, Main, Right Sidebar */
    grid-template-rows: auto 1fr !important;
    height: 100vh !important;
    overflow: hidden !important;
    background: var(--bg) !important;
  }
  
  /* Top Bar Header */
  .tb {
    position: static !important;
    grid-column: 2 / span 2 !important;
    grid-row: 1 !important;
    height: 70px !important;
    background: var(--g9) !important;
    border-bottom: 1px solid var(--line) !important;
    padding: 0 40px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
  }
  
  /* Sidebar Nav */
  nav {
    position: static !important;
    grid-column: 1 !important;
    grid-row: 1 / span 2 !important;
    height: 100vh !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    padding: 2.5rem 1.5rem !important;
    border-right: 1px solid var(--line) !important;
    background: var(--g9) !important;
    box-shadow: none !important;
  }
  
  .nb {
    margin-bottom: 2.5rem !important;
    width: 100%;
  }
  
  .nl {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0.5rem !important;
    width: 100% !important;
  }
  
  .nl a {
    padding: 14px 18px !important;
    border-radius: 8px !important;
    border-bottom: none !important;
    font-weight: 500 !important;
    transition: all 0.2s !important;
    display: flex;
    align-items: center;
    color: var(--tx) !important;
  }
  
  .nl a:hover {
    background: rgba(255, 255, 255, 0.05) !important;
  }
  
  .nl a.active {
    background: var(--ap) !important; 
    border: 1px solid rgba(251, 188, 5, 0.25) !important;
    color: var(--al) !important;
  }
  
  .nl a.nc-cta {
    margin-top: 1.5rem !important;
    background: var(--au) !important;
    color: #000 !important;
  }
  
  /* Main scrollable area */
  main#main {
    grid-column: 2 !important;
    grid-row: 2 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    position: relative !important;
    padding: 40px !important;
    background: var(--bg) !important;
  }
  
  /* We will create a fake right sidebar using a pseudo element or inject it, 
     but for now we leave column 3 empty unless there's content. Actually let's just make grid 2 columns if there's no right sidebar */
  body {
    grid-template-columns: 270px 1fr !important;
  }
  .tb { grid-column: 2 !important; }

  .hero {
    min-height: auto !important;
    padding-top: 0 !important;
    background: transparent !important;
  }
  
  /* Cards */
  .fsi, .sw, .nwi, .ctai {
    background: var(--card) !important;
    border-radius: 12px !important;
    border: 1px solid var(--line) !important;
    box-shadow: none !important;
  }
  .nwi, .ctai { padding: 40px !important; }
  
  /* Text */
  h1, h2, h3, h4, h5, h6 { color: #fff !important; }
  p, span, div { color: var(--tm); }
  .nn { color: #fff !important; }
  
  /* Hero specific */
  .hero h1 { color: #fff !important; }
  .hlbl { background: var(--ap) !important; border-color: rgba(251, 188, 5, 0.3) !important; color: var(--al) !important; }
  
  /* Overrides for text visibility in dark mode */
  .fsb p, .nwg p, .ssub { color: var(--tm) !important; }
  .stit { color: #fff !important; }
}

/* Base dark mode overrides for all screens */
body { background: var(--bg); color: var(--tx); }
.hero { background: var(--bg); }
.tb { background: var(--g9); border-bottom: 1px solid var(--line); color: var(--tm); }
nav { background: var(--g9); border-bottom: 1px solid var(--line); }
.fsi, .nwi, .ctai { background: var(--card); border: 1px solid var(--line); }
.fsb p { color: var(--tm); }
"""

css += punta_css

with open('maranatha.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated maranatha.css with dark mode Punta theme")
