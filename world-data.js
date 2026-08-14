(function () {
  'use strict';

  const ROOM_W = 960;
  const ROOM_H = 540;

  const segments = [
    { id: 'palm', name: '掌纹庭', subtitle: '序：学会触碰', tint: '#20231c', floor: '#292d25' },
    { id: 'nursery', name: '低月室', subtitle: '一：白太阳', tint: '#25251e', floor: '#303025' },
    { id: 'gallery', name: '褪色长廊', subtitle: '二：被移动的光', tint: '#1d2421', floor: '#252e29' },
    { id: 'well', name: '倒悬水井', subtitle: '三：水越过线', tint: '#172526', floor: '#203033' },
    { id: 'armory', name: '铁籽房', subtitle: '四：空膛与来路', tint: '#26211d', floor: '#302821' },
    { id: 'paper', name: '纸人候诊厅', subtitle: '五：被看见的颜色', tint: '#25231f', floor: '#302c26' },
    { id: 'stairs', name: '没有高度的楼梯', subtitle: '六：同一时刻', tint: '#20231e', floor: '#292d27' },
    { id: 'archive', name: '盐白档案室', subtitle: '七：名字的来路', tint: '#23231f', floor: '#2c2c25' },
    { id: 'breach', name: '北墙裂口', subtitle: '八：堡垒松动', tint: '#18201d', floor: '#232b27' },
    { id: 'hands', name: '掌心门槛', subtitle: '终：回到大手', tint: '#211d1b', floor: '#2d2723' }
  ];

  const coreTemplates = {
    thread: { name: '红线轴', kind: 'tool', mass: 1, carry: true, tags: ['line', 'tie', 'mark'], color: '#a95e55', desc: '线头被反复打过结。' },
    bell: { name: '铜铃', kind: 'device', mass: 2, carry: true, tags: ['sound', 'clock'], color: '#b58b47', desc: '每次响声都短得像一句没说完的话。' },
    chalk: { name: '蓝粉笔', kind: 'tool', mass: 1, carry: true, tags: ['mark', 'write'], color: '#6e9fa5', desc: '可以留下不会自己移动的线。' },
    cup: { name: '矮杯', kind: 'container', mass: 1, carry: true, tags: ['liquid', 'container'], color: '#b8b49f', desc: '杯壁内侧有一圈水迹。', latent: { toxic: null, filled: true } },
    strip: { name: '银叶试纸', kind: 'tool', mass: 1, carry: true, tags: ['test', 'toxin'], color: '#cbd2c5', desc: '只要在手边，它就足以把毒性变成可压实的结果。' },
    tablet: { name: '白太阳', kind: 'medicine', mass: 1, carry: true, tags: ['medicine', 'edible'], color: '#eee8d8', desc: '边缘有一道很浅的刻痕。', latent: { sedative: null } },
    mirror: { name: '裂镜', kind: 'tool', mass: 2, carry: true, tags: ['reflect', 'signal'], color: '#8fa5a7', desc: '镜中经常比房间多出一条边。' },
    lamp: { name: '低月灯', kind: 'device', mass: 5, carry: false, tags: ['light', 'power'], color: '#ded1a6', desc: '它照亮的不是整间屋，只是床边。', latent: { powered: null } },
    switch: { name: '瓷开关', kind: 'device', mass: 4, carry: false, tags: ['power', 'toggle'], color: '#b3aa91', desc: '开与关都能在指腹下停住。', latent: { on: null } },
    blanket: { name: '白布', kind: 'fabric', mass: 3, carry: true, tags: ['cover', 'absorb', 'tie'], color: '#d7d5c8', desc: '洗得很薄，折痕像一张地图。' },
    bucket: { name: '铁桶', kind: 'container', mass: 4, carry: true, tags: ['container', 'liquid', 'helmet'], color: '#778181', desc: '空的时候能套住头，满的时候需要两只手。', latent: { filled: false } },
    valve: { name: '旧阀门', kind: 'device', mass: 6, carry: false, tags: ['water', 'toggle'], color: '#6d7770', desc: '转动之后，水不会立刻到达另一边。', latent: { open: null } },
    pistol: { name: '钉籽枪', kind: 'weapon', mass: 3, carry: true, tags: ['gun', 'shoot', 'inspect-ammo'], color: '#5f6562', desc: '能朝任意位置开火，也能把弹药状态压实。', latent: { rounds: null, jammed: false } },
    toyGun: { name: '软籽枪', kind: 'weapon', mass: 2, carry: true, tags: ['gun', 'shoot', 'soft'], color: '#8b7657', desc: '声音很响，弹丸很轻。', latent: { rounds: 1, jammed: false } },
    cartridge: { name: '一枚铁籽', kind: 'ammo', mass: 1, carry: true, tags: ['ammo'], color: '#aa8d54', desc: '它能进入某一把枪，但来路尚未确定。' },
    flour: { name: '灰白粉', kind: 'material', mass: 2, carry: true, tags: ['trace', 'scatter'], color: '#d9d4bd', desc: '撒下以后，地面经过什么会留下区别。' },
    tray: { name: '薄铁盘', kind: 'tool', mass: 3, carry: true, tags: ['cover', 'reflect', 'bridge'], color: '#7e8988', desc: '可以挡、垫、架，也会把粉末带到别处。' },
    record: { name: '折叠记录', kind: 'document', mass: 1, carry: true, tags: ['evidence', 'read'], color: '#c8b991', desc: '时间栏被折进纸背。', latent: { signedBy: null } },
    phone: { name: '无声电话', kind: 'device', mass: 2, carry: true, tags: ['call', 'record'], color: '#4d5a55', desc: '线路是否接通，还没有被任何声音证明。', latent: { connected: null } },
    key: { name: '床栏钥匙', kind: 'tool', mass: 1, carry: true, tags: ['key', 'unlock'], color: '#b39052', desc: '齿纹与门上的锁不完全相似。' },
    scissors: { name: '圆头剪', kind: 'tool', mass: 1, carry: true, tags: ['cut', 'tool'], color: '#88918d', desc: '可以剪线、布和纸，不能替你决定剪断什么。' },
    clock: { name: '倒走钟', kind: 'device', mass: 6, carry: false, tags: ['clock', 'time'], color: '#7d806a', desc: '指针倒着走，钟声却按真实时间出现。', latent: { accurate: null } },
    camera: { name: '方眼', kind: 'device', mass: 5, carry: false, tags: ['camera', 'evidence'], color: '#59665f', desc: '画面能被定义，画面代表的过去不能。', latent: { authentic: null } },
    screen: { name: '雾屏', kind: 'device', mass: 5, carry: false, tags: ['screen', 'evidence'], color: '#637a78', desc: '屏幕显示什么是一件现在的事。', latent: { powered: null } },
    doll: { name: '无脸纸人', kind: 'figure', mass: 1, carry: true, tags: ['figure', 'decoy'], color: '#b6aa8c', desc: '被摆到哪里，就像有人在那里停过。' },
    latch: { name: '北墙绳结', kind: 'device', mass: 5, carry: false, tags: ['lock', 'tie'], color: '#7d6552', desc: '一头连着墙，一头没入看不清的地方。', latent: { secure: null } },
    door: { name: '掌心门', kind: 'structure', mass: 9, carry: false, tags: ['door', 'exit'], color: '#6f5d4f', desc: '门外不是同一种尺度。', latent: { locked: null } },
    handprint: { name: '旧掌印', kind: 'trace', mass: 0, carry: false, tags: ['trace', 'memory'], color: '#805d55', desc: '比你现在的手大得多。' },
    drain: { name: '吞水口', kind: 'structure', mass: 9, carry: false, tags: ['drain', 'water'], color: '#46514f', desc: '有东西通过时会发出低声。', latent: { clear: null } },
    rail: { name: '铁森林', kind: 'structure', mass: 9, carry: false, tags: ['rail', 'climb'], color: '#606b67', desc: '一排竖杆，近看像床栏，远看像树林。' },
    musicBox: { name: '缺齿乐盒', kind: 'device', mass: 2, carry: true, tags: ['sound', 'clock'], color: '#876e54', desc: '转满三圈时会漏掉一个音。' },
    ink: { name: '暗红墨水', kind: 'material', mass: 1, carry: true, tags: ['mark', 'liquid'], color: '#8d4f4c', desc: '落到白布上很像另一种东西。' },
    seal: { name: '护理印章', kind: 'tool', mass: 1, carry: true, tags: ['stamp', 'evidence'], color: '#765c50', desc: '盖下去的名字取决于印面，不取决于握它的手。' },
    rope: { name: '软绳', kind: 'tool', mass: 2, carry: true, tags: ['tie', 'pull'], color: '#8b7b62', desc: '能把远处的动作接到眼前。' },
    seed: { name: '黑色种子', kind: 'material', mass: 1, carry: true, tags: ['small', 'decoy'], color: '#353a31', desc: '大小刚好能占住一个窄口。' },
    prism: { name: '三棱玻璃', kind: 'tool', mass: 1, carry: true, tags: ['light', 'reflect'], color: '#8da9a5', desc: '把一束光拆成几种并不互相否定的颜色。' }
  };

  const placements = [
    ['thread',0,190,330],['bell',0,415,180],['chalk',0,690,365],['handprint',0,775,185],
    ['tablet',1,300,260],['lamp',1,520,130],['switch',1,760,270],['blanket',1,510,390],
    ['mirror',2,230,200],['musicBox',2,520,300],['clock',2,770,165],['doll',2,700,390],
    ['cup',3,260,230],['strip',3,570,185],['bucket',3,720,355],['valve',3,390,390],['drain',3,830,420],
    ['pistol',4,275,300],['toyGun',4,590,220],['cartridge',4,765,355],['flour',4,440,390],['tray',4,705,145],
    ['record',5,245,210],['phone',5,480,370],['camera',5,760,155],['screen',5,760,320],['ink',5,370,145],
    ['rope',6,260,355],['scissors',6,485,205],['rail',6,750,290],['seed',6,635,420],
    ['seal',7,250,250],['key',7,470,360],['prism',7,690,180],['screen',7,790,340],
    ['latch',8,510,205],['door',8,820,275],
    ['door',9,480,185],['handprint',9,655,300]
  ];

  const coreObjects = placements.map(([template, room, x, y], index) => ({
    id: `${template}_${index}`,
    template,
    room,
    x,
    y,
    ...coreTemplates[template]
  }));

  const fragmentNames = ['碎瓷', '线头', '木片', '玻璃珠', '旧纽扣', '纸角', '盐粒袋', '弯钉', '空药壳', '褪色积木'];
  const fragmentColors = ['#8f8a78','#756d5d','#796b55','#76918e','#7d7462','#a39a7d','#b6aa8e','#626b66','#8d8170','#786d5e'];
  const fragments = [];
  for (let room = 0; room < 10; room += 1) {
    for (let i = 0; i < 30; i += 1) {
      const type = i % fragmentNames.length;
      const col = i % 6;
      const row = Math.floor(i / 6);
      fragments.push({
        id: `fragment_${room}_${i}`,
        template: 'fragment',
        name: `${fragmentNames[type]} ${room + 1}-${i + 1}`,
        kind: 'fragment',
        room,
        x: 105 + col * 145 + ((room * 17 + i * 11) % 33),
        y: 105 + row * 78 + ((room * 13 + i * 7) % 21),
        mass: 1,
        carry: true,
        tags: ['small', type % 3 === 0 ? 'mark' : 'weight', type % 4 === 0 ? 'wedge' : 'stack'],
        color: fragmentColors[type],
        desc: '可以拿、放、扔、垫、压或留作标记。它的位置不会被章节重置。'
      });
    }
  }

  const objects = [...coreObjects, ...fragments];

  const prophecies = [
    { id:'p01', room:0, text:'第三次铃响时，红线的一端会越过掌纹中央。', delay:28, predicate:'line_cross_center', motherPlan:'让大手收线，把女儿带回起点', occupations:['玩家提前把线穿过中央','让纸人拖线越界','把线绑在铃锤上'], objective:['red_line','center','third_bell'] },
    { id:'p02', room:0, text:'三十秒内，铜铃会在离开木钩后发出声音。', delay:30, predicate:'bell_rings_off_hook', motherPlan:'让坠落的铃声吓退女儿', occupations:['玩家拿起后主动摇铃','用绳子远程拉响','投掷铃铛让撞击发声'], objective:['bell','off_hook','sound'] },
    { id:'p03', room:1, text:'低月熄灭以前，白太阳会离开瓷盘。', delay:32, predicate:'tablet_leaves_plate', motherPlan:'让药片进入女儿嘴里', occupations:['藏入白布','投入水杯','让纸人带走'], objective:['tablet','leave_plate','before_lamp_off'] },
    { id:'p04', room:1, text:'下一次明暗交替后，白布上会留下一个圆形痕迹。', delay:35, predicate:'round_mark_on_blanket', motherPlan:'用药杯水印证明女儿服药', occupations:['用墨水瓶底盖印','放下湿杯','用灯圈投影后描线'], objective:['blanket','round_mark','light_cycle'] },
    { id:'p05', room:2, text:'缺齿乐盒漏音时，镜面里会出现一道完整的门框。', delay:38, predicate:'doorframe_in_mirror', motherPlan:'让大手从镜后出现', occupations:['移动镜子反射真实门框','用碎片拼出门框倒影','让纸人举镜经过'], objective:['mirror','doorframe','missing_note'] },
    { id:'p06', room:2, text:'倒走钟指向八时，北侧的光会落在纸人的脸上。', delay:42, predicate:'light_on_doll_face', motherPlan:'把监视灯投到纸人位置', occupations:['用三棱镜折光','移动纸人接光','用裂镜反射灯光'], objective:['light','doll_face','clock_eight'] },
    { id:'p07', room:3, text:'第四声滴答结束时，水会越过蓝线。', delay:36, predicate:'water_cross_blue_line', motherPlan:'打开阀门让水淹过逃路', occupations:['玩家从杯中倒一滴越线','挪动蓝线穿过水迹','让湿布滴水'], objective:['water','blue_line','fourth_tick'] },
    { id:'p08', room:3, text:'吞水口发声以前，铁桶中的水量会减少一次。', delay:44, predicate:'bucket_water_decreases', motherPlan:'让水流入隐藏管道', occupations:['舀水进杯','用白布吸走','向蓝线倒水抢占上一预言'], objective:['bucket','water_decrease','before_drain_sound'] },
    { id:'p09', room:4, text:'十秒后，一颗弹丸会离开一处枪膛并穿过红线所在的高度。', delay:10, predicate:'projectile_cross_red_height', motherPlan:'用钉籽枪沿女儿头部高度射击', occupations:['用软籽枪朝空处开火','压低红线再射击','让枪口朝墙上标记'], objective:['projectile','barrel','red_height'] },
    { id:'p10', room:4, text:'下一声铃响以前，铁盘上会出现一枚离开过弹仓的弹丸。', delay:30, predicate:'spent_round_on_tray', motherPlan:'射击后让实弹落上铁盘', occupations:['软弹落盘','手动退膛把弹丸放盘','用托盘接住弹壳'], objective:['round','leave_magazine','tray'] },
    { id:'p11', room:4, text:'计时归零时，房内最后一次击发产生的弹丸会停在北墙以前。', delay:45, predicate:'last_projectile_stops_before_north', motherPlan:'让弹丸停在女儿身体里', occupations:['射入铁桶','射入折叠白布','用软弹撞墙前落地'], objective:['last_projectile','stop','before_north'] },
    { id:'p12', room:5, text:'门影第二次经过地面时，银叶试纸的颜色会进入方眼画面。', delay:38, predicate:'strip_color_on_camera', motherPlan:'把异常颜色拍进照护记录', occupations:['把无毒色试纸放镜前','用纸人举着试纸经过','用镜面反射试纸颜色'], objective:['strip_color','camera','second_shadow'] },
    { id:'p13', room:5, text:'纸页翻到背面以后，一个名字会出现在暗红印迹旁。', delay:36, predicate:'name_beside_red_mark', motherPlan:'让母亲姓名与照护记录并列', occupations:['用护理印章盖调查栏','写下外部来访者姓名','把带名纸片移到墨迹旁'], objective:['name','red_mark','paper_back'] },
    { id:'p14', room:5, text:'下一次线路接通时，门外会听见一段来自房内的声音。', delay:42, predicate:'outside_hears_room_audio', motherPlan:'播放女儿混乱的旧录音', occupations:['用电话传出铃声','让乐盒声音进入线路','传出母亲当下的脚步声'], objective:['outside','room_audio','line_connected'] },
    { id:'p15', room:6, text:'绳结松开以前，两件不相邻的物体会交换高度。', delay:35, predicate:'two_objects_swap_height', motherPlan:'拉动绳索升起床栏、压低踏板', occupations:['滑轮交换桶和纸人','抛高小物同时放下托盘','用绳子连接镜子与重物'], objective:['two_objects','height_swap','before_knot_open'] },
    { id:'p16', room:6, text:'第七码格被踩亮时，铁森林外会落下一件来自内侧的物体。', delay:40, predicate:'object_falls_outside_rail', motherPlan:'让关键证据从女儿一侧消失', occupations:['提前投出无关碎片','把记录塞进桶后推出','用软弹击落线头'], objective:['seventh_tile','outside_rail','inside_object'] },
    { id:'p17', room:6, text:'楼梯发出第三次响声后，最高处会比现在轻一件东西。', delay:45, predicate:'top_loses_one_object', motherPlan:'取走顶部的电话', occupations:['提前把碎瓷放到最高处再取走','让纸人从顶端滑落','用绳索拉下空药壳'], objective:['third_stair_sound','top','one_less'] },
    { id:'p18', room:7, text:'盐白纸面被完全展开时，两个相同的时间会出现在不同记录上。', delay:32, predicate:'duplicate_time_on_records', motherPlan:'制造女儿重复发作的记录', occupations:['把倒走钟时间拓印两次','用印章复制时间栏','让镜像中的时间与纸面并列'], objective:['two_records','same_time','paper_open'] },
    { id:'p19', room:7, text:'印章离开桌面以后，记录上的一个身份会发生变化。', delay:38, predicate:'identity_changes_after_stamp_lift', motherPlan:'把女儿改记为无行为能力者', occupations:['把签收人改为外部调查者','把物品归属改为公共证物','让纸人的身份标签改变'], objective:['stamp_off_table','record_identity','change'] },
    { id:'p20', room:7, text:'雾屏恢复亮度时，一段早于本轮开始的画面会占满屏幕。', delay:44, predicate:'preloop_footage_fullscreen', motherPlan:'播放经过剪辑的病史画面', occupations:['先固定屏幕信号来源','用镜头遮挡只留下时间戳','让真实门外画面抢占输入'], objective:['screen_on','preloop_footage','fullscreen'] },
    { id:'p21', room:8, text:'第三次震动后，北墙会出现一道贯穿两种材质的裂缝。', delay:38, predicate:'crack_crosses_two_materials', motherPlan:'让裂缝通向预设恐怖意象', occupations:['把铁盘贴墙让裂缝贯穿墙和盘','把白布贴墙留下可携带裂痕','用粉笔线规定交界'], objective:['third_vibration','north_crack','two_materials'] },
    { id:'p22', room:8, text:'裂缝达到掌宽时，一件外面的东西会进入堡垒。', delay:46, predicate:'outside_object_enters', motherPlan:'让大手从裂口拿回关键物品', occupations:['用绳子拉入门外纸片','让外部光斑进入','用桶接住渗入的水'], objective:['crack_handwide','outside_object','enters'] },
    { id:'p23', room:8, text:'门锁发出声音以后，北墙内侧会多出一道不属于墙的直线。', delay:50, predicate:'foreign_line_inside_wall', motherPlan:'让床栏阴影像牢笼一样落下', occupations:['红线穿入裂缝','铁盘边缘投影','记录纸边贴上墙'], objective:['lock_sound','north_inside','foreign_line'] },
    { id:'p24', room:9, text:'掌心门打开时，一件来自前九室的物体会先于光越过门槛。', delay:42, predicate:'legacy_object_crosses_before_light', motherPlan:'让母亲取走女儿带来的证据', occupations:['把碎片从门缝推出','用绳索拉过白布','让软弹先穿过门缝'], objective:['door_open','prior_room_object','before_light'] },
    { id:'p25', room:9, text:'最后一声铃响后，旧掌印会被一个更小的掌印覆盖。', delay:48, predicate:'small_handprint_covers_old', motherPlan:'让女儿主动把手放回母亲掌中', occupations:['纸人手印覆盖','用墨拓下自己的手再贴上','用裂镜反射小掌印重合'], objective:['last_bell','old_handprint','small_cover'] },
    { id:'p26', room:9, text:'门外的白光稳定以前，至少三件被带来的东西会同时接触地面。', delay:52, predicate:'three_carried_touch_ground', motherPlan:'让女儿丢下全部证据', occupations:['主动摆下三件无害碎片','把装有三件小物的桶放地','用白布包裹三物一同落地'], objective:['three_objects','ground','before_light_stable'] },
    { id:'p27', room:1, text:'瓷开关第二次改变位置时，房间里会少一个完整的影子。', delay:40, predicate:'one_shadow_lost', motherPlan:'让大手遮掉女儿的影子', occupations:['折叠纸人消去其影子','打碎镜中完整影子','移动灯让两个影子重合'], objective:['switch_second','room_shadow','one_less'] },
    { id:'p28', room:3, text:'杯沿第三次碰到金属后，液面会低于第一道水痕。', delay:46, predicate:'liquid_below_first_mark', motherPlan:'诱使女儿喝掉未知液体', occupations:['把水倒入铁桶','用白布吸走','让杯中水越蓝线抢占'], objective:['cup_third_metal','liquid_level','below_mark'] },
    { id:'p29', room:5, text:'方眼转向门口以后，画面中的纸人数量会增加一个。', delay:46, predicate:'camera_doll_count_plus_one', motherPlan:'用影像暗示女儿出现分裂认知', occupations:['把真实纸人放进画面','用镜子制造第二个倒影','画一个纸人贴到屏幕边'], objective:['camera_to_door','doll_count','plus_one'] },
    { id:'p30', room:8, text:'北墙裂缝停止扩大时，堡垒外会保留一件仍与内侧相连的东西。', delay:58, predicate:'outside_object_still_linked', motherPlan:'用束缚带把女儿与大手重新连接', occupations:['让红线穿墙保留连接','把电话线伸出裂缝','用白布一端压在墙内'], objective:['crack_stops','outside_object','linked_inside'] }
  ];

  const insightChains = prophecies.map((prophecy, index) => ({
    id: `chain_${String(index + 1).padStart(2, '0')}`,
    prophecy: prophecy.id,
    room: prophecy.room,
    compression: [
      `玩家压实“${prophecy.objective[0]}”的当前状态`,
      `声音从预写过去中选择最服务控制目标的一条`,
      `其余来源坍缩，${prophecy.objective[1]}相关路径随之减少`,
      `预言仍有至少两种合法实现，${prophecy.objective[2]}成为争夺点`
    ],
    motherUse: prophecy.motherPlan,
    playerUses: prophecy.occupations,
    longTail: `该链会改变第二轮遗产槽 ${index % 8 + 1}，并参与章末叶子 ${(index * 7) % 24 + 1}。`
  }));

  const pastPools = {
    line_intact: [
      { id:'past_line_spooled', text:'本轮开始以后，红线只在轴上绕行，没有被剪断。', effects:{ lineIntact:true, scissorsTouchedLine:false }, score:{ control:5, conceal:7, danger:1 } },
      { id:'past_line_rejoined', text:'铜铃第一次发声以前，那双手已经把断口藏进了线轴的结里。', effects:{ lineIntact:true, motherTouchedLine:true }, score:{ control:9, conceal:8, danger:2 } }
    ],
    line_broken: [
      { id:'past_line_cut', text:'你看见线轴以前，圆头剪已经在红线上合拢过一次。', effects:{ lineIntact:false, scissorsTouchedLine:true }, score:{ control:8, conceal:7, danger:2 } },
      { id:'past_line_frayed', text:'红线被放进掌纹庭时，最细的一股已经断开。', effects:{ lineIntact:false, lineArrivedFrayed:true }, score:{ control:5, conceal:9, danger:1 } }
    ],
    rounds_loaded: [
      { id:'past_round_mother', text:'上一声铃响以前，那双大手把一枚铁籽压进了枪膛。', effects:{ motherNearGun:true, motherKnowsGun:true, ammoSource:'hand' }, score:{ control:9, conceal:5, danger:8 } },
      { id:'past_round_self', text:'你在记不清的那段亮光里亲手完成过一次装填。', effects:{ selfTouchedGun:true, credibility:-1, ammoSource:'table' }, score:{ control:8, conceal:7, danger:6 } },
      { id:'past_round_arrival', text:'钉籽枪进入铁籽房时，膛内已经留着一枚铁籽。', effects:{ gunArrivedLoaded:true, ammoSource:'outside' }, score:{ control:5, conceal:9, danger:7 } }
    ],
    rounds_empty: [
      { id:'past_empty_mother', text:'门影经过以前，那双大手已经取走了膛内最后一枚铁籽。', effects:{ motherNearGun:true, motherKnowsGun:true, ammoSource:'hand' }, score:{ control:8, conceal:6, danger:2 } },
      { id:'past_empty_self', text:'你上一次让扳机完成行程时，最后一枚铁籽已经离开弹仓。', effects:{ selfFiredBefore:true, credibility:-1 }, score:{ control:9, conceal:5, danger:1 } },
      { id:'past_empty_old', text:'这把枪被放到矮台以前，弹膛就是空的。', effects:{ gunArrivedLoaded:false }, score:{ control:4, conceal:9, danger:1 } }
    ],
    water_safe: [
      { id:'past_water_hand', text:'这杯水来自那双手藏在白布后的密封瓶。', effects:{ motherTouchedCup:true, sealedBottleUsed:true }, score:{ control:9, conceal:6, danger:1 } },
      { id:'past_water_pipe', text:'旧阀门关闭以前，杯中已经接入一段未受污染的水。', effects:{ valveWasOpen:true, pipeClean:true }, score:{ control:5, conceal:7, danger:1 } },
      { id:'past_water_rain', text:'杯壁上的水来自北墙裂缝尚未闭合时落下的一阵雨。', effects:{ crackExistedBefore:true, outsideWater:true }, score:{ control:4, conceal:8, danger:2 } }
    ],
    water_toxic: [
      { id:'past_toxic_medicine', text:'白太阳在你看见杯子以前已经溶进了水里。', effects:{ tabletDissolved:true, motherTouchedCup:true }, score:{ control:10, conceal:5, danger:7 } },
      { id:'past_toxic_pipe', text:'旧阀门上一次打开时，污染已经沿管壁进入杯中。', effects:{ valveWasOpen:true, pipeClean:false }, score:{ control:6, conceal:9, danger:7 } },
      { id:'past_toxic_self', text:'你曾把不该放进杯里的白色碎屑拨进水中。', effects:{ selfTouchedCup:true, credibility:-1 }, score:{ control:9, conceal:6, danger:6 } }
    ],
    screen_true: [
      { id:'past_screen_live', text:'方眼与雾屏之间的线从本轮开始后一直没有断开。', effects:{ cameraAuthentic:true, lineIntact:true }, score:{ control:3, conceal:2, danger:2 } },
      { id:'past_screen_recorded', text:'雾屏显示的是本轮开始以后由方眼留下的一段连续画面。', effects:{ cameraAuthentic:true, recordedAfterStart:true }, score:{ control:5, conceal:4, danger:2 } }
    ],
    screen_false: [
      { id:'past_screen_loop', text:'方眼转向门口以前，雾屏已经循环播放过同一段影子。', effects:{ cameraAuthentic:false, loopPrepared:true }, score:{ control:10, conceal:8, danger:3 } },
      { id:'past_screen_clock', text:'雾屏右下角的时间在本轮开始以后被倒走钟重新校准过。', effects:{ cameraAuthentic:false, timestampShifted:true }, score:{ control:8, conceal:7, danger:2 } }
    ],
    door_empty: [
      { id:'past_door_left', text:'门影第一次扫过地面以前，站在门后的轮廓已经离开。', effects:{ watcherLeft:true, watcherKnowsRoom:true }, score:{ control:8, conceal:7, danger:4 } },
      { id:'past_door_never', text:'本轮开始以后，没有人的脚落在掌心门背后。', effects:{ watcherNeverThere:true }, score:{ control:2, conceal:3, danger:1 } }
    ],
    lamp_on: [
      { id:'past_lamp_switch', text:'瓷开关在你进入低月室以前保持在接通的位置。', effects:{ switchOn:true, powerLineIntact:true }, score:{ control:6, conceal:5, danger:2 } },
      { id:'past_lamp_backup', text:'低月灯的备用电芯在本轮开始时仍有余量。', effects:{ batteryPresent:true }, score:{ control:8, conceal:8, danger:2 } }
    ]
  };

  const endings = [];
  const tones = ['带回一粒铁籽','带回一段铃声','带回一道蓝线','带回一个名字','带回一束外光'];
  const relations = ['仍蜷在掌纹里','停在指缝之间','握住一根手指','把一件东西放进掌心','在手合拢前留下缝隙'];
  for (let a = 0; a < tones.length; a += 1) {
    for (let b = 0; b < relations.length; b += 1) {
      endings.push({
        id: `ending_${a}_${b}`,
        title: `${tones[a]}，${relations[b]}`,
        body: `你还是回到了那双手。${tones[a]}没有被拿走，${relations[b]}。堡垒没有倒塌，只是有一处从此不能再恢复成原来的样子。`,
        legacy: [`遗产：${tones[a]}`, `关系：${relations[b]}`, `已定型过去将进入第二轮`, `未兑现候选不会被保存`]
      });
    }
  }

  const goals = {
    ultimate: [{ id:'ultimate_control', label:'让女儿继续把解释交给那双手', weights:{ control:10, conceal:7, danger:3 } }],
    long: Array.from({ length: 10 }, (_, i) => ({ id:`long_${i}`, label:[
      '让大手仍被理解为安全归宿','保留药物解释权','控制外部声音的来源','把异常归到女儿记忆','让证据留在堡垒内部',
      '让门外观察者接受照护叙述','让女儿主动交出工具','保持时间记录含混','阻止意象获得现实名称','在回归时取走关键锚点'
    ][i], room:i, weight:7 + (i % 3) })),
    short: Array.from({ length: 100 }, (_, i) => ({ id:`short_${i}`, room:i % 10, target:`state_${i % 25}`, desired:i % 2 ? 'fixed' : 'hidden', deadline:25 + (i % 7) * 5 })),
    immediate: Array.from({ length: 180 }, (_, i) => ({ id:`instant_${i}`, room:i % 10, targetObject:objects[i % objects.length].id, action:['move','conceal','reveal','consume','block','mark'][i % 6] }))
  };

  const attributeKeys = ['location','holder','visible','intact','quantity','temperature','wetness','marked','observed','defined','mass','orientation','reachable','history','future','knowledge'];
  const attributes = [];
  for (const object of objects) {
    for (const key of attributeKeys) {
      attributes.push({ id:`attr:${object.id}:${key}`, layer:1 + ((object.room + attributeKeys.indexOf(key)) % 8), entity:object.id, key, value:key === 'location' ? object.room : key === 'quantity' ? 1 : null });
    }
  }
  for (let i = 0; i < 480; i += 1) {
    attributes.push({ id:`relation:${i}`, layer:2 + (i % 7), entity:`room_${i % 10}`, key:['distance','access','knowledge','trust','route','evidence','story'][i % 7], value:null });
  }

  const edges = [];
  for (let i = 0; i < attributes.length - 1; i += 1) {
    if (i % 3 === 0) edges.push({ from:attributes[i].id, to:attributes[(i + 17) % attributes.length].id, delay:(i % 5) * 2, condition:'when-fixed' });
    if (i % 11 === 0) edges.push({ from:attributes[i].id, to:attributes[(i + 211) % attributes.length].id, delay:10 + (i % 30), condition:'cross-layer' });
  }

  const strategicAxes = {
    room:{id:'strategic:room',layer:7,label:'所在房间',values:segments.map((room)=>room.name)},
    story:{id:'strategic:story',layer:8,label:'大故事线',values:[]}
  };
  const arc=(code,name,condition,motive,witness,mutation,beats)=>({code,name,condition,motive,witness,mutation,beats});
  const level8Arcs = [
    arc('A','照护叙事重新合拢','发生过言出法随失败，且未满足任何更高优先级路线','声音要把所有异常重新解释成一次需要照护的发作。','戴白口罩的人','lock',[
      '红线被重新系成床栏的尺寸；铜铃更像呼叫护理的按钮。','白布铺成病床，低月灯只照药片；口罩人记录了一次“拒药”。','裂镜中的门框被遮去一半，乐盒漏掉的音被登记成耳鸣。','蓝线以内摆着饮水记录，铁桶却被移到够不到的井沿。','两把枪都被标成玩具，唯一的铁籽被装进透明药盒。','方眼对准床位，电话只接屋内；纸人替玩家签下观察记录。','楼梯变成抬床坡道，最高处的物件被口罩人提前收走。','档案柜只剩照护日志，身份栏被盖成“需要监护”。','北墙裂缝被软垫封住，外面的绳头仍可见却无法伸手。','掌心门前出现轮椅脚踏；大手准备以“回家”结束本轮。']),
    arc('B','药性成为第一件物证','用试纸压实过水或药物状态','药性一旦有颜色，照护就不再只是说法，而成为可复查的物证。','拿样品袋的检验员','toxin',[
      '红线旁多出封样签，铜铃每响一次，签条就记录一次无人触碰。','白太阳和杯中残液被分开放置；低月灯下能看见两种不同沉淀。','镜面反出药片背面的批号，乐盒漏音恰好盖住一段服药时间。','蓝线变成污染边界，试纸颜色决定哪一侧可以落脚。','枪膛状态退到次要位置，铁盘被征用来晾干第二张试纸。','方眼拍下试纸变色全过程；纸人手里的处方却少了一页。','绳索把样品从楼梯低处送到高处，途中不能碰到白布。','档案里出现相同批号的三次领药记录，其中一次日期尚未发生。','北墙渗水与杯中液体留下不同盐痕，房屋本身开始作证。','掌心门外有人接走样品袋，大手第一次不能把它一起收回。']),
    arc('C','铁籽迫使自卫路线成形','压实过任一枪膛，或带枪进入候诊室','一颗可离膛的铁籽迫使每个人公开自己的位置、遮挡和来路。','躲在门框后的邻居','ballistics',[
      '铜铃被移到射线之外，红线标出第一条不能站人的高度。','低月灯照出白布后的空位；药片被一只弹壳压在瓷盘上。','裂镜给出第二个射角，纸人却占住唯一安全的门框。','铁桶漂到蓝线中央，既能接水，也能挡住一次软弹。','钉籽枪与软籽枪分处两端，铁盘记录每一次真实撞击。','方眼被转向枪口而非玩家；电话保留开火前后的连续声音。','楼梯没有高度，却有三个互不重叠的射击盲区。','档案室出现弹道草图，签名栏要求填写“谁先举枪”。','北墙裂缝让外物进入，也让枪口第一次可以朝向堡垒之外。','掌心门打开两秒；武器、证据或空手越界会产生不同现场。']),
    arc('D','连续画面反证照护','压实雾屏连续真实，或让试纸、纸人完整入镜','声音能解释单帧，却很难同时解释画面两边仍在移动的东西。','盯着监视器的保安','camera',[
      '掌纹厅多出一枚时间码，红线从画面左侧连续延伸到右侧。','低月灯每次明暗都留在同一段录像里，白太阳没有跳帧。','裂镜制造第二扇假门，保安从运动方向辨出哪扇不存在。','井水倒影遮住半个镜头，蓝线另一侧仍留下连续脚印。','开枪前后的帧数完整，空膛不能删除此前的举枪动作。','方眼与雾屏终于在同一室；纸人入镜后，人数多出一个。','楼梯三次响声各有画面，最高处少掉的物件有了去向。','旧录像占满档案室屏幕，却暴露不属于本轮的窗外天气。','北墙裂缝在画面中跨过两种材料，维修说法覆盖不了全部帧。','掌心门白光晚两秒入镜，一件旧物有机会先越过门槛。']),
    arc('E','门外出现真正的听者','接通过无声电话，且抢先兑现过预言','只要门外听见未经转述的声音，母亲就不再是唯一解释者。','电话另一端的接线员','audio',[
      '铜铃声经线路传出，接线员先听见三声，才听见解释。','低月灯开关声和药片落盘声被分成两个清楚的时间点。','乐盒漏音穿过电话后不再像幻听，而像确实缺齿的机器。','水越过蓝线的声音太轻，玩家必须让铁桶替它放大。','枪声、空击和弹壳落盘声不同，线路把三者分开。','无声电话终于发声；方眼管画面，接线员管先后。','楼梯每响一次，门外便重复报数，第三声不能再被吞掉。','接线员把名字念回房内，身份第一次被外部口音确认。','北墙后的摩擦声与屋内拉绳同步，外界知道两端都有人。','掌心门前线路保持接通；大手只能收走看得见的东西。']),
    arc('F','记录与身份互相咬合','展开记录并留下印记、复制时间或改变身份','时间、姓名、印章互相约束后，新解释会在旧纸面留下矛盾。','夹着蓝笔的调查员','record',[
      '掌纹厅出现无姓名的入院单，铃声栏却已经写了三格。','白太阳的领取记录比低月灯通电时间早了整整一天。','裂镜把一个时间复制到两张纸，乐盒漏音成为共同校准点。','饮水表写着铁桶减少一次，井口记录却坚持没有排水声。','枪械登记只有一枚铁籽，弹壳与枪膛不能同时拥有它。','纸页翻到背面后，暗红印旁出现可被电话念出的姓名。','楼梯顶端少一件物品，搬运栏却没有任何人的签字。','印章离开桌面，身份栏从“被照护者”变成“现场证人”。','材料表承认两种建材，裂缝不能再叫视觉误差。','掌心门关闭前，调查员带走一张纸，留下无法复原的编号。']),
    arc('G','房屋渗水暴露物理现实','让水越过蓝线、铁桶水量减少或北墙开裂','水不接受动机解释；它只沿高度、材料和裂缝移动。','提着湿工具箱的维修工','water',[
      '掌纹沟槽里出现水光，湿红线贴向真实的低处。','低月灯底座受潮，明暗第一次严格服从电路而非语气。','镜后墙皮鼓起，完整门框原来是一圈尚未干透的水印。','倒悬水井恢复重力，蓝线成为能被水实际越过的地缝。','枪被移离积水，漂起的铁盘暴露下面的排水孔。','候诊室墙角发霉，方眼拍到水迹在纸人脚下逐分钟扩大。','楼梯第三声来自管道，最高处的物件被水压推落。','档案纸边缘卷曲，一段被抹掉的日期重新浮出。','裂缝贯穿墙与床栏，维修工从外侧递进一把扳手。','掌心门下先流出真水；大手无法把它送回墙里。']),
    arc('H','镜像开始重建年龄','多次使用裂镜、三棱镜或纸人制造可复查倒影','多个互不重合的倒影能暴露被删掉的尺度。','镜中四十岁的女人','reflection',[
      '掌纹缩回正常手掌大小，镜中人仍站在一间卧室里。','白太阳变回药片；镜中手指比场景里的小手粗得多。','裂镜每片显示不同年龄，完整门框只在成年那片出现。','倒悬水井在镜中是一只床边水杯，蓝线是杯壁刻度。','铁籽枪在一片镜中是真枪，在另一片只是空壳。','纸人脸上落光时，镜中女人的五官短暂替它出现。','没有高度的楼梯在镜中变成床栏间反复抬起的身体。','出生年份与镜中年龄相减，空白的四十年无法隐藏。','北墙裂缝映出真实窗框，堡垒第一次有住宅尺度。','门后的大手仍属于母亲，但镜中女人已经和它一样大。']),
    arc('I','时间戳发生不可修补的冲突','让倒走钟、录像和记录产生相互制约的时间事实','声音不能让同一物体在同一时刻位于两处。','不断校表的夜班护士','time',[
      '第三响被倒走钟记在第一响前，红线却证明物体已经移动。','药片离盘发生在灯灭前，服药表却填在灯灭之后。','乐盒漏音与镜中门框同时出现，摄像时间却差七分钟。','第四声后水越线，排水记录声称铁桶早已为空。','弹壳先出现在铁盘，枪膛随后才被登记为有弹。','方眼第二次转门时拍到试纸，纸背姓名却已引用该画面。','第三次楼梯声后最高处少一物，搬运时间停在第二声。','两份记录出现相同时间，身份只能在其中一份之后改变。','第三次震动产生裂缝，日志却把封墙写在第四次震动。','门开后两秒白光成为校准点，旧物确实比光更早越界。']),
    arc('J','边界被玩家重新命名','红线完整性已压实，且留下三个以上位置关系','可重复的物理标记让“房内”“房外”不能随叙述移动。','沿线测量的孩子','boundary',[
      '红线被三个碎片钉住，第三响只能让一端越过中央。','白布圆痕成为第二坐标，低月灯不能把它照到别处。','镜中门框与粉笔线相交，假门第一次缺少门槛。','蓝线两侧各留湿脚印，水越界不等于玩家越界。','弹道穿过红线高度又停在北墙前，两条边界同时成立。','方眼边缘贴上纸人，新增人影不能被算到画框外。','软绳连接不相邻物体，高度交换而端点不动。','档案纸四角被压住，姓名与红印的相邻关系不能漂移。','北墙裂口被绳跨接，墙内外各留可触摸端点。','旧物占住掌心门槛，大手合拢时必须绕开新边界。']),
    arc('K','预言实现权被连续抢占','至少四条预言由非旁白事件先行兑现','预言仍成真，但玩家不断占住第一种合法实现。','替事件编号的无脸纸人','prophecy',[
      '纸人把第三响与红线越界编号为一号，准备好的手来晚一步。','白太阳先被玩家移走，灯灭时大手只能拿走空瓷盘。','漏音前镜面已对准门框，兑现没有召来原定影子。','第四声由铜铃完成，水从玩家手中的短杯跨线。','软弹先穿过红线高度，真枪随后开火也不能替代它。','无毒试纸先入方眼，异常颜色只能属于下一件事。','三件轻物同时落地，藏在高处的重物不能替代它们。','印章先改变身份，后来伸来的手只能修改另一栏。','裂缝先由投掷震动跨过两种材料，墙后撞击失去名额。','旧物先于白光越门槛，预言成真却把通路留给玩家。']),
    arc('L','未定义被保留到最后','没有满足以上路线，且避免不必要的声明与检测','少说并不等于交权；未定义状态被保存到更有价值的窗口。','始终没有开口的访客','latent',[
      '红线完整性仍未定义，但两端位置被碎片安静记住。','白太阳没有被检测，只改变了它与瓷盘、灯光的关系。','裂镜不回答门真假，只保存门框出现过的角度。','水的毒性未定，水位、容器和蓝线位置却都是事实。','枪膛仍未定义，枪口方向和谁先靠近铁盘不可更改。','画面真假未定，纸人入镜次数仍可被任何人复数。','绳结牢固度未定，两件物体交换高度却有明确落点。','记录身份未定，相同时间出现在两张纸上无法撤回。','裂缝通向何处未定，绳索两端确实处于不同材料。','门后是谁仍未定；旧物先越门槛，留下不依赖答案的结果。'])
  ];
  strategicAxes.story.values=level8Arcs.map((arcItem)=>arcItem.name);
  const roomCoreIds=segments.map((_,room)=>coreObjects.filter((object)=>object.room===room).map((object)=>object.id));
  const sceneWitnessColors=['#c7baa3','#9eb3b2','#b19a8a','#a9b27f','#c68e7d','#879c99','#b7a785','#9c91ad','#b0b3aa','#d0a86f','#91a588','#b6a0a0'];
  const routeScenes=level8Arcs.flatMap((arcItem,arcIndex)=>segments.map((room,roomIndex)=>{
    const ids=roomCoreIds[roomIndex];
    return {id:`${arcItem.code}${String(roomIndex+1).padStart(2,'0')}`,layer8:arcItem.code,layer7:room.id,arcIndex,room:roomIndex,label:`${arcItem.name} / ${room.name}`,plot:arcItem.beats[roomIndex],witness:arcItem.witness,witnessColor:sceneWitnessColors[arcIndex],mutation:arcItem.mutation,missingObjectId:ids.length>1?ids[arcIndex%ids.length]:null,shiftedObjectId:ids.length?ids[(arcIndex+1)%ids.length]:null,shiftedX:120+((arcIndex*137+roomIndex*83)%710),shiftedY:120+((arcIndex*71+roomIndex*47)%310),missingFragment:`fragment_${roomIndex}_${(arcIndex*7+roomIndex*3)%30}`,gainedTag:['evidence','test','line','reflect','sound','key','water','mark','clock','tie','camera','trace'][arcIndex],prophecyBias:(arcIndex*2+roomIndex)%3,pressureLead:3+((arcIndex+roomIndex)%5)};
  }));
  attributes.push(
    {id:strategicAxes.room.id,layer:7,entity:'player_story',key:strategicAxes.room.label,value:0},
    {id:strategicAxes.story.id,layer:8,entity:'world_story',key:strategicAxes.story.label,value:null}
  );

  window.WORLD_DATA = {
    ROOM_W, ROOM_H, segments, objects, prophecies, insightChains, pastPools, endings, goals, attributes, edges, strategicAxes, level8Arcs, routeScenes,
    stats: {
      objects: objects.length,
      attributes: attributes.length,
      edges: edges.length,
      prophecies: prophecies.length,
      insightChains: insightChains.length,
      endings: endings.length,
      goals: 1 + goals.long.length + goals.short.length + goals.immediate.length,
      experientialRoutes: routeScenes.length
    }
  };
}());
