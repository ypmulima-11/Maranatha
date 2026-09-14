from html.parser import HTMLParser
class P(HTMLParser):
  def __init__(self):
    super().__init__()
    self.depth = 0
    self.in_body = False
  def handle_starttag(self, tag, attrs):
    if tag == 'body':
        self.in_body = True
        self.depth = 0
        return
    if self.in_body and self.depth == 0 and tag not in ['img', 'br', 'hr', 'input', 'meta', 'link', 'source']:
        print(tag, dict(attrs).get('class', ''), dict(attrs).get('id', ''))
    if self.in_body and tag not in ['img', 'br', 'hr', 'input', 'meta', 'link', 'source']:
        self.depth += 1
  def handle_endtag(self, tag):
    if self.in_body and tag not in ['img', 'br', 'hr', 'input', 'meta', 'link', 'source']:
        self.depth -= 1
        if tag == 'body': self.in_body = False
p = P()
p.feed(open('index.html', encoding='utf-8').read())
