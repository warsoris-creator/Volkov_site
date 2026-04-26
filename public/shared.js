// ── ПЕРЕХОД МЕЖДУ СТРАНИЦАМИ ──
function navigateTo(url){
  document.body.classList.add('page-exit');
  setTimeout(function(){ window.location.href=url; }, 340);
}

// Исправление bfcache: при возврате кнопкой «Назад» снимаем page-exit
// и перезапускаем анимацию входа
// ── ПОКАЗ СТРАНИЦЫ ПОСЛЕ ЗАГРУЗКИ ДАННЫХ ──
function _showPage(){
  var pw=document.querySelector('.page-wrap');
  if(pw&&!pw.classList.contains('data-loaded')){
    pw.classList.add('data-loaded');
  }
}

window.addEventListener('pageshow', function(e){
  document.body.classList.remove('page-exit');
  // Перезапускаем анимацию page-wrap если страница из bfcache
  if(e.persisted){
    var pw = document.querySelector('.page-wrap');
    if(pw){
      pw.style.animation = 'none';
      pw.offsetHeight; // reflow
      pw.style.animation = '';
    }
    var hs = document.getElementById('home-screen');
    if(hs){
      hs.style.animation = 'none';
      hs.offsetHeight;
      hs.style.animation = '';
    }
  }
});

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
  // Страховочный таймаут: показываем страницу если сервер не ответил
  setTimeout(_showPage, 1500);

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


const sections=['projects','photo','painting','about','contacts'];
let currentProjectId=null, pendingUploadCallback=null, editMode=false;
let projects=[], paintingItems=[];
var _serverData={};  // кэш данных с сервера
let photoAlbums=[
  {id:'people', title:'Люди', cover:null, items:[], desc:''},
  {id:'spaces', title:'Пространства', cover:null, items:[], desc:''}
];
let currentAlbumId=null;
// совместимость со старым кодом
var photoPeopleItems = photoAlbums[0].items;
var photoSpacesItems = photoAlbums[1].items;
let navHistory=[];

// ── НАВИГАЦИЯ ──
function showHome(){
  navigateTo('/');
}
function showSection(id){
  navigateTo('/'+id);
}
function goBack(){
  // Если открыт детальный вид проекта — закрываем его
  var dv=document.getElementById('project-detail-view');
  if(dv&&dv.classList.contains('active')){closeProject();return;}
  // Если открыт детальный вид альбома — закрываем его
  var av=document.getElementById('photo-album-detail');
  if(av&&av.classList.contains('active')){closePhotoAlbum();return;}
  // Иначе — на главную
  navigateTo('/');
}
function toggleMobileMenu(){
  var nav=document.getElementById('main-nav')||document.getElementById('section-nav');
  if(!nav)return;
  nav.classList.toggle('open');
}

