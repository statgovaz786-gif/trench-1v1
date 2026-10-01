const express=require('express'),http=require('http'),WebSocket=require('ws');
const app=express(),server=http.createServer(app),wss=new WebSocket.Server({server}),rooms=new Map();

const html=`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,user-scalable=no"><title>Trench 1v1</title><style>body{margin:0;background:#171614;color:#eee;font:16px Arial;text-align:center}#m{max-width:480px;margin:8vh auto;padding:25px;background:#29261f;border-radius:12px}button,input{padding:14px;border:0;border-radius:8px;margin:5px;font-weight:bold}input{background:#111;color:white;text-transform:uppercase}#g{display:none;height:100vh;flex-direction:column}.top,.bar{background:#211f1b;padding:12px;display:flex;justify-content:space-around}.bar button{flex:1;background:#d7c49a}canvas{flex:1;width:100%;background:#756b58}</style><div id=m><h1>TRENCH 1v1</h1><button id=c>OTAQ YARAT</button><br><input id=i maxlength=6 placeholder="OTAQ KODU"><button id=j>QOŞUL</button><p id=msg></p></div><div id=g><div class=top><b id=s></b><b id=r></b></div><canvas id=cv></canvas><div class=bar><button onclick="sp('K')">KƏŞFİYYAT<br>20</button><button onclick="sp('M')">MÜDAFİƏ<br>30</button><button onclick="sp('Z')">ZİREHLİ<br>60</button></div></div><script>let w,me,code,u=[],sel,cv=document.getElementById('cv'),x=cv.getContext('2d');function con(){w=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);w.onmessage=e=>{let m=JSON.parse(e.data);if(m.type==='room'){me=m.side;code=m.code;msg.textContent='Kod: '+code}if(m.type==='start'){mdiv.style.display='none';g.style.display='flex';resize();requestAnimationFrame(loop)}if(m.type==='state')u=m.units;if(m.type==='error')msg.textContent=m.message}}c.onclick=()=>{con();setTimeout(()=>w.send(JSON.stringify({t:'create'})),150)};j.onclick=()=>{con();setTimeout(()=>w.send(JSON.stringify({t:'join',code:i.value})),150)};function send(){if(w?.readyState===1)w.send(JSON.stringify({t:'state',units:u}))}function sp(t){u.push({o:me,t,x:me==='A'?50:cv.width-50,y:80+Math.random()*(cv.height-160)});send()}function resize(){cv.width=cv.clientWidth;cv.height=cv.clientHeight}s.textContent='';addEventListener('resize',resize);cv.onpointerdown=e=>{let q=cv.getBoundingClientRect(),X=e.clientX-q.left,Y=e.clientY-q.top;sel=u.find(a=>a.o===me&&Math.hypot(a.x-X,a.y-Y)<28)};cv.onpointerup=e=>{if(!sel)return;let q=cv.getBoundingClientRect();sel.x=e.clientX-q.left;sel.y=e.clientY-q.top;sel=null;send()};function draw(){x.fillStyle='#756b58';x.fillRect(0,0,cv.width,cv.height);x.fillStyle='#554c3e';for(let y=55;y<cv.height;y+=105)x.fillRect(0,y,cv.width,22);u.forEach(a=>{x.fillStyle=a.o==='A'?'#4d83ad':'#ad4d4d';x.beginPath();x.arc(a.x,a.y,a.t==='Z'?18:13,0,7);x.fill();x.fillStyle='#111';x.font='bold 10px Arial';x.fillText(a.t,a.x-4,a.y+4)})}function loop(){draw();requestAnimationFrame(loop)}let mdiv=document.getElementById('m'),g=document.getElementById('g');</script>`;

app.get('/',(_,res)=>res.type('html').send(html));

wss.on('connection',ws=>{
  let room,side;
  ws.on('message',raw=>{
    let m;
    try{m=JSON.parse(raw)}catch{return}

    if(m.t==='create'){
      let code;
      do{code=Math.random().toString(36).slice(2,8).toUpperCase()}while(rooms.has(code));
      room={code,players:[],units:[]};
      rooms.set(code,room);
      side='A';
      room.players.push(ws);
      ws.send(JSON.stringify({type:'room',code,side}))
    }
    else if(m.t==='join'){
      let r=rooms.get(String(m.code).toUpperCase());
      if(!r)return ws.send(JSON.stringify({type:'error',message:'Otaq tapılmadı'}));
      if(r.players.length>=2)return ws.send(JSON.stringify({type:'error',message:'Otaq doludur'}));
      room=r;
      side='B';
      r.players.push(ws);
      ws.send(JSON.stringify({type:'room',code:r.code,side}));
      r.players.forEach(p=>p.send(JSON.stringify({type:'start'})))
    }
    else if(m.t==='state'&&room){
      room.units=m.units||[];
      room.players.forEach(p=>{
        if(p!==ws)p.send(JSON.stringify({type:'state',units:room.units}))
      })
    }
  });

  ws.on('close',()=>{
    if(room){
      room.players=room.players.filter(p=>p!==ws);
      if(!room.players.length)rooms.delete(room.code)
    }
  })
});

server.listen(process.env.PORT||3000);