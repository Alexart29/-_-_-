"use strict";
const app=document.querySelector("#app"), dialog=document.querySelector("#dialog");
const key="nina-journal-v1", roman=["I","II","III","IV","V"];
function fresh(){return {seen:[],done:[],cells:{},hints:{},last:null,lastRoute:null,zoom:100};}
let state=fresh(),storageError=false;
try{Object.assign(state, JSON.parse(localStorage.getItem(key)) || {});}catch{storageError=true;}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{storageError=true;} showStorage();}
function showStorage(){if(storageError&&!document.querySelector(".storageError"))document.querySelector("header").insertAdjacentHTML("afterend",'<p class="storageError" role="status">Браузер не разрешил сохранение. Можно продолжать играть до закрытия страницы.</p>');}
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;").replaceAll(">","&gt;");
const button=(label,action,cls="")=>'<button class="'+cls+'" data-action="'+action+'">'+label+'</button>';
const photo=(id,caption)=>'<figure class="photo"><button class="photoZoom" data-action="photo:'+id+'" aria-label="Рассмотреть фотографию: '+esc(caption)+'"><img src="'+id+'.jpg" alt="'+esc(caption)+'"></button><figcaption>'+esc(caption)+'</figcaption></figure>';
const chapterOf=id=>CHAPTER_PUZZLES.findIndex(items=>items.includes(id));
const allDone=()=>GRIDS.every((_,i)=>state.done.includes(i));
const fold=c=>(c||"").toUpperCase().replaceAll("Ё","Е");
const dir=w=>w.direction==="across"?"По горизонтали":"По вертикали";
const paths=GRIDS.map(words=>words.map(w=>Array.from(w.answer,(_,i)=>[w.x+(w.direction==="across"?i:0),w.y+(w.direction==="down"?i:0)].join(","))));
let review=[];
let id=0,word=0,position=0,screen="cover";
function cover(){bookCover();}
function toc(){bookToc();}
function chapter(c){
 if(!state.seen.includes(c)){state.seen.push(c);save();}
 const cards=CHAPTER_PUZZLES[c].map((n,i)=>'<div>'+button('<span class="chapterNo">'+(i+1)+'</span><span>'+LEAVES[n][0]+'</span><small>'+(state.done.includes(n)?"Разгадан":"6 слов")+' →</small>',"play:"+n,"chapterRow")+button("Лист воспоминаний →","memory:"+n,"textButton")+'</div>').join("");
 bookChapter(c,cards);
}
function play(n){
 id=n;review=[];word=0;position=0;state.last=n;
 if(!state.seen.includes(chapterOf(n)))state.seen.push(chapterOf(n));
 state.cells[n]??={};state.hints[n]??=[];save();
 const words=GRIDS[n], starts=new Map(), coords=new Set(paths[n].flat());
 words.forEach(w=>starts.set([w.x,w.y].join(","),w.number));
 const cells=[...coords].map(k=>{const [x,y]=k.split(",").map(Number);return '<label class="cell" style="--x:'+(x+1)+';--y:'+(y+1)+'">'+(starts.has(k)?'<small>'+starts.get(k)+'</small>':'')+'<input data-cell="'+k+'" aria-label="Строка '+(y+1)+', столбец '+(x+1)+'" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>';}).join("");
 const groups=["across","down"].map(d=>'<h3>'+dir({direction:d})+'</h3>'+words.map((w,i)=>w.direction===d?button('<b>'+w.number+'.</b><span>'+esc(w.clue)+'</span><span class="verdict"></span>',"word:"+i,"question"):"").join("")).join("");
 bookPuzzle(n,cells,groups);
 refresh();
}
const cellAt=k=>app.querySelector('[data-cell="'+k+'"]');
const currentPath=()=>paths[id][word];
function correct(w){return paths[id][w].every((k,i)=>fold(state.cells[id][k])===fold(GRIDS[id][w].answer[i]));}
function refresh(focus=false){
 const path=currentPath(),current=path[position],w=GRIDS[id][word];
 const board=app.querySelector(".spread > .left .board");
 board.querySelectorAll("[data-cell]").forEach(input=>{
  const k=input.dataset.cell;
  input.value=state.cells[id][k]||"";
  input.tabIndex=k===current?0:-1;
  const statuses=paths[id].map((cells,i)=>cells.includes(k)?review[i]:null);
  const selected=path.includes(k);
  let tone="";
  if(selected && review[word]) tone=review[word];
  else if(statuses.includes("right") && statuses.includes("wrong")) tone="mixed";
  else tone=statuses.find(Boolean)||"";
  input.parentElement.className=["cell",selected?"selected":"",tone?"checked-"+tone:"",k===current?"active":""].join(" ");
 });
 app.querySelectorAll(".spread > .right .question").forEach(b=>{
  const i=Number(b.dataset.action.split(":")[1]);
  b.classList.toggle("current",i===word);
  const mark=b.querySelector(".verdict");
  mark.className="verdict "+(review[i]||"");
  mark.textContent=review[i]==="right"?"✓":review[i]==="wrong"?"×":"";
  mark.setAttribute("aria-label",review[i]==="right"?"Верно":review[i]==="wrong"?"Нужно исправить":"");
 });
 app.querySelector(".selectedClue").textContent=w.number+". "+dir(w)+". "+w.clue;
 if(focus){const input=cellAt(current);input.focus({preventScroll:true});input.select();}
}
function choose(k,toggle=false,preferred=null){
 const opts=paths[id].map((p,i)=>p.includes(k)?i:-1).filter(i=>i!==-1);
 if(!opts.length)return;
 if(preferred){word=opts.find(i=>GRIDS[id][i].direction===preferred)??opts[0];}
 else if(toggle&&opts.length===2&&currentPath()[position]===k){word=opts.find(i=>i!==word)??word;}
 else if(!opts.includes(word)){word=opts[0];}
 position=currentPath().indexOf(k);refresh(true);
}
function setLetter(k,letter) {
 if((state.cells[id][k]||"")===letter)return;
 if(letter)state.cells[id][k]=letter;
 else delete state.cells[id][k];
 paths[id].forEach((cells,i)=>{if(cells.includes(k))review[i]=null;});
 app.querySelector(".afterCheck").replaceChildren();
 app.querySelector(".status").textContent="";
}
function checkWords(){
 review=paths[id].map((cells,i)=>{
   if(!cells.every(k=>state.cells[id][k]))return null;
   return correct(i)?"right":"wrong";
 });
 refresh();
 const right=review.filter(v=>v==="right").length;
 const wrong=review.filter(v=>v==="wrong").length;
 const status=app.querySelector(".status");
 if(right===review.length){
   if(!state.done.includes(id))state.done.push(id);
   save();
   status.textContent="Всё верно! Кроссворд разгадан.";
   app.querySelector(".afterCheck").innerHTML=button("Перейти к воспоминанию →","memory:"+id,"inkButton");
 }else{
   status.textContent=right||wrong?"Верно: "+right+". Исправить: "+wrong+". Осталось заполнить: "+(review.length-right-wrong)+".":"Пока нет заполненных слов. Можно продолжить в своём темпе.";
 }
}
function writeLetters(raw){
 const letters=raw.toUpperCase().match(/[А-ЯЁ]/g)||[];
 for(const c of letters){setLetter(currentPath()[position],c);if(position===currentPath().length-1)break;position++;}
 save();refresh(true);
}
function memory(n){
 id=n;const l=LEAVES[n],c=chapterOf(n);
 const following=CHAPTER_PUZZLES[c][CHAPTER_PUZZLES[c].indexOf(n)+1];
 const next=following!==undefined?button("Следующий кроссворд →","play:"+following,"primary"):allDone()?button("История продолжается… →","final","primary"):button("Вернуться к содержанию","toc","primary");
 bookMemory(n,next);
}
function album(c){bookAlbum(c);}
function finalPage(){bookLetter();}
function modal(html){document.querySelector("#dialogbody").innerHTML=html;dialog.showModal();}
function action(a){
 const [kind,arg]=a.split(":"),n=Number(arg);
 switch(kind){
 case "cover":return cover(); case "toc":return toc(); case "chapter":return chapter(n);
 case "play":return play(n); case "resume":return action(edition.includes(state.lastRoute)&&available(state.lastRoute)?state.lastRoute:"play:"+(state.last??0)); case "final":return finalPage();
 case "story":return bookStory(n); case "late":return bookLate(n);
 case "memory":return memory(n); case "album":return album(n);
 case "collage":return showCollagePhoto(n);
 case "photo":dialog.classList.add("photoDialog");return modal('<figure class="photo"><img src="'+esc(arg)+'.jpg" alt="'+esc(ARCHIVE_CAPTIONS[arg]||'Из семейного архива')+'"><figcaption>'+esc(ARCHIVE_CAPTIONS[arg]||'Из семейного архива')+'</figcaption></figure>'+(arg==='30'?button('Рассмотреть снимки по одному','collage:0'):''));
 case "reset":return modal('<h2>Начать заново?</h2><p>Заполненные клетки, подсказки и закладки будут удалены. Журнал можно будет пройти ещё раз.</p>'+button("Да, начать заново","confirmReset","primary"));
 case "confirmReset":state=fresh();save();size();dialog.close();return cover();
 case "word":word=n;position=0;return refresh(true);
 case "check":return checkWords();
 case "letter":case "answer":{
   const path=currentPath(),answer=GRIDS[id][word].answer;
   const missing=path.map((k,i)=>fold(state.cells[id][k])!==fold(answer[i])?i:-1).filter(i=>i>=0);
   const indices=kind==="letter"?missing.slice(0,1):missing;
   if(indices.length){for(const i of indices)setLetter(path[i],answer[i]);state.hints[id].push({type:kind,word,cells:indices.map(i=>path[i])});save();}
   app.querySelector(".status").textContent=indices.length?(kind==="letter"?"Буква открыта.":"Ответ открыт."):"Слово уже разгадано.";return refresh(true);
 }}
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(b)action(b.dataset.action);});
app.addEventListener("click",e=>{if(e.target.matches("[data-cell]"))choose(e.target.dataset.cell,true);});
app.addEventListener("input",e=>{if(e.target.matches("[data-cell]"))writeLetters(e.target.value);});
app.addEventListener("paste",e=>{if(e.target.matches("[data-cell]")){e.preventDefault();writeLetters(e.clipboardData.getData("text"));}});
app.addEventListener("keydown",e=>{
 if(!e.target.matches("[data-cell]")||e.ctrlKey||e.metaKey||e.altKey)return;
 const k=currentPath()[position];
 if(/^[А-ЯЁ]$/i.test(e.key)){e.preventDefault();return writeLetters(e.key);}
 if(e.key==="Backspace"||e.key==="Delete"){e.preventDefault();if(e.key==="Backspace"&&!state.cells[id][k]&&position>0)position--;setLetter(currentPath()[position],"");save();return refresh(true);}
 if(e.key===" "||e.key==="Enter"){e.preventDefault();return choose(k,true);}
 const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(delta){e.preventDefault();const [x,y]=k.split(",").map(Number);choose([x+delta[0],y+delta[1]].join(","),false,delta[0]?"across":"down");}
});
document.querySelector("#help").onclick=()=>modal('<h2>Как играть</h2><p>Выбери любую главу и кроссворд. Щёлкни по вопросу или клетке и печатай по-русски. В каждую клетку вписывается одна буква, без пробелов и дефисов. Вместо Ё можно писать Е.</p><p>Стрелки передвигают курсор, Backspace стирает букву. Повторный щелчок по пересечению или пробел меняет направление.</p><p>Можно открыть одну букву или целый ответ. Когда всё готово, нажми «Проверить кроссворд», чтобы увидеть отметки у вопросов. Зелёная галочка означает верный ответ, розовый крестик — слово для исправления. Листы воспоминаний можно читать в любой момент.</p><p>Журнал сохраняет закладку в этом браузере. Кнопка «А+» увеличивает буквы и клетки. Кнопки «Назад», «Далее» и «Содержание» всегда внизу экрана. Список «К главе» позволяет перейти в любую главу. Закладка запоминает и страницы воспоминаний. Вне полей ввода стрелки влево и вправо перелистывают журнал.</p>');
document.querySelector("#close").onclick=()=>dialog.close();
function size(){document.documentElement.style.fontSize=(18*state.zoom/100)+"px";document.querySelector("#larger").disabled=state.zoom>=150;document.querySelector("#smaller").disabled=state.zoom<=100;}
for(const [selector,delta] of [["#larger",25],["#smaller",-25]])document.querySelector(selector).onclick=()=>{state.zoom=Math.max(100,Math.min(150,state.zoom+delta));size();save();};
size();cover();showStorage();

document.addEventListener("change",e=>{if(e.target.id==="chapterJump"&&e.target.value!=="")action("chapter:"+e.target.value);});

dialog.addEventListener("close",()=>dialog.classList.remove("photoDialog"));

function showCollagePhoto(index){
 const i=Math.max(0,Math.min(9,index));
 dialog.classList.add('photoDialog');
 modal('<figure class="photo"><img src="collage-'+String(i+1).padStart(2,'0')+'.png" alt="Из семейного архива"><figcaption>Из семейного архива</figcaption></figure><div class="collageControls">'+
 '<button data-action="collage:'+Math.max(0,i-1)+'" '+(i===0?'disabled':'')+'>Предыдущий снимок</button>'+button('Весь коллаж','photo:30')+
 '<button data-action="collage:'+Math.min(9,i+1)+'" '+(i===9?'disabled':'')+'>Следующий снимок</button></div>');
}
