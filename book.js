// The printed folios stay fixed even when the reader skips an unopened album leaf.
const chapterNotes = [
  "Сибирская зима и детские радости.",
  "Московский дворик, пионерлагерь и техникум.",
  "Первая встреча, письма и свадьба.",
  "Миша и Дима, семейные истории и работа.",
  "Походы, дача и вечера за общим столом."
];
let currentRoute = null;
function printedOrder() {
  const routes = ["cover", "toc"];
  for (let c=0; c<CHAPTERS.length; c++) {
    routes.push("chapter:"+c);
    for(const n of CHAPTER_PUZZLES[c])routes.push("play:"+n,"memory:"+n);
    routes.push("story:"+c,"album:"+c);
    if(c===4)routes.push("late:0","late:1");
  }
  return [...routes, "final"];
}
const edition = printedOrder();
function available(route) {
  return true; // The closing photo album is available before solving; only the letter is gated.
}
function neighbour(route, delta) {
  const pages=edition.filter(available);
  return pages[pages.indexOf(route)+delta];
}
function firstFolio(route) { return edition.indexOf(route)*2; }
function turnOverlay(old, name, forward, oldBounds) {
  if (!old || matchMedia("(prefers-reduced-motion: reduce), (max-width: 760px)").matches) return;
  const opening=old.classList.contains("cover");
  const side=opening ? old : old.querySelector(forward?".leaf.right":".leaf.left");
  if (!side || name==="cover") return;
  const sheet=document.createElement("div");
  sheet.className="turnSheet "+(forward?"forward":"backward")+(opening?" opening":"");
  sheet.setAttribute("aria-hidden","true");
  sheet.inert=true;
  // Move the old printed side; the new interactive cells are already on the desk.
  const front=document.createElement("div");
  front.className="sheetFront";
  front.append(side);
  const back=document.createElement("div");
  back.className="sheetBack";
  // Mirror the destination paper on the reverse face; controls remain on the live spread.
  const spread=app.querySelector(".spread");
  const destination=spread.querySelector(forward?".left":".right").cloneNode(true);
  for(const el of destination.querySelectorAll("input")){
    const printed=document.createElement("span");
    printed.className="printedLetter";
    printed.textContent=el.value;
    el.replaceWith(printed);
  }
  back.append(destination);
  sheet.append(front,back);
  if(opening){
    const bounds=spread.getBoundingClientRect();
    sheet.style.setProperty("--shift",(oldBounds.left-bounds.left-bounds.width/2)+"px");
    sheet.style.setProperty("--scaleX",String(oldBounds.width/(bounds.width/2)));
    sheet.style.setProperty("--scaleY",String(oldBounds.height/bounds.height));
  }
  app.querySelector(".spread").append(sheet);
  sheet.addEventListener("animationend",e=>{if(e.target===sheet)sheet.remove();});
}
function present(route,content) {
  const old=app.querySelector(".spread,.cover");
  const oldBounds=old?.getBoundingClientRect();
  const forward=edition.indexOf(route)>=edition.indexOf(currentRoute);
  currentRoute=route;
  screen=route.split(":")[0];
  if(!["cover","toc"].includes(route)){state.lastRoute=route;save();}
  app.innerHTML=content;
  if(old)turnOverlay(old,screen,forward,oldBounds);
  const title=app.querySelector("h1");
  if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
  window.scrollTo(0,0);
}
function side(label,body,num,right) {
  return '<article class="leaf '+(right?'right':'left')+'"><div class="running"><span>'+label+'</span><span>№ 1</span></div><div class="leafBody">'+body+'</div><div class="leafFoot"><span>'+num+'</span><i></i><span>Семейный архив</span></div></article>';
}
function spread(route,section,left,right,rightLabel="Страницы моей жизни") {
  const number=firstFolio(route);
  const prev=neighbour(route,-1), next=neighbour(route,1);
  const kind=route.split(":")[0], value=Number(route.split(":")[1]);
  const c=["play","memory"].includes(kind)?chapterOf(value):["chapter","story","album"].includes(kind)?value:kind==="late"?4:null;
  const marker=(c!==null?"Глава "+roman[c]+" · ":"")+(kind==="play"?"Кроссворд "+(CHAPTER_PUZZLES[c].indexOf(value)+1)+" из "+CHAPTER_PUZZLES[c].length+" · ":"")+"Страницы "+number+"–"+(number+1);
  const nav='<nav class="turnNav" aria-label="Навигация по журналу"><div class="navLocation">'+marker+'</div><div class="navButtons">'+
    (prev?button("Назад",prev):'<button disabled>Назад</button>')+button("Содержание","toc")+
    (next?button("Далее",next):'<button disabled>Далее</button>')+'</div><label class="jumpLabel">К главе <select id="chapterJump"><option value="">Выбрать главу</option>'+CHAPTERS.map((name,i)=>'<option value="'+i+'"'+(i===c?' selected':'')+'>'+roman[i]+'. '+esc(name)+'</option>').join("")+'</select></label></nav>';
  present(route,'<section class="spread">'+side(section,left,number,false)+side(rightLabel,right,number+1,true)+'</section>'+nav);

}
function bookCover() {
  present("cover",'<section class="cover"><div class="issue"><span>Семейный архив</span><span>Специальный выпуск</span><b>№ 1</b></div>'+
    '<h1>Страницы<br><em>моей жизни</em></h1><p class="subtitle">Мемуары Нины Михайловой</p>'+
    '<div class="coverStory">'+photo("06","Нина в юности")+'<aside><div class="aster" aria-hidden="true">✳</div><h2>Пять глав<br>одной жизни</h2><p>Детство, любовь, семья и путешествия</p><div class="shortRule"></div><p><strong>11</strong> кроссвордов по семейным воспоминаниям</p></aside></div>'+
    '<div class="coverBase"><span>Фотографии из семейного архива</span>'+button("Открыть журнал →","toc","openIssue")+'</div>'+
    ((state.lastRoute||state.last!==null)?button("Продолжить с закладки →","resume","bookmark"):"")+'</section>');
}
function quotation(entry) {
  return '<blockquote>«'+esc(entry.text)+'»</blockquote><cite>Нина Михайловна · Мемуары, с. '+entry.page+'</cite>';
}
function portraits(entry) {
  if(!entry.photos.length)return "";
  return '<div class="portraits count'+entry.photos.length+'">'+entry.photos.map(id=>photo(id,ARCHIVE_CAPTIONS[id])).join("")+'</div>';
}
function bookToc() {
  const rows=CHAPTERS.map((name,c)=>button('<i>'+roman[c]+'</i><span>'+name+'<small>'+chapterNotes[c]+'</small></span><b>'+firstFolio("chapter:"+c)+'</b>',"chapter:"+c,"tocRow")).join("");
  const left='<h1>Содержание</h1>'+rows+'<p class="small">Разгадано кроссвордов: '+state.done.length+' из '+GRIDS.length+'.</p>';
  const right='<h2>От автора</h2>'+portraits(ARCHIVE.editor)+quotation(ARCHIVE.editor)+'<div class="actions">'+((state.lastRoute||state.last!==null)?button("Продолжить с закладки","resume","inkButton"):"")+(allDone()?button("Письмо Иры","final"):"")+button("Заключительный фотоальбом","final","textButton")+button("Начать заново","reset","textButton")+'</div>';
  spread("toc","Содержание выпуска",left,right,"Семейный альбом");
}
function bookChapter(c,cards) {
 const entry=ARCHIVE["chapter"+c];
 spread("chapter:"+c,"Глава "+roman[c],'<span class="bigRoman">'+roman[c]+'</span><h1>'+CHAPTERS[c]+'</h1>'+quotation(entry)+portraits(entry),
  '<h2>Кроссворды главы</h2>'+cards+button('Ещё семейные истории','story:'+c,'textButton')+(c===4?button('Поздние годы и правнук','late:0','textButton')+button('Заключительный фотоальбом','final','textButton'):'')+(available("album:"+c)?button("Разворот воспоминаний →","album:"+c,"textButton"):""));
}
function bookPuzzle(n,cells,groups) {
 const c=chapterOf(n);
 const entry=ARCHIVE["puzzle"+n];
 const left='<p class="rubric">'+CHAPTERS[c]+'</p><h1>'+LEAVES[n][0]+'</h1><p class="playHelp">Нажми на вопрос или клетку и печатай по-русски.</p><div class="boardScroll" tabindex="0" aria-label="Сетка кроссворда; при увеличении можно прокрутить по горизонтали"><div class="board">'+cells+'</div></div><div class="selectedClue"></div><aside class="archiveInset">'+portraits(entry)+'<div>'+quotation(entry)+'</div></aside>';
 const right='<div class="clues">'+groups+'</div><div class="actions">'+button("Открыть букву","letter")+button("Показать ответ","answer")+'</div>'+button("Проверить кроссворд","check","inkButton")+'<p class="status" role="status"></p><div class="afterCheck"></div>';
 spread("play:"+n,"Глава "+roman[c]+" · Кроссворд "+(CHAPTER_PUZZLES[c].indexOf(n)+1)+" из "+CHAPTER_PUZZLES[c].length,left,right,"Вопросы к кроссворду");
}
function bookMemory(n,next) {
 const c=chapterOf(n), l=LEAVES[n],entry=ARCHIVE["memory"+n];
 spread("memory:"+n,"Глава "+roman[c]+" · Воспоминания",'<p class="rubric">'+(state.done.includes(n)?"Кроссворд разгадан":"Лист воспоминаний")+'</p><h1>'+l[1]+'</h1><div class="orn">✳</div>'+(entry.photos.length?quotation(entry):'')+'<div class="actions">'+next+'</div>'+button("К главе","chapter:"+c,"textButton")+(available("album:"+c)?button("Разворот воспоминаний →","album:"+c,"textButton"):"")+(allDone()?button("Письмо Иры","final","textButton"):""),(entry.photos.length?portraits(entry):quotation(entry)),entry.photos.length?"Фотографии из архива":"Из мемуаров");
}
function bookAlbum(c) {
 const leaf=n=>{const entry=ARCHIVE["album"+n];return '<h2>'+esc(entry.title)+'</h2>'+portraits(entry)+quotation(entry);};
 spread("album:"+c,"Альбом · Глава "+roman[c],'<h1>'+CHAPTERS[c]+'</h1>'+leaf(2*c),leaf(2*c+1));
}
function bookLetter() {
 if(!allDone())return spread("final","Дорогие сердцу воспоминания",'<h1>Листая годы</h1><div class="closingWords">'+quotation(ARCHIVE.closing)+'</div>'+button('Вернуться к журналу','toc'),photo("30",ARCHIVE_CAPTIONS["30"]),"Семейный альбом");
 spread("final","Письмо от Иры",'<h1>История продолжается…</h1><div class="orn">✳</div><div class="letter">'+LETTER.map(t=>'<p>'+esc(t)+'</p>').join("")+'</div><div class="closingWords completed">'+quotation(ARCHIVE.closing)+'</div><div class="actions">'+button("Вернуться к журналу","toc")+button("Пройти кроссворды ещё раз","reset")+'</div>',photo("30",ARCHIVE_CAPTIONS["30"]),"Семейный альбом");
}
document.addEventListener("keydown",e=>{
 if(dialog.open||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.closest("input,textarea,select,button,[contenteditable=true]")) return;
 const delta={ArrowLeft:-1,ArrowRight:1}[e.key];
 if(delta){const target=neighbour(currentRoute,delta);if(target){e.preventDefault();action(target);}}
});

function archiveLeaf(entry){return '<h2>'+esc(entry.title)+'</h2>'+portraits(entry)+quotation(entry);}
function bookStory(c){
 const a=ARCHIVE['story'+c+'a'],b=ARCHIVE['story'+c+'b'];
 const familyLeaf=entry=>'<div class="familyPhotoPage">'+archiveLeaf(entry)+'</div>';
 if(c===3)return spread('story:'+c,'Глава IV · Семейные истории',familyLeaf(ARCHIVE.story3photos),'<div class="familyTextPage">'+archiveLeaf(a)+archiveLeaf(b)+'</div>');
 spread('story:'+c,'Глава '+roman[c]+' · Семейные истории',familyLeaf(a)+(c===4?quotation(ARCHIVE.sashaDate):''),familyLeaf(b));
}
function bookLate(n){
 spread('late:'+n,'Глава V · История продолжается','<h1>'+(n===0?'Семья рядом':'Новые поколения')+'</h1>'+archiveLeaf(ARCHIVE['late'+(n*2)]),archiveLeaf(ARCHIVE['late'+(n*2+1)]));
}
