with open("supabase-directory-access.sql", "r", encoding="utf-8") as f:
    sql = f.read()

sql = sql.replace("AS $function", "AS $$")
sql = sql.replace("$function;", "$$;")

with open("supabase-directory-access.sql", "w", encoding="utf-8") as f:
    f.write(sql)