// ── ФОТО ПОДРАЗДЕЛЫ ──
// showPhotoSub deprecated
let photoSubCounter=0;
function addPhotoSubsection(){
  if(!editMode) return;
  var subName = prompt('Название подраздела:', 'Новый раздел');
  if(!subName) return;
  var subId = 'sub' + Date.now();

  // Создаём вкладку
  var tabBar = document.getElementById('photo-subsections');
  var addBtn = tabBar.querySelector('.subsection-add-btn');
  var tab = document.createElement('button');
  tab.className = 'subsection-btn';
  tab.dataset.sub = subId;
  tab.textContent = subName;

  // Кнопка удаления вкладки
  var delBtn = document.createElement('button');
  delBtn.className = 'subsection-del-btn';
  delBtn.textContent = '×';
  delBtn.title = 'Удалить';
  delBtn.onclick = function(e){
    e.stopPropagation();
    delPhotoSub(subId, tab);
  };
  tab.appendChild(delBtn);

  var capturedId = subId;
  var capturedTab = tab;
  tab.onclick = function(e){
    if(e.target === delBtn) return;
    showPhotoSubDyn(capturedId, capturedTab);
  };
  tabBar.insertBefore(tab, addBtn);

  // Создаём wrap-контейнер
  var wrap = document.createElement('div');
  wrap.id = 'photo-' + subId + '-wrap';
  wrap.style.display = 'none';

  var nameDiv = document.createElement('div');
  nameDiv.className = 'gallery-section-name editable';
  nameDiv.contentEditable = editMode ? 'true' : 'false';
  nameDiv.spellcheck = false;
  nameDiv.textContent = subName;

  var descDiv = document.createElement('div');
  descDiv.className = 'gallery-section-desc editable';
  descDiv.contentEditable = editMode ? 'true' : 'false';
  descDiv.spellcheck = false;

  var header = document.createElement('div');
  header.className = 'gallery-section-header';
  header.appendChild(nameDiv);
  header.appendChild(descDiv);

  var adminBar = document.createElement('div');
  adminBar.className = 'admin-bar';
  var addImgBtn = document.createElement('button');
  addImgBtn.className = 'admin-btn';
  addImgBtn.textContent = '+ Добавить фото';
  (function(sid){ addImgBtn.onclick = function(){ addInnerItem('photo-'+sid+'-gallery', 'photo-'+sid); }; })(subId);
  adminBar.appendChild(addImgBtn);

  var gallery = document.createElement('div');
  gallery.className = 'inner-gallery';
  gallery.id = 'photo-' + subId + '-gallery';

  wrap.appendChild(header);
  wrap.appendChild(adminBar);
  wrap.appendChild(gallery);

  document.getElementById('section-photo').appendChild(wrap);

  // Регистрируем массив
  window['photoItems_' + subId] = [];

  showPhotoSubDyn(subId, tab);
}


// ── ПАРОЛЬ / РЕЖИМ РЕДАКТИРОВАНИЯ ──
function toggleEditMode(){
  if(editMode){exitEditMode();}
  else{
    document.getElementById('password-input').value='';
    document.getElementById('password-error').classList.remove('show');
    document.getElementById('password-modal').classList.add('open');
    setTimeout(()=>document.getElementById('password-input').focus(),120);
  }
}
function submitPassword(){
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
    closeModal();
  } else {
    document.getElementById('password-error').classList.add('show');
    document.getElementById('password-input').value='';
    document.getElementById('password-input').focus();
  }
}
function exitEditMode(){
  editMode=false;
  sessionStorage.removeItem('editMode');
  document.body.classList.remove('edit-mode');
  var bioEl=document.querySelector('.about-bio');
  document.querySelectorAll('.editable').forEach(el=>el.setAttribute('contenteditable','false'));
  if(bioEl)bioEl.setAttribute('contenteditable','false');
  renderProjects();
  renderPhotoAlbums();
  renderInnerGallery('painting-gallery',paintingItems,'painting');
}
function closeModal(){document.getElementById('password-modal').classList.remove('open');}

// ── ЗАГРУЗКА ФАЙЛА ──
function pickImage(cb){
  pendingUploadCallback=cb;
  var inp=document.getElementById('global-file-input');
  inp.value='';
  inp.onchange=function(){
    if(!this.files[0])return;
    var fd=new FormData();
    fd.append('image',this.files[0]);
    fetch('/api/upload',{method:'POST',body:fd})
      .then(function(r){return r.json();})
      .then(function(d){pendingUploadCallback(d.url);})
      .catch(function(){alert('Ошибка загрузки файла');});
  };
  inp.click();
}

