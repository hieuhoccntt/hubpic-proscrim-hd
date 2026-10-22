/* Coordinates are normalized to 1000×1000 and mapped to each original PNG.
 * Flattened demo pixels remain untouched until an edit is requested. */
const ORIGINAL_LAYOUTS={
1:{photo:[168,214,194,422],matte:'#625728',fields:{player:[559,243,322,46],birth:[594,306,287,47],team:[591,369,290,47],position:[542,431,339,47],game:[185,729,156,54],tournament:[366,951,230,40]},colors:{game:['#ffe13e','#161109'],position:['#827540','#fff']},fill:'#827540',weapons:[453,565,429,160]},
2:{photo:[521,162,470,696],matte:'#074026',fields:{game:[123,181,340,49],birth:[55,276,270,31],player:[55,346,270,31],team:[55,417,270,31],position:[55,488,270,31],tournament:[399,962,190,27]},fill:'#ebebeb',ink:'#111',colors:{game:['#c9c9c9','#06452c'],tournament:['#090909','#fff']},weapons:[48,580,374,121],logo:[50,29,115,91]},
3:{photo:[105,66,291,649],matte:'#6d1007',fields:{player:[581,200,222,44],birth:[581,271,222,44],team:[581,342,222,44],position:[574,414,231,44],game:[111,741,254,65],tournament:[316,950,208,36]},fill:'#a51b03',colors:{game:['#690200','#fff'],tournament:['#202020','#fff']},weapons:[522,497,315,184],chars:[490,743,361,149]},
4:{photo:[145,184,327,445],matte:'#173d43',fields:{player:[687,208,176,41],birth:[687,270,176,41],uid:[687,332,176,41],position:[682,394,181,41],game:[178,650,263,39],tournament:[399,966,230,28]},fill:'#00a0c4',colors:{game:['#eee','#111'],tournament:['#032b2f','#fff']},weapons:[550,481,276,139],chars:[456,687,468,109]},
5:{photo:[215,152,264,703],matte:'#151517',fields:{player:[8,473,166,32],birth:[8,594,166,32],uid:[8,713,166,36],game:[297,805,131,45],position:[331,866,102,24],tournament:[119,301,60,40]},fill:'#1c1d1f',colors:{game:['#151300','#fff'],position:['#dfb308','#111']},weapons:[563,867,280,76],chars:[519,479,458,370],pet:[852,649,124,290],logo:[8,843,106,144]},
6:{photo:[697,175,302,822],matte:'#161616',fields:{game:[33,864,620,108],position:[35,807,430,53],tournament:[110,287,300,42]},fill:'#141414',colors:{position:['#131313','#dcb516'],tournament:['#6b6b6b','#fff']},weapons:[338,349,230,420],chars:[614,365,221,394],pet:[67,366,220,392],logo:[43,279,53,53]},
7:{photo:[309,144,262,783],matte:'#141119',fields:{game:[493,34,343,29],team:[126,294,137,43],birth:[58,456,223,65],uid:[58,650,223,65],position:[58,839,238,62]},fill:'#111016',ink:'#ffc91a',weapons:[682,304,251,153],chars:[815,481,120,262],secondaryChars:[682,767,251,138],pet:[682,481,120,224],logo:[59,292,51,65]},
8:{photo:[314,16,411,630],matte:'#e55b02',fields:{player:[49,299,149,33],birth:[49,420,149,33],uid:[49,542,149,32],game:[548,659,330,48],position:[679,602,125,24]},fill:'#e75a00',weapons:[427,883,359,115],chars:[290,719,558,147],logo:[62,747,119,113]},
9:{photo:[402,178,383,402],matte:'#270101',fields:{team:[43,310,196,32],game:[129,736,727, 70],position:[113,856,148,33]},fill:'#320302',ink:'#ffa448',weapons:[477,836,392,105],chars:[115,593,617,112],logo:[69,201,109,78]},
10:{photo:[241,99,635,834],matte:'#073e83',fields:{birth:[11, 40,235,40],team:[778, 40,202,40],game:[30,87,928,111],position:[749,893,198,32]},fill:'#082b68',weapons:[746,409,198,125],chars:[57,330,210,563],logo:[715,42,60,45]}
};

