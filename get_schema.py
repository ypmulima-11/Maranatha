with open('supabase-phase-final.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

import re
profiles_matches = re.findall(r'CREATE TABLE IF NOT EXISTS public\.profiles(.*?);', sql, re.DOTALL | re.IGNORECASE)
if profiles_matches:
    print(profiles_matches[0])
