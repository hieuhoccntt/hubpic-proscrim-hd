'use strict';
const $=id=>document.getElementById(id);
const themes=[
 {id:1,name:'Vàng lửa',accent:'#ffc44f',dark:'#402410',layout:'wide'},
 {id:2,name:'Lục chiến',accent:'#b5ed62',dark:'#103b26',layout:'portrait'},
 {id:3,name:'Đỏ chiến đấu',accent:'#ffb629',dark:'#68160f',layout:'wide'},
 {id:4,name:'Băng ngọc',accent:'#61f9e1',dark:'#06484b',layout:'portrait'},
 {id:5,name:'Đen hoàng kim',accent:'#f5d464',dark:'#24231c',layout:'wide'},
 {id:6,name:'Tactical',accent:'#f2db58',dark:'#34342c',layout:'portrait'},
 {id:7,name:'Match MVP',accent:'#ffc632',dark:'#783208',layout:'mvp'},
 {id:8,name:'Cam bùng nổ',accent:'#ffb448',dark:'#874116',layout:'portrait'},
 {id:9,name:'Hồng ngọc',accent:'#ff6262',dark:'#4b0c16',layout:'portrait'},
 {id:10,name:'Lam ánh sáng',accent:'#73c7ff',dark:'#102b6b',layout:'portrait'}
];
const initial={mode:'original',nativeMatte:false,portraitBlendVersion:2,nativeEdits:{},template:3,player:'',game:'',team:'',birth:'',uid:'',tournament:'',position:'Rusher',headline:'PLAYER PROFILE',accent:'#ffb629',zoom:100,photoX:0,photoY:0,photo:'',logo:'',characters:['Alok','Kelly','Hayato','Moco'],weapons:['SCAR','AWM'],pet:'Rồng Dreki',showCharacters:true,showWeapons:true,showPet:false,resolution:1};
let state=structuredClone(initial),renderToken=0,pickerTarget=null,db=null,toastTimer;
const cache=new Map();
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
function loadImage(src){if(!src)return Promise.resolve(null);if(cache.has(src))return cache.get(src);const p=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Không đọc được ảnh'));im.src=src});cache.set(src,p);return p;}

const portraitBoundsCache=new WeakMap();
function portraitBounds(im){
 if(portraitBoundsCache.has(im))return portraitBoundsCache.get(im);
 const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
 const data=ctx.getImageData(0,0,c.width,c.height).data;let left=c.width,top=c.height,right=-1,bottom=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 const box=right<0?[0,0,c.width,c.height]:[left,top,right-left+1,bottom-top+1];portraitBoundsCache.set(im,box);return box;
}
function drawPortrait(c,im,x,y,w,h,s){
 const [sx,sy,sw,sh]=portraitBounds(im);const z=Math.min(w/sw,h/sh)*Number(s.zoom)/100;
 c.drawImage(im,sx,sy,sw,sh,x+(w-sw*z)/2+Number(s.photoX),y+h-sh*z+Number(s.photoY),sw*z,sh*z);
}
function centerPortrait(){state.zoom=100;state.photoX=0;state.photoY=0;state.nativeMatte=false;sync()}

function asset(kind,name){return CATALOG[kind].find(a=>a.name===name)}
async function resources(s){const t=CATALOG.templates.find(t=>+t.code===s.template);const main=asset('characters','Tatsuya')||CATALOG.characters[0];return {bg:await loadImage(t?.local),cleanBg:await loadImage(s.photo?t?.clean:null),photo:await loadImage(s.photo||main.local),logo:await loadImage(s.logo),chars:await Promise.all(s.characters.map(n=>loadImage(asset('characters',n)?.local))),weapons:await Promise.all(s.weapons.map(n=>loadImage(asset('weapons',n)?.local))),pet:await loadImage(asset('pets',s.pet)?.local)};}
function paint(canvas,s,r,scale=1){
 if(s.mode==='original')return paintOriginal(canvas,s,r,scale);
 const theme=themes[s.template-1],portrait=theme.layout==='portrait',W=portrait?1080:1600,H=portrait?1350:900;
 canvas.width=W*scale;canvas.height=H*scale;const c=canvas.getContext('2d');c.scale(scale,scale);const A=s.accent,D=theme.dark;
 function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}
 function line(x,y,x2,y2,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()}
 function text(str,x,y,size=28,color='#fff',max=600,weight=700,align='left'){str=String(str||'');c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;let fs=size;do{c.font=`${weight} ${fs}px "Segoe UI",Arial,sans-serif`;if(c.measureText(str).width<=max||fs<=12)break;fs-=1}while(true);c.fillText(str,x,y);c.textAlign='left';}
 function box(x,y,w,h,fill='#0b101bea',stroke=A){c.beginPath();c.moveTo(x+14,y);c.lineTo(x+w,y);c.lineTo(x+w,y+h-14);c.lineTo(x+w-14,y+h);c.lineTo(x,y+h);c.lineTo(x,y+14);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke()}}
 function image(im,x,y,w,h,cover=false){if(!im)return;const ratio=cover?Math.max(w/im.width,h/im.height):Math.min(w/im.width,h/im.height);const iw=im.width*ratio,ih=im.height*ratio;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih);c.restore()}
 function portraitImage(x,y,w,h){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();if(r.photo)drawPortrait(c,r.photo,x,y,w,h,s);c.restore();if(!s.photo)text('ẢNH MINH HỌA',x+18,y+22,14,'#d6dce4',w-36,500)}
 function info(x,y,w,rows,rowH=65){rows.filter(a=>a[1]).forEach(([label,value],i)=>{let yy=y+i*rowH;rect(x,yy,w,rowH-7,'#080c16dd');rect(x,yy,3,rowH-7,A);text(label,x+16,yy+18,13,A,w-32,600);text(value,x+16,yy+40,25,'#fff',w-32)})}
 function characters(x,y,w,h){if(!s.showCharacters)return;text('COMBO KỸ NĂNG',x,y-18,17,A,w);let gap=12,cw=(w-gap*3)/4;s.characters.forEach((n,i)=>{box(x+i*(cw+gap),y,cw,h,'#0b111de8',A+'80');image(r.chars[i],x+i*(cw+gap)+4,y+4,cw-8,h-30);rect(x+i*(cw+gap)+1,y+h-29,cw-2,28,'#080c12ee');text(n||'—',x+i*(cw+gap)+cw/2,y+h-14,17,'#fff',cw-10,600,'center')})}
 function weapons(x,y,w,h){if(!s.showWeapons)return;const gap=12,ww=(w-gap)/2;s.weapons.forEach((n,i)=>{box(x+i*(ww+gap),y,ww,h,'#0b111de8',A+'70');image(r.weapons[i],x+i*(ww+gap)+14,y+8,ww-28,h-33);text(n||'—',x+i*(ww+gap)+ww/2,y+h-16,18,A,ww-20,700,'center')})}
 const gradient=c.createLinearGradient(0,0,W,H);gradient.addColorStop(0,'#090d17');gradient.addColorStop(.52,D);gradient.addColorStop(1,'#080c12');rect(0,0,W,H,gradient);
 if(r.bg){c.save();c.filter='blur(36px)';c.globalAlpha=.18;image(r.bg,-50,-50,W+100,H+100,true);c.restore();rect(0,0,W,H,'#05080e55')}
 c.save();c.globalAlpha=.1;for(let i=-H;i<W;i+=100)line(i,0,i+H,H,A,1);c.restore();
 rect(0,0,12,H,A);rect(W-12,0,12,H,A);rect(35,30,75,5,A);rect(W-110,H-35,75,5,A);
 c.save();c.globalAlpha=.06;text(String(s.template).padStart(2,'0'),W-60,H*.57,portrait?620:580,A,W,900,'right');c.restore();
 text('FREE FIRE',55,63,22,'#fff',240,800);text(s.team||'ESPORTS / PLAYER CARD',W-55,63,17,A,portrait?410:700,700,'right');
 if(r.logo){box(W-120,90,65,65,'#101723cc',A+'55');image(r.logo,W-113,97,51,51)}
 const display=(s.game||'YOUR NAME').toUpperCase();
 if(!portrait){
  text(s.headline,65,135,63,'#fff',1400,900);line(65,183,W-65,183,A+'55');
  if(theme.layout==='mvp'){
   info(65,225,335,[['HỌ VÀ TÊN',s.player||'TÊN NGƯỜI CHƠI'],['NGÀY SINH',s.birth||'—'],['UID',s.uid||'—'],['ĐỘI TUYỂN',s.team||'—'],['VỊ TRÍ',s.position]],91);
   portraitImage(430,220,520,530);box(430,727,520,65,A,null);text(display,690,760,38,'#0b0c10',485,900,'center');
   weapons(985,225,550,135);characters(985,417,550,210);text(s.position.toUpperCase(),985,707,42,A,550,900);
   if(s.showPet&&r.pet){image(r.pet,1000,645,95,125);text(s.pet,1107,755,20,'#fff',350)}
  }else{
   portraitImage(65,218,520,493);box(65,686,520,93,A,null);text(display,325,722,40,'#090d16',480,900,'center');text(s.position.toUpperCase(),325,758,18,'#272d32',480,700,'center');
   const rows=[['HỌ VÀ TÊN',s.player||'TÊN NGƯỜI CHƠI'],['NGÀY SINH',s.birth||'—'],['ĐỘI TUYỂN',s.team||'—']];
   info(630,218,570,rows,65);info(1220,218,315,[['VỊ TRÍ',s.position],['UID',s.uid||'—']],65);
   weapons(630,439,905,118);characters(630,606,905,173);
   if(s.showPet&&r.pet){image(r.pet,1275,351,95,82);text(s.pet,1380,411,15,'#fff',140)}
  }
  line(65,825,1535,825,A+'65');text(s.tournament||'FREE FIRE • PLAYER PROFILE',65,859,20,'#e0e4eb',1320,600);text(String(s.template).padStart(2,'0'),1535,856,23,A,70,800,'right');
 }else{
  text(s.headline,55,139,64,'#fff',970,900);line(55,194,1025,194,A+'66');
  if([2,4,6].includes(s.template)){
   const right=s.template!==4;const px=right?480:55,ix=right?55:625;
   portraitImage(px,228,545,610);info(ix,228,400,[['HỌ VÀ TÊN',s.player||'TÊN NGƯỜI CHƠI'],['NGÀY SINH',s.birth||'—'],['ĐỘI TUYỂN',s.team||'—'],['VỊ TRÍ',s.position],['UID',s.uid||'—']],90);
   if(s.showPet&&r.pet){image(r.pet,ix+5,694,135,130);text(s.pet,ix+152,792,24,'#fff',240)}
  }else{
   portraitImage(272,226,536,595);info(55,235,197,[['NGÀY SINH',s.birth||'—'],['VỊ TRÍ',s.position]],90);info(827,235,197,[['UID',s.uid||'—'],['ĐỘI',s.team||'—']],90);
   if(s.showPet&&r.pet){image(r.pet,833,564,176,180);text(s.pet,920,770,22,'#fff',190,600,'center')}
   text(s.player||'TÊN NGƯỜI CHƠI',540,797,25,'#fff',500,700,'center');
  }
  box(55,852,970,100,A,null);text(display,540,898,60,'#090d16',916,900,'center');
  characters(55,996,970,152);weapons(55,1170,970,92);
  text(s.tournament||'FREE FIRE • PLAYER PROFILE',55,1310,21,'#fff',870,700);text(String(s.template).padStart(2,'0'),1025,1310,23,A,70,800,'right');
 }
}
async function render(){const token=++renderToken,s=structuredClone(state);try{const r=await resources(s);if(token!==renderToken)return;paint($('preview'),s,r);const t=themes[s.template-1];$('template-name').textContent=String(t.id).padStart(2,'0')+' / '+t.name;$('dimensions').textContent=($('preview').width*s.resolution)+' × '+($('preview').height*s.resolution)+' px';$('zoom-value').textContent=s.zoom+'%';}catch(e){toast('Không tải được ảnh. Hãy mở lại web hoặc chọn ảnh khác.');console.error(e)}}
function sync(){for(const key of ['player','game','team','birth','uid','tournament','position','headline','accent','zoom','photoX','photoY','resolution'])$(key).value=state[key];for(const key of ['showCharacters','showWeapons','showPet'])$(key).checked=state[key];document.querySelectorAll('.template-card').forEach(b=>{let active=Number(b.dataset.id)===state.template&&b.dataset.mode===state.mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});controls();syncOriginalUI();render()}
function controls(){
 function choices(container,kind,values){const parent=$(container);parent.replaceChildren();values.forEach((name,i)=>{let b=document.createElement('button');b.className='asset-choice';let im=new Image(),a=asset(kind,name);if(a)im.src=a.local;else im.hidden=true;im.alt='';const sp=document.createElement('span'),sm=document.createElement('small'),strong=document.createElement('b');sm.textContent=kind==='characters'?'NHÂN VẬT '+(i+1):kind==='weapons'?'VŨ KHÍ '+(i+1):'TRỢ THỦ';strong.textContent=name||'Chưa chọn';sp.append(sm,strong);b.append(im,sp,document.createTextNode('⌄'));b.onclick=()=>openPicker(kind,i);parent.append(b)})}
 choices('character-controls','characters',state.characters);choices('weapon-controls','weapons',state.weapons);choices('pet-control','pets',[state.pet]);
}
function openPicker(kind,index){pickerTarget={kind,index};$('picker-title').textContent=kind==='characters'?'Chọn nhân vật':kind==='weapons'?'Chọn vũ khí':'Chọn trợ thủ';$('asset-search').value='';showAssets();$('picker').showModal();$('asset-search').focus()}
function showAssets(){const {kind,index}=pickerTarget;let q=$('asset-search').value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();let found=CATALOG[kind].filter(a=>a.name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(q));$('asset-grid').replaceChildren();let none=document.createElement('button');none.textContent='Không chọn';none.onclick=()=>pick('');$('asset-grid').append(none);for(const a of found){let b=document.createElement('button'),im=new Image();im.src=a.local;im.alt='';im.loading='lazy';let span=document.createElement('span');span.textContent=a.name;b.append(im,span);b.onclick=()=>pick(a.name);$('asset-grid').append(b)}$('empty-search').hidden=found.length>0;function pick(name){state.nativeEdits[kind==='pets'?'pet':kind]=true;if(kind==='pets'){state.pet=name;state.showPet=!!name;$('showPet').checked=state.showPet}else state[kind][index]=name;$('picker').close();controls();render()}}
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==name)}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('asset-search').oninput=showAssets;
for(const key of ['player','game','team','birth','uid','tournament','position','headline','accent','zoom','photoX','photoY','resolution','showCharacters','showWeapons','showPet'])$(key).addEventListener('input',()=>{if(key==='position')state.nativeEdits.position=true;if(key==='showCharacters')state.nativeEdits.characters=true;if(key==='showWeapons')state.nativeEdits.weapons=true;if(key==='showPet')state.nativeEdits.pet=true;state[key]=$(key).type==='checkbox'?$(key).checked:['zoom','photoX','photoY','resolution'].includes(key)?Number($(key).value):$(key).value;render()});
async function uploaded(file){if(!file)return null;if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Chọn ảnh PNG, JPG hoặc WEBP.');if(file.size>15*1024*1024)throw Error('Ảnh quá lớn. Chọn ảnh dưới 15 MB.');const uri=await new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(file)});const im=await loadImage(uri);const c=document.createElement('canvas');const k=Math.min(1,1800/Math.max(im.width,im.height));c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/png')}
for(const key of ['photo','logo'])$(key).onchange=async e=>{try{const data=await uploaded(e.target.files[0]);if(!data)return;state[key]=data;if(key==='photo'){state.nativeMatte=false;state.zoom=100;state.photoX=0;state.photoY=0}sync();toast(key==='photo'?'Đã thêm ảnh người chơi.':'Đã thêm logo đội.')}catch(e){toast(e.message)}finally{e.target.value=''}};
$('remove-photo').onclick=()=>{state.photo='';state.zoom=100;state.photoX=0;state.photoY=0;sync()};$('remove-logo').onclick=()=>{state.logo='';render()};
$('view-reference').onclick=()=>{let t=CATALOG.templates.find(t=>+t.code===state.template);$('reference-img').src=t.local;$('reference').showModal()};
function download(blob,name){let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function filename(){return (state.game||'profile-ff').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,60)}
$('export').onclick=async()=>{if(state.mode!=='original'&&!state.game.trim()){toast('Nhập tên trong game trước khi tải ảnh.');tab('info');$('game').focus();return}let b=$('export');b.disabled=true;b.textContent='Đang xuất ảnh…';try{let s=structuredClone(state),c=document.createElement('canvas');paint(c,s,await resources(s),s.resolution);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('Không xuất được ảnh');download(blob,filename()+'.png');toast('Ảnh PNG đã được tạo.')}catch(e){toast('Xuất ảnh thất bại. Vui lòng thử lại.');console.error(e)}finally{b.disabled=false;b.textContent='↓  Tải ảnh PNG'}};
$('backup').onclick=()=>{download(new Blob([JSON.stringify({version:1,profile:state})],{type:'application/json'}),filename()+'.ffprofile.json');toast('Đã xuất tệp hồ sơ.')};$('restore').onclick=()=>$('import-file').click();
function validate(p){if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Tệp hồ sơ không hợp lệ.');let s=structuredClone(initial);s.mode=p.mode==='studio'?'studio':'original';s.nativeMatte=p.portraitBlendVersion===2&&p.nativeMatte===true;if(p.nativeEdits&&typeof p.nativeEdits==='object')for(const k of ['position','characters','weapons','pet'])s.nativeEdits[k]=p.nativeEdits[k]===true;for(let k of ['player','game','team','birth','uid','tournament','headline','position'])if(typeof p[k]==='string')s[k]=p[k].slice(0,100);for(let k of ['photo','logo'])if(p[k]){if(typeof p[k]!=='string'||p[k].length>22000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p[k]))throw Error('Ảnh trong hồ sơ không hợp lệ.');s[k]=p[k]}if(Number.isInteger(p.template)&&p.template>=1&&p.template<=10)s.template=p.template;if(/^#[0-9a-f]{6}$/i.test(p.accent))s.accent=p.accent;for(let k of ['showCharacters','showWeapons','showPet'])if(typeof p[k]==='boolean')s[k]=p[k];for(let k of ['characters','weapons'])if(Array.isArray(p[k])&&p[k].length===s[k].length)s[k]=p[k].map(n=>typeof n==='string'&&asset(k,n)?n:'');s.pet=asset('pets',p.pet)?p.pet:'';for(let k of ['zoom','photoX','photoY','resolution'])if(Number.isFinite(p[k]))s[k]=k==='zoom'?Math.max(50,Math.min(220,p[k])):k==='resolution'?(p[k]===2?2:1):Math.max(-250,Math.min(250,p[k]));return s}
$('import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>45*1024*1024)throw Error('Tệp quá lớn.');const parsed=JSON.parse(await file.text());if(parsed.version!==1)throw Error('Không đúng định dạng hồ sơ.');let s=validate(parsed.profile);await resources(s);state=s;sync();toast('Đã mở hồ sơ.')}catch(e){toast(e.message||'Không đọc được hồ sơ.')}finally{e.target.value=''}};
async function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('ff-profile-studio',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
$('save').onclick=async()=>{try{db=db||await openDB();await new Promise((resolve,reject)=>{let tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(structuredClone(state),'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});$('saved-state').textContent='Đã lưu bản nháp lúc '+new Date().toLocaleTimeString('vi-VN');toast('Đã lưu bản nháp trên trình duyệt này.')}catch{toast('Không lưu được bản nháp. Dùng “Xuất hồ sơ” để lưu thành tệp.')}};
$('save-draft').onclick=()=>$('save').click();
async function start(){try{db=await openDB();const draft=await new Promise((resolve,reject)=>{const q=db.transaction('drafts').objectStore('drafts').get('current');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});if(draft){state=validate(draft);$('saved-state').textContent='Đã khôi phục bản nháp trên máy.'}}catch{}sync();const jobs=[];
for(const [mode,title] of [['original','Mẫu gốc từ website'],['studio','Mẫu Studio cũ']]){
 const group=document.createElement('section');group.className='template-group';
 const heading=document.createElement('h3');heading.textContent=title+' · 10 mẫu';
 const grid=document.createElement('div');grid.className='template-grid';
 group.append(heading,grid);$('templates').append(group);
 for(const t of themes){
  const b=document.createElement('button');b.className='template-card';b.dataset.id=t.id;b.dataset.mode=mode;
  b.setAttribute('aria-label','Chọn mẫu '+(mode==='original'?'gốc':'Studio')+' '+t.id+' '+t.name);
  const im=new Image();im.alt='';const label=document.createElement('span');
  label.textContent=String(t.id).padStart(2,'0')+' / '+t.name;b.append(im,label);
  b.onclick=()=>{state.mode=mode;state.template=t.id;state.accent=t.accent;centerPortrait()};grid.append(b);
  if(mode==='original')im.src=CATALOG.templates.find(x=>+x.code===t.id).local;
  else jobs.push((async()=>{const ts={...initial,mode:'studio',template:t.id,accent:t.accent};const c=document.createElement('canvas');paint(c,ts,await resources(ts),.2);im.src=c.toDataURL('image/jpeg',.8)})());
 }
}
sync();await Promise.all(jobs)}

$('profile-mode').onchange=()=>{state.mode=$('profile-mode').value;centerPortrait()};
$('center-photo').onclick=centerPortrait;
$('nativeMatte').onchange=()=>{state.nativeMatte=$('nativeMatte').checked;render()};
$('download-original').onclick=async()=>{try{const r=await resources(state);const c=document.createElement('canvas');c.width=r.bg.width;c.height=r.bg.height;c.getContext('2d').drawImage(r.bg,0,0);c.toBlob(blob=>{if(blob)download(blob,'mau-goc-'+state.template+'.png')},'image/png')}catch{toast('Không tải được ảnh mẫu.')}};
start();
