import re, os

src = 'C:/Users/sasha/OneDrive/Desktop/Программирование/Александр Волков/volkov.9.html'
dst = 'C:/Users/sasha/OneDrive/Desktop/Программирование/Александр Волков/public/index.html'

with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. Заменяем pickImage() ───────────────────────────────────────────
old_pick = (
    "// \u2500\u2500 \u0417\u0410\u0413\u0420\u0423\u0417\u041a\u0410 \u0424\u0410\u0419\u041b\u0410 \u2500\u2500\n"
    "function pickImage(cb){\n"
    "  pendingUploadCallback=cb;\n"
    "  const inp=document.getElementById('global-file-input');\n"
    "  inp.value='';\n"
    "  inp.onchange=function(){\n"
    "    if(!this.files[0])return;\n"
    "    const r=new FileReader();\n"
    "    r.onload=e=>pendingUploadCallback(e.target.result);\n"
    "    r.readAsDataURL(this.files[0]);\n"
    "  };\n"
    "  inp.click();\n"
    "}"
)
new_pick = (
    "// \u2500\u2500 \u0417\u0410\u0413\u0420\u0423\u0417\u041a\u0410 \u0424\u0410\u0419\u041b\u0410 \u2500\u2500\n"
    "function pickImage(cb){\n"
    "  pendingUploadCallback=cb;\n"
    "  var inp=document.getElementById('global-file-input');\n"
    "  inp.value='';\n"
    "  inp.onchange=function(){\n"
    "    if(!this.files[0])return;\n"
    "    var fd=new FormData();\n"
    "    fd.append('image',this.files[0]);\n"
    "    fetch('/api/upload',{method:'POST',body:fd})\n"
    "      .then(function(r){return r.json();})\n"
    "      .then(function(d){pendingUploadCallback(d.url);})\n"
    "      .catch(function(){alert('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0444\u0430\u0439\u043b\u0430');});\n"
    "  };\n"
    "  inp.click();\n"
    "}"
)
if old_pick in html:
    html = html.replace(old_pick, new_pick)
    print("OK pickImage")
else:
    print("FAIL pickImage")

# ── 2. Заменяем loadAboutPhoto() ─────────────────────────────────────
old_about = (
    "function loadAboutPhoto(inp){\n"
    "  if(!inp.files[0]||!editMode)return;\n"
    "  const r=new FileReader();\n"
    "  r.onload=e=>{document.getElementById('about-photo-box').innerHTML='<img src=\"'+e.target.result+'\" alt=\"\">';};\n"
    "  r.readAsDataURL(inp.files[0]);\n"
    "}"
)
new_about = (
    "function loadAboutPhoto(inp){\n"
    "  if(!inp.files[0]||!editMode)return;\n"
    "  var fd=new FormData();\n"
    "  fd.append('image',inp.files[0]);\n"
    "  fetch('/api/upload',{method:'POST',body:fd})\n"
    "    .then(function(r){return r.json();})\n"
    "    .then(function(d){document.getElementById('about-photo-box').innerHTML='<img src=\"'+d.url+'\" alt=\"\">';})\n"
    "    .catch(function(){alert('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0444\u043e\u0442\u043e');});\n"
    "}"
)
if old_about in html:
    html = html.replace(old_about, new_about)
    print("OK loadAboutPhoto")
else:
    print("FAIL loadAboutPhoto")

# ── 3. Заменяем initTestData IIFE на loadFromServer ───────────────────
load_fn = (
    "// \u2500\u2500 \u0417\u0410\u0413\u0420\u0423\u0417\u041a\u0410 \u0414\u0410\u041d\u041d\u042b\u0425 \u0421 \u0421\u0415\u0420\u0412\u0415\u0420\u0410 \u2500\u2500\n"
    "(function loadFromServer(){\n"
    "  fetch('/api/data')\n"
    "    .then(function(r){return r.json();})\n"
    "    .then(function(d){\n"
    "      if(!d||!d.hasData)return;\n"
    "      if(d.projects&&d.projects.length){projects=d.projects;renderProjects();}\n"
    "      if(d.photoAlbums&&d.photoAlbums.length){\n"
    "        photoAlbums=d.photoAlbums;\n"
    "        photoPeopleItems=photoAlbums[0]?photoAlbums[0].items:[];\n"
    "        photoSpacesItems=photoAlbums[1]?photoAlbums[1].items:[];\n"
    "        renderPhotoAlbums();\n"
    "      }\n"
    "      if(d.paintingItems&&d.paintingItems.length){\n"
    "        paintingItems=d.paintingItems;\n"
    "        renderInnerGallery('painting-gallery',paintingItems,'painting');\n"
    "      }\n"
    "      if(d.aboutPhoto){document.getElementById('about-photo-box').innerHTML='<img src=\"'+d.aboutPhoto+'\" alt=\"\">';}\n"
    "      if(d.aboutBio){var b=document.querySelector('.about-bio');if(b)b.textContent=d.aboutBio;}\n"
    "      var s=function(id,v){var e=document.getElementById(id);if(e&&v)e.textContent=v;};\n"
    "      s('painting-name',d.paintingName);\n"
    "      s('painting-desc',d.paintingDesc);\n"
    "      s('photo-people-name',d.photoPeopleName);\n"
    "      s('photo-people-desc',d.photoPeopleDesc);\n"
    "      s('photo-spaces-name',d.photoSpacesName);\n"
    "      s('photo-spaces-desc',d.photoSpacesDesc);\n"
    "    })\n"
    "    .catch(console.error);\n"
    "})();"
)

