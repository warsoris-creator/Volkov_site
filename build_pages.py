import sys
sys.stdout = open(sys.stdout.fileno(), mode="w", encoding="utf-8", buffering=1)
"""
build_pages.py — разбивает монолитный index.html на отдельные страницы
с анимациями при переходе и сохранением админ-режима через sessionStorage.
"""
import re, os

BASE   = r'C:\Users\sasha\OneDrive\Desktop\Программирование\Александр Волков'
SRC    = os.path.join(BASE, 'public', 'index.html')
PUBLIC = os.path.join(BASE, 'public')

with open(SRC, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Извлекаем CSS ────────────────────────────────────────────────────
css_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
css = css_match.group(1)

# ── Дополнительные стили для переходов и многостраничной навигации ──────
EXTRA_CSS = """
/* ═══════════════════════════════════════════════
   МНОГОСТРАНИЧНАЯ НАВИГАЦИЯ И АНИМАЦИИ ПЕРЕХОДОВ
   ═══════════════════════════════════════════════ */

/* ── Анимации страницы ── */
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes pageExit {
  from { opacity: 1; transform: translateY(0);     }
  to   { opacity: 0; transform: translateY(-24px); }
}
.page-wrap {
  animation: pageEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
body.page-exit .page-wrap {
  animation: pageExit 0.32s ease-in forwards;
}

/* Home-screen тоже анимируется */
#home-screen {
  animation: pageEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}
body.page-exit #home-screen {
  animation: pageExit 0.32s ease-in forwards;
}

/* ── Навигация в шапке на страницах разделов ── */
.section-nav {
  display: flex;
  gap: 32px;
  align-items: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.section-nav a {
  font-family: var(--nav-font);
  font-size: 10px;
  font-weight: normal;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  transition: color 0.3s;
}
.section-nav a:hover,
.section-nav a.active {
  color: #ffffff;
}
@media(max-width:700px){
  .section-nav {
    display: none;
    position: fixed;
    top: 60px;
    left: 0; right: 0;
    background: rgba(10,10,8,0.97);
    flex-direction: column;
    gap: 0;
    padding: 16px 0;
    z-index: 9998;
    transform: none;
  }
  .section-nav.open { display: flex; }
  .section-nav a {
    padding: 14px 32px;
    width: 100%;
  }
}

/* ── section-page всегда видна на своей странице ── */
.section-page.standalone {
  display: block !important;
  border-top: none;
  padding-top: 80px;
}
"""

css_full = css + EXTRA_CSS

with open(os.path.join(PUBLIC, 'shared.css'), 'w', encoding='utf-8') as f:
    f.write(css_full)
print('✓ shared.css создан')

# ── 2. Извлекаем JS ─────────────────────────────────────────────────────
js_match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
js = js_match.group(1)

# ── Модифицируем JS для многостраничной версии ──────────────────────────

# 2a. Заменяем showHome() — навигация на главную с анимацией
old_showHome = """function showHome(){
  navHistory=[];
  document.getElementById('home-screen').style.display='flex';
  sections.forEach(id=>document.getElementById('section-'+id).classList.remove('active'));
  document.getElementById('back-btn').classList.remove('visible');
  window.scrollTo({top:0,behavior:'smooth'});
}"""
new_showHome = """function showHome(){
  navigateTo('/');
}"""
if old_showHome in js:
    js = js.replace(old_showHome, new_showHome)
    print('OK showHome')
else:
    print('FAIL showHome')

# 2b. Заменяем showSection()
old_showSection = """function showSection(id){
  navHistory.push(id);
  document.getElementById('home-screen').style.display='none';
  sections.forEach(s=>document.getElementById('section-'+s).classList.toggle('active',s===id));
  document.getElementById('back-btn').classList.add('visible');
  window.scrollTo({top:0,behavior:'smooth'});
}"""
new_showSection = """function showSection(id){
  navigateTo('/'+id);
}"""
if old_showSection in js:
    js = js.replace(old_showSection, new_showSection)
    print('OK showSection')
else:
    print('FAIL showSection')

# 2c. Заменяем goBack()
old_goBack = """function goBack(){
  navHistory.pop(); // убираем текущую
  if(navHistory.length>0){
    const prev=navHistory[navHistory.length-1];
    navHistory.pop();
    showSection(prev);
  } else {
    showHome();
  }
}"""
new_goBack = """function goBack(){
  // Если открыт детальный вид проекта — закрываем его
  var dv=document.getElementById('project-detail-view');
  if(dv&&dv.classList.contains('active')){closeProject();return;}
  // Если открыт детальный вид альбома — закрываем его
  var av=document.getElementById('photo-album-detail');
  if(av&&av.classList.contains('active')){closePhotoAlbum();return;}
  // Иначе — на главную
  navigateTo('/');
}"""
if old_goBack in js:
    js = js.replace(old_goBack, new_goBack)
    print('OK goBack')
else:
    print('FAIL goBack')

# 2d. Заменяем toggleMobileMenu()
old_toggle = """function toggleMobileMenu(){
  const nav=document.getElementById('main-nav');
  nav.style.display=nav.style.display==='none'?'':'none';
}"""
new_toggle = """function toggleMobileMenu(){
  var nav=document.getElementById('main-nav')||document.getElementById('section-nav');
  if(!nav)return;
  nav.classList.toggle('open');
}"""
if old_toggle in js:
    js = js.replace(old_toggle, new_toggle)
    print('OK toggleMobileMenu')
else:
    print('FAIL toggleMobileMenu')

# 2e. Добавляем null-check в renderProjects
old_renderProjects_start = """function renderProjects(){
  const g=document.getElementById('projects-grid');
  g.innerHTML='';"""
new_renderProjects_start = """function renderProjects(){
  const g=document.getElementById('projects-grid');
  if(!g)return;
  g.innerHTML='';"""
if old_renderProjects_start in js:
    js = js.replace(old_renderProjects_start, new_renderProjects_start)
    print('OK renderProjects null-check')
else:
    print('FAIL renderProjects null-check')

# 2f. Добавляем null-check в renderInnerGallery
old_renderInner_start = """function renderInnerGallery(gid,items,type){
  const g=document.getElementById(gid);
  g.innerHTML='';"""
new_renderInner_start = """function renderInnerGallery(gid,items,type){
  const g=document.getElementById(gid);
  if(!g)return;
  g.innerHTML='';"""
if old_renderInner_start in js:
    js = js.replace(old_renderInner_start, new_renderInner_start)
    print('OK renderInnerGallery null-check')
else:
    print('FAIL renderInnerGallery null-check')

# 2g. Добавляем sessionStorage в submitPassword
old_submit = """function submitPassword(){
  if(document.getElementById('password-input').value==='Z1488Z'){
    editMode=true;
    document.body.classList.add('edit-mode');
    document.querySelectorAll('.editable').forEach(el=>el.setAttribute('contenteditable','true'));
    document.querySelector('.about-bio').setAttribute('contenteditable','true');
    // Перерисовываем галереи чтобы появились кнопки сортировки
    renderProjects();
    renderPhotoAlbums();
    renderInnerGallery('painting-gallery',paintingItems,'painting');
    closeModal();"""
new_submit = """function submitPassword(){
  if(document.getElementById('password-input').value==='Z1488Z'){
    editMode=true;
    sessionStorage.setItem('editMode','1');
    document.body.classList.add('edit-mode');
    var bioEl=document.querySelector('.about-bio');
    document.querySelectorAll('.editable').forEach(el=>el.setAttribute('contenteditable','true'));
    if(bioEl)bioEl.setAttribute('contenteditable','true');
    // Перерисовываем галереи чтобы появились кнопки сортировки
    renderProjects();
    renderPhotoAlbums();
    renderInnerGallery('painting-gallery',paintingItems,'painting');
    closeModal();"""
if old_submit in js:
    js = js.replace(old_submit, new_submit)
    print('OK submitPassword + sessionStorage')
else:
    print('FAIL submitPassword')

# 2h. Добавляем sessionStorage в exitEditMode
old_exit = """function exitEditMode(){
  editMode=false;
  document.body.classList.remove('edit-mode');
  document.querySelectorAll('.editable').forEach(el=>el.setAttribute('contenteditable','false'));
  document.querySelector('.about-bio').setAttribute('contenteditable','false');
  renderProjects();
  renderPhotoAlbums();
  renderInnerGallery('painting-gallery',paintingItems,'painting');
}"""
new_exit = """function exitEditMode(){
  editMode=false;
  sessionStorage.removeItem('editMode');
  document.body.classList.remove('edit-mode');
  var bioEl=document.querySelector('.about-bio');
  document.querySelectorAll('.editable').forEach(el=>el.setAttribute('contenteditable','false'));
  if(bioEl)bioEl.setAttribute('contenteditable','false');
  renderProjects();
  renderPhotoAlbums();
  renderInnerGallery('painting-gallery',paintingItems,'painting');
}"""
if old_exit in js:
    js = js.replace(old_exit, new_exit)
    print('OK exitEditMode + sessionStorage')
else:
    print('FAIL exitEditMode')

# 2i. Навигация на главную с анимацией + функция initPage
PREPEND_JS = """// ── ПЕРЕХОД МЕЖДУ СТРАНИЦАМИ ──
function navigateTo(url){
  document.body.classList.add('page-exit');
  setTimeout(function(){ window.location.href=url; }, 340);
}

// ── ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ ──
function initPage(sectionId){
  // Восстанавливаем режим редактирования из sessionStorage
  if(sessionStorage.getItem('editMode')==='1'){
    editMode=true;
    document.body.classList.add('edit-mode');
    var bioEl=document.querySelector('.about-bio');
    document.querySelectorAll('.editable').forEach(function(el){el.setAttribute('contenteditable','true');});
    if(bioEl)bioEl.setAttribute('contenteditable','true');
  }
  // Подсвечиваем текущий раздел в навигации
  if(sectionId){
    var navLinks=document.querySelectorAll('.section-nav a');
    navLinks.forEach(function(a){
      if(a.getAttribute('href')==='/'+sectionId) a.classList.add('active');
    });
  }
  // Кнопка "Назад" всегда видна на страницах разделов
  if(sectionId){
    var btn=document.getElementById('back-btn');
    if(btn)btn.classList.add('visible');
  }
}

"""

# Вставляем в начало JS
js = PREPEND_JS + js

# 2j. Убираем вызов renderPhotoAlbums() в корне (он будет вызван из loadFromServer или вручную)
# Оставляем его — он безопасен с null-check в renderPhotoAlbums

print('OK JS modifications done')

# Пишем shared.js
with open(os.path.join(PUBLIC, 'shared.js'), 'w', encoding='utf-8') as f:
    f.write(js)
print('✓ shared.js создан')

# ── 3. Извлекаем HTML-блоки ─────────────────────────────────────────────
lines = content.split('\n')

def extract_block(start_comment, end_comment=None, end_lines=None):
    """Извлекает блок HTML между двумя маркерами"""
    in_block = False
    result = []
    for line in lines:
        if start_comment in line:
            in_block = True
        if in_block:
            result.append(line)
        if in_block and end_comment and end_comment in line:
            break
    return '\n'.join(result)

# Извлекаем логотип (base64 png) — первое вхождение в section-logo
logo_match = re.search(r'<img src="(data:image/png;base64,[^"]+)" [^>]*class="section-logo"', content)
logo_src = logo_match.group(1) if logo_match else ''

# Извлекаем секции
section_projects_match = re.search(r'<!-- ПРОЕКТЫ -->(.*?)<!-- ФОТОГРАФИЯ -->', content, re.DOTALL)
section_photo_match    = re.search(r'<!-- ФОТОГРАФИЯ -->(.*?)<!-- КАРТИНЫ -->', content, re.DOTALL)
section_painting_match = re.search(r'<!-- КАРТИНЫ -->(.*?)<!-- ОБ АВТОРЕ -->', content, re.DOTALL)
section_about_match    = re.search(r'<!-- ОБ АВТОРЕ -->(.*?)<!-- МОДАЛКА -->', content, re.DOTALL)
section_contacts_match = re.search(r'<!-- КОНТАКТЫ -->(.*?)<footer', content, re.DOTALL)
modal_match            = re.search(r'<!-- МОДАЛКА -->(.*?)<!-- КНОПКА СОХРАНЕНИЯ -->', content, re.DOTALL)
savebar_match          = re.search(r'<!-- КНОПКА СОХРАНЕНИЯ -->(.*?)<!-- КОНТАКТЫ -->', content, re.DOTALL)
lightbox_match         = re.search(r'<!-- ЛАЙТБОКС -->(.*?)<script>', content, re.DOTALL)
home_screen_match      = re.search(r'<!-- ГЛАВНАЯ -->(.*?)<!-- ПРОЕКТЫ -->', content, re.DOTALL)

# Обновляем nav-ссылки на главной странице на navigateTo
home_html = home_screen_match.group(1).strip() if home_screen_match else ''
home_html = home_html.replace(
    "onclick=\"showSection('projects');return false;\"",
    "onclick=\"navigateTo('/projects');return false;\""
).replace(
    "onclick=\"showSection('photo');return false;\"",
    "onclick=\"navigateTo('/photo');return false;\""
).replace(
    "onclick=\"showSection('painting');return false;\"",
    "onclick=\"navigateTo('/painting');return false;\""
).replace(
    "onclick=\"showSection('about');return false;\"",
    "onclick=\"navigateTo('/about');return false;\""
).replace(
    "onclick=\"showSection('contacts');return false;\"",
    "onclick=\"navigateTo('/contacts');return false;\""
)

# Вытаскиваем блоки
section_projects = section_projects_match.group(1).strip() if section_projects_match else ''
section_photo    = section_photo_match.group(1).strip() if section_photo_match else ''
section_painting = section_painting_match.group(1).strip() if section_painting_match else ''
section_about    = section_about_match.group(1).strip() if section_about_match else ''
section_contacts = section_contacts_match.group(1).strip() if section_contacts_match else ''
modal_html       = modal_match.group(1).strip() if modal_match else ''
savebar_html     = savebar_match.group(1).strip() if savebar_match else ''
lightbox_html    = lightbox_match.group(1).strip() if lightbox_match else ''

# В section-contacts меняем class чтобы был виден
section_contacts = section_contacts.replace(
    'id="section-contacts" class="section-page"',
    'id="section-contacts" class="section-page standalone"'
)

# Убираем <!-- КОНТАКТЫ --> из начала (если есть)
def strip_comment(html, comment):
    return re.sub(r'<!--[^-]*' + re.escape(comment.strip('<!-- -->')) + r'[^-]*-->\s*', '', html, count=1)

print('OK HTML blocks extracted')

# ── 4. Шапка сайта ─────────────────────────────────────────────────────
HEADER_HOME = """<!-- ШАПКА -->
<header class="site-header">
  <a href="#" class="back-btn" id="back-btn" onclick="goBack();return false;">Вернуться</a>
  <button class="mobile-nav-toggle" onclick="toggleMobileMenu()" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
</header>"""

def make_header(current_section):
    """Шапка для страниц разделов с навигацией"""
    sections_info = [
        ('projects', 'Проекты'),
        ('photo', 'Фотография'),
        ('painting', 'Картины'),
        ('about', 'Об авторе'),
        ('contacts', 'Контакты'),
    ]
    links = '\n    '.join(
        f'<a href="/{s}">{name}</a>'
        for s, name in sections_info
    )
    return f"""<!-- ШАПКА -->
<header class="site-header">
  <a href="/" class="back-btn visible" id="back-btn" onclick="goBack();return false;">Вернуться</a>
  <nav class="section-nav" id="section-nav">
    {links}
  </nav>
  <button class="mobile-nav-toggle" onclick="toggleMobileMenu()" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
</header>"""

FOOTER_HTML = """<footer class="site-footer">
  <span class="footer-copy">&copy; &#1040;&#1083;&#1077;&#1082;&#1089;&#1072;&#1085;&#1076;&#1088; &#1042;&#1086;&#1083;&#1082;&#1086;&#1074;. &#1042;&#1089;&#1077; &#1087;&#1088;&#1072;&#1074;&#1072; &#1079;&#1072;&#1097;&#1080;&#1097;&#1077;&#1085;&#1099;.</span>
</footer>"""

FILE_INPUT_HTML = '<input type="file" id="global-file-input" accept="image/*" style="display:none;">'

# ── 5. Шаблон страницы раздела ─────────────────────────────────────────
def make_page(title, section_id, section_html, extra_bottom=''):
    header = make_header(section_id)
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Александр Волков — {title}</title>
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="stylesheet" href="/shared.css">
</head>
<body>

{header}

<div class="page-wrap">
{section_html}

{FOOTER_HTML}
</div>

{modal_html}

{savebar_html}

{FILE_INPUT_HTML}

<!-- ЛАЙТБОКС -->
{lightbox_html}

<script src="/shared.js"></script>
<script>
initPage('{section_id}');
</script>
</body>
</html>"""

# ── 6. Создаём страницы разделов ───────────────────────────────────────

# Проекты — убираем class section-page, делаем standalone
projects_html = section_projects.replace(
    'id="section-projects" class="section-page"',
    'id="section-projects" class="section-page standalone"'
)
with open(os.path.join(PUBLIC, 'projects.html'), 'w', encoding='utf-8') as f:
    f.write(make_page('Проекты', 'projects', projects_html))
print('✓ projects.html создан')

# Фотография
photo_html = section_photo.replace(
    'id="section-photo" class="section-page"',
    'id="section-photo" class="section-page standalone"'
)
with open(os.path.join(PUBLIC, 'photo.html'), 'w', encoding='utf-8') as f:
    f.write(make_page('Фотография', 'photo', photo_html))
print('✓ photo.html создан')

# Картины
painting_html = section_painting.replace(
    'id="section-painting" class="section-page"',
    'id="section-painting" class="section-page standalone"'
)
with open(os.path.join(PUBLIC, 'painting.html'), 'w', encoding='utf-8') as f:
    f.write(make_page('Картины', 'painting', painting_html))
print('✓ painting.html создан')

# Об авторе
about_html = section_about.replace(
    'id="section-about" class="section-page"',
    'id="section-about" class="section-page standalone"'
)
with open(os.path.join(PUBLIC, 'about.html'), 'w', encoding='utf-8') as f:
    f.write(make_page('Об авторе', 'about', about_html))
print('✓ about.html создан')

# Контакты — contacts section уже в contacts_html
contacts_page_html = section_contacts
with open(os.path.join(PUBLIC, 'contacts.html'), 'w', encoding='utf-8') as f:
    f.write(make_page('Контакты', 'contacts', contacts_page_html))
print('✓ contacts.html создан')

# ── 7. Обновляем index.html (главная) ───────────────────────────────────
index_html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Александр Волков</title>
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="stylesheet" href="/shared.css">
</head>
<body>

{HEADER_HOME}

<div class="page-wrap">
{home_html}
</div>

{modal_html}

{savebar_html}

{FILE_INPUT_HTML}

<!-- ЛАЙТБОКС -->
{lightbox_html}

<script src="/shared.js"></script>
<script>
initPage(null);
</script>
</body>
</html>"""

with open(os.path.join(PUBLIC, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(index_html)
print('✓ index.html обновлён (главная страница)')

# ── 8. Обновляем server.js — добавляем extensions: ['html'] ─────────────
server_path = os.path.join(BASE, 'server.js')
with open(server_path, 'r', encoding='utf-8') as f:
    server = f.read()

old_static = "app.use(express.static(path.join(__dirname, 'public')));"
new_static  = "app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));"
if old_static in server:
    server = server.replace(old_static, new_static)
    with open(server_path, 'w', encoding='utf-8') as f:
        f.write(server)
    print('✓ server.js обновлён (extensions html)')
else:
    print('SKIP server.js (уже обновлён или изменён)')

print('\n✅ Готово! Все страницы созданы.')
sizes = []
for fn in ['index.html','projects.html','photo.html','painting.html','about.html','contacts.html','shared.css','shared.js']:
    p = os.path.join(PUBLIC, fn)
    if os.path.exists(p):
        sizes.append(f'  {fn}: {os.path.getsize(p)//1024} KB')
print('\n'.join(sizes))
