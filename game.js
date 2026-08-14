(function () {
  'use strict';

  const DATA = window.WORLD_DATA;
  const { RuleEngine } = window.NARRATOR_RULES;
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const dom = {
    roomTitle: $('#room-title'), segmentLabel: $('#segment-label'), segmentProgress: $('#segment-progress'), gameTime: $('#game-time'),
    prophecyStrip: $('#prophecy-strip'), prophecyText: $('#prophecy-text'), prophecyDetail: $('#prophecy-detail'), prophecyClock: $('#prophecy-clock'),
    crosshair: $('#crosshair'), nearPrompt: $('#near-prompt'), cinematic: $('#cinematic'), cinematicSpeaker: $('#cinematic-speaker'), cinematicText: $('#cinematic-text'),
    tutorial: $('#tutorial-card'), tutorialStep: $('#tutorial-step'), tutorialTitle: $('#tutorial-title'), tutorialText: $('#tutorial-text'), tutorialNext: $('#tutorial-next'), tutorialSkip: $('#tutorial-skip'),
    selectedName: $('#selected-name'), selectedState: $('#selected-state'), playerPose: $('#player-pose'), handsStatus: $('#hands-status'), actionRow: $('#action-row'), inventory: $('#inventory'), utterances: $('#utterance-options'),
    log: $('#event-log'), graph: $('#fact-graph'), graphCount: $('#graph-count'), graphDetail: $('#graph-detail'), fixedFacts: $('#fixed-facts'), nearby: $('#nearby-objects'), objectCount: $('#object-count'), assetAudit: $('#asset-audit'), strategicState:$('#strategic-state'), attributeStatus:$('#attribute-status'),
    pause: $('#pause-screen'), ending: $('#ending-screen'), endingTitle: $('#ending-title'), endingBody: $('#ending-body'), legacyList: $('#legacy-list'),
    utteranceForm: $('#utterance-form'), utteranceInput: $('#utterance-input'), llmStatus:$('#llm-status'), llmEnable:$('#llm-enable')
  };

  const objectState = new Map(DATA.objects.map((object) => [object.id, {
    ...object,
    x: object.x,
    y: object.y,
    room: object.room,
    holder: null,
    intact: true,
    quantity: 1,
    marked: false,
    wet: false,
    used: false,
    discovered: false,
    latent: { ...(object.latent || {}) }
  }]));

  const state = {
    time: 0,
    lastFrame: performance.now(),
    playing: false,
    paused: false,
    typing: false,
    ended: false,
    room: 0,
    roomEnteredAt: 0,
    x: 88,
    y: 420,
    facing: 1,
    pose: '站立',
    speed: 155,
    keys: new Set(),
    selected: null,
    hands: [],
    maxHandMass: 6,
    aiming: null,
    aimPoint: null,
    recentActions: [],
    fixedFacts: [],
    log: [],
    tutorialIndex: 0,
    tutorialDone: false,
    tutorialFlags: new Set(),
    roomUnlocks: new Set([0]),
    resolvedByRoom: Array(10).fill(0),
    collapsesByRoom: Array(10).fill(0),
    relationScore: 0,
    evidenceScore: 0,
    autonomyScore: 0,
    legacyTokens: new Set(),
    meaningfulDeclarations: 0,
    evidenceSeen: new Set(),
    playerOccupiedProphecies: new Set(),
    definedAttributes: new Map(DATA.attributes.filter((attribute)=>attribute.value!==null).map((attribute)=>[attribute.id,attribute.value])),
    dialogueQueue: [],
    cinematicUntil: 0,
    scenePulse: null,
    ambientAt: 9,
    plannerMode: 'fallback',
    manualProphecySeeded: false,
    routeHistory: [],
    tileVisits: new Set(),
    stairVisits: new Set(),
    roomVibrations: Array(10).fill(0),
    storyArc: null,
    storyLockedAt: null,
    sceneHidden: new Set(),
    sceneAnchorId: null,
    appliedScenes: new Set(),
    failedDeclarations: 0,
    walkPhase: 0,
    moving: false,
    debug: false
  };

  const tutorialSteps = [
    { title:'先试着走动', text:'用 WASD、方向键，或点场景空地，走到发光的红线轴旁。时间在教程里不会流动。', need:'move' },
    { title:'靠近，才能伸手', text:'靠近以后，点场景里的物件，或在右侧“附近”里选它。然后点“拿起”。', need:'take' },
    { title:'手里不是菜单栏', text:'拿起的物件会从地面消失并占住双手。点下方物件名选中它，再点“放下”。', need:'drop' },
    { title:'动作会留下事实', text:'靠近铜铃，选中它并让它发声。所有操作都会进入真实事件流，之后可能成为别的事情的前提。', need:'sound' },
    { title:'你的能力叫“言出法随”', text:'只要眼前存在真实的感知或压实路径，你就能直接声明结果；若仍有合法世界线，结果必须照你说的成立。现在选一句“红线完整”。这不是猜测，也不是询问。', need:'declare' },
    { title:'它有清楚的边界', text:'你能说“我开枪”，因为扣动扳机就能当场压实枪是否有弹；不能说“我开枪把某人打死”，因为死亡是后续结果。有试纸时能定义水是否有毒，没有任何检验路径时则不能。', need:'ack' },
    { title:'声音负责过去', text:'无论你的话成功还是失败，声音都会公开并固定一段过去。那段过去及其必然推论不能再改。', need:'past' },
    { title:'图就是世界的骨架', text:'右侧关系图直接显示后台因果网中已经揭示的部分。蓝色是过去，黄色是现在，红色是必然未来。', need:'graph' },
    { title:'未来会完整发生', text:'听到红色提示音，整句客观预言就一定发生。它不规定你的想法，也不会替你行动。', need:'prophecy' },
    { title:'从这里开始', text:'靠近右侧发亮的门缝即可进入下一室。之后不会再出现教程目标。', need:'exit' }
  ];

  const ambientLines = [
    '墙面向内呼吸了一次。没有东西因此获得名字。',
    '很远的地方，有人把一只碗放回原处。',
    '手掌之外，所有尺度都显得不太可靠。',
    '你记得一扇窗。记忆里没有墙。',
    '白色的东西并不都发光。',
    '有一句话在到达这里以前，已经被说过很多遍。',
    '影子比物件晚了一小会儿才停住。',
    '纸人没有脸，所以也没有否认什么。',
    '水声里夹着一段像电梯的低鸣。',
    '那双手收拾东西时，从来不需要问它们想留在哪里。'
  ];

  const actionLabels = {
    inspect:'看一看', take:'拿起', drop:'放下', use:'使用', ring:'摇响', toggle:'切换', pour:'倾倒', test:'检测', drink:'喝下',
    fire:'瞄准开火', throw:'瞄准投掷', mark:'留下标记', scatter:'撒开', tie:'系上', cut:'剪开', read:'展开阅读', call:'接通线路', stamp:'盖印', enter:'穿过门缝',
    wind:'拨动刻度', turn:'转向门口', pull:'拉动绳结', align:'校准倒影', dropAll:'一起放下', open:'打开', scene:'处理现场差异'
  };
  const sceneActionLabels={lock:'撕开封条',toxin:'固定封样',ballistics:'立起落点标尺',camera:'卡住画框',audio:'敲出房间编号',record:'压住纸角',water:'标住湿痕',reflection:'校准镜中尺度',time:'抵住时间刻度',boundary:'钉住边界',prophecy:'标记兑现者',latent:'只记录位置'};

  const audio = {
    context: null,
    ensure() {
      if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended') this.context.resume();
    },
    tone(freq, start, duration, type = 'sine', volume = .06) {
      this.ensure();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, this.context.currentTime + start);
      gain.gain.setValueAtTime(0, this.context.currentTime + start);
      gain.gain.linearRampToValueAtTime(volume, this.context.currentTime + start + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, this.context.currentTime + start + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(this.context.currentTime + start);
      oscillator.stop(this.context.currentTime + start + duration + .02);
    },
    prophecy() { [196,247,294].forEach((frequency,index)=>this.tone(frequency,index*.09,.42,'triangle',.075)); },
    collapse() { [420,315,236].forEach((frequency,index)=>this.tone(frequency,index*.07,.32,'sine',.07)); },
    fulfilled() { [294,392,587].forEach((frequency,index)=>this.tone(frequency,index*.08,.26,'triangle',.06)); },
    bell() { this.tone(740,0,.55,'sine',.075); this.tone(1110,.02,.35,'sine',.035); },
    shot(soft = false) { this.tone(soft ? 160 : 90,0,.12,'sawtooth',soft?.06:.11); }
  };

  function gameStateForRules() {
    const inventoryTags = state.hands.flatMap((id) => objectState.get(id)?.tags || []);
    return {
      time: state.time,
      room: state.room,
      timeInRoom: state.time - state.roomEnteredAt,
      activeProphecies: engine.activeProphecies,
      recentActions: state.recentActions.slice(-8),
      inventoryTags,
      fixedFacts: state.fixedFacts.map((fact) => fact.text),
      inTutorial: !state.tutorialDone,
      player: { x:state.x, y:state.y },
      route: currentRouteProfile()
    };
  }

  function currentStoryArc(){return DATA.level8Arcs.find((arc)=>arc.code===state.storyArc)||null;}
  function currentRouteProfile(){
    if(!state.storyArc)return null;
    return DATA.routeScenes.find((scene)=>scene.layer8===state.storyArc&&scene.room===state.room)||null;
  }

  function eventCount(type,predicate=()=>true){return engine.events.filter((event)=>event.type===type&&predicate(event)).length;}
  function chooseStoryArc(){
    const hasFixed=(test)=>[...engine.fixed.entries()].some(([key,fact])=>test(key,fact));
    if(state.playerOccupiedProphecies.size>=4)return 'K';
    if(eventCount('duplicate-value',(event)=>event.key==='time')&&eventCount('clock-value'))return 'I';
    if(eventCount('attribute-change',(event)=>event.key==='identity')||eventCount('stamp-off-table')||eventCount('duplicate-value',(event)=>event.key==='time'))return 'F';
    if(hasFixed((key,fact)=>key==='screen.authentic'&&fact.value===true)||eventCount('camera-capture')>=2)return 'D';
    if(eventCount('line-connected')&&state.playerOccupiedProphecies.size)return 'E';
    if(eventCount('test-contact')&&hasFixed((key)=>key.endsWith('.toxic')))return 'B';
    if(hasFixed((key)=>key.endsWith('.rounds')))return 'C';
    if(eventCount('cross',(event)=>event.material==='water'&&event.line==='blue')||eventCount('crack'))return 'G';
    if(eventCount('reflection')>=2)return 'H';
    if(hasFixed((key)=>key==='red_line.intact')&&eventCount('mark')>=3)return 'J';
    if(state.failedDeclarations>0)return 'A';
    return 'L';
  }

  function lockStoryArc(){
    if(state.storyArc)return currentStoryArc();
    state.storyArc=chooseStoryArc();
    state.storyLockedAt=state.time;
    const arc=currentStoryArc();
    state.definedAttributes.set(DATA.strategicAxes.story.id,arc.code);
    const node=engine.graph.addNode({id:'attribute:strategic:story',label:`第八层：${arc.name}`,kind:'past',fixedAt:state.time});
    const cause=engine.graph.addNode({id:`story-cause:${arc.code}`,label:`压实条件：${arc.condition}`,kind:'inferred',fixedAt:state.time});
    engine.graph.addEdge({from:cause.id,to:node.id,relation:'fixes-story'});
    state.fixedFacts.push({kind:'past',text:`大故事线已定型：${arc.name}。${arc.condition}。`,time:state.time});
    audio.collapse();
    say('定型',`不是选择菜单。此前留下的事实只允许故事进入“${arc.name}”。`,'past');
    return arc;
  }

  function applyRouteScene(){
    state.sceneHidden=new Set();
    state.sceneAnchorId=null;
    const scene=currentRouteProfile();
    state.definedAttributes.set(DATA.strategicAxes.room.id,state.room);
    if(!scene)return null;
    const hiddenCore=objectState.get(scene.missingObjectId);
    if(hiddenCore&&!hiddenCore.holder)state.sceneHidden.add(hiddenCore.id);
    const hiddenFragment=objectState.get(scene.missingFragment);
    if(hiddenFragment&&!hiddenFragment.holder)state.sceneHidden.add(hiddenFragment.id);
    const shifted=objectState.get(scene.shiftedObjectId);
    if(shifted&&!shifted.holder){shifted.x=scene.shiftedX;shifted.y=scene.shiftedY;}
    const anchor=[...objectState.values()].find((object)=>object.room===state.room&&object.kind==='fragment'&&!state.sceneHidden.has(object.id));
    if(anchor){
      state.sceneAnchorId=anchor.id;
      if(!anchor.tags.includes(scene.gainedTag))anchor.tags.push(scene.gainedTag);
      anchor.sceneRole=scene.mutation;
      anchor.sceneRoles=anchor.sceneRoles||new Set();
      if(!anchor.sceneRoles.has(scene.id)){anchor.sceneRoles.add(scene.id);anchor.desc=`${anchor.desc} 在${scene.id}里，它还可以用来${sceneActionLabels[scene.mutation]}。`;}
    }
    if(!state.appliedScenes.has(scene.id)){
      state.appliedScenes.add(scene.id);
      const roomNode=engine.graph.addNode({id:`scene:${scene.id}`,label:`${scene.id} ${scene.label}`,kind:'now',fixedAt:state.time});
      engine.graph.addEdge({from:'attribute:strategic:story',to:roomNode.id,relation:'enters-room'});
      defineAttribute('player_story','room',state.room,`第七层：${DATA.segments[state.room].name}`);
    }
    return scene;
  }

  function defineAttribute(objectId,key,value,label){
    const id=`attr:${objectId}:${key}`;
    state.definedAttributes.set(id,value);
    if(label&&!engine.graph.nodes.has(`attribute:${id}`))engine.graph.addNode({id:`attribute:${id}`,label,kind:'inferred',fixedAt:state.time});
  }

  function updateStrategicAttributes(){
    state.definedAttributes.set(DATA.strategicAxes.room.id,state.room);
    const profile=currentRouteProfile();
    if(profile){
      const arc=currentStoryArc();
      state.maxHandMass=6+(profile.arcIndex%3);
      state.definedAttributes.set(DATA.strategicAxes.story.id,arc.code);
      engine.graph.addNode({id:'attribute:strategic:story',label:`第八层：${arc.name}`,kind:'past',fixedAt:state.storyLockedAt});
    }
    return profile;
  }

  const engine = new RuleEngine(gameStateForRules, {
    onCollapseStart: ({ compatible }) => {
      audio.collapse();
      state.scenePulse = { color:compatible ? '#78a6aa' : '#c85b58', until:state.time + .8 };
    },
    onPastFixed: ({ past, compatible, label }) => {
      say('定型', past.text, 'past');
      state.fixedFacts.push({ kind:'past', text:past.text, time:state.time, compatible, label });
      state.tutorialFlags.add('past');
      state.collapsesByRoom[state.room] += 1;
      if (!compatible) state.relationScore -= 1;
      renderFacts();
    },
    onProphecy: (prophecy) => {
      audio.prophecy();
      say('未来', prophecy.text, 'future');
      state.fixedFacts.push({ kind:'future', text:prophecy.text, time:state.time });
      state.tutorialFlags.add('prophecy');
      state.scenePulse = { color:'#d17662', until:state.time + 1.2 };
      showCinematic('未来', prophecy.text, 3.2);
      renderFacts();
    },
    onProphecyFulfilled: (prophecy) => {
      audio.fulfilled();
      say('兑现', `“${prophecy.text}”已经由刚才发生的事情完整占据。`, 'future');
      state.resolvedByRoom[prophecy.room] += 1;
      state.autonomyScore += 1;
      const evidence=prophecy.evidence.map((id)=>engine.events.find((event)=>event.id===id)).filter(Boolean);
      if(evidence.some((event)=>event.actor!=='narrator'))state.playerOccupiedProphecies.add(prophecy.id);
      updateStrategicAttributes();
      if (state.resolvedByRoom[prophecy.room] === 1) state.roomUnlocks.add(Math.min(9, prophecy.room + 1));
      renderFacts();
    },
    onProphecyPressure: (prophecy) => {
      scheduleNarratorPressure(prophecy);
    }
  });

  function currentRoomObjects() {
    return [...objectState.values()].filter((object) => object.room === state.room && !object.holder && !state.sceneHidden.has(object.id));
  }

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function selectedObject() { return state.selected ? objectState.get(state.selected) : null; }
  function handMass() { return state.hands.reduce((sum,id)=>sum+(objectState.get(id)?.mass || 0),0); }
  function canTake(object) { return object?.carry && !object.holder && object.room === state.room && distance(state, object) < 76 && handMass() + object.mass <= state.maxHandMass; }
  function isNear(object, radius = 80) { return object && object.room === state.room && !object.holder && distance(state, object) <= radius; }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2,'0');
    const rest = Math.floor(seconds % 60).toString().padStart(2,'0');
    return `${minutes}:${rest}`;
  }

  function say(tag, text, kind = '') {
    const line = { time:state.time, tag, text, kind };
    state.log.push(line);
    if (state.log.length > 160) state.log.shift();
    const row = document.createElement('div');
    row.className = `log-line ${kind}`;
    row.innerHTML = `<span class="log-time">${formatTime(state.time)}</span><span class="log-tag">${tag}</span><span>${text}</span>`;
    dom.log.append(row);
    dom.log.scrollTop = dom.log.scrollHeight;
  }

  function showCinematic(speaker, text, seconds = 2.6) {
    dom.cinematicSpeaker.textContent = speaker;
    dom.cinematicText.textContent = text;
    dom.cinematic.classList.remove('hidden');
    state.cinematicUntil = state.time + seconds;
  }

  function noteAction(type) {
    state.recentActions.push(type);
    if (state.recentActions.length > 20) state.recentActions.shift();
  }

  function objectAtScreen(x, y) {
    return currentRoomObjects().filter((object) => distance({x,y},object) < (object.kind === 'fragment' ? 18 : 28)).sort((a,b)=>distance({x,y},a)-distance({x,y},b))[0] || null;
  }

  function nearestObject() {
    return currentRoomObjects().filter((object)=>distance(state,object)<82).sort((a,b)=>distance(state,a)-distance(state,b))[0] || null;
  }

  function selectObject(id) {
    if (!objectState.has(id)) return;
    state.selected = id;
    objectState.get(id).discovered = true;
    renderControls();
    renderNearby();
  }

  function take(object) {
    if (!canTake(object)) return;
    if (object.tags.includes('medicine')) engine.record('leave-surface', { object:object.id, objectTags:object.tags, surface:'plate' });
    if (object.surface === 'highest') engine.record('leave-surface', { object:object.id, objectTags:object.tags, surface:'highest' });
    object.holder = 'player';
    defineAttribute(object.id,'holder','player',`${object.name}由玩家携带`);
    state.hands.push(object.id);
    state.selected = object.id;
    say('动作', `你把${object.name}拿到手中。`, 'action');
    engine.record('take', { object:object.id, objectTags:object.tags, from:{x:object.x,y:object.y} });
    noteAction('take');
    state.tutorialFlags.add('take');
    renderControls();
  }

  function drop(object, offset = 24) {
    if (object?.holder !== 'player') return;
    object.holder = null;
    object.room = state.room;
    object.x = Math.max(35, Math.min(DATA.ROOM_W - 35, state.x + state.facing * offset));
    object.y = Math.max(45, Math.min(DATA.ROOM_H - 35, state.y + 12));
    object.surface = object.y < 150 ? 'highest' : 'ground';
    defineAttribute(object.id,'holder',null,`${object.name}被放下`);
    defineAttribute(object.id,'location',state.room,`${object.name}位于${DATA.segments[state.room].name}`);
    state.hands = state.hands.filter((id)=>id!==object.id);
    say('动作', `你把${object.name}放在脚边。`, 'action');
    engine.record('drop', { object:object.id, objectTags:object.tags, x:object.x, y:object.y });
    noteAction('drop');
    state.tutorialFlags.add('drop');
    renderControls();
  }

  function inspect(object) {
    if (!object) return;
    object.discovered = true;
    defineAttribute(object.id,'observed',true,`${object.name}已被观察`);
    say('观察', `${object.name}：${object.desc}`, '');
    engine.record('inspect', { object:object.id, objectTags:object.tags });
    noteAction('inspect');
    if (object.tags.includes('evidence') && !state.evidenceSeen.has(object.id)) {
      state.evidenceSeen.add(object.id);
      state.evidenceScore += 1;
      updateStrategicAttributes();
    }
    renderControls();
  }

  function toggle(object) {
    const key = object.tags.includes('light') ? 'powered' : object.tags.includes('water') ? 'open' : 'on';
    const previous = object.latent[key];
    object.latent[key] = previous === null ? true : !previous;
    say('动作', `${object.name}${object.latent[key] ? '接通' : '断开'}。`, 'action');
    engine.record(object.tags.includes('light') ? 'light-cycle' : object.tags.includes('water') ? 'valve-change' : 'switch-change', { object:object.id, value:object.latent[key] });
    object.toggleCount=(object.toggleCount||0)+1;
    if(object.template==='switch'&&object.toggleCount===2)engine.record('quantity-change',{kind:'shadow',delta:-1});
    if(object.tags.includes('screen')&&object.latent[key]){
      engine.record('screen-on',{object:object.id});
      engine.record('screen-content',{object:object.id,beforeLoop:true,fullscreen:true});
    }
    if (object.tags.includes('light') && !object.latent[key]) engine.record('lamp-off', { object:object.id });
    noteAction('toggle');
  }

  function ring(object) {
    audio.bell();
    say('声音', `${object.name}发出一次短响。`, 'action');
    const event = engine.record('sound', { object:object.id, objectTags:object.tags, objectLocation:object.holder ? 'hand' : 'ground' });
    engine.record('bell', { object:object.id });
    engine.record('tick', { source:object.id });
    object.soundCount = (object.soundCount || 0) + 1;
    if (object.tags.includes('clock') && object.template === 'musicBox' && object.soundCount % 3 === 0) engine.record('missing-note', { object:object.id });
    if (object.template === 'bell' && object.soundCount === 3) {
      const linkedLine=[...objectState.values()].find((entry)=>entry.tags.includes('line')&&entry.linkedTargets?.includes(object.id));
      if(linkedLine)engine.record('cross',{object:linkedLine.id,objectTags:linkedLine.tags,line:'center'});
    }
    if (state.room === 9) engine.record('last-bell', { object:object.id });
    state.tutorialFlags.add('sound');
    noteAction('sound');
  }

  function makeMark(object) {
    const target = nearestObject();
    if (!target || target.id === object.id) {
      object.marked = true;
      say('动作', `你用${object.name}在地面留下一个记号。`, 'action');
      engine.record('mark', { tool:object.id, target:'floor', shape:object.tags.includes('small') ? 'round' : 'line', targetTags:['floor'] });
    } else {
      target.marked = true;
      say('动作', `你用${object.name}在${target.name}上留下记号。`, 'action');
      engine.record('mark', { tool:object.id, target:target.id, shape:object.tags.includes('small') ? 'round' : 'line', targetTags:target.tags });
    }
    noteAction('mark');
  }

  function pour(object) {
    const target = nearestObject();
    if (object.tags.includes('container')) {
      const hadWater = object.latent.filled !== false;
      if (!hadWater) return;
      object.latent.filled = false;
      const line = state.room === 3 ? 'blue' : state.room === 0 ? 'center' : 'floor-line';
      say('动作', `你让${object.name}里的水落到地面，水迹越过${line === 'blue' ? '蓝线' : '一道界线'}。`, 'action');
      engine.record('quantity-change', { object:object.id, objectTags:object.tags, material:'water', delta:-1 });
      engine.record('cross', { material:'water', line });
      if (target?.tags.includes('fabric')) target.wet = true;
    } else if (object.tags.includes('liquid')) {
      engine.record('cross', { material:'water', line:'blue' });
    }
    noteAction('pour');
  }

  function scatter(object) {
    say('动作', `你把${object.name}撒在周围。每一次经过都会在这里留下区别。`, 'action');
    object.quantity = Math.max(0, object.quantity - .2);
    engine.record('scatter', { object:object.id, area:{x:state.x,y:state.y}, objectTags:object.tags });
    noteAction('trace');
  }

  function usePair(tool, target) {
    if (!tool || !target || tool.id === target.id) return false;
    const toolTags = tool.tags;
    const targetTags = target.tags;
    if (toolTags.includes('liquid') && target.template === 'bucket') {
      tool.latent.filled = false;
      target.latent.filled = true;
      say('动作', `你把${tool.name}里的水倒进${target.name}。`, 'action');
      engine.record('transfer', { material:'water', from:tool.id, to:target.id });
      return true;
    }
    if (toolTags.includes('test') && targetTags.includes('liquid')) {
      say('动作', `你让${tool.name}接触${target.name}。颜色将在毒性被压实时如实留下。`, 'action');
      tool.used = true;
      engine.record('test-contact', { tool:tool.id, target:target.id });
      return true;
    }
    if (toolTags.includes('tie') || toolTags.includes('line')) {
      say('动作', `你把${tool.name}系在${target.name}上。`, 'action');
      engine.record('link', { a:tool.id, b:target.id, aTags:toolTags, bTags:targetTags });
      tool.linkedTargets = tool.linkedTargets || [];
      if (!tool.linkedTargets.includes(target.id)) tool.linkedTargets.push(target.id);
      if (tool.linkedTargets.length >= 2) {
        const a=objectState.get(tool.linkedTargets.at(-2)), b=objectState.get(tool.linkedTargets.at(-1));
        if (a && b && distance(a,b)>120) engine.record('height-swap', { nonAdjacent:true, objects:[a.id,b.id] });
      }
      if (state.room === 0 && targetTags.includes('clock')) engine.record('cross', { object:tool.id, objectTags:toolTags, line:'center' });
      if (state.room === 8 && target.template === 'latch') {
        engine.record('crack-stop', { source:tool.id });
        engine.record('linked-across', { aArea:'outside', bArea:'inside', object:tool.id });
        if (engine.getValue('crack-width') >= engine.getValue('hand-width')) engine.record('cross', { from:'outside', to:'inside', object:'tied-object' });
      }
      return true;
    }
    if (toolTags.includes('cut') && (targetTags.includes('tie') || targetTags.includes('fabric'))) {
      target.intact = false;
      say('动作', `${target.name}被${tool.name}剪开。`, 'action');
      engine.record('cut', { tool:tool.id, target:target.id, targetTags });
      if (targetTags.includes('tie')) engine.record('knot-open', { target:target.id });
      return true;
    }
    if (toolTags.includes('stamp') && targetTags.includes('evidence')) {
      target.latent.signedBy = 'outside-observer';
      say('动作', `你在${target.name}上压下一枚清楚的身份印记。`, 'action');
      engine.record('stamp-off-table', { tool:tool.id });
      engine.record('attribute-change', { target:target.id, key:'identity', value:'outside-observer' });
      engine.record('duplicate-value', { key:'time', targets:[target.id,`${target.id}:copy`] });
      return true;
    }
    if (toolTags.includes('reflect') && (targetTags.includes('light') || targetTags.includes('door') || targetTags.includes('figure') || targetTags.includes('evidence'))) {
      say('动作', `${tool.name}接住一道光，画面里出现了${targetTags.includes('door') ? '完整门框' : '被折开的亮边'}。`, 'action');
      engine.record('reflection', { tool:tool.id, subject:targetTags.includes('door') ? 'doorframe' : 'light' });
      if (targetTags.includes('figure')) engine.record('light-hit', { target:target.id, targetTags, part:'face' });
      if (targetTags.includes('evidence')) engine.record('duplicate-value', { key:'time', targets:[target.id,`${target.id}:reflection`] });
      return true;
    }
    if (toolTags.includes('test') && targetTags.includes('camera')) {
      engine.record('camera-capture', { subject:tool.id, subjectTags:toolTags, attribute:'color' });
      say('动作', `${tool.name}的颜色进入了${target.name}画面。`, 'action');
      return true;
    }
    if (toolTags.includes('figure') && targetTags.includes('camera')) {
      engine.record('quantity-change', { kind:'figure-in-frame', delta:1, object:tool.id });
      say('动作', `${tool.name}被摆进方眼的门口画面。`, 'action');
      return true;
    }
    if (toolTags.includes('mark') && targetTags.includes('evidence')) {
      engine.record('adjacent', { aType:'name', bType:'red-mark', target:target.id });
      say('动作', `${tool.name}在${target.name}的姓名旁留下暗红印迹。`, 'action');
      return true;
    }
    if ((toolTags.includes('mark') || toolTags.includes('figure')) && targetTags.includes('memory')) {
      engine.record('cover', { target:'old-handprint', coverType:'smaller-handprint', object:tool.id });
      say('动作', `${tool.name}留下的小掌形覆盖了旧掌印。`, 'action');
      return true;
    }
    if (toolTags.includes('liquid') && (targetTags.includes('bridge') || target.kind==='device' || target.kind==='structure')) {
      tool.metalTouches=(tool.metalTouches||0)+1;
      engine.record('cup-metal', { object:tool.id, target:target.id });
      if (tool.metalTouches>=3) engine.record('attribute-change', { target:tool.id, key:'liquid-level', value:'below-first-mark' });
      say('动作', `${tool.name}的杯沿碰在${target.name}上。`, 'action');
      return true;
    }
    if (toolTags.includes('cover')) {
      say('动作', `你用${tool.name}覆盖了${target.name}。`, 'action');
      engine.record('cover', { cover:tool.id, target:target.id, targetTags, coverType:tool.tags.includes('figure') ? 'smaller-handprint' : 'object' });
      return true;
    }
    if (tool.kind === 'fragment') {
      target.marked = true;
      say('动作', `你把${tool.name}垫在${target.name}旁边。两个位置从此可以比较。`, 'action');
      engine.record('wedge', { tool:tool.id, target:target.id });
      return true;
    }
    return false;
  }

  function startAim(object, mode) {
    state.aiming = { object:object.id, mode };
    state.aimPoint = { x:state.x + state.facing * 120, y:state.y };
    dom.crosshair.classList.add('show');
    say('动作', mode === 'fire' ? `你举起${object.name}。下一次点击决定枪口方向。` : `你掂了掂${object.name}。下一次点击决定落点。`, 'action');
    renderControls();
  }

  async function resolveAim(x, y) {
    if (!state.aiming) return;
    const object = objectState.get(state.aiming.object);
    const mode = state.aiming.mode;
    state.aiming = null;
    dom.crosshair.classList.remove('show');
    if (!object || object.holder !== 'player') return;
    if (mode === 'throw') {
      const originRoom=object.room;
      object.holder = null;
      object.room = state.room;
      object.x = x;
      object.y = y;
      object.surface = y < 150 ? 'highest' : 'ground';
      state.hands = state.hands.filter((id)=>id!==object.id);
      say('动作', `${object.name}沿你指定的方向落下。`, 'action');
      engine.record('throw', { object:object.id, objectTags:object.tags, from:{x:state.x,y:state.y}, to:{x,y} });
      if (x > 820 && state.room === 6) engine.record('cross', { object:object.id, from:'inside-rail', to:'outside-rail' });
      if (state.room === 9 && x > 850) engine.record('cross', { object:object.id, fromRoom:originRoom, to:'threshold' });
      if (state.room === 8 && x > 700) {
        state.roomVibrations[8]+=1;engine.record('vibration',{object:object.id});
        if(state.roomVibrations[8]===3){engine.setValue('crack-width',60);engine.record('crack',{materials:['wall','rail']});}
      }
    } else {
      await fireGun(object, x, y);
    }
    renderControls();
  }

  async function fireGun(gun, targetX, targetY) {
    const soft = gun.tags.includes('soft');
    let rounds = gun.latent.rounds;
    if (rounds === null) {
      const result = await engine.declare({ key:`${gun.id}.rounds`, value:true, label:`${gun.name}中有弹丸`, successPool:'rounds_loaded', failurePool:'rounds_empty', sourceObject:gun.id });
      rounds = result.actualValue ? 1 : 0;
      gun.latent.rounds = rounds;
      state.tutorialFlags.add('declare');
    }
    if (rounds <= 0) {
      say('动作', `扳机走完行程，${gun.name}没有形成开火事件。`, 'action');
      engine.record('trigger-empty', { gun:gun.id });
      return;
    }
    gun.latent.rounds -= 1;
    audio.shot(soft);
    say('动作', `${gun.name}完成开火。一颗${soft ? '软弹' : '铁籽'}沿枪口方向离开枪膛。`, 'action');
    const redHeight = state.room === 4 ? 280 : state.y;
    const crossesRed = Math.abs(targetY - redHeight) < 34;
    engine.record('projectile-cross', { gun:gun.id, projectile:true, fromChamber:true, line:crossesRed ? 'red-height' : 'other-height', from:{x:state.x,y:state.y}, to:{x:targetX,y:targetY}, soft });
    engine.record('projectile-stop', { gun:gun.id, projectile:true, stoppedBefore:targetX < 880 ? 'north' : 'beyond-north', x:targetX, y:targetY, soft });
    const tray = currentRoomObjects().find((entry)=>entry.tags.includes('bridge') && distance({x:targetX,y:targetY},entry)<45);
    if (tray) engine.record('land', { projectile:true, leftMagazine:true, target:tray.id, targetTags:tray.tags });
    noteAction('fire');
  }

  async function declareOption(option) {
    audio.ensure();
    say('你', option.speech, 'action');
    const result = await engine.declare(option);
    state.tutorialFlags.add('declare');
    if (option.apply) option.apply(result);
    state.fixedFacts.push({ kind:'now', text:`${option.label}：${String(result.actualValue)}`, time:state.time, compatible:result.compatible });
    if (result.compatible) state.autonomyScore += 1; else state.relationScore -= 2;
    if (!result.compatible) state.failedDeclarations += 1;
    if (state.tutorialDone) state.meaningfulDeclarations += 1;
    updateStrategicAttributes();
    renderControls();
    renderFacts();
  }

  function utteranceOptions() {
    const selected = selectedObject();
    const hands = state.hands.map((id)=>objectState.get(id));
    const visible = currentRoomObjects().filter((object)=>distance(state,object)<180);
    const all = [...hands, ...visible];
    const options = [];
    if (state.room === 0 && all.some((object)=>object.tags.includes('line'))) {
      options.push({ key:'red_line.intact', value:true, label:'红线完整', speech:'这条红线现在是完整的。', successPool:'line_intact', failurePool:'line_broken', sourceObject:selected?.id });
    }
    const gun = all.find((object)=>object.tags.includes('gun'));
    if (gun) {
      options.push({ key:`${gun.id}.rounds`, value:true, label:`${gun.name}有弹`, speech:`${gun.name}里有一颗能够离开枪膛的弹丸。`, successPool:'rounds_loaded', failurePool:'rounds_empty', sourceObject:gun.id, apply:(r)=>{gun.latent.rounds=r.actualValue?1:0;} });
      options.push({ key:`${gun.id}.rounds`, value:false, label:`${gun.name}空膛`, speech:`${gun.name}的弹膛是空的。`, successPool:'rounds_empty', failurePool:'rounds_loaded', sourceObject:gun.id, apply:(r)=>{gun.latent.rounds=r.actualValue?0:1;} });
    }
    const cup = all.find((object)=>object.tags.includes('liquid'));
    const strip = hands.find((object)=>object.tags.includes('test'));
    if (cup && strip) {
      options.push({ key:`${cup.id}.toxic`, value:false, label:`${cup.name}无毒`, speech:`${cup.name}里的水无毒。`, successPool:'water_safe', failurePool:'water_toxic', sourceObject:cup.id, apply:(r)=>{cup.latent.toxic=!r.actualValue;} });
      options.push({ key:`${cup.id}.toxic`, value:true, label:`${cup.name}有毒`, speech:`${cup.name}里的水含有毒物。`, successPool:'water_toxic', failurePool:'water_safe', sourceObject:cup.id, apply:(r)=>{cup.latent.toxic=!!r.actualValue;} });
    }
    const screen = all.find((object)=>object.tags.includes('screen'));
    const camera = all.find((object)=>object.tags.includes('camera'));
    if (screen && camera) {
      options.push({ key:'screen.authentic', value:true, label:'画面连续真实', speech:'雾屏现在显示的是方眼留下的连续画面。', successPool:'screen_true', failurePool:'screen_false', sourceObject:screen.id });
    }
    const lamp = all.find((object)=>object.tags.includes('light'));
    if (lamp) options.push({ key:`${lamp.id}.powered`, value:true, label:'低月灯通电', speech:'低月灯现在有稳定电源。', successPool:'lamp_on', failurePool:'screen_false', sourceObject:lamp.id, apply:(r)=>{lamp.latent.powered=!!r.actualValue;} });
    const door = all.find((object)=>object.tags.includes('door'));
    if (door) options.push({ key:`${door.id}.emptyBehind`, value:true, label:'门后无人', speech:'掌心门现在背后没有人。', successPool:'door_empty', failurePool:'screen_false', sourceObject:door.id });
    return options;
  }

  function normalizeUtterance(value) {
    return value.trim().replace(/[，。！？、,.!?\s]/g, '').replace(/^我说/, '');
  }

  function matchTypedOption(raw, options) {
    const text = normalizeUtterance(raw);
    const tests = [
      [/空膛|没有子弹|没子弹|无弹/, (o)=>/空膛/.test(o.label)],
      [/有子弹|有弹|能够开火|能开枪/, (o)=>/有弹/.test(o.label)],
      [/无毒|没有毒|没毒/, (o)=>/无毒/.test(o.label)],
      [/有毒|含毒/, (o)=>/有毒/.test(o.label)],
      [/红线.*完整|完整.*红线/, (o)=>/红线完整/.test(o.label)],
      [/画面.*真实|连续画面|监控.*真实/, (o)=>/画面连续真实/.test(o.label)],
      [/灯.*通电|低月.*有电/, (o)=>/低月灯通电/.test(o.label)],
      [/门后.*无人|门后.*没人/, (o)=>/门后无人/.test(o.label)]
    ];
    for (const [pattern, matcher] of tests) {
      if (pattern.test(text)) return options.find(matcher) || null;
    }
    return options.find((option)=>normalizeUtterance(option.speech) === text || normalizeUtterance(option.label) === text) || null;
  }

  async function submitUtterance(raw) {
    const text = raw.trim();
    if (!text) return;
    const options=utteranceOptions().map((option,index)=>({...option,id:`fact_${index}`,kind:'fact',requirements:option.label}));
    const actionCandidates=[];
    for(const object of [...state.hands.map((id)=>objectState.get(id)),...currentRoomObjects().filter((entry)=>isNear(entry))]){
      for(const action of availableActions(object)){
        if(['inspect','take','drop','ring','toggle','pour','scatter','mark','fire','throw','use','read','call','wind','turn','pull','dropAll'].includes(action)){
          actionCandidates.push({id:`action:${object.id}:${action}`,kind:'action',label:`对${object.name}${actionLabels[action]||action}`,requirements:`物件=${object.name};动作=${actionLabels[action]||action}`,objectId:object.id,action});
        }
      }
    }
    let option = matchTypedOption(text, options);
    let actionChoice=null;
    if(!option && engine.planner.model){
      const picked=await engine.planner.interpretUtterance(text,[...options,...actionCandidates]);
      if(picked?.kind==='fact') option=options.find((entry)=>entry.id===picked.id);
      else if(picked?.kind==='action') actionChoice=actionCandidates.find((entry)=>entry.id===picked.id);
    }
    if (option) return declareOption(option);
    if(actionChoice){state.selected=actionChoice.objectId;await interact(actionChoice.action);return;}
    if (/开枪|扣动扳机/.test(text)) {
      const gun = state.hands.map((id)=>objectState.get(id)).find((object)=>object?.tags.includes('gun'));
      if (gun) {
        state.selected = gun.id;
        startAim(gun, 'fire');
        return;
      }
    }
    say('边界', engine.planner.model ? '规则复核没有找到唯一合法的直接结果；这句话未提交，也没有透露目标状态。' : '当前浏览器没有可用的本地语言模型；这句话未匹配到确定性表达，也没有透露目标状态。可用按钮仍是完整合法候选。', '');
  }

  function availableActions(object) {
    if (!object) return [];
    const actions = ['inspect'];
    if (object.holder === 'player') {
      actions.push('drop');
      if (object.tags.includes('gun')) actions.push('fire');
      else actions.push('throw');
      if (object.tags.includes('sound')) actions.push('ring');
      if (state.hands.length >= 3) actions.push('dropAll');
      if (object.tags.includes('toggle')) actions.push('toggle');
      if (object.tags.includes('liquid') || object.tags.includes('container')) actions.push('pour');
      if (object.tags.includes('trace')) actions.push('scatter');
      if (object.tags.includes('mark') || object.kind === 'fragment') actions.push('mark');
      const target = nearestObject();
      if (target && target.id !== object.id) actions.push('use');
      if (object.id===state.sceneAnchorId) actions.push('scene');
    } else if (isNear(object)) {
      if (canTake(object)) actions.push('take');
      if (object.tags.includes('sound')) actions.push('ring');
      if (object.tags.includes('toggle') || object.tags.includes('power') || object.tags.includes('water')) actions.push('toggle');
      if (object.tags.includes('read')) actions.push('read');
      if (object.tags.includes('call')) actions.push('call');
      if (object.tags.includes('door')) actions.push('enter');
      if (object.template === 'clock') actions.push('wind');
      if (object.template === 'mirror') actions.push('align');
      if (object.tags.includes('camera')) actions.push('turn');
      if (object.tags.includes('screen')) actions.push('toggle');
      if (object.template === 'latch') actions.push('pull');
      if (object.tags.includes('door')) actions.push('open');
    }
    return [...new Set(actions)];
  }

  async function interact(action) {
    audio.ensure();
    const object = selectedObject();
    if (!object || !availableActions(object).includes(action)) return;
    if (action === 'inspect') inspect(object);
    else if (action === 'take') take(object);
    else if (action === 'drop') drop(object);
    else if (action === 'ring') ring(object);
    else if (action === 'toggle') toggle(object);
    else if (action === 'pour') pour(object);
    else if (action === 'scatter') scatter(object);
    else if (action === 'mark') makeMark(object);
    else if (action === 'fire') startAim(object, 'fire');
    else if (action === 'throw') startAim(object, 'throw');
    else if (action === 'dropAll') {
      const dropped=[...state.hands];
      dropped.forEach((id,index)=>drop(objectState.get(id),24+index*16));
      engine.record('group-contact',{count:dropped.length,origin:'carried',surface:'ground'});
    }
    else if (action === 'use') usePair(object, nearestObject());
    else if (action === 'scene') performSceneAction(object);
    else if (action === 'wind') {
      engine.record('clock-value',{object:object.id,value:'eight'});
      say('动作', `${object.name}的长针停在八时。`, 'action');
    } else if (action === 'align') {
      engine.record('reflection',{tool:object.id,subject:'doorframe'});
      say('动作', `${object.name}被校到长廊尽头，镜中拼出一整道门框。`, 'action');
    } else if (action === 'turn') {
      object.turnCount=(object.turnCount||0)+1;
      engine.record('camera-to-door',{object:object.id});
      engine.record('door-shadow',{object:object.id});
      say('动作', `${object.name}转向门口，门影扫过地面。`, 'action');
    } else if (action === 'pull') {
      engine.record('lock-sound',{object:object.id});
      engine.record('line-appears',{area:'north-inside',origin:'rope-shadow'});
      say('动作', `${object.name}拉紧，锁舌发声，绳影落在北墙内侧。`, 'action');
    } else if (action === 'open') {
      object.latent.locked=false;
      engine.record('door-open',{object:object.id});
      state.dialogueQueue.push({at:state.time+2,run:()=>engine.record('door-light-cross',{object:object.id})});
      say('动作', `${object.name}打开。门外的白光还要两秒才会越过门槛。`, 'action');
    }
    else if (action === 'read') {
      say('观察', `${object.name}展开后，时间栏与身份栏同时露出来。`, '');
      engine.record('paper-open', { object:object.id });
      engine.record('paper-flip', { object:object.id });
    } else if (action === 'call') {
      object.latent.connected = true;
      say('动作', `${object.name}的线路接通。门外先听见房内此刻的环境声。`, 'action');
      engine.record('line-connected', { object:object.id });
      engine.record('audio-transfer', { from:'room', to:'outside', source:'ambient' });
    } else if (action === 'enter') enterNextRoom();
    renderControls();
  }

  function enterNextRoom() {
    const next = state.room + 1;
    if (next >= DATA.segments.length) return finishChapter();
    if (!state.roomUnlocks.has(next) && state.tutorialDone) {
      say('门缝', '门没有拒绝你，但这一室仍有一个被说出的未来没有得到结果。', '');
      return;
    }
    state.room = next;
    if(next>=6&&!state.storyArc)lockStoryArc();
    state.roomEnteredAt = state.time;
    state.x = 70;
    state.y = 410;
    state.selected = null;
    state.routeHistory.push(next);
    state.roomUnlocks.add(next);
    const scene=applyRouteScene();
    say('移动', `你进入${DATA.segments[next].name}。`, 'action');
    showCinematic(scene?.witness||'', roomIntro(next), scene?4.2:2.8);
    engine.record('room-enter', { room:next });
    renderAll();
  }

  function enterPreviousRoom() {
    if (state.room <= 0) return;
    state.room -= 1;
    state.roomEnteredAt = state.time;
    state.x = 885;
    state.y = 410;
    state.selected = null;
    const scene=applyRouteScene();
    say('移动', `你回到${DATA.segments[state.room].name}。此前移动过的东西仍在那里。`, 'action');
    if(scene)showCinematic(scene.witness,scene.plot,3.6);
    renderAll();
  }

  function roomIntro(room) {
    const base=[
      '掌纹向四面延伸。你不知道自己站在地面，还是某段被放大的触感里。',
      '一轮低月只照亮白布。白色的圆片等在瓷盘中央。',
      '长廊保留着几个不属于同一年龄的影子。',
      '水井倒悬在天花板下。蓝线像很早以前有人规定过的岸。',
      '铁籽没有发芽。它们只会从狭窄的金属里离开。',
      '纸人们等待一个可以写进格子里的答案。',
      '每一级楼梯都和地面一样高，只是声音逐级上升。',
      '名字被折在纸背，时间被盐一样抹平。',
      '北墙的材料并不统一。某些地方像墙，某些地方像床栏。',
      '那双手尚未合拢。门槛横在掌纹最深的地方。'
    ][room];
    const scene=currentRouteProfile();
    return scene?`${base}\n${scene.plot}`:base;
  }

  function performSceneAction(object){
    const scene=currentRouteProfile();
    if(!scene||object.id!==state.sceneAnchorId)return;
    const operations={
      lock:['你把现场留下的封条撕开一角。照护记录失去一处完整边缘。','seal-broken'],
      toxin:['你用这块碎片托住封样。样品与房间编号第一次绑定。','sample-fixed'],
      ballistics:['你把碎片立成落点标尺。下一次弹道会留下可比较的高度。','ballistic-marker'],
      camera:['你把碎片卡在画框边。任何跳帧都会让它同时出现在两个位置。','frame-anchor'],
      audio:['你用碎片敲出房间编号，让门外听者能校准声音的来处。','audio-calibration'],
      record:['你把碎片压在纸角，当前房间与这页记录从此一一对应。','record-index'],
      water:['你让碎片贴住湿痕末端。下一次渗水只能从这里继续。','water-boundary'],
      reflection:['你把碎片留在镜边，现实与倒影终于共用一个尺度。','mirror-scale'],
      time:['你用碎片抵住刻度。这个房间的当前时间不能再被挪走。','time-anchor'],
      boundary:['你把碎片压在线上。房内与房外各自多了一个固定端点。','boundary-pin'],
      prophecy:['你把碎片放在预言关系旁，标记这一室由谁先完成了结果。','prophecy-claim'],
      latent:['你只记录它的位置，不替它命名。一个未定义状态被完整保存。','latent-preserved']
    };
    const [text,eventType]=operations[scene.mutation];
    object.marked=true;object.used=true;
    defineAttribute(object.id,'history',scene.id,`${object.name}承担${scene.id}现场作用`);
    engine.record(eventType,{sceneId:scene.id,room:state.room,object:object.id,actor:'player'});
    engine.graph.addNode({id:`scene-action:${scene.id}`,label:`${scene.id}：${text}`,kind:'now',fixedAt:state.time});
    engine.graph.addEdge({from:`scene:${scene.id}`,to:`scene-action:${scene.id}`,relation:'player-changes'});
    state.evidenceScore+=1;state.legacyTokens.add(`现场-${scene.id}`);
    say('现场',text,'action');
    renderFacts();
  }

  function scheduleNarratorPressure(prophecy) {
    const dueIn = prophecy.dueAt - state.time;
    say('声音', `某种摆放正在靠近“${prophecy.text}”要求的状态。`, '');
    state.dialogueQueue.push({ at:state.time + Math.max(1, dueIn - .6), run:()=>forceObjectiveEvent(prophecy) });
  }

  function forceObjectiveEvent(prophecy) {
    if (prophecy.status !== 'active') return;
    const p = prophecy.predicate;
    const emit = (type, data={}) => engine.record(type,data);
    // The hand uses the same public operators available to objects. It does not bypass predicate checks.
    if (p === 'line_cross_center') emit('cross',{object:'narrator_line',objectTags:['line'],line:'center'});
    else if (p === 'bell_rings_off_hook') emit('sound',{object:'narrator_bell',objectTags:['sound'],objectLocation:'ground'});
    else if (p === 'tablet_leaves_plate') emit('leave-surface',{object:'tablet',objectTags:['medicine'],surface:'plate'});
    else if (p === 'round_mark_on_blanket') { emit('light-cycle'); emit('mark',{shape:'round',targetTags:['fabric']}); }
    else if (p === 'doorframe_in_mirror') { emit('missing-note'); emit('reflection',{subject:'doorframe'}); }
    else if (p === 'light_on_doll_face') { emit('clock-value',{value:'eight'}); emit('light-hit',{targetTags:['figure'],part:'face'}); }
    else if (p === 'water_cross_blue_line') { for(let i=0;i<4;i+=1)emit('tick'); emit('cross',{material:'water',line:'blue'}); }
    else if (p === 'bucket_water_decreases') emit('quantity-change',{objectTags:['container'],material:'water',delta:-1});
    else if (p === 'projectile_cross_red_height') emit('projectile-cross',{fromChamber:true,line:'red-height'});
    else if (p === 'spent_round_on_tray') emit('land',{projectile:true,leftMagazine:true,targetTags:['bridge']});
    else if (p === 'last_projectile_stops_before_north') emit('projectile-stop',{stoppedBefore:'north'});
    else if (p === 'strip_color_on_camera') { emit('door-shadow');emit('door-shadow');emit('camera-capture',{subjectTags:['test'],attribute:'color'}); }
    else if (p === 'name_beside_red_mark') { emit('paper-flip');emit('adjacent',{aType:'name',bType:'red-mark'}); }
    else if (p === 'outside_hears_room_audio') { emit('line-connected');emit('audio-transfer',{from:'room',to:'outside'}); }
    else if (p === 'two_objects_swap_height') emit('height-swap',{nonAdjacent:true});
    else if (p === 'object_falls_outside_rail') { for(let i=0;i<7;i+=1)emit('tile-lit');emit('cross',{object:'fragment',from:'inside-rail',to:'outside-rail'}); }
    else if (p === 'top_loses_one_object') { for(let i=0;i<3;i+=1)emit('stair-sound');emit('leave-surface',{surface:'highest'}); }
    else if (p === 'duplicate_time_on_records') {emit('paper-open');emit('duplicate-value',{key:'time',targets:['a','b']});}
    else if (p === 'identity_changes_after_stamp_lift') {emit('stamp-off-table');emit('attribute-change',{key:'identity',value:'dependent'});}
    else if (p === 'preloop_footage_fullscreen') {emit('screen-on');emit('screen-content',{beforeLoop:true,fullscreen:true});}
    else if (p === 'crack_crosses_two_materials') {for(let i=0;i<3;i+=1)emit('vibration');emit('crack',{materials:['wall','rail']});}
    else if (p === 'outside_object_enters') {engine.setValue('crack-width',60);emit('cross',{from:'outside',to:'inside'});}
    else if (p === 'foreign_line_inside_wall') {emit('lock-sound');emit('line-appears',{area:'north-inside',origin:'rail-shadow'});}
    else if (p === 'legacy_object_crosses_before_light') emit('cross',{fromRoom:Math.max(0,state.room-1),to:'threshold'});
    else if (p === 'small_handprint_covers_old') {emit('last-bell');emit('cover',{target:'old-handprint',coverType:'smaller-handprint'});}
    else if (p === 'three_carried_touch_ground') emit('group-contact',{count:3,origin:'carried',surface:'ground'});
    else if (p === 'one_shadow_lost') {emit('switch-change');emit('switch-change');emit('quantity-change',{kind:'shadow',delta:-1});}
    else if (p === 'liquid_below_first_mark') {for(let i=0;i<3;i+=1)emit('cup-metal');emit('attribute-change',{key:'liquid-level',value:'below-first-mark'});}
    else if (p === 'camera_doll_count_plus_one') {emit('camera-to-door');emit('quantity-change',{kind:'figure-in-frame',delta:1});}
    else if (p === 'outside_object_still_linked') {emit('crack-stop');emit('linked-across',{aArea:'outside',bArea:'inside'});}
    showCinematic('', '画面外，一双无法看清归属的手移动了某件东西。', 2.2);
  }

  function finishChapter() {
    state.ended = true;
    state.playing = false;
    const carried=state.hands.map((id)=>objectState.get(id)).filter(Boolean);
    const categoryRules=[
      (object)=>object.tags.includes('ammo')||object.tags.includes('gun'),
      (object)=>object.tags.includes('sound'),
      (object)=>object.template==='chalk'||object.template==='cup'||object.template==='bucket'||object.tags.includes('water'),
      (object)=>object.tags.includes('evidence')||object.tags.includes('stamp'),
      (object)=>object.tags.includes('light')||object.template==='prism'
    ];
    let a=categoryRules.findIndex((rule)=>carried.some(rule));
    if(a<0)a=0;
    const b=Math.min(4,state.meaningfulDeclarations);
    const ending = DATA.endings[a * 5 + b];
    dom.endingTitle.textContent = ending.title;
    dom.endingBody.textContent = ending.body;
    const carriedState=carried.map((item)=>item.id);
    const sceneActions=engine.events.filter((event)=>event.sceneId&&event.actor==='player').map((event)=>event.sceneId);
    const dynamicLegacy=[...ending.legacy,`第八层：${currentStoryArc()?.name||'未压实'}`,`玩家抢先兑现：${state.playerOccupiedProphecies.size} 条`,`现场改动：${sceneActions.length} 处`,`固定事实：${engine.fixed.size} 项`];
    dom.legacyList.innerHTML = dynamicLegacy.map((item)=>`<span>${item}</span>`).join('');
    dom.ending.classList.remove('hidden');
    localStorage.setItem('palm-fortress-loop1', JSON.stringify({
      version:2,ending:ending.id,storyArc:state.storyArc,storyLockedAt:state.storyLockedAt,
      fixed:[...engine.fixed.entries()],fixedFacts:state.fixedFacts,definedAttributes:[...state.definedAttributes.entries()],
      legacy:[...state.legacyTokens],sceneActions,appliedScenes:[...state.appliedScenes],carried:carriedState,
      resolvedProphecies:engine.resolvedProphecies.map((item)=>item.id),playerOccupiedProphecies:[...state.playerOccupiedProphecies],
      meaningfulDeclarations:state.meaningfulDeclarations,autonomy:state.autonomyScore,evidence:state.evidenceScore,relation:state.relationScore,
      objects:[...objectState.values()].filter((item)=>item.marked||item.wet||item.used||item.holder||item.room!==DATA.objects.find((source)=>source.id===item.id)?.room).map((item)=>({id:item.id,room:item.room,x:item.x,y:item.y,holder:item.holder,marked:item.marked,wet:item.wet,used:item.used,latent:item.latent}))
    }));
  }

  function tutorialUpdate() {
    if (state.tutorialDone) return;
    const step = tutorialSteps[state.tutorialIndex];
    dom.tutorialStep.textContent = `${state.tutorialIndex + 1} / ${tutorialSteps.length}`;
    dom.tutorialTitle.textContent = step.title;
    dom.tutorialText.textContent = step.text;
    const done = ['graph','exit','ack'].includes(step.need) ? true : state.tutorialFlags.has(step.need);
    dom.tutorialNext.disabled = !done;
    if (step.need === 'prophecy' && !state.manualProphecySeeded) {
      state.manualProphecySeeded = true;
      const first = DATA.prophecies.find((p)=>p.id==='p01');
      engine.announce(first);
    }
  }

  function completeTutorial() {
    state.tutorialDone = true;
    state.playing = true;
    state.roomEnteredAt = state.time;
    state.roomUnlocks.add(1);
    dom.tutorial.classList.add('hidden');
    say('记住', '你能定义当前可压实的事实；声音会固定过去；红色提示音后的客观未来一定发生。', '');
  }

  function movePlayer(dt) {
    let dx = 0, dy = 0;
    if (state.keys.has('w') || state.keys.has('arrowup')) dy -= 1;
    if (state.keys.has('s') || state.keys.has('arrowdown')) dy += 1;
    if (state.keys.has('a') || state.keys.has('arrowleft')) dx -= 1;
    if (state.keys.has('d') || state.keys.has('arrowright')) dx += 1;
    state.moving=!!(dx||dy);
    if (!dx && !dy) return;
    const length = Math.hypot(dx,dy);
    state.x += dx / length * state.speed * dt;
    state.y += dy / length * state.speed * dt;
    state.walkPhase=(state.walkPhase+dt*9)%(Math.PI*2);
    state.x = Math.max(24, Math.min(DATA.ROOM_W - 24, state.x));
    state.y = Math.max(62, Math.min(DATA.ROOM_H - 26, state.y));
    if (dx) state.facing = Math.sign(dx);
    state.tutorialFlags.add('move');
    if (state.room === 6) {
      const tile=Math.max(0,Math.min(6,Math.floor(state.x/(DATA.ROOM_W/7))));
      const tileKey=`${state.room}:${tile}`;
      if(!state.tileVisits.has(tileKey)){state.tileVisits.add(tileKey);engine.record('tile-lit',{tile});}
      const stair=Math.max(0,Math.min(2,Math.floor(state.y/(DATA.ROOM_H/3))));
      const stairKey=`${state.room}:${stair}`;
      if(!state.stairVisits.has(stairKey)){state.stairVisits.add(stairKey);engine.record('stair-sound',{stair});}
    }
    noteAction('move');
    if (state.x > 930 && state.tutorialDone) enterNextRoom();
    else if (state.x < 30 && state.room > 0 && state.tutorialDone) enterPreviousRoom();
  }

  function drawRoom() {
    const room = DATA.segments[state.room];
    ctx.fillStyle = room.tint;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = room.floor;
    ctx.fillRect(0,70,canvas.width,470);
    ctx.strokeStyle = 'rgba(210,215,195,.08)';
    ctx.lineWidth = 1;
    for (let x=0;x<canvas.width;x+=48) { ctx.beginPath();ctx.moveTo(x,70);ctx.lineTo(x,540);ctx.stroke(); }
    for (let y=70;y<canvas.height;y+=48) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke(); }

    // The same shapes remain ambiguous: palm lines, bed rails, walls and remembered corridors overlap.
    ctx.strokeStyle = 'rgba(141,161,110,.32)';
    ctx.lineWidth = 3;
    for (let i=0;i<5;i+=1) {
      ctx.beginPath();
      ctx.moveTo(0,150+i*70);
      ctx.bezierCurveTo(210,80+i*86,430,240+i*28,960,120+i*74);
      ctx.stroke();
    }
    if (state.room === 3) {
      ctx.strokeStyle = '#5f969f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(80,310);ctx.lineTo(880,310);ctx.stroke();
    }
    if (state.room === 4) {
      ctx.strokeStyle = '#9e5a55';ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(80,280);ctx.lineTo(880,280);ctx.stroke();ctx.setLineDash([]);
    }
    if (state.room === 8) {
      ctx.strokeStyle = '#6d7368';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(480,70);ctx.lineTo(525,190);ctx.lineTo(505,320);ctx.lineTo(570,540);ctx.stroke();
    }
    const scene=currentRouteProfile();
    if(scene){
      ctx.save();
      ctx.fillStyle=`${scene.witnessColor}33`;ctx.strokeStyle=scene.witnessColor;ctx.lineWidth=2;
      const wx=790-((scene.arcIndex*43+state.room*29)%310),wy=210+((scene.arcIndex*19+state.room*31)%170)+Math.sin(state.time*1.4+scene.arcIndex)*3;
      ctx.beginPath();ctx.arc(wx,wy-34,15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillRect(wx-17,wy-17,34,62);ctx.strokeRect(wx-17,wy-17,34,62);
      ctx.fillStyle='rgba(12,14,11,.86)';ctx.fillRect(wx-66,wy+52,132,22);ctx.fillStyle='#d9ded3';ctx.font='11px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(scene.witness,wx,wy+67);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(212,167,87,.18)';
    ctx.fillRect(926,88,18,402);
    if (state.room > 0) ctx.fillRect(16,88,12,402);
  }

  function drawObject(object) {
    const near = distance(state,object)<82;
    const selected = state.selected === object.id;
    const size = object.kind === 'fragment' ? 7 : object.carry ? 13 : 19;
    ctx.save();
    ctx.translate(object.x,object.y);
    if(object.id===state.sceneAnchorId)ctx.scale(1+Math.sin(state.time*3)*.08,1+Math.sin(state.time*3)*.08);
    ctx.fillStyle = object.color;
    ctx.strokeStyle = selected ? '#f1c36c' : near ? '#c8d2af' : 'rgba(0,0,0,.55)';
    ctx.lineWidth = selected ? 3 : near ? 2 : 1;
    if (object.tags.includes('gun')) {
      ctx.fillRect(-size,-4,size*1.7,8);ctx.fillRect(-2,3,6,10);ctx.strokeRect(-size,-4,size*1.7,8);
    } else if (object.tags.includes('container')) {
      ctx.beginPath();ctx.rect(-size,-size*.8,size*2,size*1.6);ctx.fill();ctx.stroke();
    } else if (object.tags.includes('figure')) {
      ctx.beginPath();ctx.arc(0,-7,6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillRect(-7,0,14,18);
    } else if (!object.carry) {
      ctx.fillRect(-size,-size,size*2,size*2);ctx.strokeRect(-size,-size,size*2,size*2);
    } else {
      ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size,size*.65);ctx.lineTo(-size,size*.65);ctx.closePath();ctx.fill();ctx.stroke();
    }
    if (object.marked) { ctx.strokeStyle='#d17662';ctx.beginPath();ctx.arc(0,0,size+6,0,Math.PI*2);ctx.stroke(); }
    if (near && object.kind !== 'fragment') {
      ctx.fillStyle = 'rgba(11,13,10,.88)';ctx.fillRect(-45,-size-28,90,18);ctx.fillStyle='#e4e7dc';ctx.font='11px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(object.name,0,-size-15);
    }
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    const step=state.moving?Math.sin(state.walkPhase):0;
    ctx.translate(state.x,state.y-Math.abs(step)*2);
    ctx.scale(state.facing,1);
    ctx.fillStyle='#d4a757';ctx.strokeStyle='#f5d998';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,-13,8,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillRect(-7,-5,14,22);
    ctx.beginPath();ctx.moveTo(-4,16);ctx.lineTo(-7+step*5,29);ctx.moveTo(4,16);ctx.lineTo(7-step*5,29);ctx.moveTo(-6,1);ctx.lineTo(-13-step*4,11);ctx.moveTo(6,1);ctx.lineTo(13+step*4,11);ctx.stroke();
    ctx.fillStyle='rgba(212,167,87,.18)';ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function drawFog() {
    const gradient = ctx.createRadialGradient(state.x,state.y,42,state.x,state.y,245);
    gradient.addColorStop(0,'rgba(4,5,4,0)');gradient.addColorStop(.55,'rgba(4,5,4,.12)');gradient.addColorStop(1,'rgba(4,5,4,.91)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,960,540);
    if (state.scenePulse && state.time < state.scenePulse.until) {
      ctx.fillStyle = `${state.scenePulse.color}24`;ctx.fillRect(0,0,960,540);
    }
  }

  function draw() {
    drawRoom();
    currentRoomObjects().forEach(drawObject);
    drawPlayer();
    drawFog();
  }

  function renderControls() {
    const object = selectedObject();
    dom.selectedName.textContent = object ? object.name : '没有物件';
    dom.selectedState.textContent = object ? `${object.holder === 'player' ? '手中' : isNear(object) ? '触手可及' : '离得太远'} · ${object.intact ? '完整' : '已改变'}${object.marked ? ' · 有标记' : ''}` : '';
    dom.handsStatus.textContent = state.hands.length ? `双手 ${handMass()}/${state.maxHandMass}` : '双手空着';
    dom.inventory.innerHTML = state.hands.length ? '' : '<span class="small-copy">空</span>';
    state.hands.forEach((id) => {
      const item = objectState.get(id);
      const button = document.createElement('button');
      button.textContent=item.name;button.className=state.selected===id?'active':'';button.onclick=()=>selectObject(id);dom.inventory.append(button);
    });
    dom.actionRow.innerHTML='';
    availableActions(object).forEach((action) => {
      const button=document.createElement('button');button.textContent=action==='scene'?(sceneActionLabels[currentRouteProfile()?.mutation]||actionLabels[action]):(actionLabels[action]||action);button.className=action==='fire'?'danger':'';button.onclick=()=>interact(action);dom.actionRow.append(button);
    });
    const options=utteranceOptions();dom.utterances.innerHTML='';
    if (!options.length) dom.utterances.innerHTML='<span class="empty">现在没有可被你直接压实的结果。</span>';
    options.forEach((option)=>{const button=document.createElement('button');button.textContent=option.speech;button.onclick=()=>declareOption(option);dom.utterances.append(button);});
  }

  function renderNearby() {
    const nearby=currentRoomObjects().filter((object)=>distance(state,object)<190).sort((a,b)=>distance(state,a)-distance(state,b));
    dom.objectCount.textContent=`${nearby.length} 件在附近`;
    dom.nearby.innerHTML='';
    nearby.forEach((object)=>{const button=document.createElement('button');button.innerHTML=`${object.name}<span>${Math.round(distance(state,object))} 步 · ${object.kind==='fragment'?'可搬动碎片':object.desc.slice(0,18)}</span>`;button.onclick=()=>selectObject(object.id);dom.nearby.append(button);});
    const nearest=nearestObject();
    if(nearest){dom.nearPrompt.textContent=`靠近 ${nearest.name} · 点击选中`;dom.nearPrompt.classList.add('show');}else dom.nearPrompt.classList.remove('show');
  }

  function renderFacts() {
    dom.fixedFacts.innerHTML='';
    state.fixedFacts.slice().reverse().forEach((fact)=>{const card=document.createElement('div');card.className=`fact-card ${fact.kind==='future'?'future':''}`;card.innerHTML=`<span>${formatTime(fact.time)} · ${fact.kind==='future'?'未来':'已定型'}</span>${fact.text}`;dom.fixedFacts.append(card);});
    renderGraph();
  }

  function renderGraph() {
    const allNodes=engine.graph.visibleNodes;const nodes=allNodes.slice(-45);const edges=engine.graph.visibleEdges;dom.graphCount.textContent=`已揭示 ${allNodes.length} / ${DATA.stats.attributes} 属性`;
    dom.graph.innerHTML='';
    if(!nodes.length){dom.graph.innerHTML='<text x="215" y="310" text-anchor="middle" fill="#72796e" font-size="12">还没有事实被固定</text>';return;}
    const positions=new Map();
    nodes.forEach((node,index)=>{const column=node.kind==='past'?0:node.kind==='future'?2:1;const peers=nodes.filter((n)=> (n.kind==='past'?0:n.kind==='future'?2:1)===column);const row=peers.indexOf(node);positions.set(node.id,{x:22+column*139,y:32+row*72});});
    const maxY=Math.max(650,...[...positions.values()].map((position)=>position.y+64));dom.graph.setAttribute('viewBox',`0 0 430 ${maxY}`);dom.graph.style.height=`${Math.min(900,Math.max(430,maxY))}px`;
    for(const edge of edges){const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b)continue;const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',a.x+112);line.setAttribute('y1',a.y+20);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y+20);line.setAttribute('class',`graph-edge ${edge.inferred?'inferred':''}`);dom.graph.append(line);}
    for(const node of nodes){const p=positions.get(node.id);const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.setAttribute('class',`graph-node ${node.kind}`);group.setAttribute('transform',`translate(${p.x} ${p.y})`);const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('width','112');rect.setAttribute('height','42');const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x','7');text.setAttribute('y','15');const label=node.label.length>18?`${node.label.slice(0,18)}…`:node.label;text.textContent=label;group.append(rect,text);group.onclick=()=>{dom.graphDetail.textContent=`${node.label}（${node.kind==='past'?'过去定型':node.kind==='future'?'必然未来':'当前/推论'}，${formatTime(node.fixedAt)}）`;};dom.graph.append(group);}
  }

  function renderTop() {
    const segment=DATA.segments[state.room];dom.roomTitle.textContent=segment.name;dom.segmentLabel.textContent=segment.subtitle;dom.segmentProgress.style.width=`${(state.room+1)/10*100}%`;dom.gameTime.textContent=formatTime(state.time);
    const active=engine.activeProphecies[0];
    if(active){dom.prophecyStrip.classList.add('active');dom.prophecyText.textContent=active.text;dom.prophecyDetail.textContent=`整句必须发生 · 由实际事件流判定`;dom.prophecyClock.textContent=Math.max(0,active.dueAt-state.time).toFixed(1);}else{dom.prophecyStrip.classList.remove('active');dom.prophecyText.textContent='尚无被固定的未来';dom.prophecyDetail.textContent='';dom.prophecyClock.textContent='--';}
  }

  function renderAudit() {
    dom.assetAudit.textContent=[
      `实体：${DATA.stats.objects}（全部有坐标、状态与交互）`,
      `八层属性：${DATA.stats.attributes}`,
      `带时间影响边：${DATA.stats.edges}`,
      `客观预言：${DATA.stats.prophecies}`,
      `压缩博弈链：${DATA.stats.insightChains}`,
      `第一轮结局叶子：${DATA.stats.endings}`,
      `旁白目标：${DATA.stats.goals}`,
      `七八层剧情现场：${DATA.stats.experientialRoutes}（12 故事线 × 10 房间）`,
      `候选排序：${state.plannerMode==='fallback'?'确定性规则':state.plannerMode==='web-llm'?'网页本地LLM':'浏览器内置LLM'}`
    ].join('\n');
  }

  function renderAttributeStatus(){
    const scene=currentRouteProfile();const arc=currentStoryArc();
    dom.strategicState.innerHTML=`<span>第8层<strong>${arc?arc.name:'尚未压实'}</strong></span><span>第7层<strong>${DATA.segments[state.room].name}</strong></span><span>当前现场<strong>${scene?scene.id:'公共前段'}</strong></span>`;
    const lines=[];
    for(let layer=8;layer>=1;layer-=1){
      const layerAttrs=DATA.attributes.filter((attribute)=>attribute.layer===layer);
      const fixed=layerAttrs.filter((attribute)=>state.definedAttributes.has(attribute.id)).length;
      lines.push(`第 ${layer} 层：已确定 ${fixed} / ${layerAttrs.length}，未确定 ${layerAttrs.length-fixed}`);
    }
    const relevant=DATA.attributes.filter((attribute)=>attribute.entity===`room_${state.room}`||objectState.get(attribute.entity)?.room===state.room);
    const unknown=relevant.filter((attribute)=>!state.definedAttributes.has(attribute.id)).slice(0,12);
    lines.push('',`当前房间相关未确定（列前 ${unknown.length} 项）：`,...unknown.map((attribute)=>`· ${objectState.get(attribute.entity)?.name||attribute.entity} / ${attribute.key}`));
    if(scene)lines.push('',`现场差异：${scene.plot}`,`缺失：${objectState.get(scene.missingObjectId)?.name||'无核心物件'}；移位：${objectState.get(scene.shiftedObjectId)?.name||'无'}；见证者：${scene.witness}`);
    dom.attributeStatus.textContent=lines.join('\n');
  }

  function renderAll(){renderTop();renderControls();renderNearby();renderFacts();renderAttributeStatus();renderAudit();tutorialUpdate();}

  async function tick(timestamp) {
    const rawDt=Math.min(.05,(timestamp-state.lastFrame)/1000);state.lastFrame=timestamp;
    if(!state.paused&&!state.typing&&!state.ended){
      movePlayer(rawDt);
      if(state.playing) state.time+=rawDt;
      if(state.playing) await engine.update();
      while(state.dialogueQueue.length&&state.dialogueQueue[0].at<=state.time){const item=state.dialogueQueue.shift();item.run();}
      if(state.playing&&state.time>=state.ambientAt){say('',ambientLines[Math.floor(state.time/9)%ambientLines.length],'');state.ambientAt=state.time+11+((state.room*3)%6);}
      if(!dom.cinematic.classList.contains('hidden')&&state.time>=state.cinematicUntil)dom.cinematic.classList.add('hidden');
    }
    draw();renderTop();renderNearby();tutorialUpdate();requestAnimationFrame(tick);
  }

  function bindEvents() {
    window.addEventListener('keydown',(event)=>{
      const key=event.key.toLowerCase();
      if (event.target === dom.utteranceInput) {
        if (key === 'escape') { dom.utteranceInput.blur(); state.typing=false; }
        return;
      }
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){event.preventDefault();state.keys.add(key);audio.ensure();}
      if(key==='escape'&&state.aiming){state.aiming=null;dom.crosshair.classList.remove('show');renderControls();}
      if(key==='enter') { event.preventDefault();state.typing=true;dom.utteranceInput.focus(); }
      if(key==='p')togglePause();
    });
    window.addEventListener('keyup',(event)=>state.keys.delete(event.key.toLowerCase()));
    canvas.addEventListener('click',(event)=>{
      audio.ensure();const rect=canvas.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width*canvas.width;const y=(event.clientY-rect.top)/rect.height*canvas.height;
      if(state.aiming){resolveAim(x,y);return;}
      const object=objectAtScreen(x,y);if(object)selectObject(object.id);
      else {state.x=Math.max(24,Math.min(DATA.ROOM_W-24,x));state.y=Math.max(62,Math.min(DATA.ROOM_H-26,y));state.tutorialFlags.add('move');noteAction('move');}
    });
    canvas.addEventListener('mousemove',(event)=>{if(!state.aiming)return;const rect=canvas.getBoundingClientRect();const x=event.clientX-rect.left,y=event.clientY-rect.top;dom.crosshair.style.left=`${x}px`;dom.crosshair.style.top=`${y}px`;});
    $$('.tabs button').forEach((button)=>button.onclick=()=>{$$('.tabs button').forEach((b)=>b.classList.toggle('active',b===button));$$('.tab-view').forEach((view)=>view.classList.toggle('active',view.dataset.view===button.dataset.tab));if(button.dataset.tab==='graph')state.tutorialFlags.add('graph');});
    dom.tutorialNext.onclick=()=>{if(state.tutorialIndex>=tutorialSteps.length-1){completeTutorial();return;}state.tutorialIndex+=1;tutorialUpdate();};
    dom.tutorialSkip.onclick=completeTutorial;
    dom.utteranceInput.addEventListener('focus',()=>{state.typing=true;state.keys.clear();});
    dom.utteranceInput.addEventListener('blur',()=>{state.typing=false;});
    dom.utteranceForm.addEventListener('submit',async(event)=>{
      event.preventDefault();
      const value=dom.utteranceInput.value;
      dom.utteranceInput.value='';
      await submitUtterance(value);
      dom.utteranceInput.focus();
    });
    $('#pause-button').onclick=togglePause;$('#resume-button').onclick=togglePause;
    dom.llmEnable.onclick=async()=>{
      dom.llmEnable.disabled=true;dom.llmStatus.textContent='正在下载并加载网页本地LLM（首次约数百MB）…';
      const mode=await engine.planner.enableWebLLM((progress)=>{dom.llmStatus.textContent=`网页本地LLM：${progress}`;});
      state.plannerMode=mode;dom.llmEnable.classList.toggle('hidden',mode!=='fallback');dom.llmEnable.disabled=false;
      dom.llmStatus.textContent=mode==='web-llm'?'自然语言：网页本地LLM已启用':'网页本地LLM不可用；保留确定性候选与按钮';renderAudit();
    };
    $('#restart-button').onclick=()=>location.reload();
    $('#graph-center').onclick=renderGraph;
  }

  function togglePause(){if(!state.tutorialDone)return;state.paused=!state.paused;dom.pause.classList.toggle('hidden',!state.paused);}

  async function start() {
    bindEvents();
    state.plannerMode=await engine.initialize();
    dom.llmStatus.textContent=state.plannerMode==='browser-llm'?'自然语言：浏览器内置LLM已启用':'自然语言：确定性解析；可另行加载网页本地LLM';
    dom.llmEnable.classList.toggle('hidden',state.plannerMode!=='fallback');
    engine.graph.onChange(()=>renderGraph());
    say('',roomIntro(0),'');
    renderAll();
    requestAnimationFrame(tick);
  }

  window.__palmDemo = {
    state, engine, objectState, DATA,
    select:selectObject, interact, declare:declareOption, enterNextRoom, enterPreviousRoom,
    record:(type,data)=>engine.record(type,data),
    advance(seconds){state.time+=seconds;return engine.update();},
    audit(){return [...engine.audit(), ...auditAssets()];},
    fulfill(id){const prophecy=engine.activeProphecies.find((p)=>p.id===id);if(prophecy)forceObjectiveEvent(prophecy);},
    finish:finishChapter,
    aimAt:resolveAim,
    chooseStoryArc,
    lockStoryArc,
    applyRouteScene,
    currentRouteProfile,
    sceneAction:performSceneAction
  };

  function auditAssets() {
    const errors=[];
    if(DATA.stats.objects<300)errors.push('Object count below 300');
    if(DATA.stats.attributes<5000)errors.push('Attribute count below 5000');
    if(DATA.stats.insightChains<30)errors.push('Insight chains below 30');
    if(DATA.stats.endings<20)errors.push('Ending leaves below 20');
    if(DATA.level8Arcs.length!==12)errors.push('Story arc count must be 12');
    if(DATA.routeScenes.length!==120)errors.push('Route scene count must be 120');
    if(new Set(DATA.routeScenes.map((scene)=>scene.plot)).size!==120)errors.push('Route scene plots must all differ');
    for(const object of DATA.objects){if(!object.id||!object.name||!Array.isArray(object.tags)||!Number.isFinite(object.x)||!Number.isFinite(object.y))errors.push(`Invalid object ${object.id}`);}
    for(const prophecy of DATA.prophecies){if(/[你我]|害怕|决定|想要|伤害自己/.test(prophecy.text))errors.push(`Subjective prophecy ${prophecy.id}`);}
    return errors;
  }

  start();
}());
