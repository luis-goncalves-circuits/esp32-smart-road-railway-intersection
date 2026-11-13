const canvas=document.querySelector("#scene"),ctx=canvas.getContext("2d"),statusEl=document.querySelector("#status");
let cars=[],trains=[],hold=false,selected=0;
function addCar(){cars.push({x:450,y:40,vx:0,vy:0,color:["#e76f51","#4cc9f0","#f4a261"][cars.length%3]});selected=cars.length-1}
function addTrain(){trains.push({x:40,y:285,vx:2,vy:0})}
function reset(){cars=[];trains=[];hold=false;addCar();status("normal");draw()}
function status(s){statusEl.textContent="Estado: "+s}
function draw(){ctx.clearRect(0,0,900,600);ctx.fillStyle="#497b4d";ctx.fillRect(0,0,900,600);ctx.fillStyle="#343a40";ctx.fillRect(0,210,900,180);ctx.fillRect(360,0,180,600);
ctx.strokeStyle="#f8f9fa";ctx.setLineDash([18,14]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(450,0);ctx.lineTo(450,600);ctx.moveTo(0,300);ctx.lineTo(900,300);ctx.stroke();ctx.setLineDash([]);
ctx.strokeStyle="#d9d9d9";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,270);ctx.lineTo(900,270);ctx.moveTo(0,330);ctx.lineTo(900,330);ctx.stroke();
ctx.fillStyle=hold?"#d00000":"#2a9d8f";ctx.fillRect(375,190,150,18);
cars.forEach((c,i)=>{ctx.fillStyle=c.color;ctx.fillRect(c.x-12,c.y-20,24,40);if(i===selected){ctx.strokeStyle="#fff";ctx.strokeRect(c.x-16,c.y-24,32,48)}});
trains.forEach(t=>{ctx.fillStyle="#f1c40f";ctx.fillRect(t.x-55,t.y-15,110,30)});
requestAnimationFrame(()=>{});}
function tick(){for(const c of cars){c.x+=c.vx;c.y+=c.vy;c.vx*=.85;c.vy*=.85;c.x=Math.max(15,Math.min(885,c.x));c.y=Math.max(15,Math.min(585,c.y))}
for(const t of trains){t.x+=t.vx;t.y+=t.vy;if(t.x>950)t.x=-50;if(t.x< -50)t.x=950}draw();requestAnimationFrame(tick)}
window.addEventListener("keydown",e=>{const k=e.key;if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k))return;e.preventDefault();const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[k];if(e.shiftKey&&trains.length){const t=trains.at(-1);t.vx=d[0]*3;t.vy=d[1]*3}else if(cars.length){const c=cars[selected];c.vx=d[0]*3;c.vy=d[1]*3}});
document.querySelector("#addCar").onclick=addCar;document.querySelector("#addTrain").onclick=addTrain;document.querySelector("#reset").onclick=reset;
document.querySelector("#violation").onclick=()=>{hold=true;status("INCIDENT_HOLD — tráfego retido; verificar a zona antes de rearmar")};
reset();tick();