// ── ПРОЕКТЫ ──
// ── ФОТОАЛЬБОМЫ ──
function renderPhotoAlbums(){
  var grid=document.getElementById('photo-albums-grid');
  if(!grid) return;
  grid.innerHTML='';
  photoAlbums.forEach(function(a,idx){
    var c=document.createElement('div');
    c.className='project-card';

    // Картинка
    var imgWrap=document.createElement('div');
    imgWrap.className='project-card-img';
    if(a.cover){
      var img=document.createElement('img');
      img.src=a.cover; img.alt='';
      imgWrap.appendChild(img);
    } else {
      var ph=document.createElement('div');
      ph.className='ph';
      ph.textContent='+ обложка';
      imgWrap.appendChild(ph);
    }
    (function(aid){ imgWrap.onclick=function(){ openPhotoAlbum(aid); }; })(a.id);
    c.appendChild(imgWrap);

    // Сортировка
    if(editMode){
      var sc=document.createElement('div');
      sc.className='sort-controls';
      if(idx>0){
        var su=document.createElement('button');
        su.className='sort-btn'; su.textContent='↑';
        (function(aid){ su.onclick=function(e){ e.stopPropagation(); movePhotoAlbum(aid,-1); }; })(a.id);
        sc.appendChild(su);
      }
      if(idx<photoAlbums.length-1){
        var sd=document.createElement('button');
        sd.className='sort-btn'; sd.textContent='↓';
        (function(aid){ sd.onclick=function(e){ e.stopPropagation(); movePhotoAlbum(aid,1); }; })(a.id);
        sc.appendChild(sd);
      }
      c.appendChild(sc);
    }

    // Футер
    var footer=document.createElement('div');
    footer.className='project-card-footer';

    var titleEl=document.createElement('div');
    titleEl.className='project-card-title';
    titleEl.textContent=a.title;
    if(editMode){
      titleEl.contentEditable='true';
      titleEl.spellcheck=false;
      (function(aid){ titleEl.onblur=function(){ var al=photoAlbums.find(function(x){return x.id===aid;}); if(al) al.title=titleEl.innerText.trim()||al.title; }; })(a.id);
    }
    titleEl.addEventListener('click',function(e){ e.stopPropagation(); });
    footer.appendChild(titleEl);

    var actions=document.createElement('div');
    actions.className='project-card-actions';

    var coverBtn=document.createElement('button');
    coverBtn.className='card-btn'; coverBtn.title='Обложка';
    coverBtn.innerHTML='&#128444;';
    (function(aid){ coverBtn.onclick=function(e){ e.stopPropagation(); setAlbumCover(aid); }; })(a.id);
    actions.appendChild(coverBtn);

    if(idx>1){
      var delBtn=document.createElement('button');
      delBtn.className='card-btn del'; delBtn.title='Удалить';
      delBtn.innerHTML='&#10005;';
      (function(aid){ delBtn.onclick=function(e){ e.stopPropagation(); deletePhotoAlbum(aid); }; })(a.id);
      actions.appendChild(delBtn);
    }
    footer.appendChild(actions);
    c.appendChild(footer);
    grid.appendChild(c);
  });
}
function openPhotoAlbum(id){
  currentAlbumId=id;
  const a=photoAlbums.find(x=>x.id===id);
  document.getElementById('photo-albums-list').style.display='none';
  document.getElementById('photo-album-detail').classList.add('active');
  const t=document.getElementById('photo-album-title');
  t.innerText=a.title;
  t.contentEditable=editMode?'true':'false';
  const d=document.getElementById('photo-album-desc');
  if(d){d.innerText=a.desc||'';d.contentEditable=editMode?'true':'false';}
  renderInnerGallery('photo-album-gallery',a.items,'photo-album');
}
function closePhotoAlbum(){
  const a=photoAlbums.find(x=>x.id===currentAlbumId);
  if(a){
    a.title=document.getElementById('photo-album-title').innerText.trim()||a.title;
    const d=document.getElementById('photo-album-desc');
    if(d) a.desc=d.innerText;
  }
  currentAlbumId=null;
  document.getElementById('photo-albums-list').style.display='';
  document.getElementById('photo-album-detail').classList.remove('active');
  renderPhotoAlbums();
}
function setAlbumCover(id){
  if(!editMode)return;
  pickImage(src=>{const a=photoAlbums.find(x=>x.id===id);if(a){a.cover=src;renderPhotoAlbums();}});
}
function deletePhotoAlbum(id){
  if(!editMode)return;
  if(!confirm('Удалить подборку?'))return;
  photoAlbums=photoAlbums.filter(x=>x.id!==id);
  renderPhotoAlbums();
}
function movePhotoAlbum(id,dir){
  const i=photoAlbums.findIndex(x=>x.id===id);
  if(i===-1)return;
  const ni=i+dir;
  if(ni<0||ni>=photoAlbums.length)return;
  [photoAlbums[i],photoAlbums[ni]]=[photoAlbums[ni],photoAlbums[i]];
  renderPhotoAlbums();
}
function addPhotoAlbum(){
  if(!editMode)return;
  var name=prompt('Название подборки:','Новая подборка');
  if(!name)return;
  photoAlbums.push({id:'album'+Date.now(),title:name,cover:null,items:[],desc:''});
  renderPhotoAlbums();
}

