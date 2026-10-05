(function(){
"use strict";
fetch('/data/projects.json',{cache:'no-store'})
  .then(function(r){if(!r.ok)throw new Error('load');return r.json();})
  .then(main)
  .catch(function(){document.body.innerHTML='<p style="padding:40px;font-family:sans-serif;color:#2430B8">내용을 불러오지 못했어요. 새로고침해 주세요.</p>';});
function main(SAVED){
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- 데이터 ---------------- */
var SAVED_JSON=JSON.stringify(SAVED);
var data=SAVED;
try{
  var stash=sessionStorage.getItem('ggr-draft');
  if(stash){if(stash===SAVED_JSON) sessionStorage.removeItem('ggr-draft'); else data=JSON.parse(stash);}
}catch(e){}
function dirty(){return JSON.stringify(data)!==SAVED_JSON;}
function commit(){try{sessionStorage.setItem('ggr-draft',JSON.stringify(data));}catch(e){} renderDraftBar();}

var CATS={
  all:{label:'전체',desc:'지금까지 만든 것 전부. 하나씩 늘어나는 중이에요.'},
  game:{label:'게임',desc:'직접 기획하고 만드는 게임들. 엔진도 장르도 제각각이에요.',icon:0},
  story:{label:'이야기',desc:'웹소설과 웹툰, 오래 붙잡고 있는 이야기들.',icon:1},
  edu:{label:'교실',desc:'교실에서 쓰려고 만든 수업 도구와 서비스.',icon:2},
  lab:{label:'실험실',desc:'어디에 쓰일지 아직 모르는 실험들.',icon:3}
};
var CAT_KEYS=['game','story','edu','lab'];
var ICONS=['게임패드','책','연필','플라스크','행성','주사위','별','하트','전구','머그컵','로켓','보석'];
function projects(){return data.projects||[];}
function countOf(c){return projects().filter(function(p){return c==='all'||p.cat===c;}).length;}
function byId(id){var a=projects();for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
function safeUrl(u){u=String(u||'').trim();return /^https?:\/\//i.test(u)?u:'';}
function el(tag,attrs,kids){var e=document.createElement(tag);if(attrs)for(var k in attrs){if(k==='text')e.textContent=attrs[k];else if(k==='html')e.innerHTML=attrs[k];else e.setAttribute(k,attrs[k]);}
  (kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c);});return e;}

/* ---------------- 편집 권한 (비밀번호) ---------------- */
var canEdit=false,PW_KEY='ggr-admin';
function adminPw(){try{return sessionStorage.getItem(PW_KEY)||'';}catch(e){return '';}}
function checkPw(pw){return fetch('/api/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pw})}).then(function(r){return r.ok;}).catch(function(){return false;});}
function enableEdit(){canEdit=true;document.body.classList.add('can-edit');renderNavAdmin();renderDraftBar();}
function logout(){canEdit=false;try{sessionStorage.removeItem(PW_KEY);}catch(e){}document.body.classList.remove('can-edit');
  [].forEach.call(document.querySelectorAll('[data-nav="admin"]'),function(a){a.remove();});renderDraftBar();}
function initEditing(){var pw=adminPw();if(!pw)return;checkPw(pw).then(function(ok){if(ok){enableEdit();if(/^#\/admin/.test(location.hash))route();}else logout();});}

/* ---------------- 셰이더 ---------------- */
var FS="precision highp float;\nuniform vec2 uRes;uniform float uT;uniform vec3 uL;uniform vec4 uO[4];uniform float uFit;uniform float uOnly;\nconst vec3 PAPER=vec3(.906,.910,.925);const vec3 INK=vec3(.141,.188,.722);\nmat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}\nfloat dot2(vec2 v){return dot(v,v);}\nfloat smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}\nfloat sdRB(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}\nfloat sdTor(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}\nfloat sdOct(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*.57735027;}\nfloat sdCyl(vec3 p,float h,float r){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}\nfloat sdCone(vec3 p,float h,float r1,float r2){vec2 q=vec2(length(p.xz),p.y);vec2 k1=vec2(r2,h);vec2 k2=vec2(r2-r1,2.*h);\n vec2 ca=vec2(q.x-min(q.x,(q.y<0.)?r1:r2),abs(q.y)-h);vec2 cb=q-k1+k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.,1.);\n float s=(cb.x<0.&&ca.y<0.)?-1.:1.;return s*sqrt(min(dot(ca,ca),dot(cb,cb)));}\nfloat sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}\nfloat sdHex(vec3 p,vec2 h){const vec3 k=vec3(-.8660254,.5,.57735);p=abs(p);p.xy-=2.*min(dot(k.xy,p.xy),0.)*k.xy;\n vec2 d=vec2(length(p.xy-vec2(clamp(p.x,-k.z*h.x,k.z*h.x),h.x))*sign(p.y-h.x),p.z-h.y);return min(max(d.x,d.y),0.)+length(max(d,0.));}\nfloat sdStar5(vec2 p,float r,float rf){const vec2 k1=vec2(.809016994375,-.587785252292);const vec2 k2=vec2(-.809016994375,-.587785252292);\n p.x=abs(p.x);p-=2.*max(dot(k1,p),0.)*k1;p-=2.*max(dot(k2,p),0.)*k2;p.x=abs(p.x);p.y-=r;\n vec2 ba=rf*vec2(-k1.y,k1.x)-vec2(0.,1.);float h=clamp(dot(p,ba)/dot(ba,ba),0.,r);return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);}\nfloat sdHeart(vec2 p){p.x=abs(p.x);if(p.y+p.x>1.)return sqrt(dot2(p-vec2(.25,.75)))-.35355339;\n return sqrt(min(dot2(p-vec2(0.,1.)),dot2(p-.5*max(p.x+p.y,0.))))*sign(p.x-p.y);}\nfloat extrude(float d2,float z,float h){vec2 w=vec2(d2,abs(z)-h);return min(max(w.x,w.y),0.)+length(max(w,0.));}\n\nfloat gamepad(vec3 p){\n float b=sdRB(p-vec3(0.,.06,0.),vec3(.6,.22,.15),.13);\n b=smin(b,sdCap(p,vec3(-.38,0.,0.),vec3(-.52,-.36,0.),.17),.14);\n b=smin(b,sdCap(p,vec3(.38,0.,0.),vec3(.52,-.36,0.),.17),.14);\n float dp=min(sdRB(p-vec3(-.32,.06,.15),vec3(.12,.04,.05),.015),sdRB(p-vec3(-.32,.06,.15),vec3(.04,.12,.05),.015));\n float bt=min(length(p-vec3(.26,.0,.16))-.06,length(p-vec3(.38,.12,.16))-.06);\n bt=min(bt,min(length(p-vec3(.26,.14,.16))-.045,length(p-vec3(.38,-.02,.16))-.045));\n return min(b,min(dp,bt));}\nfloat book(vec3 p){\n vec3 q=p;q.yz=rot(.62)*q.yz;q.x=abs(q.x);\n float x=min(q.x,.72);float f=.24*(1.-exp(-x*6.))-.12*x*x;\n float sheet=(abs(q.y-f)-.035)*.7;\n sheet=max(sheet,max(q.x-.72,abs(q.z)-.5));\n float cv=sdRB(q-vec3(.37,-.05,0.),vec3(.39,.018,.53),.015);\n float sp=sdCyl(vec3(q.x,q.z,q.y+.04),.53,.045);\n return min(min(sheet,cv),sp);}\nfloat pencil(vec3 p){\n vec3 d=normalize(vec3(.74,.67,0.));vec3 e1=vec3(-d.y,d.x,0.);\n vec3 q=vec3(dot(p,e1),p.z,dot(p,d));\n float body=sdHex(q,vec2(.115,.52));\n float wood=sdCone(vec3(q.x,q.z-.66,q.y),.14,.115,.048);\n float lead=sdCone(vec3(q.x,q.z-.86,q.y),.06,.04,.006);\n float fer=sdCyl(vec3(q.x,q.z+.585,q.y),.065,.142);\n float era=sdCyl(vec3(q.x,q.z+.745,q.y),.075,.098)-.022;\n return min(min(body,min(wood,lead)),min(fer,era));}\nfloat flask(vec3 p){\n float bd=sdCone(p-vec3(0.,-.2,0.),.3,.5,.16)-.04;\n float nk=sdCyl(p-vec3(0.,.3,0.),.2,.13);\n vec3 l=p-vec3(0.,.5,0.);float lip=length(vec2(length(l.xz)-.15,l.y))-.04;\n float f=smin(bd,nk,.08);f=min(f,lip);\n float tb=fract(uT*.35);float b1=length(p-vec3(.03,.62+tb*.45,0.))-.07*(1.-tb);\n float tb2=fract(uT*.35+.5);float b2=length(p-vec3(-.04,.62+tb2*.45,0.))-.05*(1.-tb2);\n return min(f,min(b1,b2));}\nfloat planet(vec3 p){float s=length(p)-.48;vec3 q=p;q.yz=rot(.42)*q.yz;q.xy=rot(.25)*q.xy;return min(s,sdTor(q,vec2(.8,.04)));}\nfloat dice(vec3 p){\n float b=sdRB(p,vec3(.48),.12);\n float pip=length(p-vec3(0.,0.,.54))-.11;\n pip=min(pip,length(p-vec3(-.19,.54,-.19))-.1);pip=min(pip,length(p-vec3(.19,.54,.19))-.1);\n pip=min(pip,length(p-vec3(.54,.21,.21))-.09);pip=min(pip,length(p-vec3(.54,0.,0.))-.09);pip=min(pip,length(p-vec3(.54,-.21,-.21))-.09);\n return max(b,-pip);}\nfloat star(vec3 p){return extrude(sdStar5(p.xy,.74,.46),p.z,.08)-.07;}\nfloat heart(vec3 p){vec2 q=p.xy/.98+vec2(0.,.56);return extrude(sdHeart(q)*.98,p.z,.1)-.09;}\nfloat bulb(vec3 p){\n float g=length(p-vec3(0.,.2,0.))-.42;\n float neck=sdCone(p-vec3(0.,-.2,0.),.14,.17,.3);\n float b=smin(g,neck,.1);\n float base=sdCyl(p-vec3(0.,-.46,0.),.12,.17);\n base=min(base,length(vec2(length(p.xz)-.175,p.y+.4))-.03);\n base=min(base,length(vec2(length(p.xz)-.175,p.y+.5))-.03);\n float tip=length(p-vec3(0.,-.62,0.))-.07;\n return min(min(b,base),tip);}\nfloat mug(vec3 p){\n vec3 q=p-vec3(-.1,0.,0.);\n float outer=sdCyl(q,.34,.33)-.03;\n float inner=sdCyl(q-vec3(0.,.12,0.),.34,.26);\n float body=max(outer,-inner);\n vec3 h=q-vec3(.36,0.,0.);\n float hd=length(vec2(length(h.xy)-.18,h.z))-.06;\n hd=max(hd,-h.x+.02);\n return min(body,hd);}\nfloat rocket(vec3 p){\n vec3 q=p;q.xy=rot(-.35)*q.xy;\n float body=sdCap(q,vec3(0.,-.3,0.),vec3(0.,.2,0.),.2);\n float nose=sdCone(q-vec3(0.,.4,0.),.2,.2,.02);\n float r=smin(body,nose,.05);\n r=max(r,-(length(q-vec3(0.,.1,.18))-.075));\n vec3 f=q;f.x=abs(f.x);\n float fin=sdRB(f-vec3(.24,-.36,0.),vec3(.1,.14,.025),.02);\n float fin2=sdRB(q-vec3(0.,-.36,.22),vec3(.025,.14,.09),.02);\n float fl=sdCone(q-vec3(0.,-.62,0.),.1,.02,.12);\n return min(min(r,fl),min(fin,fin2));}\nfloat gem(vec3 p){vec3 q=p;q.y-=.05;float o=sdOct(q*vec3(1.,1.35,1.),.74)/1.35;o=max(o,q.y-.26);return o-.02;}\n\nfloat obj(int i,vec3 p){\n if(i==0) return gamepad(p);\n if(i==1) return book(p);\n if(i==2) return pencil(p);\n if(i==3) return flask(p);\n if(i==4) return planet(p);\n if(i==5) return dice(p);\n if(i==6) return star(p);\n if(i==7) return heart(p);\n if(i==8) return bulb(p);\n if(i==9) return mug(p);\n if(i==10) return rocket(p);\n return gem(p);}\nfloat map(vec3 p){float d=1e5;\n for(int i=0;i<4;i++){\n  if(uOnly>-.5&&abs(float(i)-uOnly)>.5)continue;\n  vec4 o=uO[i];float sc=o.w*uFit;vec3 rp=p-vec3(o.xy,0.);\n  float bs=length(rp)-1.15*sc;if(bs>.25){d=min(d,bs);continue;}\n  vec3 q=rp/sc;float fi=float(i);int ic=int(o.z+.5);\n  float amp=(ic==1)?.22:((ic==2)?.35:.6);\n  q.xz=rot(sin(uT*.55+fi*1.7)*amp)*q.xz;q.yz=rot(.18+sin(uT*.4+fi)*.15)*q.yz;\n  d=min(d,obj(ic,q)*sc);}\n return d;}\nvec3 nrm(vec3 p){vec2 e=vec2(.003,-.003);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}\nfloat b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}\nfloat b4(vec2 a){return b2(.5*a)*.25+b2(a);}\nfloat b8(vec2 a){return b4(.5*a)*.25+b2(a);}\nvoid main(){\n vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*2.;\n vec3 ro=vec3(0.,0.,6.),rd=normalize(vec3(uv,-2.));\n float t=0.;bool hit=false;vec3 p=ro;\n for(int i=0;i<72;i++){p=ro+rd*t;float d=map(p);if(d<.002){hit=true;break;}t+=d;if(t>11.)break;}\n float lum;\n if(hit){vec3 n=nrm(p);float df=max(dot(n,uL),0.);float rim=pow(1.-max(dot(n,-rd),0.),3.);\n  lum=clamp(.02+df*.74+rim*.16,0.,1.);\n }else{\n  vec2 w=uv*3.;lum=1.;\n  for(int i=0;i<4;i++){if(uOnly>-.5&&abs(float(i)-uOnly)>.5)continue;vec4 o=uO[i];float sc=o.w*uFit;vec2 sp=o.xy+vec2(-uL.x*.35*sc,-1.02*sc);\n   vec2 dd=(w-sp)*vec2(1.,3.4);lum-=exp(-dot(dd,dd)/(.36*sc*sc))*.42;}\n }\n float th=b8(gl_FragCoord.xy);\n float ink=step(th+.004,1.-lum);\n gl_FragColor=vec4(mix(PAPER,INK,ink),1.);\n}\n";
function makeGL(cv,keep){
  var gl=cv.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:!!keep});
  if(!gl) return null;
  function sh(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));return s;}
  var pr=gl.createProgram();
  gl.attachShader(pr,sh(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
  var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var l=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
  var U={};['uRes','uT','uL','uO','uFit','uOnly'].forEach(function(n){U[n]=gl.getUniformLocation(pr,n);});
  return {gl:gl,U:U};
}

/* 공용 렌더러: 아이콘 하나를 2D 캔버스에 점묘로 그려 준다 */
var R=(function(){
  var cv=document.createElement('canvas'),G=makeGL(cv,true),o=new Float32Array(16);
  if(!G) return null;
  var gl=G.gl,U=G.U;gl.uniform1f(U.uOnly,0);
  return function(target,icon,light,t,fit,oy){
    var w=target.width,h=target.height;
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
    gl.viewport(0,0,w,h);gl.uniform2f(U.uRes,w,h);
    var asp=w/h;o[0]=0;o[1]=oy==null?.5:oy;o[2]=icon;o[3]=1;
    gl.uniform4fv(U.uO,o);gl.uniform1f(U.uFit,(fit||2.55)*Math.min(1,asp));
    var ln=Math.hypot(light[0],light[1],light[2]);gl.uniform3f(U.uL,light[0]/ln,light[1]/ln,light[2]/ln);
    gl.uniform1f(U.uT,t||0);gl.drawArrays(gl.TRIANGLES,0,3);
    target.getContext('2d').drawImage(cv,0,0);
  };
})();
var DEF_L=[-.55,.62,1];
function dcanvas(cssW,ratio,px){var c=document.createElement('canvas');c.className='px';c.setAttribute('aria-hidden','true');
  c.width=Math.max(8,Math.round(cssW/px));c.height=Math.max(6,Math.round(c.width*ratio));return c;}
function drawStatic(c,icon,fit,oy){if(R)R(c,icon,DEF_L,0,fit,oy);}

/* 살아 있는 캔버스(조명이 커서를 따라감) 관리 */
var lives=[],loopId=0;
function live(c,icon,host,opts){
  opts=opts||{};
  var L={c:c,icon:icon,fit:opts.fit,oy:opts.oy,always:!!opts.always,cur:DEF_L.slice(),tgt:null,active:!!opts.always,t0:performance.now(),tt:0};
  host.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect();
    L.tgt=[((e.clientX-r.left)/r.width-.5)*3,-((e.clientY-r.top)/r.height-.5)*3,1.2];L.active=true;kick();});
  host.addEventListener('pointerleave',function(){L.tgt=null;kick();});
  lives.push(L);drawStatic(c,icon,opts.fit,opts.oy);if(L.always)kick();
  return L;
}
function kick(){if(!loopId)loopId=requestAnimationFrame(tick);}
function tick(now){
  loopId=0;var more=false;
  lives.forEach(function(L){
    if(!L.active||!document.body.contains(L.c)) return;
    var tl=L.tgt||DEF_L,moving=false;
    for(var k=0;k<3;k++){var dv=tl[k]-L.cur[k];if(Math.abs(dv)>.003)moving=true;L.cur[k]+=reduce?dv:dv*.12;}
    var anim=!reduce&&(L.always||L.tgt);
    if(anim) L.tt=(now-L.t0)/1000;
    if(R) R(L.c,L.icon,L.cur,L.tt,L.fit,L.oy);
    if(moving||anim) more=true; else L.active=false;
  });
  if(more) kick();
}
function clearLives(){lives=[];}

/* ---------------- 화면 뼈대 ---------------- */
document.body.insertAdjacentHTML('afterbegin',
 '<section class="hero" id="hero" aria-label="꿈고래 아카이브 첫 화면" hidden>'+
 '<canvas class="px" aria-hidden="true"></canvas>'+
 '<div class="labels" data-labels>'+CAT_KEYS.map(function(k,i){return '<a href="#/c/'+k+'" data-i="'+i+'">'+CATS[k].label+'<span data-count="'+k+'"></span></a>';}).join('')+'</div>'+
 '<div class="ui"><div class="top"><p class="logo"><a href="#/">꿈고래</a></p><nav class="nav" aria-label="보조" data-heronav><a href="#/about">만든 사람</a></nav></div><div></div>'+
 '<div class="bottom fade"><h1>퇴근 후에 만든<br>것들의 진열장</h1><div class="side"><p class="hint">커서가 조명이 돼요. 물건을 누르면 그 칸이 열려요.</p>'+
 '<a class="cta" href="#/c/all">프로젝트 둘러보기</a></div></div></div></section>'+
 '<div class="page" id="page" hidden><header class="bar"><div class="top"><p class="logo"><a href="#/">꿈고래</a></p>'+
 '<nav class="nav" aria-label="주요" data-mainnav>'+CAT_KEYS.map(function(k){return '<a href="#/c/'+k+'" data-nav="'+k+'">'+CATS[k].label+'</a>';}).join('')+
 '<a href="#/about" data-nav="about">만든 사람</a></nav></div></header><main class="wrap" id="view"></main></div>'+
 '<div class="toast" id="toast" role="status" hidden></div>');

var heroEl=document.getElementById('hero'),pageEl=document.getElementById('page'),view=document.getElementById('view');
function updateCounts(){[].forEach.call(document.querySelectorAll('[data-count]'),function(e){e.textContent=countOf(e.getAttribute('data-count'));});}
function setNav(key){[].forEach.call(document.querySelectorAll('[data-nav]'),function(a){if(a.getAttribute('data-nav')===key)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
function renderNavAdmin(){
  [document.querySelector('[data-mainnav]'),document.querySelector('[data-heronav]')].forEach(function(n){
    if(!n||n.querySelector('[data-nav="admin"]')) return;
    n.appendChild(el('a',{href:'#/admin','data-nav':'admin',text:'관리'}));
  });
}
var toastT=0;
function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},2600);}

function renderDraftBar(){
  [].forEach.call(document.querySelectorAll('.draftbar'),function(b){b.remove();});
  if(!canEdit||!dirty()) return;
  var mk=function(){
    var bar=el('div',{class:'draftbar',role:'region','aria-label':'저장 안 된 변경'},[
      el('span',{text:'아직 사이트에 반영하지 않은 변경이 있어요.'}),
      el('button',{class:'cta',type:'button','data-publish':'',text:'사이트에 반영'}),
      el('button',{class:'cta ghost',type:'button','data-revert':'',text:'변경 취소'})]);
    bar.querySelector('[data-publish]').addEventListener('click',publish);
    bar.querySelector('[data-revert]').addEventListener('click',function(){
      data=JSON.parse(SAVED_JSON);try{sessionStorage.removeItem('ggr-draft');}catch(e){}renderDraftBar();route();toast('변경을 취소했어요.');});
    return bar;
  };
  pageEl.insertBefore(mk(),pageEl.firstChild);
  heroEl.appendChild(mk());
}

/* ---------------- 반영 (GitHub에 저장 → Vercel 자동 배포) ---------------- */
var publishing=false;
function publish(){
  if(publishing||!canEdit) return;
  publishing=true;
  [].forEach.call(document.querySelectorAll('[data-publish]'),function(b){b.disabled=true;b.textContent='반영하는 중';});
  var snapshot=JSON.stringify(data);
  fetch('/api/publish',{method:'POST',headers:{'content-type':'application/json','x-admin-password':adminPw()},body:snapshot})
  .then(function(r){
    publishing=false;
    if(r.ok){SAVED_JSON=snapshot;try{sessionStorage.removeItem('ggr-draft');}catch(e){}renderDraftBar();toast('반영했어요. 1~2분 뒤 사이트에 나타나요.');return;}
    renderDraftBar();
    if(r.status===401){logout();toast('비밀번호가 바뀌었거나 맞지 않아요. 다시 들어와 주세요.');return;}
    if(r.status===409){toast('다른 곳에서 먼저 바뀌었어요. 새로고침한 뒤 다시 반영해 주세요.');return;}
    toast('반영하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }).catch(function(){publishing=false;renderDraftBar();toast('인터넷 연결을 확인하고 다시 시도해 주세요.');});
}

/* ---------------- 첫 화면 ---------------- */
var hero=(function(root){
  var cv=root.querySelector('canvas'),G=makeGL(cv,false);
  if(!G) return {start:function(){},stop:function(){},resize:function(){}};
  var gl=G.gl,U=G.U;gl.uniform1f(U.uOnly,-1);
  var labels=[].slice.call(root.querySelectorAll('[data-labels] a'));
  var W=0,H=0,raf=0,fit=1,t0=performance.now(),d=new Float32Array(16),running=false;
  var pos=[[0,0],[0,0],[0,0],[0,0]],hov=[1,1,1,1],hv=[0,0,0,0],over=-1,ptr={x:0,y:0,on:false},L=DEF_L.slice();
  function layout(){
    var asp=W/H,hw=3*asp;
    if(asp<.8){fit=Math.min(1,hw*.8/1.9);pos=[[-fit,1.75],[fit,1.75],[-fit,.25],[fit,.25]];}
    else{fit=Math.min(1,hw*.86/3.6);pos=[[-2.7*fit,.3],[-.9*fit,.3],[.9*fit,.3],[2.7*fit,.3]];}
    for(var i=0;i<4;i++){labels[i].style.left=(W/2+pos[i][0]*(H/6))+'px';labels[i].style.top=(H/2-(pos[i][1]-1.38*fit)*(H/6))+'px';}
  }
  function resize(){W=root.clientWidth;H=root.clientHeight;if(!W||!H)return;var px=W<700?2.5:3;
    cv.width=Math.ceil(W/px);cv.height=Math.ceil(H/px);gl.viewport(0,0,cv.width,cv.height);gl.uniform2f(U.uRes,cv.width,cv.height);layout();if(reduce)frame(t0);}
  function frame(t){
    var tt=reduce?0:(t-t0)/1000,tl=ptr.on?[(ptr.x/W-.5)*3.2,-(ptr.y/H-.5)*3.2,1.25]:DEF_L;
    for(var k=0;k<3;k++)L[k]+=reduce?(tl[k]-L[k]):(tl[k]-L[k])*.08;
    var ln=Math.hypot(L[0],L[1],L[2]);gl.uniform3f(U.uL,L[0]/ln,L[1]/ln,L[2]/ln);
    over=-1;
    for(var i=0;i<4;i++){
      var sx=W/2+pos[i][0]*(H/6),sy=H/2-pos[i][1]*(H/6),on=ptr.on&&Math.hypot(ptr.x-sx,ptr.y-sy)<.95*fit*(H/6);
      if(on)over=i;labels[i].classList.toggle('on',on);var tg=on?1.16:1;
      if(reduce)hov[i]=tg;else{hv[i]+=(tg-hov[i])*.12;hv[i]*=.72;hov[i]+=hv[i];}
      d[i*4]=pos[i][0];d[i*4+1]=pos[i][1];d[i*4+2]=CATS[CAT_KEYS[i]].icon;d[i*4+3]=hov[i];
    }
    root.style.cursor=over>=0?'pointer':'';
    gl.uniform4fv(U.uO,d);gl.uniform1f(U.uFit,fit*.95);gl.uniform1f(U.uT,tt);gl.drawArrays(gl.TRIANGLES,0,3);
  }
  function loop(t){if(!running)return;frame(t);raf=requestAnimationFrame(loop);}
  var pend=false;function redraw(){if(!reduce||pend)return;pend=true;requestAnimationFrame(function(){pend=false;frame(t0);});}
  root.addEventListener('pointermove',function(e){ptr.x=e.clientX;ptr.y=e.clientY;ptr.on=true;redraw();});
  root.addEventListener('pointerleave',function(){ptr.on=false;redraw();});
  root.addEventListener('click',function(e){if(e.target.closest('a,button'))return;if(over>=0)location.hash='#/c/'+CAT_KEYS[over];});
  return {resize:resize,start:function(){running=true;resize();if(reduce){frame(t0);return;}cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);},
    stop:function(){running=false;cancelAnimationFrame(raf);}};
})(heroEl);

/* ---------------- 목록 ---------------- */
var filter={status:'all'};
function renderList(cat){
  if(!CATS[cat])cat='all';var C=CATS[cat];
  var items=projects().filter(function(p){return (cat==='all'||p.cat===cat)&&(filter.status==='all'||p.status===filter.status);});
  view.innerHTML='';
  var head=el('section',{class:'head'});
  if(C.icon!=null){var hc=dcanvas(window.innerWidth<700?130:Math.min(220,Math.max(130,window.innerWidth*.16)),1,2.5);head.appendChild(hc);live(hc,C.icon,hc,{always:true,fit:2.3,oy:.45});}
  var h1=el('h1',{text:C.label});h1.appendChild(el('small',{text:String(countOf(cat))}));
  head.appendChild(el('div',null,[h1,el('p',{text:C.desc})]));view.appendChild(head);
  var tabs=el('nav',{class:'tabs','aria-label':'카테고리'});
  ['all'].concat(CAT_KEYS).forEach(function(k){var a=el('a',{href:'#/c/'+k,text:CATS[k].label});if(k===cat)a.setAttribute('aria-current','page');tabs.appendChild(a);});
  var chips=el('div',{class:'chips',role:'group','aria-label':'상태로 거르기'});
  ['all'].concat(data.statuses).forEach(function(s){
    var b=el('button',{type:'button','aria-pressed':String(filter.status===s),text:s==='all'?'모든 상태':s});
    b.addEventListener('click',function(){filter.status=s;renderList(cat);});chips.appendChild(b);});
  view.appendChild(el('div',{class:'filters'},[tabs,chips]));
  if(!items.length){
    var msg=projects().length?'이 상태의 프로젝트는 아직 없어요. 다른 상태를 골라 보세요.':'아직 올린 프로젝트가 없어요.';
    var em=el('p',{class:'empty',text:msg});
    if(canEdit){em.appendChild(document.createTextNode(' '));em.appendChild(el('a',{href:'#/admin/new',text:'첫 프로젝트 올리기'}));}
    view.appendChild(em);
  }else{
    var ul=el('ul',{class:'list'});
    var tw=window.innerWidth<700?116:Math.min(264,Math.max(150,window.innerWidth*.2));
    items.forEach(function(p){
      var a=el('a',{class:'row',href:'#/p/'+p.id});
      var c=dcanvas(tw,.75,3);a.appendChild(c);
      a.appendChild(el('div',null,[el('h2',{text:p.title}),p.one?el('p',{text:p.one}):null]));
      a.appendChild(el('div',{class:'meta'},[el('span',{text:CATS[p.cat]?CATS[p.cat].label:''}),el('span',{text:p.status||''})]));
      ul.appendChild(el('li',null,[a]));live(c,p.icon,a);
    });
    view.appendChild(ul);
  }
  setNav(cat);document.title=C.label+' · 꿈고래 아카이브';
}

/* ---------------- 상세 ---------------- */
function paras(text){return String(text||'').split(/\n\s*\n/).map(function(s){return s.trim();}).filter(Boolean);}
function renderDetail(id){
  var list=projects(),i=-1;for(var k=0;k<list.length;k++)if(list[k].id===id)i=k;
  view.innerHTML='';
  if(i<0){var e=el('p',{class:'empty',text:'찾는 프로젝트가 없어요. '});e.appendChild(el('a',{href:'#/c/all',text:'전체 목록으로 가기'}));view.appendChild(e);return;}
  var p=list[i],C=CATS[p.cat]||CATS.all;
  view.appendChild(el('a',{class:'back',href:'#/c/'+(CATS[p.cat]?p.cat:'all'),text:C.label+' 목록으로'}));
  var facts=el('dl',{class:'facts'},[el('dt',{text:'분류'}),el('dd',{text:C.label}),el('dt',{text:'상태'}),el('dd',{text:p.status||''})]);
  if(p.start){facts.appendChild(el('dt',{text:'시작'}));facts.appendChild(el('dd',{text:p.start}));}
  var left=el('div',null,[el('h1',{text:p.title}),p.one?el('p',{class:'one',text:p.one}):null,facts]);
  var lk=el('div',{class:'links'}),play=safeUrl(p.links&&p.links.play),doc=safeUrl(p.links&&p.links.doc);
  if(play)lk.appendChild(el('a',{class:'cta',href:play,target:'_blank',rel:'noopener',text:'해 보기'}));
  if(doc)lk.appendChild(el('a',{class:'cta ghost',href:doc,target:'_blank',rel:'noopener',text:'자세히 보기'}));
  if(play||doc)left.appendChild(lk);
  if(canEdit)left.appendChild(el('p',{style:'margin:20px 0 0;font-size:14px'},[el('a',{href:'#/admin/edit/'+p.id,text:'이 프로젝트 수정하기'})]));
  var cover=el('div',{class:'cover'});
  view.appendChild(el('section',{class:'dhead'},[left,cover]));
  var cc=dcanvas(Math.min(620,cover.clientWidth||520),.75,3);cover.appendChild(cc);live(cc,p.icon,cover,{always:true});
  var ps=paras(p.body);
  if(ps.length){var b=el('div',{class:'body'});ps.forEach(function(t){b.appendChild(el('p',{text:t}));});view.appendChild(el('section',{class:'sec'},[el('h2',{text:'소개'}),b]));}
  var ups=(p.updates||[]).filter(function(u){return u&&(u.date||u.text);});
  if(ups.length){var ol=el('ol',{class:'timeline'});ups.forEach(function(u){ol.appendChild(el('li',null,[el('time',{text:u.date||''}),el('span',{text:u.text||''})]));});
    view.appendChild(el('section',{class:'sec'},[el('h2',{text:'진행 기록'}),el('div',{class:'body'},[ol])]));}
  if(list.length>1){
    var prev=list[(i-1+list.length)%list.length],next=list[(i+1)%list.length];
    view.appendChild(el('nav',{class:'pager','aria-label':'다른 프로젝트'},[
      el('a',{href:'#/p/'+prev.id},[el('small',{text:'이전'}),el('strong',{text:prev.title})]),
      el('a',{href:'#/p/'+next.id,style:'text-align:right'},[el('small',{text:'다음'}),el('strong',{text:next.title})])]));
  }
  setNav(p.cat);document.title=p.title+' · 꿈고래 아카이브';
}

/* ---------------- 만든 사람 ---------------- */
function renderAbout(){
  var a=data.about||{},s=el('section',{class:'about'},[el('h1',{text:'만든 사람'})]);
  var ps=paras(a.intro);
  if(ps.length)ps.forEach(function(t){s.appendChild(el('p',{text:t}));});else s.appendChild(el('p',{text:'소개 글이 아직 없어요.'}));
  if(a.contact){var c=safeUrl(a.contact);s.appendChild(el('p',null,[c?el('a',{href:c,target:'_blank',rel:'noopener',text:a.contact}):document.createTextNode(a.contact)]));}
  if(canEdit)s.appendChild(el('p',{style:'font-size:14px'},[el('a',{href:'#/admin/about',text:'소개 글 수정하기'})]));
  view.innerHTML='';view.appendChild(s);setNav('about');document.title='만든 사람 · 꿈고래 아카이브';
}

/* ---------------- 관리 ---------------- */
function needEdit(){
  if(canEdit) return true;
  view.innerHTML='';
  var pw=el('input',{id:'login-pw',type:'password',autocomplete:'current-password'});
  var err=el('p',{class:'err',id:'login-err',hidden:''});
  var btn=el('button',{class:'cta',type:'submit',text:'들어가기'});
  var f=el('form',{class:'fields',style:'display:grid;gap:14px;max-width:360px;margin-top:24px'},[
    el('div',{class:'field'},[el('label',{for:'login-pw',text:'관리 비밀번호'}),pw,err]),el('div',{class:'actions'},[btn])]);
  pw.style.cssText='font:inherit;font-size:16px;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;min-height:44px';
  f.addEventListener('submit',function(e){e.preventDefault();var v=pw.value;if(!v){pw.focus();return;}
    btn.disabled=true;btn.textContent='확인하는 중';
    checkPw(v).then(function(ok){btn.disabled=false;btn.textContent='들어가기';
      if(ok){try{sessionStorage.setItem(PW_KEY,v);}catch(e){}enableEdit();route();}
      else{err.textContent='비밀번호가 맞지 않아요.';err.hidden=false;pw.setAttribute('aria-invalid','true');pw.setAttribute('aria-describedby','login-err');pw.select();}});});
  view.appendChild(el('section',{class:'admin'},[el('h1',{text:'관리'}),el('p',{class:'lead',text:'사이트 내용을 고치려면 비밀번호를 입력해 주세요.'}),f]));
  setNav('admin');setTimeout(function(){pw.focus();},0);
  return false;
}
function adminHead(title,lead){
  var s=el('section',{class:'admin'},[el('p',{style:'margin:0 0 10px;font-size:14px'},[el('a',{href:'#/admin',text:'관리 첫 화면'})]),el('h1',{text:title})]);
  if(lead)s.appendChild(el('p',{class:'lead',text:lead}));return s;
}
function renderAdmin(){
  if(!needEdit())return;
  view.innerHTML='';
  var s=el('section',{class:'admin'},[el('h1',{text:'관리'}),
    el('p',{class:'lead',text:'여기서 바꾼 내용은 위쪽 파란 띠의 "사이트에 반영"을 눌러야 방문자에게 보여요. 반영 후 1~2분 걸려요.'})]);
  s.appendChild(el('div',{class:'toolbar'},[
    el('a',{class:'cta',href:'#/admin/new',text:'새 프로젝트 올리기'}),
    el('a',{class:'cta ghost',href:'#/admin/status',text:'상태 이름 관리'}),
    el('a',{class:'cta ghost',href:'#/admin/about',text:'소개 글 수정'}),
    (function(){var b=el('button',{class:'cta ghost',type:'button',text:'관리 끝내기'});b.addEventListener('click',function(){logout();location.hash='#/';});return b;})()]));
  var ul=el('ul',{class:'alist'}),list=projects();
  if(!list.length)s.appendChild(el('p',{class:'empty',text:'아직 올린 프로젝트가 없어요.'}));
  list.forEach(function(p,idx){
    var c=dcanvas(96,.75,2);
    var sel=el('select',{'aria-label':p.title+' 상태'});
    data.statuses.forEach(function(st){var o=el('option',{value:st,text:st});if(st===p.status)o.selected=true;sel.appendChild(o);});
    sel.addEventListener('change',function(){p.status=sel.value;commit();toast('상태를 "'+sel.value+'"(으)로 바꿨어요.');});
    var up=el('button',{class:'iconbtn',type:'button','aria-label':p.title+' 위로',text:'위로'}),dn=el('button',{class:'iconbtn',type:'button','aria-label':p.title+' 아래로',text:'아래로'});
    if(idx===0)up.disabled=true;if(idx===list.length-1)dn.disabled=true;
    up.addEventListener('click',function(){move(idx,-1);});dn.addEventListener('click',function(){move(idx,1);});
    var del=el('button',{class:'iconbtn warn',type:'button',text:'내리기'});
    var acts=el('div',{class:'acts'},[sel,up,dn,el('a',{class:'iconbtn',href:'#/admin/edit/'+p.id,style:'display:inline-flex;align-items:center;text-decoration:none',text:'수정'}),del]);
    del.addEventListener('click',function(){
      acts.innerHTML='';
      var yes=el('button',{class:'cta small danger',type:'button',text:'정말 내리기'}),no=el('button',{class:'cta small ghost',type:'button',text:'취소'});
      acts.appendChild(el('span',{style:'font-size:14px',text:'"'+p.title+'"을(를) 내릴까요?'}));acts.appendChild(yes);acts.appendChild(no);
      yes.addEventListener('click',function(){data.projects.splice(idx,1);commit();renderAdmin();toast('"'+p.title+'"을(를) 내렸어요.');});
      no.addEventListener('click',renderAdmin);no.focus();
    });
    ul.appendChild(el('li',{class:'arow'},[c,el('div',null,[el('strong',{text:p.title}),el('div',{class:'sub',text:(CATS[p.cat]?CATS[p.cat].label:'')+'  '+(p.one||'')})]),acts]));
    drawStatic(c,p.icon);
  });
  if(list.length)s.appendChild(ul);
  view.appendChild(s);setNav('admin');document.title='관리 · 꿈고래 아카이브';
}
function move(i,dir){var a=data.projects,j=i+dir;if(j<0||j>=a.length)return;var t=a[i];a[i]=a[j];a[j]=t;commit();renderAdmin();
  var b=view.querySelectorAll('.arow')[j];if(b){var f=b.querySelector(dir<0?'button[aria-label$="위로"]':'button[aria-label$="아래로"]');if(f&&!f.disabled)f.focus();}}

function renderEdit(id){
  if(!needEdit())return;
  var isNew=!id,src=isNew?null:byId(id);
  if(!isNew&&!src){view.innerHTML='';view.appendChild(adminHead('찾는 프로젝트가 없어요',''));return;}
  var p=src?JSON.parse(JSON.stringify(src)):{id:'',title:'',cat:'game',status:data.statuses[0]||'',icon:0,one:'',body:'',start:'',links:{play:'',doc:''},updates:[]};
  p.links=p.links||{play:'',doc:''};p.updates=p.updates||[];
  view.innerHTML='';
  var s=adminHead(isNew?'새 프로젝트 올리기':'"'+p.title+'" 수정',isNew?'제목과 분류만 있으면 올릴 수 있어요. 나머지는 나중에 채워도 돼요.':'');
  var form=el('form',{class:'form',novalidate:''});
  var fields=el('div',{class:'fields'});
  function field(label,input,help,id){var f=el('div',{class:'field'},[el('label',{for:id,text:label}),input]);if(help)f.appendChild(el('p',{class:'help',text:help}));return f;}
  var tTitle=el('input',{id:'f-title',type:'text',value:p.title,autocomplete:'off',required:''});
  var err=el('p',{class:'err',id:'f-title-err',hidden:''});
  var fT=field('제목',tTitle,null,'f-title');fT.appendChild(err);fields.appendChild(fT);
  var sCat=el('select',{id:'f-cat'});CAT_KEYS.forEach(function(k){var o=el('option',{value:k,text:CATS[k].label});if(k===p.cat)o.selected=true;sCat.appendChild(o);});
  var sSt=el('select',{id:'f-status'});data.statuses.forEach(function(st){var o=el('option',{value:st,text:st});if(st===p.status)o.selected=true;sSt.appendChild(o);});
  fields.appendChild(el('div',{class:'two'},[field('분류',sCat,null,'f-cat'),field('상태',sSt,null,'f-status')]));
  var tOne=el('input',{id:'f-one',type:'text',value:p.one,maxlength:'80'});
  fields.appendChild(field('한 줄 소개',tOne,'목록에 제목과 함께 보여요. 80자까지.','f-one'));
  var fs=el('fieldset',{class:'field'},[el('legend',{text:'썸네일 아이콘'}),el('p',{class:'help',text:'고르면 사이트 스타일의 점묘 그림으로 자동으로 바뀌어요.'})]);
  var grid=el('div',{class:'icons'});
  ICONS.forEach(function(name,i){
    var c=dcanvas(120,.75,2),r=el('input',{type:'radio',name:'icon',value:String(i)});if(i===p.icon)r.checked=true;
    var lb=el('label',null,[r,c,el('span',{text:name})]);grid.appendChild(lb);drawStatic(c,i);
    r.addEventListener('change',function(){p.icon=i;pv.icon=i;pv.active=true;kick();});
    live(c,i,lb);
  });
  fs.appendChild(grid);fields.appendChild(fs);
  var tBody=el('textarea',{id:'f-body'});tBody.value=p.body||'';
  fields.appendChild(field('소개 글',tBody,'빈 줄로 문단을 나눠요.','f-body'));
  var tStart=el('input',{id:'f-start',type:'text',value:p.start||'',placeholder:'예: 2026년 3월'});
  fields.appendChild(field('시작한 때',tStart,null,'f-start'));
  var tPlay=el('input',{id:'f-play',type:'url',value:p.links.play||'',placeholder:'https://'}),tDoc=el('input',{id:'f-doc',type:'url',value:p.links.doc||'',placeholder:'https://'});
  fields.appendChild(el('div',{class:'two'},[field('"해 보기" 링크',tPlay,'게임 빌드, 서비스 주소 등','f-play'),field('"자세히 보기" 링크',tDoc,'기획서, 연재처 등','f-doc')]));
  var up=el('div',{class:'updates'}),upf=el('div',{class:'field'},[el('label',{text:'진행 기록'}),el('p',{class:'help',text:'날짜와 한 줄 기록. 위에 있는 것부터 보여요.'}),up]);
  function addU(u){var d=el('input',{type:'text',value:u.date||'',placeholder:'2026.10.05','aria-label':'날짜'}),t=el('input',{type:'text',value:u.text||'',placeholder:'무엇을 했는지','aria-label':'기록'});
    var x=el('button',{class:'iconbtn',type:'button',text:'빼기'});var row=el('div',{class:'urow'},[d,t,x]);x.addEventListener('click',function(){row.remove();});up.appendChild(row);return d;}
  p.updates.forEach(addU);
  var addB=el('button',{class:'iconbtn',type:'button',text:'기록 추가'});addB.addEventListener('click',function(){addU({}).focus();});
  upf.appendChild(addB);fields.appendChild(upf);
  var save=el('button',{class:'cta',type:'submit',text:isNew?'올리기':'저장'});
  var cancel=el('a',{class:'cta ghost',href:'#/admin',text:'취소'});
  fields.appendChild(el('div',{class:'actions'},[save,cancel]));
  var pc=dcanvas(380,.75,3),preview=el('div',{class:'preview'},[pc,el('p',{text:'썸네일 미리보기. 커서를 올리면 조명이 따라와요.'})]);
  form.appendChild(fields);form.appendChild(preview);s.appendChild(form);view.appendChild(s);
  var pv=live(pc,p.icon,preview,{always:true});
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var title=tTitle.value.trim();
    if(!title){err.textContent='제목을 적어 주세요.';err.hidden=false;tTitle.setAttribute('aria-invalid','true');tTitle.setAttribute('aria-describedby','f-title-err');tTitle.focus();return;}
    p.title=title;p.cat=sCat.value;p.status=sSt.value;p.one=tOne.value.trim();p.body=tBody.value.trim();p.start=tStart.value.trim();
    p.links={play:tPlay.value.trim(),doc:tDoc.value.trim()};
    p.updates=[].map.call(up.querySelectorAll('.urow'),function(r){var ins=r.querySelectorAll('input');return {date:ins[0].value.trim(),text:ins[1].value.trim()};}).filter(function(u){return u.date||u.text;});
    if(isNew){p.id='p'+Date.now().toString(36);data.projects.unshift(p);}
    else{var a=data.projects;for(var k=0;k<a.length;k++)if(a[k].id===p.id)a[k]=p;}
    commit();location.hash='#/admin';toast(isNew?'"'+p.title+'"을(를) 올렸어요. 반영을 눌러 공개하세요.':'저장했어요. 반영을 눌러 공개하세요.');
  });
  setNav('admin');document.title=(isNew?'새 프로젝트':'수정')+' · 꿈고래 아카이브';tTitle.focus();
}

function renderStatus(){
  if(!needEdit())return;
  view.innerHTML='';
  var s=adminHead('상태 이름 관리','목록의 거르기 버튼과 프로젝트 상태에 쓰이는 이름이에요. 쓰고 있는 상태는 지울 수 없어요.');
  var ul=el('ul',{class:'slist'});
  data.statuses.forEach(function(st,i){
    var used=projects().filter(function(p){return p.status===st;}).length;
    var inp=el('input',{type:'text',value:st,'aria-label':'상태 이름 '+(i+1)});
    inp.addEventListener('change',function(){
      var v=inp.value.trim();if(!v||v===st){inp.value=st;return;}
      if(data.statuses.indexOf(v)>=0){toast('같은 이름의 상태가 이미 있어요.');inp.value=st;return;}
      data.statuses[i]=v;projects().forEach(function(p){if(p.status===st)p.status=v;});commit();renderStatus();toast('"'+st+'"을(를) "'+v+'"(으)로 바꿨어요.');
    });
    var upB=el('button',{class:'iconbtn',type:'button',text:'위로','aria-label':st+' 위로'});if(i===0)upB.disabled=true;
    upB.addEventListener('click',function(){var a=data.statuses,t=a[i];a[i]=a[i-1];a[i-1]=t;commit();renderStatus();});
    var del=el('button',{class:'iconbtn warn',type:'button',text:'지우기','aria-label':st+' 지우기'});
    if(used){del.disabled=true;del.title=used+'개 프로젝트가 쓰는 중';}
    del.addEventListener('click',function(){data.statuses.splice(i,1);commit();renderStatus();toast('"'+st+'"을(를) 지웠어요.');});
    ul.appendChild(el('li',null,[inp,el('span',{class:'count',text:used+'개 사용'}),upB,del]));
  });
  s.appendChild(ul);
  var ni=el('input',{type:'text',placeholder:'새 상태 이름','aria-label':'새 상태 이름'}),ab=el('button',{class:'cta small',type:'button',text:'상태 추가'});
  ab.addEventListener('click',function(){var v=ni.value.trim();if(!v)return ni.focus();if(data.statuses.indexOf(v)>=0){toast('같은 이름의 상태가 이미 있어요.');return;}
    data.statuses.push(v);commit();renderStatus();toast('"'+v+'" 상태를 추가했어요.');});
  ni.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();ab.click();}});
  s.appendChild(el('div',{class:'slist',style:'grid-template-columns:minmax(0,1fr) auto'},[ni,ab]));
  view.appendChild(s);setNav('admin');document.title='상태 이름 · 꿈고래 아카이브';
}

function renderAboutEdit(){
  if(!needEdit())return;
  var a=data.about||{};view.innerHTML='';
  var s=adminHead('소개 글 수정','"만든 사람" 페이지에 보이는 글이에요.');
  var t=el('textarea',{id:'a-intro'});t.value=a.intro||'';
  var c=el('input',{id:'a-contact',type:'text',value:a.contact||'',placeholder:'메일 주소나 링크'});
  var f=el('form',{class:'fields',style:'max-width:640px;margin-top:24px;display:grid;gap:20px'},[
    el('div',{class:'field form'},[el('label',{for:'a-intro',text:'소개'}),t,el('p',{class:'help',text:'빈 줄로 문단을 나눠요.'})]),
    el('div',{class:'field form'},[el('label',{for:'a-contact',text:'연락할 곳'}),c]),
    el('div',{class:'actions'},[el('button',{class:'cta',type:'submit',text:'저장'}),el('a',{class:'cta ghost',href:'#/admin',text:'취소'})])]);
  [].forEach.call(f.querySelectorAll('.field.form'),function(x){x.style.display='grid';x.style.gridTemplateColumns='1fr';x.style.marginTop='0';});
  f.addEventListener('submit',function(e){e.preventDefault();data.about={intro:t.value.trim(),contact:c.value.trim()};commit();location.hash='#/admin';toast('저장했어요. 반영을 눌러 공개하세요.');});
  s.appendChild(f);view.appendChild(s);setNav('admin');
}

/* ---------------- 라우팅 ---------------- */
function route(){
  var h=(location.hash||'#/').replace(/^#/,''),parts=h.split('/').filter(Boolean);
  clearLives();updateCounts();
  if(!parts.length){pageEl.hidden=true;heroEl.hidden=false;document.body.classList.add('lock');document.title='꿈고래 아카이브';hero.start();return;}
  hero.stop();heroEl.hidden=true;pageEl.hidden=false;document.body.classList.remove('lock');
  if(parts[0]==='c')renderList(parts[1]||'all');
  else if(parts[0]==='p')renderDetail(parts[1]);
  else if(parts[0]==='about')renderAbout();
  else if(parts[0]==='admin'){
    if(parts[1]==='new')renderEdit(null);
    else if(parts[1]==='edit')renderEdit(parts[2]);
    else if(parts[1]==='status')renderStatus();
    else if(parts[1]==='about')renderAboutEdit();
    else renderAdmin();
  }else renderList('all');
  window.scrollTo(0,0);
  if(!(parts[0]==='admin'&&(parts[1]==='new'||parts[1]==='edit'))){var h1=view.querySelector('h1');if(h1){h1.setAttribute('tabindex','-1');h1.focus({preventScroll:true});}}
}
window.addEventListener('hashchange',function(){if(!/^#\/c\//.test(location.hash))filter.status='all';route();});
var rt=0;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(!heroEl.hidden)hero.resize();},120);});

try{
  var fl=sessionStorage.getItem('ggr-flash'),rr=sessionStorage.getItem('ggr-route');
  if(fl){sessionStorage.removeItem('ggr-flash');setTimeout(function(){toast(fl);},400);}
  if(rr){sessionStorage.removeItem('ggr-route');if(!location.hash||location.hash==='#/'||location.hash==='#')location.hash=rr;}
}catch(e){}
route();
initEditing();

}
})();
