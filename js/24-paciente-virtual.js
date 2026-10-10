(function (OVA) {
    OVA.PacienteVirtual = OVA.PacienteVirtual || {};

// --- PACIENTE VIRTUAL · MANIFESTACIONES CLÍNICAS (Módulo 02, Unidad 2) ---
//
// Adaptación del prototipo «Paciente virtual · Manifestaciones clínicas» a la
// arquitectura del OVA. El motor de animación se conserva íntegro; lo que
// cambia es su acoplamiento a la página:
//
// · No hay un simulador con pestañas, sino cinco pacientes: uno en cada
//   apartado (2.1 a 2.5), fijado a su manifestación con data-manifestacion y
//   colocado en el espacio que ocupaba la imagen, alternando lado. La lectura
//   clínica que los acompaña es la del documento de módulos, que ya está en
//   el HTML; el panel de texto del prototipo se retira para no dar dos
//   versiones distintas de lo mismo. Quedan solo «Estado basal», para
//   comparar, y «Reiniciar animación».
// · Cada instancia renombra los identificadores de su SVG con un prefijo
//   propio («pv1-», «pv2-»…). El prototipo era una página entera y podía
//   llamar «sh» a un degradado; aquí hay cinco copias en el mismo documento y
//   un «url(#sh)» repetido haría que las cinco camisetas siguieran a la
//   primera.
// · Las consultas salen de la raíz del widget, no del documento.
// · El bucle de animación se detiene cuando su nodo deja de estar en el
//   documento: los módulos se reemplazan con innerHTML y, de otro modo, cada
//   visita al Módulo 02 dejaría un requestAnimationFrame vivo.
//
// El montaje va por el mismo MutationObserver sobre #vista-modulo que los
// demás widgets, porque los <script> de un módulo inyectado no se ejecutan.

/* ===== 1. ESTADOS DEL PACIENTE =====
 El texto clínico de cada manifestación es el del documento de módulos y vive
 en el HTML, junto al paciente. Aquí solo queda el rótulo del estado, que
 describe lo que se ve en la escena y da el texto alternativo del SVG. */
const CONTENT={
basal:{t:"Paciente en estado basal",estado:"Consciente · respiración normal"},
palpitaciones:{t:"Palpitaciones",estado:"Consciente · sentado"},
disnea:{t:"Disnea",estado:"Consciente · esfuerzo respiratorio"},
dolor:{t:"Dolor torácico",estado:"Consciente · molestia precordial"},
mareo:{t:"Mareo / presíncope",estado:"Consciente · inestable"},
sincope:{t:"Síncope",estado:"Sin respuesta · pérdida del tono postural"}
};

/* ===== 2. POSES =====
 Brazos [marco,x,y,ángulo]: R reposo · G colgando · T tronco · H cabeza · P pelvis · W mundo */
const BASE={tilt:0,lean:0,hrot:0,hdrop:0,sh:0,eye:1,sq:0,gx:0,gy:0,br:0,fr:0,wo:0,smile:.05,mo:0,mw:11,rate:.24,amp:1,beat:0,fxS:0,fxR:0,fxE:0,fxW:0,fxG:0,stab:0,dz:0,pr:0,py:245,px:260,kb:0,press:0,
 L:['R',0,0,0],R:['R',0,0,0]};
const W={pr:2.3,py:2.5,px:2.5,tilt:3.2,hrot:3,hdrop:3.5,sh:4,lean:3,eye:12,sq:8,br:7,fr:7,wo:7,smile:6,mo:8,mw:6,gx:9,gy:9,rate:1.5,amp:2,kb:3,stab:2,dz:2,press:3,fxS:4,fxR:4,fxE:4,fxW:4,fxG:4};
const POSES={
basal:{},
palpitaciones:{fxE:1,fxG:.8,R:['T',36,-62,100],br:1.4,wo:.45,smile:-.1,gy:.9,rate:.27,amp:1.1,beat:1,tilt:-1,stab:.15},
disnea:{fxW:1,lean:.55,sh:5,hdrop:5,L:['P',-38,22,18],R:['P',38,22,-18],eye:.85,sq:.35,br:1.2,wo:.3,fr:.3,smile:-.2,mo:.8,mw:8.5,rate:.74,amp:2.1,gy:.5},
dolor:{fxR:1,R:['T',24,-62,104,.22],L:['P',-36,22,18],tilt:-3,hrot:-4,lean:.14,hdrop:3,sh:2,eye:.6,sq:.7,br:-.3,fr:1,wo:.3,smile:-.8,mo:.15,mw:10,rate:.4,amp:1.3,press:1,gy:.7},
mareo:{fxS:1,L:['W',205,246,60],R:['H',28,-8,140],tilt:-7,hrot:-9,lean:.1,hdrop:3,sh:-2,eye:.62,br:.9,wo:.8,smile:-.3,mo:.25,mw:10,rate:.33,amp:1.1,stab:1,dz:1},
sincope:t=>t<.6?{eye:.45,hrot:6,tilt:3,hdrop:3,gy:.8,wo:.5,smile:-.1,mo:.1}
 :t<1.5?{eye:0,hrot:15,tilt:12,hdrop:9,sh:-5,lean:.12,kb:.3,mo:.3,rate:.2,amp:.7,L:['G',0,0,0],R:['G',0,0,0]}
 :t<2.7?{eye:0,pr:48,py:296,px:252,tilt:20,hrot:22,hdrop:11,sh:-6,lean:.1,kb:.8,mo:.3,rate:.2,amp:.6,L:['G',0,0,0],R:['G',0,0,0]}
 :{eye:0,pr:90,py:338,px:246,tilt:0,hrot:7,mo:.28,smile:0,rate:.18,amp:.45,L:['T',-56,-5,0,.45],R:['T',56,-5,0,.45]}
};

/* ===== 3. MARCADO ===== */

const SVG = `
   <svg class="pv-svg" id="pv-sv" viewBox="0 -16 520 436" role="img" aria-label="Paciente virtual animado: hombre mayor con camiseta azul">
    <defs>
     <linearGradient id="pv-sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f81c6"/><stop offset="1" stop-color="#3a68a8"/></linearGradient>
     <linearGradient id="pv-pt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a939d"/><stop offset="1" stop-color="#6e7681"/></linearGradient>
     <linearGradient id="pv-hs" x1="0" x2="1"><stop offset="0" stop-color="#ecc5a4"/><stop offset="1" stop-color="#dba784"/></linearGradient>
     <radialGradient id="pv-fc" cx=".42" cy=".36" r=".78"><stop offset="0" stop-color="#f3cfb1"/><stop offset=".6" stop-color="#e7b894"/><stop offset="1" stop-color="#cf9672"/></radialGradient>
     <linearGradient id="pv-hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e6ea"/><stop offset="1" stop-color="#9aa1a9"/></linearGradient>
     <radialGradient id="pv-ir"><stop offset="0" stop-color="#7d6247"/><stop offset="1" stop-color="#43321f"/></radialGradient>
     <radialGradient id="pv-js"><stop offset="0" stop-color="#7a4a31" stop-opacity=".42"/><stop offset="1" stop-color="#7a4a31" stop-opacity="0"/></radialGradient>
     <radialGradient id="pv-gl"><stop offset="0" stop-color="#ff3b30" stop-opacity=".7"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
     <radialGradient id="pv-gs"><stop offset="0" stop-color="#14263f" stop-opacity=".2"/><stop offset="1" stop-color="#14263f" stop-opacity="0"/></radialGradient>
     <linearGradient id="pv-so" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#58606b"/><stop offset="1" stop-color="#3a4049"/></linearGradient>
     <clipPath id="pv-ec"><path d="M-8.5,.5C-5,-5.5 1,-7 4.5,-5.5C7,-4.5 8.3,-2 9,.5C5,5 -3,5.5 -8.5,.5Z"/></clipPath>
     <path id="pv-shirtP"/>
     <clipPath id="pv-shc"><use href="#pv-shirtP"/></clipPath>
    </defs>
    <ellipse cx="260" cy="408" rx="240" ry="9" fill="url(#pv-gs)"/>
    <g id="pv-bench"><rect x="190" y="268" width="9" height="136" rx="3" fill="#b3c4da"/><rect x="325" y="268" width="9" height="136" rx="3" fill="#b3c4da"/><rect x="172" y="250" width="180" height="22" rx="9" fill="#c9d7e8"/><rect x="178" y="252" width="168" height="4" rx="2" fill="#fff" opacity=".45"/></g>
    <g id="pv-mat" opacity="0"><rect x="62" y="386" width="396" height="22" rx="11" fill="#9db9d9"/><rect x="72" y="388" width="376" height="4" rx="2" fill="#fff" opacity=".35"/></g>
    <g id="pv-shoes"></g>
    <g id="pv-legs"></g>
    <g id="pv-pelv"><path d="M-47,-20C-52,-2 -50,16 -40,24C-20,29 20,29 40,24C50,16 52,-2 47,-20Z" fill="url(#pv-pt)"/><path id="pv-lapf" d="M-34,0C-36,12 -42,20 -48,21M34,0C36,12 42,20 48,21" fill="none" stroke="#2b3138" stroke-width="1.6" stroke-linecap="round" opacity=".2"/></g>
    <path id="pv-neck" fill="#dba783"/>
    <g id="pv-torso">
     <use href="#pv-shirtP" fill="url(#pv-sh)"/>
     <g clip-path="url(#pv-shc)">
      <ellipse cx="-30" cy="-70" rx="30" ry="62" fill="#fff" opacity=".08"/>
      <path d="M62,-130L22,-130C30,-80 26,-24 32,18L62,18Z" fill="#0b2145" opacity=".15"/>
      <ellipse cx="-52" cy="-90" rx="9" ry="16" fill="#0b2145" opacity=".13"/><ellipse cx="52" cy="-90" rx="9" ry="16" fill="#0b2145" opacity=".16"/>
      <path d="M-34,-62Q0,-46 34,-62" fill="none" stroke="#0b2145" stroke-width="8" stroke-linecap="round" opacity=".07"/>
      <g id="pv-folds" fill="none" stroke-linecap="round"><path d="M-32,-34C-14,-24 14,-24 32,-34" stroke="#0b2145" stroke-width="1.6" opacity=".2"/><path d="M-30,-22C-12,-13 12,-13 30,-22" stroke="#0b2145" stroke-width="1.4" opacity=".16"/><path d="M-41,-60C-37,-40 -39,-20 -43,-4M41,-60C37,-40 39,-20 43,-4" stroke="#0b2145" stroke-width="1.5" opacity=".14"/><path d="M-31,-33C-14,-23 14,-23 31,-33" stroke="#fff" stroke-width="1" opacity=".14"/></g>
      <path d="M-50,5C-30,14 30,14 50,5" fill="none" stroke="#27497f" stroke-width="2.4" opacity=".5"/>
     </g>
     <path id="pv-collar" fill="none" stroke="#2c5390" stroke-width="3.6" stroke-linecap="round"/>
    </g>
    <g id="pv-head">
     <ellipse cy="40" rx="24" ry="11" fill="url(#pv-js)"/>
     <g id="pv-ears"></g>
     <path d="M0,-39C16,-39 28,-27 28.5,-8C28.7,4 27.5,13 23.5,23C19.5,33 10.5,41.5 0,41.5C-10.5,41.5 -19.5,33 -23.5,23C-27.5,13 -28.7,4 -28.5,-8C-28,-27 -16,-39 0,-39Z" fill="url(#pv-fc)"/>
     <path d="M28.5,-8C28.7,4 27.5,13 23.5,23C19.5,33 10.5,41.5 0,41.5C9,36 17,28 20,14C22,6 23,-2 22,-10Z" fill="#8a5233" opacity=".13"/>
     <path d="M-23,20C-17,32 -9,38 0,38.5C9,38 17,32 23,20C15,26 8,28 0,28C-8,28 -15,26 -23,20Z" fill="#8a5233" opacity=".07"/>
     <ellipse cx="-16" cy="12" rx="8" ry="5" fill="#e07a6a" opacity=".1"/><ellipse cx="16" cy="12" rx="8" ry="5" fill="#e07a6a" opacity=".1"/>
     <g id="pv-wr" fill="none" stroke="#a9704f" stroke-linecap="round"><path id="pv-wf" d="M-14,-24Q0,-26.5 14,-24M-11,-20.5Q0,-22.5 11,-20.5" stroke-width="1" opacity=".2"/><path id="pv-wg" d="M-2.6,-17L-2.3,-9M2.6,-17L2.3,-9" stroke-width="1.1" opacity="0"/><path d="M-23,-2L-27,-4M-23,1L-27,2M23,-2L27,-4M23,1L27,2M-8,13C-12,19 -13,25 -12,31M8,13C12,19 13,25 12,31" stroke-width="1" opacity=".22"/></g>
     <g id="pv-eL" transform="translate(-14 -4) scale(-1 1)"></g><g id="pv-eR" transform="translate(14 -4)"></g>
     <path id="pv-bL" fill="#858c94" stroke="#858c94" stroke-width="1" stroke-linejoin="round"/><path id="pv-bR" fill="#858c94" stroke="#858c94" stroke-width="1" stroke-linejoin="round"/>
     <path d="M1.5,-8C4.5,-2 6.5,6 8.8,12C6,14 2.5,12 1,9Z" fill="#a56b4a" opacity=".15"/>
     <path d="M-8.5,12.5C-9,9.5 -6.5,8 -4,9C-2,10 2,10 4,9C6.5,8 9,9.5 8.5,12.5C7,15.5 3,16.5 0,16C-3,16.5 -7,15.5 -8.5,12.5Z" fill="#d79d7a" opacity=".5"/>
     <path d="M-1.5,-6C-2.5,2 -5.5,7 -7.5,10.5M-6.8,12.5Q0,17.8 6.8,12.5" fill="none" stroke="#b17e5f" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>
     <ellipse cx="-3.6" cy="14" rx="2" ry="1.1" fill="#7b4731" opacity=".5"/><ellipse cx="3.6" cy="14" rx="2" ry="1.1" fill="#7b4731" opacity=".5"/>
     <ellipse cx="-.5" cy="10" rx="2" ry="3" fill="#fff" opacity=".16"/>
     <path d="M-1.8,17.5L-1.6,22M1.8,17.5L1.6,22" stroke="#a9704f" stroke-width="1" opacity=".16"/>
     <path d="M-4,34Q0,36 4,34" fill="none" stroke="#8a5233" stroke-width="1.4" stroke-linecap="round" opacity=".14"/>
     <g id="pv-mth"><path id="pv-mcav" fill="#5c2a2a"/><path id="pv-mlp" fill="none" stroke="#c0766a" stroke-width="3.4" stroke-linecap="round" opacity=".32"/><path id="pv-mup" fill="none" stroke="#b4705f" stroke-width="2.4" stroke-linecap="round" opacity=".22"/><path id="pv-mln" fill="none" stroke="#8c473e" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></g>
     <path d="M-29.5,-6C-34,-30 -20,-47 0,-47C20,-47 34,-30 29.5,-6C28.5,-12 27,-16 25,-19.5C21,-26 14,-29 6,-27.5C0,-26.5 -3,-29 -9,-28.5C-17,-28 -23,-24 -25.5,-18C-27.5,-14 -28.5,-10 -29.5,-6Z" fill="url(#pv-hg)"/>
     <path d="M29.5,-6C30,-1 29,3 27.5,6C27,1 27,-3 26.5,-6ZM-29.5,-6C-30,-1 -29,3 -27.5,6C-27,1 -27,-3 -26.5,-6Z" fill="#a7adb4"/>
     <path d="M-20,-38C-12,-42 -2,-42 6,-41M8,-43C16,-41 22,-36 25,-28M-26,-26C-24,-34 -18,-39 -12,-41" fill="none" stroke="#f4f6f8" stroke-width=".9" opacity=".55" stroke-linecap="round"/>
     <path d="M-10,-33C-4,-35 4,-34 10,-32M14,-38C20,-33 24,-27 26,-20" fill="none" stroke="#7d848c" stroke-width=".9" opacity=".35" stroke-linecap="round"/>
    </g>
    <circle id="pv-glow" r="38" fill="url(#pv-gl)" opacity="0"/>
    <g id="pv-arms"></g>
    <g id="pv-fx" fill="none" stroke-linecap="round" stroke-linejoin="round">
     <g id="pv-swirl" opacity="0" stroke="#5b9bd5" stroke-width="2.6" stroke-dasharray="12 9"><ellipse id="pv-sw1" rx="44" ry="10"/><ellipse id="pv-sw2" rx="33" ry="7" cy="10"/></g>
     <g id="pv-rings" opacity="0" stroke="#e5383b" stroke-width="2"><circle id="pv-rg1"/><circle id="pv-rg2"/></g>
     <g id="pv-ecg" opacity="0"><path id="pv-ecp" pathLength="100" stroke-dasharray="100" d="M0,30L18,30L24,24L30,36L38,4L46,48L54,30L84,30" stroke="#e5383b" stroke-width="2.4"/></g>
     <g id="pv-wind" opacity="0" stroke="#5b9bd5" stroke-width="2.6"><path d="M0,-10q9,-5 18,0"/><path d="M0,2q9,-5 18,0"/><path d="M0,14q9,-5 18,0"/></g>
    </g>
   </svg>
`;

// Hay un paciente por manifestación y los cinco viven en la misma página, de
// modo que los identificadores del SVG no pueden repetirse: un «url(#pv-sh)»
// duplicado haría que las cinco camisetas siguieran a la primera. Cada
// instancia recibe su propio prefijo y lo guarda para el motor.
let instancias = 0;

function construir(raiz) {
    const px = 'pv' + (++instancias) + '-';
    raiz.dataset.pvPrefijo = px;

    const svg = SVG.replace(/id="pv-/g, 'id="' + px).replace(/#pv-/g, '#' + px);

    raiz.innerHTML =
        '<div class="pv-stage"><span class="pv-badge" id="' + px + 'badge"></span>' + svg + '</div>' +
        '<div class="pv-ctl">' +
        '<button type="button" class="pv-boton" id="' + px + 'rst">Reiniciar animación</button>' +
        '<button type="button" class="pv-boton" id="' + px + 'bas">Estado basal</button>' +
        '</div>';
}

/* ===== 4. MOTOR ===== */

function arrancar(raiz) {
const PX=raiz.dataset.pvPrefijo||'pv-',pref=s=>s.split('#pv-').join('#'+PX);
const $=s=>raiz.querySelector(pref(s)),RM=matchMedia('(prefers-reduced-motion: reduce)'),
 f=n=>Math.round(n*100)/100,P=p=>f(p[0])+','+f(p[1]),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,k)=>a+(b-a)*k,
 nz=(t,a,b,c)=>(Math.sin(t*a)+.6*Math.sin(t*b+1.7)+.4*Math.sin(t*c+4.1))/2,RAD=Math.PI/180;
const NUM=Object.keys(BASE).filter(k=>typeof BASE[k]==='number');
const cur=Object.assign({},BASE),vel={};NUM.forEach(k=>vel[k]=0);
let id='basal',t=0,time=0,last=performance.now(),phase=0,nextBeat=1,pulse=0,nextBlink=2.2,blinkT=-1,nextSac=2,queue=null,resumeAt=0;
const FX={};['glow','swirl','sw1','sw2','rings','rg1','rg2','ecg','ecp','wind'].forEach(k=>FX[k]=raiz.querySelector('#'+PX+k));
const sac={x:0,y:0,tx:0,ty:0,vx:0,vy:0};
const skin='#e3b08c';

/* geometría auxiliar */
const cap=(a,b,wa,wb)=>{let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;const nx=-dy,ny=dx;
 return`M${P([a[0]+nx*wa,a[1]+ny*wa])}L${P([b[0]+nx*wb,b[1]+ny*wb])}A${f(wb)} ${f(wb)} 0 0 0 ${P([b[0]-nx*wb,b[1]-ny*wb])}L${P([a[0]-nx*wa,a[1]-ny*wa])}A${f(wa)} ${f(wa)} 0 0 0 ${P([a[0]+nx*wa,a[1]+ny*wa])}Z`};
const side=(a,b,wa,wb,dir)=>{let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;let nx=-dy/l,ny=dx/l;if(nx+ny>0){nx=-nx;ny=-ny}nx*=dir;ny*=dir;
 return cap([a[0]+nx*wa*.55,a[1]+ny*wa*.55],[b[0]+nx*wb*.55,b[1]+ny*wb*.55],wa*.42,wb*.42)};
const ik=(S,T,k,w=0)=>{const L1=60,L2=56;let dx=T[0]-S[0],dy=T[1]-S[1],d=Math.hypot(dx,dy)||.01;const m=L1+L2-3,mn=26;
 if(d>m){dx*=m/d;dy*=m/d;d=m}else if(d<mn){dx*=mn/d;dy*=mn/d;d=mn}
 const a=Math.atan2(dy,dx),A=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1)),g=a+k*A*(1-2*w);
 return[[S[0]+L1*Math.cos(g),S[1]+L1*Math.sin(g)],[S[0]+dx,S[1]+dy]]};

/* construcción de componentes repetidos */
const ear=`<path d="M27.5,-8C33,-10 36,-3 35,5C34.5,10 31,14 26.5,13Z" fill="#d9a27e"/><path d="M30,-3C33,-1 33,6 30,9" fill="none" stroke="#b3785a" stroke-width=".9" opacity=".6" stroke-linecap="round"/>`;
$('#pv-ears').innerHTML=ear+`<g transform="scale(-1 1)">${ear}</g>`;
const eyeT=pref(`<g clip-path="url(#pv-ec)"><path d="M-8.5,.5C-5,-5.5 1,-7 4.5,-5.5C7,-4.5 8.3,-2 9,.5C5,5 -3,5.5 -8.5,.5Z" fill="#f5f0ea"/><g class="ir"><circle r="4.4" fill="url(#pv-ir)"/><circle r="4.4" fill="none" stroke="#2a2018" stroke-width=".7" opacity=".6"/><circle r="1.9" fill="#15191d"/><circle cx="1.4" cy="-1.6" r=".95" fill="#fff" opacity=".9"/></g><path class="lid" fill="#dba781"/><path class="low" fill="#e4b490"/></g><path class="crs" fill="none" stroke="#a9704f" stroke-width="1" stroke-linecap="round"/><path class="lsh" fill="none" stroke="#3d2a22" stroke-linecap="round"/><path d="M-6.5,8.8Q.5,11.8 8,7.8" fill="none" stroke="#a9704f" stroke-width="1" opacity=".28" stroke-linecap="round"/>`);
const EYES=['#pv-eL','#pv-eR'].map((q,i)=>{const g=$(q);g.innerHTML=eyeT;return{m:i?1:-1,ir:g.querySelector('.ir'),lid:g.querySelector('.lid'),low:g.querySelector('.low'),crs:g.querySelector('.crs'),lsh:g.querySelector('.lsh')}});
const hand='<path class="u" fill="#d19b77"/>'.repeat(5)+`<path fill="#e6b390" d="M-6.2,-1C-7.6,5 -8.8,12 -8.6,19.2Q0,23.4 8.6,19.2C8.8,12 7.6,5 6.2,-1Z"/><ellipse cx="4.8" cy="9" rx="4.2" ry="7.5" transform="rotate(-16 4.8 9)" fill="#efc6a6" opacity=".55"/><path d="M-3.4,3L-4,17M0,3L0,18M3.2,3L3.6,17" stroke="#b27a58" stroke-width=".8" opacity=".16" fill="none" stroke-linecap="round"/>`+'<path class="fg" fill="#e6b390"/>'.repeat(5);
/* dedos: [x,y,long1,long2,ancho,abertura,factor de flexión] */
const FING=[[-6,18.6,8,7,2.9,-.12,1.25],[-2.1,19.6,11,9.6,3.1,-.04,1.1],[2.1,20,12.4,10.6,3.3,.04,1],[6.2,19.4,11.2,9.6,3.1,.12,.9]],DEFCU={R:.38,G:.5,T:.06,H:.1,P:.12,W:.12};
function drawHand(A,cu,tm,mot){for(let i=0;i<5;i++){let p0,p1,p2,w;
  if(i<4){const[x,y,l1,l2,wd,sp,k]=FING[i],c=clamp(cu*k+.035*nz(tm+i*2.1+A.s,.6,.9,1.4)*mot,0,1.15),c1=c*.95,c2=c1+c*.8,L1=l1*Math.max(.3,Math.cos(c1)),L2=l2*Math.max(.18,Math.cos(c2)),a=sp*(1+(1-cu)*.8),dx=Math.sin(a),dy=Math.cos(a);
   p0=[x,y];p1=[x+L1*dx,y+L1*dy];p2=[p1[0]+L2*dx,p1[1]+L2*dy];w=wd}
  else{const th=.66-.5*cu,th2=th-cu*.55+.08;p0=[5.4,6.5];p1=[p0[0]+8.5*Math.sin(th),p0[1]+8.5*Math.cos(th)];const L2=7.6*(1-.25*cu);p2=[p1[0]+L2*Math.sin(th2),p1[1]+L2*Math.cos(th2)];w=3.9}
  A.ff[i].setAttribute('d',cap(p0,p1,w,w*.9)+cap(p1,p2,w*.9,w*.74));A.fu[i].setAttribute('d',cap(p0,p1,w+.8,w*.9+.8)+cap(p1,p2,w*.9+.8,w*.74+.8))}}

const ARM=[-1,1].map((s,i)=>{const g=$('#pv-arms');const e=document.createElementNS('http://www.w3.org/2000/svg','g');
 e.innerHTML=`<path class="ua" fill="${skin}"/><path class="uas" fill="#8a5233" opacity=".12"/><path class="fa" fill="${skin}"/><path class="fas" fill="#8a5233" opacity=".12"/><circle class="el" r="12" fill="#dfab87"/><g class="hd">${hand}</g><path class="sl" fill="#406fb2"/><path class="slh" fill="#fff" opacity=".1"/><path class="sls" fill="#0b2145" opacity=".13"/><path class="hem" fill="none" stroke="#2c5390" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
 g.appendChild(e);const q=c=>e.querySelector('.'+c);
 return{s,p:null,v:[0,0],a:null,av:0,cu:.38,cv:0,fu:[...e.querySelectorAll('.u')],ff:[...e.querySelectorAll('.fg')],ua:q('ua'),uas:q('uas'),fa:q('fa'),fas:q('fas'),el:q('el'),hd:q('hd'),sl:q('sl'),slh:q('slh'),sls:q('sls'),hem:q('hem')}});
const LEG=[-1,1].map(s=>{const sh=document.createElementNS('http://www.w3.org/2000/svg','g');
 sh.innerHTML=pref(`<path d="M-16,2C-17,-6 -9,-11 0,-11C9,-11 17,-6 16,2C16,8 13,10 0,10C-13,10 -16,8 -16,2Z" fill="url(#pv-so)"/><path d="M-16.5,5Q0,13.5 16.5,5L16.5,8.5Q0,17 -16.5,8.5Z" fill="#eef0f2"/><path d="M-5,-7L5,-7M-6,-3.5L6,-3.5" stroke="#d9dde2" stroke-width=".9" opacity=".6"/><ellipse cy="-5" rx="8" ry="3" fill="#fff" opacity=".1"/>`);
 $('#pv-shoes').appendChild(sh);
 const lg=document.createElementNS('http://www.w3.org/2000/svg','g');lg.innerHTML=`<path class="b" fill="#79828d"/><path class="h" fill="#fff" opacity=".1"/><path class="d" fill="#1f252b" opacity=".13"/><path class="k" fill="none" stroke="#2b3138" stroke-width="1.4" opacity=".22" stroke-linecap="round"/><path class="c" fill="none" stroke="#2b3138" stroke-width="1.4" opacity=".3" stroke-linecap="round"/>`;
 $('#pv-legs').appendChild(lg);const q=c=>lg.querySelector('.'+c);
 return{s,sh,b:q('b'),h:q('h'),d:q('d'),k:q('k'),c:q('c')}});

/* ===== bucle ===== */
const desired=()=>{const p=POSES[id];return Object.assign({},BASE,typeof p==='function'?p(t):p)};
function frame(now){
 if(!raiz.isConnected)return;   /* el modulo se reemplaza con innerHTML: el bucle muere con su nodo */
 const dt=clamp((now-last)/1000,0,.05);last=now;time+=dt;t+=dt;
 const mot=RM.matches?.25:1;
 if(queue&&time>=resumeAt){id=queue;queue=null;t=0}
 const D=desired();
 /* resortes críticamente amortiguados (independientes de la frecuencia de refresco) */
 const n=Math.max(1,Math.ceil(dt/.01)),h=dt/n;
 for(let i=0;i<n;i++)for(const k of NUM){const w=W[k]||5,a=w*w*(D[k]-cur[k])-2*w*vel[k];vel[k]+=a*h;cur[k]+=vel[k]*h}
 /* respiración y latido */
 phase+=dt*cur.rate*6.283;const b=Math.sin(phase),e=cur.amp*b*(RM.matches?.5:1);
 if(cur.beat>.5&&time>nextBeat){pulse=Math.random()<.25?1.5:1;nextBeat=time+.32+Math.random()*.5}
 pulse*=Math.exp(-dt*9);
 /* parpadeo con párpados */
 let bl=0;if(time>nextBlink){blinkT=0;nextBlink=time+(Math.random()<.2?.35:2.6+Math.random()*3.6)}
 if(blinkT>=0){blinkT+=dt/.2;if(blinkT>=1)blinkT=-1;else bl=Math.sin(Math.PI*blinkT)}
 const cyc=((time*.15)%1),dzc=cur.dz*(cyc<.2?Math.sin(Math.PI*cyc/.2):0);
 const cl=clamp(Math.max(1-cur.eye,bl,dzc),0,1);
 /* sacadas oculares */
 if(time>nextSac){sac.tx=(Math.random()-.5)*2.4;sac.ty=(Math.random()-.5)*1.2;nextSac=time+2+Math.random()*3}
 sac.vx+=(400*(sac.tx-sac.x)-40*sac.vx)*dt;sac.x+=sac.vx*dt;sac.vy+=(400*(sac.ty-sac.y)-40*sac.vy)*dt;sac.y+=sac.vy*dt;
 /* tronco */
 const sway=mot*(.45*nz(time,.5,.83,1.3)+cur.stab*2.6*nz(time,.37,.61,.97));
 const Bd=cur.pr+cur.tilt+sway,B=Bd*RAD,Bc=Math.cos(B),Bs=Math.sin(B),sy=1-.22*cur.lean,dy=cur.lean*22,px=cur.px,py=cur.py;
 const TT=(x,y)=>{const Y=y*sy+dy;return[px+x*Bc-Y*Bs,py+x*Bs+Y*Bc]};
 const pr=cur.pr*RAD,Pc=Math.cos(pr),Ps=Math.sin(pr),PT=(x,y)=>[px+x*Pc-y*Ps,py+x*Ps+y*Pc];
 $('#pv-torso').setAttribute('transform',`translate(${f(px)} ${f(py)}) rotate(${f(Bd)}) translate(0 ${f(dy)}) scale(1 ${f(sy)})`);
 $('#pv-pelv').setAttribute('transform',`translate(${f(px)} ${f(py)}) rotate(${f(cur.pr)})`);
 const Lf=clamp(cur.pr/90,0,1);
 $('#pv-lapf').setAttribute('opacity',.2*(1-Lf));
 /* camiseta: forma deformable (respiración + elevación de hombros) */
 const cw=50+1.8*e+pulse*.35,sY=-111-cur.sh-1.3*e,nY=-131-cur.sh*.7-.8*e,sx=47+.6*e;
 const sd=`M-16,${f(nY)}C-31,${f(nY+2)} -44,${f(sY-12)} -${f(sx+6)},${f(sY)}C-${f(sx+10)},${f(sY+6)} -${f(cw+5)},${f(sY+22)} -${f(cw+4)},${f(sY+30)}C-${f(cw+3)},${f(sY+70)} -${f(cw)},-30 -${f(cw-3)},5C-28,14 28,14 ${f(cw-3)},5C${f(cw)},-30 ${f(cw+3)},${f(sY+70)} ${f(cw+4)},${f(sY+30)}C${f(cw+5)},${f(sY+22)} ${f(sx+10)},${f(sY+6)} ${f(sx+6)},${f(sY)}C44,${f(sY-12)} 31,${f(nY+2)} 16,${f(nY)}C9,${f(nY+13)} -9,${f(nY+13)} -16,${f(nY)}Z`;
 $('#pv-shirtP').setAttribute('d',sd);$('#pv-collar').setAttribute('d',`M-16,${f(nY)}C-9,${f(nY+13)} 9,${f(nY+13)} 16,${f(nY)}`);
 $('#pv-folds').setAttribute('opacity',clamp(.55+cur.lean*1.2,0,1));
 /* cabeza articulada desde la base del cuello */
 const N=TT(0,nY+3),hr=Bd+cur.hrot+mot*(1.1*nz(time,.31,.53,.77)),hrr=hr*RAD,Hc=Math.cos(hrr),Hs=Math.sin(hrr),Dn=51-cur.hdrop-cur.lean*4-.7*e;
  const HC=[N[0]+Dn*Hs,N[1]-Dn*Hc],HT=(x,y)=>[HC[0]+x*Hc-y*Hs,HC[1]+x*Hs+y*Hc];
 $('#pv-head').setAttribute('transform',`translate(${f(HC[0])} ${f(HC[1])}) rotate(${f(hr)})`);
 /* cuello continuo entre cabeza y hombros */
 const nl=[TT(-17,nY+4),HT(-14.5,26)],nr=[TT(17,nY+4),HT(14.5,26)],cen=[(nl[0][0]+nr[0][0]+nl[1][0]+nr[1][0])/4,(nl[0][1]+nr[0][1]+nl[1][1]+nr[1][1])/4];
 const ctl=(a,b)=>{const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];return[m[0]+(cen[0]-m[0])*.14,m[1]+(cen[1]-m[1])*.14]};
 $('#pv-neck').setAttribute('d',`M${P(nl[0])}Q${P(ctl(nl[0],nl[1]))} ${P(nl[1])}L${P(nr[1])}Q${P(ctl(nr[0],nr[1]))} ${P(nr[0])}Z`);
 /* rostro: ojos, cejas, boca */
 const sq=cur.sq,gx=cur.gx*0+sac.x+(RM.matches?0:0),gy=cur.gy+sac.y;
 EYES.forEach(E=>{const m=lerp(-6.2,4.4,cl),c=2*m-.4,m2=lerp(7.2,2.8,sq);
  E.ir.setAttribute('transform',`translate(${f(E.m*gx)} ${f(gy)})`);
  E.lid.setAttribute('d',`M-11,-13H11V.4H9.5Q.2,${f(c)} -9,.4H-11Z`);
  E.low.setAttribute('d',`M-11,13H11V.4H9.5Q.2,${f(2*m2-.4)} -9,.4H-11Z`);
  E.lsh.setAttribute('d',`M-9,.4Q.2,${f(c)} 9.5,.4`);E.lsh.setAttribute('stroke-width',f(lerp(1.7,1.2,cl)));
  E.crs.setAttribute('d',`M-7.5,-2.6Q.2,${f(2*m-3.9)} 8.5,-2.4`);E.crs.setAttribute('opacity',.5*(1-cl))});
 const br=cur.br+.35*nz(time,.4,.7,1.1)*mot,fr=cur.fr,wo=cur.wo;
 const brow=s=>{const xi=s*(5.4-fr*1.4),yi=-15-br+fr*2.4-wo*2.6,xp=s*14,yp=-19.6-br-wo*.9+fr*.2,xo=s*24,yo=-15.4-br+wo*2.1-fr*.6;
  return`M${f(xi)},${f(yi-2.2)}Q${f(xp)},${f(yp-3)} ${f(xo)},${f(yo-1.1)}L${f(xo)},${f(yo+.8)}Q${f(xp)},${f(yp+1.6)} ${f(xi)},${f(yi+2.5)}Z`};
 $('#pv-bL').setAttribute('d',brow(-1));$('#pv-bR').setAttribute('d',brow(1));
 $('#pv-wg').setAttribute('opacity',clamp(fr*.4+wo*.12,0,.5));$('#pv-wf').setAttribute('opacity',.18+.07*clamp(br,0,2));
 const sm=cur.smile+.1*nz(time,.3,.5,.9)*mot,w=cur.mw,cy=26,cr=cy-sm*3.2,yU=cy-.4-cur.mo*2,yL=yU+cur.mo*8+.4;
 const up=`M${f(-w)},${f(cr)}Q0,${f(2*yU-cr)} ${f(w)},${f(cr)}`,lo=`Q0,${f(2*yL-cr)} ${f(-w)},${f(cr)}`;
 $('#pv-mln').setAttribute('d',up);$('#pv-mcav').setAttribute('d',cur.mo>.04?up+lo+'Z':'M0,0Z');
 $('#pv-mlp').setAttribute('d',`M${f(-w*.6)},${f(yL+2.4)}Q0,${f(yL+5)} ${f(w*.6)},${f(yL+2.4)}`);$('#pv-mup').setAttribute('d',`M${f(-w*.5)},${f(yU-2)}Q0,${f(yU-3.6)} ${f(w*.5)},${f(yU-2)}`);
 /* piernas: cadena cadera-rodilla-tobillo */
 LEG.forEach(L=>{const s=L.s,a1=(28-26*Lf+cur.kb*6)*RAD,a2=(2+cur.kb*10+Lf*3)*RAD,
  hip=PT(s*20,6),kn=[hip[0]+68*(s*Math.sin(a1)*Pc-Math.cos(a1)*Ps),hip[1]+68*(s*Math.sin(a1)*Ps+Math.cos(a1)*Pc)],
  an=[kn[0]+84*(s*Math.sin(a2)*Pc-Math.cos(a2)*Ps),kn[1]+84*(s*Math.sin(a2)*Ps+Math.cos(a2)*Pc)];
  const md=[kn[0]+(an[0]-kn[0])*.3,kn[1]+(an[1]-kn[1])*.3],LG=(fn,d)=>fn(hip,kn,24,18,d)+fn(kn,md,18,17.5,d)+fn(md,an,17.5,11.5,d),cp=(a,b,wa,wb)=>cap(a,b,wa,wb);
  L.b.setAttribute('d',cap(hip,kn,24,18)+cap(kn,md,18,17.5)+cap(md,an,17.5,11.5));L.h.setAttribute('d',LG(side,1));L.d.setAttribute('d',LG(side,-1));
  const kd=[kn[0]-hip[0],kn[1]-hip[1]],kl=Math.hypot(kd[0],kd[1])||1,kv=[-kd[1]/kl*15,kd[0]/kl*15];
  L.k.setAttribute('d',`M${P([kn[0]-kv[0],kn[1]-kv[1]])}Q${P([kn[0]+kd[0]/kl*3,kn[1]+kd[1]/kl*3])} ${P([kn[0]+kv[0],kn[1]+kv[1]])}`);
  const ad=[an[0]-kn[0],an[1]-kn[1]],al=Math.hypot(ad[0],ad[1])||1,ap=[an[0]-ad[0]/al*7,an[1]-ad[1]/al*7],av=[-ad[1]/al*12,ad[0]/al*12];
  L.c.setAttribute('d',`M${P([ap[0]-av[0],ap[1]-av[1]])}L${P([ap[0]+av[0],ap[1]+av[1]])}`);
  L.sh.setAttribute('transform',`translate(${P([an[0]+ad[0]/al*6,an[1]+ad[1]/al*6])}) rotate(${f(cur.pr-s*(2+cur.kb*10+Lf*3))}) scale(1.12)`)});
 /* brazos: hombro → codo → muñeca → mano */
 ARM.forEach((A,i)=>{const s=A.s,S=TT(s*46,sY+3),tg=D[s<0?'L':'R'],fm=tg[0],x=tg[1],y=tg[2],ha=tg[3];let q,ang;
  if(fm==='R'){q=[S[0]+s*9,S[1]+102];ang=ha+s*8}else if(fm==='G'){q=[S[0]+s*3,S[1]+110];ang=ha+s*14}
  else if(fm==='T'){q=TT(x,y+(fm==='T'&&cur.press?Math.sin(time*1.1)*.8*cur.press*mot:0));if(id==='palpitaciones')q[1]+=Math.min(pulse,1.5)*.8;ang=Bd+ha}
  else if(fm==='H'){q=HT(x,y);ang=hr+ha}else if(fm==='P'){q=PT(x,y);ang=cur.pr+ha}else{q=[x,y];ang=ha}
  if(!A.p)A.p=q.slice();
  for(let j=0;j<n;j++)for(let c=0;c<2;c++){const w=6,a=w*w*(q[c]-A.p[c])-2*w*A.v[c];A.v[c]+=a*h;A.p[c]+=A.v[c]*h}
  A.kw=(A.kw||0)+((fm==='H'?1:0)-(A.kw||0))*Math.min(1,dt*5);const[E,Wr]=ik(S,A.p,-s,A.kw),flw=fm==='R'||fm==='G',thf=Math.atan2(-(Wr[0]-E[0]),Wr[1]-E[1])/RAD,angT=flw?thf*(fm==='G'?.6:.85)+s*3+ha:ang,cuT=tg[4]??DEFCU[fm];
  if(A.a==null)A.a=angT;
  for(let j=0;j<n;j++){let w=8,a=w*w*(angT-A.a)-2*w*A.av;A.av+=a*h;A.a+=A.av*h;w=5;a=w*w*(cuT-A.cu)-2*w*A.cv;A.cv+=a*h;A.cu+=A.cv*h}
  drawHand(A,A.cu,time,mot);
  const M=[S[0]+(E[0]-S[0])*.5,S[1]+(E[1]-S[1])*.5];
  A.ua.setAttribute('d',cap(S,E,15,12.2));A.uas.setAttribute('d',side(S,E,15,12.2,-1));A.fa.setAttribute('d',cap(E,Wr,12.2,8.6));A.fas.setAttribute('d',side(E,Wr,12.2,8.6,-1));
  A.el.setAttribute('cx',f(E[0]));A.el.setAttribute('cy',f(E[1]));
  A.hd.setAttribute('transform',`translate(${P(Wr)}) rotate(${f(A.a)}) scale(${-s*1.12} 1.12)`);
  A.sl.setAttribute('d',cap(S,M,18.5,15.8));A.slh.setAttribute('d',side(S,M,18.5,15.8,1));A.sls.setAttribute('d',side(S,M,18.5,15.8,-1));
  const dx=E[0]-S[0],dy2=E[1]-S[1],dl=Math.hypot(dx,dy2)||1,hv=[-dy2/dl*15.8,dx/dl*15.8];
  A.hem.setAttribute('d',`M${P([M[0]-hv[0],M[1]-hv[1]])}L${P([M[0]+hv[0],M[1]+hv[1]])}`)});
/* indicadores visuales: solo se actualizan mientras son visibles */
 const R_=RM.matches,hrad=hr*RAD,rc=Math.cos(hrad),rs=Math.sin(hrad),at=(el,v)=>{const o=v>.01?f(v):0;if(el._o!==o){el._o=o;el.setAttribute('opacity',o)}return o>0};
 if(at(FX.swirl,cur.fxS*.9)){FX.swirl.setAttribute('transform',`translate(${P([HC[0]+52*rs,HC[1]-52*rc-4])}) rotate(${f(hr*.6)})`);
  if(!R_){FX.sw1.setAttribute('stroke-dashoffset',f(-time*28));FX.sw2.setAttribute('stroke-dashoffset',f(time*28))}}
 if(at(FX.rings,cur.fxR)){const c=TT(12,-76);[FX.rg1,FX.rg2].forEach((g,i)=>{const k=R_?.4:(time*.65+i*.5)%1;g.setAttribute('cx',f(c[0]));g.setAttribute('cy',f(c[1]));g.setAttribute('r',f(9+24*k));g.setAttribute('stroke-opacity',f((1-k)*.95))})}
 const gc=TT(12,-80);
 if(at(FX.glow,cur.fxG*(.55+.45*Math.min(1,pulse)))){FX.glow.setAttribute('cx',f(gc[0]));FX.glow.setAttribute('cy',f(gc[1]))}
 if(at(FX.ecg,cur.fxE)){FX.ecg.setAttribute('transform',`translate(${P([gc[0]+62,gc[1]-78])})`);FX.ecp.setAttribute('stroke-dashoffset',f(R_?0:100-clamp(((time*1.2)%1)/.6,0,1)*100))}
 if(at(FX.wind,cur.fxW)){const c=HT(34,14);FX.wind.setAttribute('transform',`translate(${P(c)}) rotate(${f(hr)})`);
  [...FX.wind.children].forEach((pth,i)=>{const k=R_?.5:(time*1.2+i*.25)%1;pth.setAttribute('transform',`translate(${f(k*14)} 0)`);pth.setAttribute('opacity',f(Math.sin(Math.PI*k)))})}
 /* escena */
 const bo=clamp(1-(Lf-.25)/.5,0,1);$('#pv-bench').setAttribute('opacity',f(bo));$('#pv-mat').setAttribute('opacity',f(clamp(Lf*1.6,0,1)));
 requestAnimationFrame(frame)}
/* ===== 4. INTERFAZ =====
 Cada paciente queda fijado a la manifestación de su apartado (data-manifestacion
 en el HTML del módulo), así que no hay pestañas: solo volver al estado basal
 para comparar y repetir la animación. */
const PRINCIPAL=CONTENT[raiz.dataset.manifestacion]?raiz.dataset.manifestacion:'basal';
function select(k,hold){
 queue=null;id=hold?'basal':k;t=0;
 const c=CONTENT[k];$('#pv-badge').textContent=c.estado;
 $('#pv-sv').setAttribute('aria-label',c.t+'. Paciente virtual animado: '+c.estado)}
/* Reiniciar: vuelve a la postura basal con transición controlada y repite la manifestación */
$('#pv-rst').onclick=()=>{
 if(PRINCIPAL==='basal'){select('basal');return}
 select(PRINCIPAL,true);queue=PRINCIPAL;resumeAt=time+(cur.pr>30?3.2:1.4)};
$('#pv-bas').onclick=()=>select('basal');
raiz._pvSelect=select;
select(PRINCIPAL);requestAnimationFrame(frame);
}

/* ===== 5. MONTAJE ===== */

function montar(raiz) {
    if (raiz.dataset.listo === 'true') return;
    raiz.dataset.listo = 'true';
    construir(raiz);
    arrancar(raiz);
}

const observador = new MutationObserver((mutaciones) => {
    mutaciones.forEach((mutacion) => {
        mutacion.addedNodes.forEach((nodo) => {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('pv-paciente')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.pv-paciente')) : []);
            raices.forEach(montar);
        });
    });
});

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

// --- API PÚBLICA DEL NAMESPACE ---
OVA.PacienteVirtual.montar = montar;

})(window.OVA = window.OVA || {});