function addProject(){
  if(!editMode)return;
  const id=Date.now();
  projects.push({id,title:'\u041d\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0435\u043a\u0442',cover:null,items:[],desc:''});
  renderProjects();
}
function renderProjects(){
  const g=document.getElementById('projects-grid');
  if(!g)return;
  g.innerHTML='';
  projects.forEach((p,idx)=>{
    const c=document.createElement('div');
    c.className='project-card';
    const sortHtml='<div class="sort-controls">'
      +(idx>0?'<button class="sort-btn" onclick="event.stopPropagation();moveProject('+p.id+',-1)">&#8593;</button>':'')
      +(idx<projects.length-1?'<button class="sort-btn" onclick="event.stopPropagation();moveProject('+p.id+',1)">&#8595;</button>':'')
      +'</div>';
    c.innerHTML='<div class="project-card-img" onclick="openProject('+p.id+')">'
      +(p.cover?'<img src="'+p.cover+'" alt="">':'<div class="ph">+ \u043e\u0431\u043b\u043e\u0436\u043a\u0430</div>')
      +'</div>'
      +sortHtml
      +'<div class="project-card-footer">'
      +'<div class="project-card-title">'+escH(p.title)+'</div>'
      +'<div class="project-card-actions">'
      +'<button class="card-btn" onclick="event.stopPropagation();setCover('+p.id+')">&#128444;</button>'
      +'<button class="card-btn del" onclick="event.stopPropagation();deleteProject('+p.id+')">&#10005;</button>'
      +'</div></div>'
      +'<div class="project-card-desc">'+(p.desc||'')+'</div>';
    const titleEl=c.querySelector('.project-card-title');
    const descEl=c.querySelector('.project-card-desc');
    if(editMode){
      titleEl.contentEditable='true';titleEl.spellcheck=false;
      titleEl.onblur=()=>updateProjectTitle(p.id,titleEl.innerText);
      descEl.contentEditable='true';descEl.spellcheck=false;
      descEl.onblur=()=>{const pr=projects.find(x=>x.id===p.id);if(pr)pr.desc=descEl.innerText;};
    }
    titleEl.addEventListener('click',e=>e.stopPropagation());
    descEl.addEventListener('click',e=>e.stopPropagation());
    g.appendChild(c);
  });
}
function moveProject(id,dir){
  const i=projects.findIndex(x=>x.id===id);
  if(i===-1)return;
  const ni=i+dir;
  if(ni<0||ni>=projects.length)return;
  [projects[i],projects[ni]]=[projects[ni],projects[i]];
  renderProjects();
}
function escH(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function updateProjectTitle(id,v){const p=projects.find(x=>x.id===id);if(p)p.title=v.trim()||'\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f';}
function setCover(id){if(!editMode)return;pickImage(src=>{const p=projects.find(x=>x.id===id);if(p){p.cover=src;renderProjects();}});}
function deleteProject(id){if(!editMode)return;if(!confirm('\u0423\u0434\u0430\u043b\u0438\u0442\u044c?'))return;projects=projects.filter(x=>x.id!==id);renderProjects();}
function openProject(id){
  currentProjectId=id;
  const p=projects.find(x=>x.id===id);
  document.getElementById('projects-list-view').style.display='none';
  document.getElementById('project-detail-view').classList.add('active');
  const t=document.getElementById('project-detail-title');
  t.innerText=p.title;
  t.contentEditable=editMode?'true':'false';
  const descEl=document.getElementById('project-detail-desc');
  if(descEl){descEl.innerText=p.desc||'';descEl.contentEditable=editMode?'true':'false';}
  renderInnerGallery('project-inner-gallery',p.items,'project');
}
function closeProject(){
  const p=projects.find(x=>x.id===currentProjectId);
  if(p){
    p.title=document.getElementById('project-detail-title').innerText.trim()||p.title;
    const descEl=document.getElementById('project-detail-desc');
    if(descEl)p.desc=descEl.innerText;
  }
  currentProjectId=null;
  document.getElementById('projects-list-view').style.display='';
  document.getElementById('project-detail-view').classList.remove('active');
  renderProjects();
}

// ── ГАЛЕРЕЯ ──
function getArr(type){
  if(type==='project'){const p=projects.find(x=>x.id===currentProjectId);return p?p.items:[];}
  if(type==='photo-album'){const a=photoAlbums.find(x=>x.id===currentAlbumId);return a?a.items:[];}
  if(type==='painting')return paintingItems;
  return[];
}
function addInnerItem(gid,type){
  if(!editMode)return;
  pickImage(src=>{
    getArr(type).push({id:Date.now(),src,caption:''});
    renderInnerGallery(gid,getArr(type),type);
  });
}
function renderInnerGallery(gid,items,type){
  const g=document.getElementById(gid);
  if(!g)return;
  g.innerHTML='';
  items.forEach((item,idx)=>{
    const d=document.createElement('div');
    d.className='inner-item';
    // Кнопки сортировки
    const sortHtml='<div class="sort-controls">'
      +(idx>0?'<button class="sort-btn" title="\u0412\u044b\u0448\u0435" onclick="moveItem(\''+gid+'\',\''+type+'\','+item.id+',-1)">&#8593;</button>':'')
      +(idx<items.length-1?'<button class="sort-btn" title="\u041d\u0438\u0436\u0435" onclick="moveItem(\''+gid+'\',\''+type+'\','+item.id+',1)">&#8595;</button>':'')
      +'</div>';
    d.innerHTML='<div class="inner-item-img"><img src="'+item.src+'" alt=""></div>'
      +sortHtml
      +'<div class="inner-item-caption">'
      +'<div class="inner-item-text">'+(item.caption||'')+'</div>'
      +'<button class="inner-item-del" onclick="delInner(\''+gid+'\',\''+type+'\','+item.id+')">&#10005;</button>'
      +'</div>';
    const textEl=d.querySelector('.inner-item-text');
    if(editMode){textEl.contentEditable='true';textEl.spellcheck=false;textEl.onblur=()=>updateCap(type,item.id,textEl.innerText);}
    g.appendChild(d);
  });
}
function moveItem(gid,type,id,dir){
  const arr=getArr(type);
  const i=arr.findIndex(x=>x.id===id);
  if(i===-1)return;
  const ni=i+dir;
  if(ni<0||ni>=arr.length)return;
  [arr[i],arr[ni]]=[arr[ni],arr[i]];
  renderInnerGallery(gid,arr,type);
}
function updateCap(type,id,v){const i=getArr(type).find(x=>x.id===id);if(i)i.caption=v;}
function delInner(gid,type,id){if(!editMode)return;const a=getArr(type);const i=a.findIndex(x=>x.id===id);if(i!==-1)a.splice(i,1);renderInnerGallery(gid,a,type);}

// ── ОБ АВТОРЕ ──
function loadAboutPhoto(inp){
  if(!inp.files[0]||!editMode)return;
  var fd=new FormData();
  fd.append('image',inp.files[0]);
  fetch('/api/upload',{method:'POST',body:fd})
    .then(function(r){return r.json();})
    .then(function(d){document.getElementById('about-photo-box').innerHTML='<img src="'+d.url+'" alt="">';})
    .catch(function(){alert('Ошибка загрузки фото');});
}

// ── СОХРАНЕНИЕ НА СЕРВЕР ──
function saveAll(){
  var img=document.querySelector('#about-photo-box img');
  var bio=document.querySelector('.about-bio');
  var g=function(id){var e=document.getElementById(id);return e?e.textContent:null;};
  // Читаем контакты только если на странице контактов, иначе берём из кэша
  var contactsData=null;
  var nickEl=document.getElementById('edit-telegram-nick');
  if(nickEl){
    contactsData=getContactData();
  } else if(_serverData.contacts){
    contactsData=_serverData.contacts;
  }
  var payload={
    hasData:true,
    projects:projects,
    photoAlbums:photoAlbums,
    paintingItems:paintingItems,
    aboutPhoto:img?img.getAttribute("src"):(_serverData.aboutPhoto||null),
    aboutBio:bio?bio.innerHTML:(_serverData.aboutBio||''),
    paintingName:g('painting-name')||_serverData.paintingName||'',
    paintingDesc:g('painting-desc')||_serverData.paintingDesc||'',
    photoPeopleName:g('photo-people-name')||_serverData.photoPeopleName||'',
    photoPeopleDesc:g('photo-people-desc')||_serverData.photoPeopleDesc||'',
    photoSpacesName:g('photo-spaces-name')||_serverData.photoSpacesName||'',
    photoSpacesDesc:g('photo-spaces-desc')||_serverData.photoSpacesDesc||'',
    contacts:contactsData
  };
  fetch('/api/save',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  })
  .then(function(r){return r.json();})
  .then(function(){
    var btn=document.querySelector('.save-bar .admin-btn');
    if(btn){var t=btn.textContent;btn.textContent='✓ Сохранено';setTimeout(function(){btn.textContent=t;},2000);}
  })
  .catch(function(){alert('Ошибка сохранения');});
}