pattern = (
    r'// \u2500\u2500 \u0422\u0415\u0421\u0422\u041e\u0412\u042b\u0415 \u0414\u0410\u041d\u041d\u042b\u0415 \u2500\u2500\n'
    r'\(function initTestData\(\)\{.*?\}\)\(\);'
)
m = re.search(pattern, html, flags=re.DOTALL)
if m:
    html = html[:m.start()] + load_fn + html[m.end():]
    print("OK initTestData->loadFromServer")
else:
    print("FAIL initTestData pattern not found")

# ── 4. Добавляем saveAll() перед renderPhotoAlbums() в конце файла ────
save_all = (
    "\n// \u2500\u2500 \u0421\u041e\u0425\u0420\u0410\u041d\u0415\u041d\u0418\u0415 \u041d\u0410 \u0421\u0415\u0420\u0412\u0415\u0420 \u2500\u2500\n"
    "function saveAll(){\n"
    "  var img=document.querySelector('#about-photo-box img');\n"
    "  var bio=document.querySelector('.about-bio');\n"
    "  var g=function(id){var e=document.getElementById(id);return e?e.textContent:'';};\n"
    "  var payload={\n"
    "    hasData:true,\n"
    "    projects:projects,\n"
    "    photoAlbums:photoAlbums,\n"
    "    paintingItems:paintingItems,\n"
    "    aboutPhoto:img?img.src:null,\n"
    "    aboutBio:bio?bio.textContent:'',\n"
    "    paintingName:g('painting-name'),\n"
    "    paintingDesc:g('painting-desc'),\n"
    "    photoPeopleName:g('photo-people-name'),\n"
    "    photoPeopleDesc:g('photo-people-desc'),\n"
    "    photoSpacesName:g('photo-spaces-name'),\n"
    "    photoSpacesDesc:g('photo-spaces-desc')\n"
    "  };\n"
    "  fetch('/api/save',{\n"
    "    method:'POST',\n"
    "    headers:{'Content-Type':'application/json'},\n"
    "    body:JSON.stringify(payload)\n"
    "  })\n"
    "  .then(function(r){return r.json();})\n"
    "  .then(function(){\n"
    "    var btn=document.querySelector('.save-bar .admin-btn');\n"
    "    if(btn){var t=btn.textContent;btn.textContent='\u2713 \u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e';setTimeout(function(){btn.textContent=t;},2000);}\n"
    "  })\n"
    "  .catch(function(){alert('\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f');});\n"
    "}\n"
)

# Вставляем saveAll перед последним вхождением "renderPhotoAlbums();"
target = "\nrenderPhotoAlbums();\n"
idx = html.rfind(target)
if idx != -1:
    html = html[:idx] + save_all + html[idx:]
    print("OK saveAll added")
else:
    print("FAIL renderPhotoAlbums not found")

# ── 5. Добавляем HTML кнопки Сохранить ───────────────────────────────
save_bar_html = (
    "\n<!-- КНОПКА СОХРАНЕНИЯ -->\n"
    "<div class=\"save-bar admin-bar\" "
    "style=\"position:fixed;bottom:24px;right:24px;z-index:9999;"
    "background:rgba(10,10,8,0.92);border:1px solid rgba(255,255,255,0.25);\">\n"
    "  <button class=\"admin-btn\" onclick=\"saveAll()\" "
    "style=\"border:none;padding:12px 24px;font-size:10px;\">"
    "&#128190; \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button>\n"
    "</div>\n"
)

anchor = "\n<!-- \u041a\u041e\u041d\u0422\u0410\u041a\u0422\u042b -->"
if anchor in html:
    html = html.replace(anchor, save_bar_html + anchor, 1)
    print("OK save bar HTML added")
else:
    # Попробуем добавить перед закрывающим </body>
    html = html.replace("</body>", save_bar_html + "</body>", 1)
    print("OK save bar added before </body>")

with open(dst, 'w', encoding='utf-8') as f:
    f.write(html)

size_kb = os.path.getsize(dst) // 1024
print(f"\nDONE: public/index.html ({size_kb} KB)")
