# 掌中堡垒：第一轮

俯视2D叙事机制 Demo。玩家用“言出法随”压实当前可被实际感知或操作验证的结果；旁白必须接受结果，但会从仍合法的过去中选择对自己最有利的一条，并永久剪掉其他解释。客观预言一旦说出便必须完整发生，玩家可以用自己的操作抢先占住第一种合法实现。

## 当前内容

- 10个连续房间，带真实计时、暂停、输入自动停表和逐步教程。
- 12条第8层大故事线 × 10个第7层房间，共120个不同剧情现场。
- 339件逐件可交互物品，其中300件通用物理碎片。
- 5906个八层属性、带时间有向关系、30条客观预言和30组过去/未来压缩链。
- 25种结局演出，以及供第二周目读取的完整 `localStorage` 遗产存档。
- 浏览器内置 `LanguageModel` 优先；没有时可由玩家加载网页本地 Qwen 0.5B。LLM只从规则引擎给出的合法ID中选择，不能创造事实。

## 打开

线上地址：<https://ljq15611703653-ship-it.github.io/narrator-demo/>

完整攻略：<https://ljq15611703653-ship-it.github.io/narrator-demo/guide.html>

本地运行：

```powershell
npm install
npm run serve
```

然后打开 `http://127.0.0.1:8765/`。

## 验证

服务器运行时，在另一终端执行：

```powershell
npm test
npm run test:browser
```

测试覆盖30条预言的规则证据、12种路线压实条件、120个现场操作、25个可达结局、十室完整实玩、教程、暂停和桌面/手机布局。

设计与关系图见 [docs/DESIGN.md](docs/DESIGN.md) 和 [docs/RELATION_GRAPH.md](docs/RELATION_GRAPH.md)。所有物件、状态、预言、路线与结局的逐项攻略直接收录在 `guide.html`。