renderPhotoAlbums();

// ── ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ──
(function loadFromServer(){
  fetch('/api/data')
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d||!d.hasData)return;
      _serverData=d;
      if(d.projects&&d.projects.length){projects=d.projects;renderProjects();}
      if(d.photoAlbums&&d.photoAlbums.length){
        photoAlbums=d.photoAlbums;
        photoPeopleItems=photoAlbums[0]?photoAlbums[0].items:[];
        photoSpacesItems=photoAlbums[1]?photoAlbums[1].items:[];
        renderPhotoAlbums();
      }
      if(d.paintingItems&&d.paintingItems.length){
        paintingItems=d.paintingItems;
        renderInnerGallery('painting-gallery',paintingItems,'painting');
      }
      if(d.aboutPhoto){var ab=document.getElementById('about-photo-box');if(ab)ab.innerHTML='<img src="'+d.aboutPhoto+'" alt="">';}
      if(d.aboutBio){var b=document.querySelector('.about-bio');if(b)b.innerHTML=d.aboutBio;}
      var s=function(id,v){var e=document.getElementById(id);if(e&&v)e.textContent=v;};
      s('painting-name',d.paintingName);
      s('painting-desc',d.paintingDesc);
      s('photo-people-name',d.photoPeopleName);
      s('photo-people-desc',d.photoPeopleDesc);
      s('photo-spaces-name',d.photoSpacesName);
      s('photo-spaces-desc',d.photoSpacesDesc);
      if(d.contacts){applyContactData(d.contacts);}
      _showPage();
    })
    .catch(function(e){console.error(e); _showPage();});
})();


