with open("supabase-directory-access.sql", "r", encoding="utf-8") as f:
    sql = f.read()

import re
old_insert = """INSERT INTO public.resources (title, body, date, audience)
VALUES (
  'Katiba ya Kwaya ya Maranatha 2025',
  '<a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link">Pakua Katiba (PDF)</a>',
  TO_CHAR(NOW(), 'DD/MM/YYYY'),
  'leader'
)
ON CONFLICT DO NOTHING;"""

new_insert = """INSERT INTO public.resources (title, body, date, audience)
SELECT 'Katiba ya Kwaya ya Maranatha 2025',
       '<a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link">Pakua Katiba (PDF)</a>',
       TO_CHAR(NOW(), 'DD/MM/YYYY'),
       'leader'
WHERE NOT EXISTS (
  SELECT 1 FROM public.resources WHERE title = 'Katiba ya Kwaya ya Maranatha 2025'
);"""

sql = sql.replace(old_insert, new_insert)

with open("supabase-directory-access.sql", "w", encoding="utf-8") as f:
    f.write(sql)