function paintOriginal(canvas,s,r,scale=1){
 if(!r.bg)throw Error('Thiếu ảnh mẫu gốc');const L=ORIGINAL_LAYOUTS[s.template],W=r.bg.width,H=r.bg.height;
 canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);const c=canvas.getContext('2d');c.scale(scale,scale);c.drawImage(s.photo&&r.cleanBg?r.cleanBg:r.bg,0,0,W,H);
 const R=a=>[a[0]*W/1000,a[1]*H/1000,a[2]*W/1000,a[3]*H/1000];
 function patch(a,bg){const [x,y,w,h]=R(a);c.fillStyle=bg||L.fill||'#171717';c.fillRect(x,y,w,h);return [x,y,w,h]}
 function label(value,a,bg,ink){const [x,y,w,h]=patch(a,bg);let size=h*.72;c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink||L.ink||'#fff';while(size>10){c.font=`800 ${size}px "Segoe UI",Arial,sans-serif`;if(c.measureText(value).width<w*.95)break;size--}c.fillText(value,x+w/2,y+h*.53)}
 function fitted(im,a,fill,caption){let [x,y,w,h]=patch(a,fill);if(im){const hh=caption?h*.82:h;const z=Math.min(w/im.width,hh/im.height);c.drawImage(im,x+(w-im.width*z)/2,y+(hh-im.height*z)/2,im.width*z,im.height*z)}if(caption)label(caption,[a[0],a[1]+a[3]*.82,a[2],a[3]*.18],fill,s.accent)}
 // Uploaded portraits replace the demo silhouette inside a bounded photo area.
 if(s.photo&&r.photo&&L.photo){const [x,y,w,h]=s.nativeMatte===true?patch(L.photo,L.matte):R(L.photo);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();drawPortrait(c,r.photo,x,y,w,h,s);c.restore()}
 for(const [key,box] of Object.entries(L.fields)){const value=String(s[key]||'').trim();if(!value)continue;const colors=L.colors?.[key]||[];label(value,box,colors[0],colors[1])}
 if(s.logo&&r.logo&&L.logo)fitted(r.logo,L.logo,L.matte);
 if(L.weapons&&s.nativeEdits?.weapons){const a=L.weapons;patch(a,L.fill);const count=s.template===7?1:2;for(let i=0;i<count;i++)fitted(s.showWeapons?r.weapons[i]:null,[a[0]+i*a[2]/count,a[1],a[2]/count,a[3]],L.fill,s.showWeapons?s.weapons[i]:'')}
 if(L.chars&&s.nativeEdits?.characters){const a=L.chars;if(s.template===7){fitted(s.showCharacters?r.chars[0]:null,a,L.fill,s.showCharacters?s.characters[0]:'');const b=L.secondaryChars;for(let i=0;i<3;i++)fitted(s.showCharacters?r.chars[i+1]:null,[b[0]+i*b[2]/3,b[1],b[2]/3,b[3]],L.fill,s.showCharacters?s.characters[i+1]:'')}
  else if(s.template===10){for(let i=0;i<4;i++)fitted(s.showCharacters?r.chars[i]:null,[a[0],a[1]+i*a[3]/4,a[2],a[3]/4],L.fill,s.showCharacters?s.characters[i]:'')}
  else if(s.template===5||s.template===6){for(let i=0;i<4;i++)fitted(s.showCharacters?r.chars[i]:null,[a[0]+(i%2)*a[2]/2,a[1]+Math.floor(i/2)*a[3]/2,a[2]/2,a[3]/2],L.fill,s.showCharacters?s.characters[i]:'')}
  else for(let i=0;i<4;i++)fitted(s.showCharacters?r.chars[i]:null,[a[0]+i*a[2]/4,a[1],a[2]/4,a[3]],L.fill,s.showCharacters?s.characters[i]:'');}
 if(L.pet&&s.nativeEdits?.pet)fitted(s.showPet?r.pet:null,L.pet,L.fill,s.showPet?s.pet:'');
}
function syncOriginalUI(){
 const original=state.mode==='original',L=ORIGINAL_LAYOUTS[state.template];$('profile-mode').value=state.mode;$('native-note').hidden=!original;$('native-matte-row').hidden=!original;$('nativeMatte').checked=state.nativeMatte===true;
 for(const key of ['player','game','team','birth','uid','tournament','position']){const enabled=!original||!!L.fields[key];$(key).disabled=!enabled;$(key).closest('label').classList.toggle('unsupported',!enabled);$(key).title=enabled?'':'Mẫu ảnh này không có ô '+$(key).closest('label').textContent.trim();}
 $('headline').disabled=original;$('headline').closest('label').classList.toggle('unsupported',original);
 $('logo').disabled=original&&!L.logo;$('logo').closest('label').classList.toggle('unsupported',original&&!L.logo);
 for(const [id,key,check] of [['character-controls','chars','showCharacters'],['weapon-controls','weapons','showWeapons'],['pet-control','pet','showPet']]){$(id).classList.toggle('unsupported',original&&!L[key]);$(id).querySelectorAll('button').forEach(b=>b.disabled=original&&!L[key]);$(check).disabled=original&&!L[key];}
 $('gallery-note').textContent='20 mẫu · 10 mẫu gốc + 10 mẫu Studio cũ';
}