// ── ЛАЙТБОКС (просмотр фото с зумом) ──
var lbScale=1, lbPanX=0, lbPanY=0, lbDragging=false, lbStartX=0, lbStartY=0;
var lbTouchDist=0, lbTouchScale=1;
function openLightbox(src){
  var lb=document.getElementById('lightbox');
  var img=document.getElementById('lightbox-img');
  img.src=src;
  lbScale=1; lbPanX=0; lbPanY=0;
  updateLightboxTransform();
  lb.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow='';
  var img=document.getElementById('lightbox-img');
  img.classList.remove('zoomed','dragging');
}
function lightboxZoom(dir, step){
  step=step||0.25;
  lbScale=Math.max(0.5, Math.min(5, lbScale+dir*step));
  if(lbScale<=1){lbPanX=0;lbPanY=0;}
  updateLightboxTransform();
}
function updateLightboxTransform(){
  var img=document.getElementById('lightbox-img');
  img.style.transform='translate('+lbPanX+'px,'+lbPanY+'px) scale('+lbScale+')';
  img.classList.toggle('zoomed',lbScale>1);
  document.getElementById('lightbox-zoom-label').textContent=Math.round(lbScale*100)+'%';
}
// Колёсико мыши для зума (плавный, маленький шаг)
var lbWheelRaf=null;
var lbWheelAccum=0;
document.getElementById('lightbox').addEventListener('wheel',function(e){
  e.preventDefault();
  lbWheelAccum+=e.deltaY<0?1:-1;
  if(!lbWheelRaf){
    lbWheelRaf=requestAnimationFrame(function(){
      var dir=lbWheelAccum>0?1:-1;
      lightboxZoom(dir, 0.1);
      lbWheelAccum=0;
      lbWheelRaf=null;
    });
  }
},{passive:false});
// Перетаскивание мышью
document.getElementById('lightbox-img').addEventListener('mousedown',function(e){
  if(lbScale<=1)return;
  e.preventDefault();
  lbDragging=true; lbStartX=e.clientX-lbPanX; lbStartY=e.clientY-lbPanY;
  this.classList.add('dragging');
});
document.addEventListener('mousemove',function(e){
  if(!lbDragging)return;
  lbPanX=e.clientX-lbStartX; lbPanY=e.clientY-lbStartY;
  updateLightboxTransform();
});
document.addEventListener('mouseup',function(){
  if(lbDragging){lbDragging=false;document.getElementById('lightbox-img').classList.remove('dragging');}
});
// Тач-жесты (pinch-to-zoom + перетаскивание) — с RAF для плавности
var lbTouches={};
var lbRafId=null;
function lbScheduleUpdate(){
  if(!lbRafId){
    lbRafId=requestAnimationFrame(function(){
      updateLightboxTransform();
      lbRafId=null;
    });
  }
}
document.getElementById('lightbox-wrap').addEventListener('touchstart',function(e){
  if(e.touches.length===2){
    e.preventDefault();
    lbDragging=false;
    lbTouchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    lbTouchScale=lbScale;
  } else if(e.touches.length===1&&lbScale>1){
    e.preventDefault();
    lbDragging=true; lbStartX=e.touches[0].clientX-lbPanX; lbStartY=e.touches[0].clientY-lbPanY;
    document.getElementById('lightbox-img').classList.add('dragging');
  }
},{passive:false});
document.getElementById('lightbox-wrap').addEventListener('touchmove',function(e){
  if(e.touches.length===2){
    e.preventDefault();
    var dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    lbScale=Math.max(0.5,Math.min(5,lbTouchScale*(dist/lbTouchDist)));
    if(lbScale<=1){lbPanX=0;lbPanY=0;}
    lbScheduleUpdate();
  } else if(e.touches.length===1&&lbDragging){
    e.preventDefault();
    lbPanX=e.touches[0].clientX-lbStartX; lbPanY=e.touches[0].clientY-lbStartY;
    lbScheduleUpdate();
  }
},{passive:false});
document.getElementById('lightbox-wrap').addEventListener('touchend',function(e){
  if(e.touches.length<2){lbDragging=false;document.getElementById('lightbox-img').classList.remove('dragging');}
});
// Закрытие по клику на оверлей (не на картинку)
document.getElementById('lightbox').addEventListener('click',function(e){
  if(e.target===this||e.target===document.getElementById('lightbox-wrap')){
    if(lbScale>1){lbScale=1;lbPanX=0;lbPanY=0;updateLightboxTransform();}
    else closeLightbox();
  }
});
// Закрытие по Escape
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&document.getElementById('lightbox').classList.contains('open'))closeLightbox();
});
// Двойной клик для зума
document.getElementById('lightbox-img').addEventListener('dblclick',function(){
  if(lbScale>1){lbScale=1;lbPanX=0;lbPanY=0;}else{lbScale=2.5;}
  updateLightboxTransform();
});
// Подключаем клик на все изображения галереи (кроме обложек альбомов/проектов)
document.addEventListener('click',function(e){
  var img=e.target;
  if(img.tagName!=='IMG')return;
  // Обложки альбомов/проектов открывают альбом, а не лайтбокс
  if(img.closest('.project-card-img'))return;
  var parent=img.closest('.inner-item-img,.about-photo');
  if(!parent)return;
  if(editMode)return;
  e.stopPropagation();
  e.preventDefault();
  openLightbox(img.src);
});

