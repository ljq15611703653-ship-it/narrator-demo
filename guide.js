(function(){
  'use strict';
  const D=window.WORLD_DATA;
  const $=(s)=>document.querySelector(s);
  const prophecySteps=[
    '把红线系到铜铃，亲手摇响三次。','拿起铜铃后摇响；绳子远拉或投掷撞响也算。','在低月灯熄灭前拿起白太阳。','切换一次明暗，再用圆形碎片给白布做圆痕。','让乐盒第三响漏音，再校准裂镜中的完整门框。','拨钟到八时，并在一秒内让镜光落到纸人脸上。','先制造四声滴答，再把杯水倒过蓝线。','先把杯水转入铁桶，再从桶中倒出。','在铁籽房瞄准红线高度开火。','瞄准薄铁盘开火，让离膛弹丸落在盘上。','最后一次开火的落点要在北墙之前。','方眼转门两次，再让试纸颜色进入画面。','展开记录，在纸背姓名旁留下暗红印。','接通无声电话，房内声音会直接传到门外。','软绳依次连接相距较远的两个物件。','踩亮七个格，再把内侧物件投过铁森林。','先把物件放到最高处，踩出三声后再取走。','展开记录，再用印章或镜面复制同一时间。','用护理印章盖记录，抬起印章后身份必须变化。','接通档案室雾屏，让本轮以前的画面占满屏幕。','朝北墙方向投掷三次，让裂缝跨过墙和床栏。','裂缝达到掌宽后，用绳从外侧带入物件。','拉动北墙绳结，锁声后让异物绳影落进墙内。','打开掌心门，两秒白光到达前把前九室旧物投过门槛。','在终室摇响铜铃，再用纸人或墨迹覆盖旧掌印。','同时携带三件轻物，选择“一起放下”。','同一瓷开关切换两次，第二次少一道影子。','让杯沿碰金属三次，水位会低过第一道刻痕。','方眼转向门，再把纸人放进它的画面。','用软绳连接北墙绳结，裂缝停下时仍保持内外相连。'
  ];
  const ruleBlocks=[
    ['移动与时间','WASD/方向键移动，手机可点场景空地移动；靠近才能操作。P可暂停，按Enter输入时自动停表，Esc离开输入。完整首轮通常60至90分钟，熟悉后约30至45分钟。'],
    ['言出法随','你可以用自然语言要求一个当前能被行动直接压实的结果。说得越具体，所需工具和前提越多。能说“枪里有弹”或“我开枪”，不能顺带说“所以某人死了”。'],
    ['成功也有代价','若仍有合法过去，结果按你说的成立；旁白随即挑一条最利于自己的过去并永久固定。那条过去会剪掉与你之后声明冲突的路线。'],
    ['失败不是鉴定器','只有存在真实感知/压实路径的结果才会进入候选。失败时规则不会告诉你“差一点”，而会固定实际结果和一条更糟的过去；你没拿试纸，就没有声明毒性的资格。'],
    ['预言','红色提示音后的整句客观事实必定完整发生。它不命令主角做事。你能用自己的操作先占住第一个合法实现，改变旁白后续计划。'],
    ['关系图','图只揭示已经固定或必然推出的节点。蓝是过去，黄是现在，红是未来；隐藏但已定义的事一定能由已展示事实推出。']
  ];
  $('#plain-rules').innerHTML=ruleBlocks.map(([h,p])=>`<div><strong>${h}</strong><br>${p}</div>`).join('');
  $('#toc').innerHTML=[['start','玩法'],['routes','120现场'],['prophecies','30预言'],['speech','言出法随'],['objects','338物件'],['attributes','8层属性'],['endings','25结局']].map(([id,t])=>`<a href="#${id}">${t}</a>`).join('');

  const scenesByArc=new Map(D.level8Arcs.map((arc)=>[arc.code,D.routeScenes.filter((scene)=>scene.layer8===arc.code)]));
  const sceneActions={lock:'撕开封条',toxin:'固定封样',ballistics:'立起落点标尺',camera:'卡住画框',audio:'敲出房间编号',record:'压住纸角',water:'标住湿痕',reflection:'校准镜中尺度',time:'抵住时间刻度',boundary:'钉住边界',prophecy:'标记兑现者',latent:'只记录位置'};
  $('#route-list').innerHTML=D.level8Arcs.map((arc,index)=>`<details ${index===0?'open':''}><summary>${arc.code} · ${arc.name}</summary><p><strong>压实条件：</strong>${arc.condition}<br><strong>旁白动机：</strong>${arc.motive}<br><strong>现场见证者：</strong>${arc.witness}</p><div class="route-scenes">${scenesByArc.get(arc.code).map((scene)=>`<div class="scene"><strong>${scene.id} · ${D.segments[scene.room].name}</strong>${scene.plot}<div class="meta">缺失：${D.objects.find((o)=>o.id===scene.missingObjectId)?.name||'无'}；移位：${D.objects.find((o)=>o.id===scene.shiftedObjectId)?.name||'无'}；专用现场操作：${sceneActions[scene.mutation]}</div></div>`).join('')}</div></details>`).join('');

  $('#prophecy-list').innerHTML=D.prophecies.map((p,i)=>`<article class="card prophecy"><h3>${p.id} · ${p.text}</h3><div><strong>玩家路径：</strong>${prophecySteps[i]}</div><div class="meta">旁白若抢回实现：${p.motherPlan}<br>规则谓词：${p.predicate}</div></article>`).join('');

  $('#speech-list').innerHTML=`<details open><summary>所有当前可声明结果</summary><div class="route-scenes"><div class="scene"><strong>红线完整</strong>红线在视野或手中；成功池“本轮未剪断/大手藏起断口”，失败池“剪刀剪过/入场已磨断”。</div><div class="scene"><strong>枪有弹 / 空膛</strong>枪在手中或近处；扣扳机也能直接压实。旁白从大手装弹、自己装弹、入场带弹等过去中选一条。</div><div class="scene"><strong>水有毒 / 无毒</strong>必须同时接触水和试纸。只喝或看水不能声明毒性；试纸提供可当场证实的路径。</div><div class="scene"><strong>画面连续真实</strong>方眼与雾屏同时可操作；会固定直播线或本轮连续录像。</div><div class="scene"><strong>低月灯通电</strong>灯可操作；会固定开关线路或备用电芯。</div><div class="scene"><strong>门后无人</strong>掌心门处于可观察和可打开范围；固定“刚离开”或“本轮从未站过”。</div></div></details>${D.insightChains.map((chain)=>`<details><summary>${chain.id} · ${chain.prophecy}</summary><ol>${chain.compression.map((step)=>`<li>${step}</li>`).join('')}</ol><p>旁白用途：${chain.motherUse}<br>玩家可抢占：${chain.playerUses.join('；')}<br>${chain.longTail}</p></details>`).join('')}`;

  const actionText=(o)=>{const a=['观察'];if(o.carry)a.push('拿起','放下','瞄准投掷');if(o.tags.includes('gun'))a.push('瞄准开火','压实弹药');if(o.tags.includes('sound'))a.push('摇响');if(o.tags.includes('toggle')||o.tags.includes('power')||o.tags.includes('water'))a.push('切换');if(o.tags.includes('liquid')||o.tags.includes('container'))a.push('倾倒');if(o.tags.includes('mark'))a.push('标记');if(o.tags.includes('evidence'))a.push('展开/入镜/盖印');if(o.kind==='fragment')a.push('垫高','压线','组合','作为现场锚点');return [...new Set(a)].join('、');};
  function renderObjects(filter=''){const q=filter.trim().toLowerCase();const list=D.objects.filter((o)=>!q||`${o.id}${o.name}${o.kind}${o.tags.join('')}`.toLowerCase().includes(q));$('#object-list').innerHTML=`<p>显示 ${list.length} / ${D.objects.length}</p><div class="object-table">${list.map((o)=>`<div class="object"><strong>${o.name}</strong><small>${o.id} · ${D.segments[o.room].name}</small><div>${o.desc}</div><div class="meta">动作：${actionText(o)}<br>标签：${o.tags.join(' / ')}</div></div>`).join('')}</div>`;}
  renderObjects();$('#object-search').addEventListener('input',(e)=>renderObjects(e.target.value));

  const layerMeaning={1:'单件物品的直接状态：位置、持有者、数量、湿度等',2:'两件物品的距离、接触、容纳与遮挡',3:'局部机关和材料关系',4:'同一房间的事件链',5:'跨房间证据与人物知识',6:'预言占位、过去冲突和长线资源',7:'当前实际所在的10个房间之一',8:'12条完全不同的大故事线之一'};
  $('#attribute-guide').innerHTML=`<table class="layer-table"><thead><tr><th>层</th><th>含义</th><th>属性数</th></tr></thead><tbody>${[8,7,6,5,4,3,2,1].map((layer)=>`<tr><td>${layer}</td><td>${layerMeaning[layer]}</td><td>${D.attributes.filter((a)=>a.layer===layer).length}</td></tr>`).join('')}</tbody></table><p>游戏开始时，只预填可公开的物理初值，例如物件初始房间和数量。潜在毒性、枪膛、画面真伪、第8层故事线等保持未定义。每次压实后，界面的“已确定/未确定属性”按同一份后台属性卷实时更新。</p>`;

  const anchors=['最终携带枪或弹药；若多类同时携带，这类优先','最终携带铜铃或乐盒等声源，且不携带枪弹','最终携带蓝粉笔、水杯或水容器，且不携带前两类','最终携带记录、印章等证据，且不携带前三类','最终携带低月灯、三棱镜等光学物，且不携带前四类'];
  $('#ending-list').innerHTML=D.endings.map((e,i)=>{const a=Math.floor(i/5),b=i%5;return `<article class="card"><h3>${e.id} · ${e.title}</h3><div><strong>锚点：</strong>${anchors[a]}</div><div><strong>声明次数：</strong>教程结束后恰好 ${b<4?b:'4次或更多'}</div><div class="meta">${e.body}</div></article>`;}).join('');
}());