// ── РЕДАКТИРОВАНИЕ КОНТАКТОВ ──
function getContactData(){
  return {
    telegram:{nick:document.getElementById('edit-telegram-nick').value,url:document.getElementById('edit-telegram-url').value},
    instagram:{nick:document.getElementById('edit-instagram-nick').value,url:document.getElementById('edit-instagram-url').value},
    vk:{nick:document.getElementById('edit-vk-nick').value,url:document.getElementById('edit-vk-url').value}
  };
}
function applyContactData(contacts){
  if(!contacts)return;
  ['telegram','instagram','vk'].forEach(function(key){
    var c=contacts[key];
    if(!c)return;
    var link=document.getElementById('contact-'+key+'-link');
    var nickInput=document.getElementById('edit-'+key+'-nick');
    var urlInput=document.getElementById('edit-'+key+'-url');
    if(link&&c.nick){link.textContent=c.nick;}
    if(link&&c.url){link.href=c.url;}
    if(nickInput&&c.nick){nickInput.value=c.nick;}
    if(urlInput&&c.url){urlInput.value=c.url;}
  });
}
// Обновляем отображение при изменении полей
document.querySelectorAll('.contact-edit-input').forEach(function(inp){
  inp.addEventListener('input',function(){
    var item=this.closest('.contact-item');
    var key=item.dataset.contact;
    var link=document.getElementById('contact-'+key+'-link');
    var nickInput=document.getElementById('edit-'+key+'-nick');
    var urlInput=document.getElementById('edit-'+key+'-url');
    if(link){link.textContent=nickInput.value;link.href=urlInput.value;}
  });
});

// ── СЕКРЕТНЫЙ ВХОД ──
var secretClickCount=0, secretTimer=null;
function handleSecretClick(){
  secretClickCount++;
  clearTimeout(secretTimer);
  secretTimer=setTimeout(function(){ secretClickCount=0; }, 3000);
  if(secretClickCount>=7){
    secretClickCount=0;
    clearTimeout(secretTimer);
    if(editMode){
      exitEditMode();
    } else {
      document.getElementById('password-input').value='';
      document.getElementById('password-error').classList.remove('show');
      document.getElementById('password-modal').classList.add('open');
      setTimeout(function(){ document.getElementById('password-input').focus(); },120);
    }
  }
}
