/* 剧情与任务数据（原创，由多智能体设计工作流合成；港口/海域已迁移到真实世界地图）。
   字段说明见 quests.js；who 可用 'captain' 指代玩家船长，文本中 {captain} 会被替换。 */
export const STORY = {
  "title": "沧海纪·海不分家",
  "premise": "{captain} 在里斯本继承了老船主的初雪号和一本被撕去最后一页的账本，账上每月一笔「护航费」在他失踪前半年戛然而止，而大副阿海记得那夜天上一颗星都没少。追查之下，三大商会以「分海约」瓜分沧海、用护航费供养海盗巴罗清除独立商人的黑幕逐层揭开：傲慢的赫克托并非凶手，圆滑的萨利姆只是账房，优雅的艾丽丝却亲手签过那张要命的单子。真正把老船主卖给巴罗的，是无处不在、事事按章的岑港务长——那一成「港务附加」买下了一场灭口。玩家在果阿会审废除密约、于骸湾击沉巴罗后，三家又想重新分海，而账本扉页那句「海不分家」，成了玩家一统六海的唯一答案。",
  "newChars": [
    {
      "key": "guyan",
      "name": "顾砚",
      "title": "前蓝鲸账房",
      "role": "替蓝鲸商会管过十年账、知晓分海约分账结构的落魄账房先生，躲在阿姆斯特丹酗酒，胆小却是真相的第一把钥匙。",
      "portrait": {
        "skin": "#e6c2a0",
        "hair": "#4a3a2a",
        "hairStyle": "short",
        "hat": null,
        "hatColor": "#000000",
        "clothes": "#3a4a6a",
        "bg": "#2a3040",
        "mouth": "frown",
        "beard": "stubble",
        "mustache": false,
        "acc": "glasses",
        "outfit": "robe",
        "trim": "#8a8aa0",
        "eyes": "#2a2a3a"
      }
    },
    {
      "key": "ding",
      "name": "丁伯",
      "title": "龙骨岛灯塔守",
      "role": "守了四十年灯塔的老人，三年前亲眼看见归雁号被围沉、以及远处那条不挂旗的深蓝色巡船，是唯一的目击者。",
      "portrait": {
        "skin": "#d8b090",
        "hair": "#cfcfcf",
        "hairStyle": "bald",
        "hat": "cap",
        "hatColor": "#3a3a2a",
        "clothes": "#5a5a4a",
        "bg": "#3a4a5a",
        "mouth": "smile",
        "beard": "full",
        "mustache": true,
        "acc": null,
        "outfit": "coat",
        "trim": "#7a6a4a",
        "eyes": "#2a1a12"
      }
    }
  ],
  "prologue": [
    {
      "who": "ahai",
      "text": "{captain}，就是这条船——初雪号。老爷子留下的。这三年我天天擦桅杆，就怕它烂在港里。"
    },
    {
      "who": "ahai",
      "text": "还有这本账。老爷子说过，账本比船值钱。翻到最后一页看看——被撕了吧？是他自己撕的，出海前一晚。"
    },
    {
      "who": "ahai",
      "text": "港里都说归雁号沉在澳门外的风暴里。可那晚我在桅顶看了一夜——天上一颗星都没少。"
    },
    {
      "who": "ahai",
      "text": "账上每个月都有一笔'护航费'，最后半年却一笔没付。然后归雁号就再没回来。"
    },
    {
      "who": "ahai",
      "text": "先别急着查，船长。船要吃饭，人也要吃饭。老爷子的路子是从塞维利亚跑起来的，咱也从那儿开始。"
    }
  ],
  "main": [
    {
      "id": "m01_old_ledger",
      "type": "main",
      "title": "旧账本的头几页",
      "giver": "ahai",
      "port": null,
      "prereq": {
        "quests": []
      },
      "intro": [
        {
          "who": "ahai",
          "text": "账本头几页记的是老爷子最早的航线：在里斯本买布，运到塞维利亚去卖。赚得少，但稳。"
        },
        {
          "who": "qian",
          "text": "老船主的布？小东家，做生意嘛，稳是本钱，快是利钱。老钱认人不认船，价照旧给你。"
        },
        {
          "who": "ahai",
          "text": "出港前记得买够补给。饿肚子的船员会跳船——这话老爷子说过，我也亲眼见过。"
        },
        {
          "who": "ahai",
          "text": "先照着账本跑一趟。看看他走过的港，说不定能看出他最后半年到底在找什么。"
        }
      ],
      "objectives": [
        {
          "kind": "buy",
          "good": "cloth",
          "qty": 20,
          "label": "累计买入 20 布匹"
        },
        {
          "kind": "visit",
          "port": "sevilla",
          "label": "到达塞维利亚"
        },
        {
          "kind": "sell",
          "good": "cloth",
          "qty": 20,
          "zone": "iberia",
          "label": "在伊比利亚海岸各港累计卖出 20 布匹"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "ahai",
          "text": "账对上了。老爷子当年也是这么一港一港跑的……我记得他每到丰沙尔，都要去红姨的酒馆坐一晚。"
        },
        {
          "who": "ahai",
          "text": "红姨跟老爷子熟，比我还熟。护航费的事，她要是愿意开口，肯定知道。去丰沙尔的酒馆找她吧。"
        }
      ],
      "reward": {
        "gold": 600
      }
    },
    {
      "id": "m02_escort_fee",
      "type": "main",
      "title": "丰沙尔的护航费",
      "giver": "hong",
      "port": "funchal",
      "prereq": {
        "quests": [
          "m01_old_ledger"
        ]
      },
      "intro": [
        {
          "who": "hong",
          "text": "哎呀，初雪号！你就是老船主的后人？坐坐坐，这位子是他的，三年没人敢坐。"
        },
        {
          "who": "hong",
          "text": "护航费？小声点。每月往货栈交一笔钱，海盗就绕着你走。港港如此，谁都不问钱去了哪。"
        },
        {
          "who": "hong",
          "text": "老船主最后半年不交了。他说查出那笔钱最后进了谁的口袋——说完就出海了，再没回来。"
        },
        {
          "who": "hong",
          "text": "他那条归雁号是伦敦的木叔造的。出事前他还去伦敦改过初雪号，说要在龙骨下加个'夹层'。"
        },
        {
          "who": "hong",
          "text": "顺路帮姨带二十桶酒给木叔，他给我修过酒窖。见了他，把夹层的事问清楚。"
        }
      ],
      "objectives": [
        {
          "kind": "deliver",
          "good": "wine",
          "qty": 20,
          "port": "london",
          "label": "把 20 桶酒送到伦敦"
        },
        {
          "kind": "explore",
          "count": 4,
          "label": "到访 4 个不同港口"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "mu",
          "text": "丰沙尔的酒……红姨还记着。归雁号是我造的，初雪号的夹层也是我改的。老船主没说装什么，我也没问。"
        },
        {
          "who": "mu",
          "text": "夹层在龙骨下面。来，我给你开——空的。只剩一枚铜印，蓝鲸商会的，还有半张阿姆斯特丹货栈的收据。"
        },
        {
          "who": "ahai",
          "text": "蓝鲸的印？老爷子跟蓝鲸有什么关系……木叔，这收据上盖的是谁的章？"
        },
        {
          "who": "mu",
          "text": "阿姆斯特丹账房，姓顾。原先是蓝鲸的账房先生，后来不知怎么，整天在阿姆斯特丹喝酒。"
        }
      ],
      "reward": {
        "gold": 900
      }
    },
    {
      "id": "m03_clerk_of_yinhu",
      "type": "main",
      "title": "阿姆斯特丹的账房先生",
      "giver": "guyan",
      "port": "amsterdam",
      "prereq": {
        "quests": [
          "m02_escort_fee"
        ]
      },
      "intro": [
        {
          "who": "guyan",
          "text": "蓝印……你从哪儿弄来的？别在这儿掏出来！收起来，快。"
        },
        {
          "who": "guyan",
          "text": "我叫顾砚，替蓝鲸管过十年账。你手里那枚印是老船主自己的——他当年是蓝鲸的伊比利亚海岸总管。"
        },
        {
          "who": "guyan",
          "text": "三家商会分海：蓝鲸守北海，红帆守南洋，金沙守加勒比海。护航费三家分账，海盗巴罗替他们清场。"
        },
        {
          "who": "guyan",
          "text": "我为什么告诉你？因为我怕。他们不杀我，只因为我还记得那本账。可我想走，想活着走。"
        },
        {
          "who": "guyan",
          "text": "你先证明你不是三家养的狗。在北海卖三十匹布，攒六千金币——吃自己饭的商人，我才敢信。"
        }
      ],
      "objectives": [
        {
          "kind": "sell",
          "good": "cloth",
          "qty": 30,
          "zone": "northeu",
          "label": "向北海各港累计卖出 30 布匹"
        },
        {
          "kind": "gold",
          "amount": 6000,
          "label": "持有 6,000 金币"
        }
      ],
      "turnIn": "amsterdam",
      "outro": [
        {
          "who": "guyan",
          "text": "行，你做生意的路子跟老船主一个样。听着：护航费蓝四红三金二——还有一成，账上写着'港务附加'。"
        },
        {
          "who": "guyan",
          "text": "那一成给谁的，我十年都没查出来。只知道每年腊月在果阿结一次账。"
        },
        {
          "who": "guyan",
          "text": "老船主最恨的不是蓝鲸，是红帆的赫克托。他在南洋抢了赫克托的香料生意，赫克托当众说要沉他的船。"
        },
        {
          "who": "ahai",
          "text": "马六甲……老爷子的香料线。船长，去南洋吧，那是他最后跑的航线。"
        }
      ],
      "reward": {
        "gold": 1100,
        "shareZone": "northeu",
        "sharePts": 3
      }
    },
    {
      "id": "m04_spice_route",
      "type": "main",
      "title": "南洋香料线",
      "giver": "ahai",
      "port": null,
      "prereq": {
        "quests": [
          "m03_clerk_of_yinhu"
        ]
      },
      "intro": [
        {
          "who": "ahai",
          "text": "南洋是红帆的地盘，赫克托的船见了独立商船就横着走。老爷子当年就是硬闯进去的。"
        },
        {
          "who": "ahai",
          "text": "马六甲的香料便宜得离谱，运回里斯本、丰沙尔能翻好几倍。老爷子说过，这条线能养活一支船队。"
        },
        {
          "who": "ahai",
          "text": "咱把这条线再跑起来。赫克托要是真跟归雁号的事有关，他见了初雪号的帆，自己就会跳出来。"
        }
      ],
      "objectives": [
        {
          "kind": "visit",
          "port": "malacca",
          "label": "到达马六甲"
        },
        {
          "kind": "buy",
          "good": "spice",
          "qty": 40,
          "label": "累计买入 40 香料"
        },
        {
          "kind": "sell",
          "good": "spice",
          "qty": 40,
          "zone": "iberia",
          "label": "向伊比利亚海岸各港累计卖出 40 香料"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "ahai",
          "text": "香料线活了！老爷子在天上看着，肯定笑得合不拢嘴。"
        },
        {
          "who": "cen",
          "text": "咳，{captain}船长。《港务条例》第九条：总署代转商会文书。红帆同盟赫克托船长，邀你至亚齐一叙。"
        },
        {
          "who": "cen",
          "text": "总署只负责转递，不负责后果。请在此签收。"
        },
        {
          "who": "ahai",
          "text": "他果然跳出来了。船长，亚齐是红帆的老窝……但不去，就永远问不出归雁号的事。"
        }
      ],
      "reward": {
        "gold": 1500,
        "shareZone": "iberia",
        "sharePts": 4
      }
    },
    {
      "id": "m05_redsail_rules",
      "type": "main",
      "title": "红帆的规矩",
      "giver": "hector",
      "port": "aceh",
      "prereq": {
        "quests": [
          "m04_spice_route"
        ]
      },
      "intro": [
        {
          "who": "hector",
          "text": "一个卖布的小崽子，跑到本船长的南洋卖香料。老船主当年也是这样，站在这儿，一脸不服。"
        },
        {
          "who": "hector",
          "text": "南洋的规矩很简单：交护航费，或者交船。老船主选了第三条——他不交。"
        },
        {
          "who": "ahai",
          "text": "所以你就沉了归雁号？！"
        },
        {
          "who": "hector",
          "text": "红帆的炮从正面打，从不摸黑。归雁号不是本船长沉的——但我也不欠你一个解释。"
        },
        {
          "who": "hector",
          "text": "想在南洋跟本船长说话？先拿出配得上的实力。两条船，南洋一成半的份额。做不到就滚回伊比利亚海岸。"
        }
      ],
      "objectives": [
        {
          "kind": "fleet",
          "count": 2,
          "label": "船队扩充到 2 艘"
        },
        {
          "kind": "share",
          "zone": "nanyang",
          "pct": 15,
          "label": "南洋份额 ≥15%"
        }
      ],
      "turnIn": "aceh",
      "outro": [
        {
          "who": "hector",
          "text": "……比老船主硬。好，给你一句实话：护航费的红印，三年前本船长就停付了。红帆不养狗。"
        },
        {
          "who": "hector",
          "text": "巴罗现在听谁的？我不知道。但他的船上装着金沙的咖啡，你自己想。"
        },
        {
          "who": "hector",
          "text": "南洋一半是本船长的血打下来的。你要拿，就从我手里拿——班达外海，我等你。输了，就别再提归雁号。"
        },
        {
          "who": "ahai",
          "text": "他是想跟咱正面打一场……船长，这家伙傲得要命，但好像真不是那种背后下黑手的人。"
        }
      ],
      "reward": {
        "gold": 2000
      }
    },
    {
      "id": "m06_shanhu_duel",
      "type": "main",
      "title": "班达外海",
      "giver": "ahai",
      "port": null,
      "prereq": {
        "quests": [
          "m05_redsail_rules"
        ]
      },
      "intro": [
        {
          "who": "ahai",
          "text": "赫克托的船队在班达外海等着。船长，他的旗舰是条大商船改的炮船，火力凶得很。"
        },
        {
          "who": "mu",
          "text": "把船修满，炮位填满。红帆打正面，那就正面把他打回去。"
        },
        {
          "who": "ahai",
          "text": "班达……是我长大的地方。当年老爷子就是在那儿的码头把我捡上船的。别在我家门口输，船长。"
        }
      ],
      "objectives": [
        {
          "kind": "boss",
          "port": "banda",
          "rival": "redsail",
          "label": "前往班达，迎战赫克托的旗舰船队",
          "bossName": "赫克托的旗舰·赤帆号"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "hector",
          "text": "……好炮。红帆输得起。从今天起，南洋有两个说话的人。"
        },
        {
          "who": "hector",
          "text": "既然你赢了，再送你一句：归雁号沉的那天，本船长的船全在马六甲港里，停泊文书是岑港务长亲手签的。"
        },
        {
          "who": "hector",
          "text": "他记性好得很，什么都记。你去问问他，那天还有谁的船出了港。"
        },
        {
          "who": "hector",
          "text": "还有——金沙的萨利姆最近像丢了魂。去哈瓦那，他那儿有你要的账。"
        },
        {
          "who": "ahai",
          "text": "岑港务长……他到哪儿都在，跟老钱一样。船长，我怎么突然觉得后背发凉。"
        }
      ],
      "reward": {
        "gold": 3000,
        "shareZone": "nanyang",
        "sharePts": 8
      }
    },
    {
      "id": "m07_fourth_chair",
      "type": "main",
      "title": "金沙的第四把椅子",
      "giver": "salim",
      "port": "havana",
      "prereq": {
        "quests": [
          "m06_shanhu_duel"
        ]
      },
      "intro": [
        {
          "who": "salim",
          "text": "沧海新贵，{captain}船长！请坐。哈瓦那的茶不好，是从泉州运来的——但金沙的诚意是本地的。"
        },
        {
          "who": "salim",
          "text": "红帆的事我听说了。赫克托是头蛮牛，但牛也知道谁能打赢它。所以我想和你谈的，是一把椅子。"
        },
        {
          "who": "salim",
          "text": "分海约有三把椅子，蓝红金。加一把，四家分海，你守伊比利亚海岸。护航费……我们可以叫它别的名字。"
        },
        {
          "who": "ahai",
          "text": "你们就是这么分老爷子的命的？"
        },
        {
          "who": "salim",
          "text": "金沙只是账房。谁付钱我们记，谁拿钱我们付。想看归雁号那页账？三十箱茶叶，外加五千金投在哈瓦那。"
        }
      ],
      "objectives": [
        {
          "kind": "deliver",
          "good": "tea",
          "qty": 30,
          "port": "havana",
          "label": "把 30 箱茶叶运抵哈瓦那"
        },
        {
          "kind": "invest",
          "port": "havana",
          "amount": 5000,
          "label": "向哈瓦那累计投资 5,000 金币"
        }
      ],
      "turnIn": "havana",
      "outro": [
        {
          "who": "salim",
          "text": "看这一页。三年前腊月，'特别护航——归雁号'，付款金沙，报销科目：港务附加。"
        },
        {
          "who": "salim",
          "text": "钱从港务附加那一成出，三家只在单子上盖了章。谁开的单子？看这儿：岑。"
        },
        {
          "who": "ahai",
          "text": "港务长……老爷子最后一次出海，就是去果阿找港务总署交账本的！"
        },
        {
          "who": "salim",
          "text": "我为什么告诉你？巴罗上月沉了我两条运金船。他不再听任何人的话了，而三家里只有一家的船从没被他碰过。"
        },
        {
          "who": "salim",
          "text": "去卑尔根，问问那位优雅的蓝小姐。记住，金沙的每一分善意，都是有账的。"
        }
      ],
      "reward": {
        "gold": 3500,
        "shareZone": "caribbean",
        "sharePts": 4
      }
    },
    {
      "id": "m08_whale_invitation",
      "type": "main",
      "title": "卑尔根的请柬",
      "giver": "alice",
      "port": "bergen",
      "prereq": {
        "quests": [
          "m07_fourth_chair"
        ],
        "day": 90
      },
      "intro": [
        {
          "who": "alice",
          "text": "{captain}船长，请坐。卑尔根的风冷，我让人温了茶。三年了，初雪号的帆我一眼就认得。"
        },
        {
          "who": "alice",
          "text": "老船主教过我看账。那时他是伊比利亚海岸总管，我是刚进商会的小账房。你手里那枚铜印，是他亲手刻的。"
        },
        {
          "who": "alice",
          "text": "萨利姆没说错。那张'特别护航'的单子，我签过。我知道它是什么。"
        },
        {
          "who": "alice",
          "text": "阿海，先听完。巴罗的船队已经比红帆大了，三家都养不起他。要收拾他，得拿着分海约原件在果阿开会审。"
        },
        {
          "who": "alice",
          "text": "原件在我手上。你要证明你配得上：在我的北海拿两成份额，再打赢一次蓝鲸的巡航船队。我要亲眼看你的炮。"
        }
      ],
      "objectives": [
        {
          "kind": "share",
          "zone": "northeu",
          "pct": 20,
          "label": "北海份额 ≥20%"
        },
        {
          "kind": "defeat",
          "type": "rival",
          "rival": "whale",
          "count": 1,
          "label": "击败 1 支蓝鲸商会船队"
        }
      ],
      "turnIn": "bergen",
      "outro": [
        {
          "who": "alice",
          "text": "你做到了。这是分海约原件，三家印鉴俱全。我签它那年，以为签下的是十五年太平。"
        },
        {
          "who": "alice",
          "text": "阿海，你以为老船主为什么在出海前把你打发上岸？他知道会有什么等着他。他救的是你。"
        },
        {
          "who": "ahai",
          "text": "……老爷子。"
        },
        {
          "who": "alice",
          "text": "岑港务长每年腊月在果阿封印结账。带着账本、铜印和这份原件去，三家的人都会到。"
        },
        {
          "who": "alice",
          "text": "至于我为什么帮你——蓝鲸太肥了，需要一场风暴。别把我当朋友，船长。把我当对手，会活得久一点。"
        }
      ],
      "reward": {
        "gold": 4500,
        "cannons": 6
      }
    },
    {
      "id": "m09_fengyu_tribunal",
      "type": "main",
      "title": "果阿的会审",
      "giver": "cen",
      "port": "goa",
      "prereq": {
        "quests": [
          "m08_whale_invitation"
        ]
      },
      "intro": [
        {
          "who": "cen",
          "text": "{captain}船长。文书齐全吗？账本、密约原件、三家印鉴、商会资质证明……嗯，缺一项。"
        },
        {
          "who": "cen",
          "text": "《港务条例》第一条：港务附加税是合法的港务收入。护航费嘛，那是商会之间的私约，总署不予评价。"
        },
        {
          "who": "ahai",
          "text": "你给老爷子倒了杯茶，然后把他卖给了巴罗！"
        },
        {
          "who": "cen",
          "text": "……我按章办事二十年，盖过一次不该盖的章。海上太平了十五年，代价只是几个不交钱的人。我以为划算。"
        },
        {
          "who": "cen",
          "text": "如今巴罗每年要三成，三家都付不起。按章程，会审须由印度洋份额过两成半的商会主持，另押一万五保证金。"
        }
      ],
      "objectives": [
        {
          "kind": "share",
          "zone": "indocean",
          "pct": 25,
          "label": "印度洋份额 ≥25%"
        },
        {
          "kind": "gold",
          "amount": 15000,
          "label": "持有 15,000 金币（会审保证金）"
        }
      ],
      "turnIn": "goa",
      "outro": [
        {
          "who": "cen",
          "text": "章程齐备。三会会审——开始。分海约，当众作废。港务附加税，即日停征。本人……停职候查。"
        },
        {
          "who": "hector",
          "text": "终于能光明正大地打了。船长，下次在海上见。"
        },
        {
          "who": "cen",
          "text": "澳门骸湾。巴罗每年冬天都在那儿修船，港务的记录上写得清清楚楚。我的茶还没喝完，船长，你去吧。"
        },
        {
          "who": "ahai",
          "text": "船长……账本最后一页在我这儿。老爷子塞给我时说：'查到果阿再拿出来。'上面一行字：骸湾，冬。"
        },
        {
          "who": "alice",
          "text": "他说的是真的，这一次没有陷阱。但巴罗不会坐着等你。"
        }
      ],
      "reward": {
        "gold": 6000,
        "shareZone": "indocean",
        "sharePts": 6
      }
    },
    {
      "id": "m10_bonebay_showdown",
      "type": "main",
      "title": "骸湾决战",
      "giver": "ahai",
      "port": null,
      "prereq": {
        "quests": [
          "m09_fengyu_tribunal"
        ]
      },
      "intro": [
        {
          "who": "ahai",
          "text": "骸湾。老爷子三年前就查到了这个地方，他是要把它交给港务总署的……结果总署把他交给了巴罗。"
        },
        {
          "who": "mu",
          "text": "巴罗那条旗舰是哈瓦那船厂出的巡防舰，四十四门炮。四条船以下别去送死。先来广州，我给船底包铜皮。"
        },
        {
          "who": "hong",
          "text": "丰沙尔的水手都愿意跟你走，我一个一个问过了。老船主的账，这回得清了。"
        },
        {
          "who": "ahai",
          "text": "船长，这一战不只为老爷子打。是为所有交过护航费、夜里不敢点灯的人。走吧。"
        }
      ],
      "objectives": [
        {
          "kind": "fleet",
          "count": 4,
          "label": "船队达到 4 艘"
        },
        {
          "kind": "invest",
          "port": "guangzhou",
          "amount": 3000,
          "label": "在广州投资 3,000 金币，请木叔加固船队"
        },
        {
          "kind": "boss",
          "port": "macau",
          "label": "前往澳门骸湾，与独眼巴罗决战",
          "bossName": "巴罗的旗舰·黑潮号"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "barro",
          "text": "哈哈哈——三家养了老子十五年，如今借你的手来杀老子？你以为你是赢家？你只是他们新买的狗！"
        },
        {
          "who": "barro",
          "text": "归雁号那老头临死前跟老子说了一句话：'海不分家。'老子到现在都不懂……去死吧！"
        },
        {
          "who": "ahai",
          "text": "他沉了。巴罗的旗舰还漂在骸湾上——船长，那条巡防舰还能开，是咱的了。"
        },
        {
          "who": "ahai",
          "text": "老爷子，账清了。……不，还差一页。不是最后一页，是扉页。"
        },
        {
          "who": "ahai",
          "text": "账本扉页上老爷子写的不是航线，是四个字：海不分家。他不是要一把椅子，他是要把桌子掀了。"
        }
      ],
      "reward": {
        "gold": 9000,
        "ship": "frigate",
        "crew": 40
      }
    },
    {
      "id": "m11_sea_undivided",
      "type": "main",
      "title": "海不分家",
      "giver": "alice",
      "port": null,
      "prereq": {
        "quests": [
          "m10_bonebay_showdown"
        ]
      },
      "intro": [
        {
          "who": "qian",
          "text": "船长，蓝鲸托货栈联号转一封信，蓝小姐亲笔。老钱一辈子只记账不问账，可这回……有些账不能算。"
        },
        {
          "who": "alice",
          "text": "「船长：巴罗已死，分海约已废。北海留给蓝鲸，其余五海任你纵横。这是我最后一次以朋友的身份写信。」"
        },
        {
          "who": "hector",
          "text": "红帆也带话来：南洋不给。想要，海上见。"
        },
        {
          "who": "salim",
          "text": "金沙的意思是……加勒比海的份额可以谈。当然，价格也可以谈。"
        },
        {
          "who": "ahai",
          "text": "他们又要分海了。船长，先把老爷子起家的伊比利亚海岸归一，再拿下三片海——让他们看看什么叫海不分家。"
        }
      ],
      "objectives": [
        {
          "kind": "share",
          "zone": "iberia",
          "pct": 50,
          "label": "主导伊比利亚海岸（份额 ≥50%）"
        },
        {
          "kind": "dominate",
          "count": 4,
          "label": "主导 4 个海域"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "alice",
          "text": "三海归一，伊比利亚海岸易主。老船主，你教出来的人，把你没做完的事做完了。……船长，蓝鲸认这一局。"
        },
        {
          "who": "hector",
          "text": "红帆的旗还没降。但本船长承认——你是打出来的，不是买出来的。"
        },
        {
          "who": "salim",
          "text": "新的桌子，新的账房。金沙随时为您效劳。"
        },
        {
          "who": "hong",
          "text": "老船主的位子，今天我撤了。往后酒馆里最好的位子，是你的。"
        },
        {
          "who": "ahai",
          "text": "账本我重新抄了一本，扉页还是那四个字。船长——剩下的海，咱一片一片拿回来。"
        }
      ],
      "reward": {
        "gold": 15000
      }
    }
  ],
  "side": [
    {
      "id": "s01_qian_grain",
      "type": "side",
      "title": "老钱的谷子",
      "giver": "qian",
      "port": "lisboa",
      "prereq": {
        "quests": [],
        "day": 6
      },
      "intro": [
        {
          "who": "qian",
          "text": "小船长，接个小活儿？卑尔根的谷价飞上天了，那边的货栈掌柜托我送一船谷子。"
        },
        {
          "who": "qian",
          "text": "里斯本的谷子便宜，你装二十五袋过去，运费我这边付。对了——那边的掌柜也叫老钱，别惊讶，行规。"
        }
      ],
      "objectives": [
        {
          "kind": "deliver",
          "good": "grain",
          "qty": 25,
          "port": "bergen",
          "label": "把 25 袋谷物运到卑尔根"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "qian",
          "text": "谷子到了？好好好。里斯本的老钱来信说你靴子干净、付钱爽快。货栈联号记着你的名字了。"
        },
        {
          "who": "qian",
          "text": "货栈联号？就是……各港货栈都是一家的。别多问，掌柜只记账，不问账。"
        }
      ],
      "reward": {
        "gold": 900
      }
    },
    {
      "id": "s02_mu_blueprint",
      "type": "side",
      "title": "木叔的图纸",
      "giver": "mu",
      "port": "sevilla",
      "prereq": {
        "quests": [
          "m01_old_ledger"
        ]
      },
      "intro": [
        {
          "who": "mu",
          "text": "初雪号的龙骨我摸了一遍，还撑得住，但跑不了远洋。老船主当年在我这儿留过一张纵帆船的图纸。"
        },
        {
          "who": "mu",
          "text": "你去弄一条纵帆船来，六千金币，这儿的船厂就能造。我照图纸给你加炮位，不收工钱，收老船主那份人情。"
        }
      ],
      "objectives": [
        {
          "kind": "fleet",
          "type": "schooner",
          "label": "拥有一艘纵帆船"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "mu",
          "text": "好船。图纸上的炮位我给你加上了。老船主说过，海上先活着，再谈赚钱。"
        },
        {
          "who": "mu",
          "text": "他还说，要是哪天有人拿着蓝鲸的印来找我……让我别问，只管修船。我一直记着。"
        }
      ],
      "reward": {
        "gold": 500,
        "cannons": 4
      }
    },
    {
      "id": "s03_cen_chart",
      "type": "side",
      "title": "总署的海图",
      "giver": "cen",
      "port": "lisboa",
      "prereq": {
        "quests": [
          "m02_escort_fee"
        ]
      },
      "intro": [
        {
          "who": "cen",
          "text": "{captain}船长。《港务条例》第二十条：海图更新须由民间船长逐港核验，每到一港，由港务盖章。"
        },
        {
          "who": "cen",
          "text": "报酬按章程发放。八个港口，缺一不可。另外……澳门那条航线务必详细记录，总署对它格外关注。"
        }
      ],
      "objectives": [
        {
          "kind": "explore",
          "count": 8,
          "label": "到访 8 个不同港口"
        }
      ],
      "turnIn": "lisboa",
      "outro": [
        {
          "who": "cen",
          "text": "八港印鉴齐全，核验合格。报酬按章程发放，请签收。"
        },
        {
          "who": "ahai",
          "text": "他问澳门问得那么细……归雁号就是在澳门外海失踪的。船长，我不喜欢这个人问问题的样子。"
        }
      ],
      "reward": {
        "gold": 1500
      }
    },
    {
      "id": "s04_hong_wine_debt",
      "type": "side",
      "title": "红姨的酒债",
      "giver": "hong",
      "port": "funchal",
      "prereq": {
        "quests": [
          "m02_escort_fee"
        ]
      },
      "intro": [
        {
          "who": "hong",
          "text": "伦敦那帮人欠我的酒钱三年了！你替姨把酒卖过去，卖多少都算你的——我就图个出气。"
        },
        {
          "who": "hong",
          "text": "北海人爱丰沙尔的酒，伦敦的价最好。四十桶，卖完了，北海哪个港的红姨都是我表姐妹，跟她说一声就行。"
        }
      ],
      "objectives": [
        {
          "kind": "sell",
          "good": "wine",
          "qty": 40,
          "zone": "northeu",
          "label": "向北海各港累计卖出 40 酒"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "hong",
          "text": "丰沙尔的表姐来信了：酒卖光了？痛快！这袋钱是她托我给你的，她高兴。"
        },
        {
          "who": "hong",
          "text": "她还让我带一句：老船主最后一次来，喝的就是这酒。他说'阿海以后带人来，把我的位子让给他坐'。"
        }
      ],
      "reward": {
        "gold": 800
      }
    },
    {
      "id": "s05_guyan_ransom",
      "type": "side",
      "title": "顾砚的赎身钱",
      "giver": "guyan",
      "port": "amsterdam",
      "prereq": {
        "quests": [
          "m03_clerk_of_yinhu"
        ]
      },
      "intro": [
        {
          "who": "guyan",
          "text": "我想走，开一间干净的账房。可蓝鲸的眼睛盯着阿姆斯特丹，你不在这儿站住脚，我走不了。"
        },
        {
          "who": "guyan",
          "text": "往阿姆斯特丹投四千金币。港口的人记得你，蓝鲸就得掂量掂量。到那时我就能悄悄走了。"
        }
      ],
      "objectives": [
        {
          "kind": "invest",
          "port": "amsterdam",
          "amount": 4000,
          "label": "向阿姆斯特丹累计投资 4,000 金币"
        }
      ],
      "turnIn": "amsterdam",
      "outro": [
        {
          "who": "guyan",
          "text": "谢谢。走之前再送你一句：那一成'港务附加'，结账的人从不签名，只盖一个'总署'的章。"
        },
        {
          "who": "guyan",
          "text": "而且我记得，归雁号出事前一个月，账上多了一笔'特别护航'。数目大得离谱。"
        }
      ],
      "reward": {
        "gold": 1200
      }
    },
    {
      "id": "s06_huiyan_sugar",
      "type": "side",
      "title": "伦敦的伤兵",
      "giver": "cen",
      "port": "london",
      "prereq": {
        "quests": [
          "m03_clerk_of_yinhu"
        ]
      },
      "intro": [
        {
          "who": "cen",
          "text": "伦敦驻军的军需申请，第三次被驳回了。伤兵熬药要砂糖，北海不产糖，南洋的糖运不上来。"
        },
        {
          "who": "cen",
          "text": "我按程序申请，也按程序被驳回。程序之外的事，我不方便做。若有商船自愿运三十砂糖来，港务处依例致谢。"
        }
      ],
      "objectives": [
        {
          "kind": "deliver",
          "good": "sugar",
          "qty": 30,
          "port": "london",
          "label": "把 30 砂糖运抵伦敦"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "cen",
          "text": "签收。三十砂糖，入库。依例致谢——这是港务处的规矩，不是我个人的人情。你懂就好。"
        },
        {
          "who": "ahai",
          "text": "他明明就是在谢我们，非得说成规矩。这人真别扭……可他为伤兵跑了三回申请，倒不像个坏人。"
        }
      ],
      "reward": {
        "gold": 2200
      }
    },
    {
      "id": "s07_shanhu_blackflag",
      "type": "side",
      "title": "班达的黑旗",
      "giver": "hong",
      "port": "banda",
      "prereq": {
        "quests": [
          "m04_spice_route"
        ]
      },
      "intro": [
        {
          "who": "hong",
          "text": "姨在班达也有间小店。这镇子上个月又被黑旗船烧了两回码头，镇上的人夜里都不敢点灯。"
        },
        {
          "who": "ahai",
          "text": "……烧的是我长大的那条街。船长，挂黑旗的是巴罗的人。他也是这镇子出去的。"
        },
        {
          "who": "hong",
          "text": "替镇子出口气吧。打掉两支海盗船队，班达的人会记着你。"
        }
      ],
      "objectives": [
        {
          "kind": "defeat",
          "type": "pirate",
          "count": 2,
          "label": "累计击败 2 支海盗船队"
        }
      ],
      "turnIn": "banda",
      "outro": [
        {
          "who": "hong",
          "text": "镇子上的人都在传初雪号的名字。这点钱是大家凑的，别嫌少。"
        },
        {
          "who": "ahai",
          "text": "巴罗小时候跟我抢过一条鱼。他说这镇子欠他的。如今他把欠的都烧了……船长，我不怕他。"
        }
      ],
      "reward": {
        "gold": 1500,
        "shareZone": "nanyang",
        "sharePts": 3
      }
    },
    {
      "id": "s08_ahai_home",
      "type": "side",
      "title": "阿海的家",
      "giver": "ahai",
      "port": "malacca",
      "prereq": {
        "quests": [
          "m03_clerk_of_yinhu"
        ],
        "day": 30
      },
      "intro": [
        {
          "who": "ahai",
          "text": "船长……班达离这儿不远。我娘在那儿。跟老爷子上船后，我五年没回去了。"
        },
        {
          "who": "ahai",
          "text": "我不下船。就想让船靠一靠，送二十五袋谷物上岸。她做的饼要用里斯本的谷子。"
        },
        {
          "who": "ahai",
          "text": "别告诉她我在船上。等把老爷子的事弄明白了，我再自己回去。"
        }
      ],
      "objectives": [
        {
          "kind": "deliver",
          "good": "grain",
          "qty": 25,
          "port": "banda",
          "label": "带 25 袋谷物到班达交付"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "ahai",
          "text": "……她收了。码头上站了半天，往船这边看了一眼。船长，咱们走吧。"
        },
        {
          "who": "ahai",
          "text": "老爷子说过，欠家里的账最难还。我记着。走吧，先把海上的账还完。"
        }
      ],
      "reward": {
        "gold": 600,
        "shareZone": "nanyang",
        "sharePts": 2
      }
    },
    {
      "id": "s09_salim_coffee",
      "type": "side",
      "title": "萨利姆的咖啡",
      "giver": "salim",
      "port": "cartagena",
      "prereq": {
        "quests": [
          "m07_fourth_chair"
        ]
      },
      "intro": [
        {
          "who": "salim",
          "text": "朋友！卡塔赫纳的萨利姆也想做点小生意。波托韦洛的咖啡便宜，丰沙尔的人宁愿用金币换。"
        },
        {
          "who": "salim",
          "text": "帮金沙卖四十袋咖啡到伊比利亚海岸去。利润你拿，我只要一个消息：伊比利亚海岸的人怎么议论金沙。"
        }
      ],
      "objectives": [
        {
          "kind": "sell",
          "good": "coffee",
          "qty": 40,
          "zone": "iberia",
          "label": "向伊比利亚海岸各港累计卖出 40 咖啡"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "salim",
          "text": "金沙的快信到了：卖得好。伊比利亚海岸议论金沙？无所谓，他们议论，就说明他们还在买。"
        },
        {
          "who": "salim",
          "text": "船长，赫克托说我像丢了魂——他没说错。巴罗沉我运金船那天，我才明白账房也会被人记账。"
        }
      ],
      "reward": {
        "gold": 2500
      }
    },
    {
      "id": "s10_alice_gambit",
      "type": "side",
      "title": "艾丽丝的棋局",
      "giver": "alice",
      "port": "london",
      "prereq": {
        "quests": [
          "m05_redsail_rules"
        ]
      },
      "intro": [
        {
          "who": "alice",
          "text": "船长，蓝鲸想请你做一件对你也有好处的事：把红帆在伊比利亚海岸的旗子压下去。"
        },
        {
          "who": "alice",
          "text": "伊比利亚海岸三成半的份额。做到了，蓝鲸付三千金——不多，但蓝鲸从不欠账。"
        },
        {
          "who": "alice",
          "text": "你想问为什么找你？因为老船主当年也是从伊比利亚海岸起家的。我想看看，他的路还能不能再走一遍。"
        }
      ],
      "objectives": [
        {
          "kind": "share",
          "zone": "iberia",
          "pct": 35,
          "label": "伊比利亚海岸份额 ≥35%"
        }
      ],
      "turnIn": "london",
      "outro": [
        {
          "who": "alice",
          "text": "很好。伊比利亚海岸的风向变了，赫克托会睡不着的。"
        },
        {
          "who": "alice",
          "text": "你手里那枚铜印……老船主刻它的时候，我在旁边磨墨。别问了，船长。等你该知道的时候，我会告诉你。"
        }
      ],
      "reward": {
        "gold": 3000
      }
    },
    {
      "id": "s11_longgu_lighthouse",
      "type": "side",
      "title": "澳门的灯",
      "giver": "ding",
      "port": "macau",
      "prereq": {
        "quests": [
          "m06_shanhu_duel"
        ]
      },
      "intro": [
        {
          "who": "ding",
          "text": "灯塔的梁塌了半边，我这老骨头扛不动木头。二十根木料，船长，澳门上一根树都没有。"
        },
        {
          "who": "ding",
          "text": "换我一个故事。三年前冬天，我在这灯塔上看见的事，还没跟活人说过。"
        }
      ],
      "objectives": [
        {
          "kind": "deliver",
          "good": "wood",
          "qty": 20,
          "port": "macau",
          "label": "把 20 根木材运到澳门"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "ding",
          "text": "那晚没有风暴。我看见三盏黑旗的灯围着一条纵帆船，还有第四条船——没挂旗，停在远处，只看，不动。"
        },
        {
          "who": "ding",
          "text": "天亮它就走了。船身漆的是深蓝，桅顶挂着一盏……港务署那种白灯。船长，我只是个守灯的，不敢乱说。"
        },
        {
          "who": "ahai",
          "text": "深蓝船身……港务的白灯。船长，那是港务总署的巡船。他们就在那儿看着归雁号沉。"
        }
      ],
      "reward": {
        "gold": 800
      }
    },
    {
      "id": "s12_yueya_herb",
      "type": "side",
      "title": "摩卡的药材",
      "giver": "qian",
      "port": "mocha",
      "prereq": {
        "quests": [
          "m04_spice_route"
        ]
      },
      "intro": [
        {
          "who": "qian",
          "text": "摩卡的药材是好东西，加勒比海的卡塔赫纳缺得厉害，那边的人愿意出高价。"
        },
        {
          "who": "qian",
          "text": "三十份药材，卖到加勒比海去。掌柜我不收介绍费——联号会记你一功，这比钱有用。"
        }
      ],
      "objectives": [
        {
          "kind": "sell",
          "good": "herb",
          "qty": 30,
          "zone": "caribbean",
          "label": "向加勒比海各港累计卖出 30 药材"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "qian",
          "text": "成了。摩卡的老钱来信说，金沙的人问起了你的船。这是联号给你的份子。"
        },
        {
          "who": "qian",
          "text": "小船长，掌柜提醒一句：金沙的人问船，不是想买货，是想买人。"
        }
      ],
      "reward": {
        "gold": 1600
      }
    },
    {
      "id": "s13_mu_last_ship",
      "type": "side",
      "title": "木叔的最后一艘船",
      "giver": "mu",
      "port": "guangzhou",
      "prereq": {
        "quests": [
          "m08_whale_invitation"
        ]
      },
      "intro": [
        {
          "who": "mu",
          "text": "老船主生前订过一条盖伦帆船，图纸画好了，船还没开工，他就没回来。"
        },
        {
          "who": "mu",
          "text": "三万二千金币，三十门炮位，三百二十点船体。广州的三级船厂能造。老船主说，省下的木头都会变成海里的洞。"
        },
        {
          "who": "mu",
          "text": "你去弄一条来。我把图纸上的东西全给你装上——炮位、水手舱，一样不少。这是我欠他的。"
        }
      ],
      "objectives": [
        {
          "kind": "fleet",
          "type": "galleon",
          "label": "拥有一艘盖伦帆船"
        }
      ],
      "turnIn": null,
      "outro": [
        {
          "who": "mu",
          "text": "成了。这条船，老船主原本叫它'不分家号'。我不懂什么意思，名字你自己定。"
        },
        {
          "who": "mu",
          "text": "去吧。木匠只造船，不打仗。但我会在广州等你回来修船。这袋钱是他当年付的定金，该还给你。"
        }
      ],
      "reward": {
        "gold": 2000,
        "cannons": 8,
        "crew": 30
      }
    },
    {
      "id": "s14_hector_return_gift",
      "type": "side",
      "title": "赫克托的回礼",
      "giver": "hector",
      "port": "aceh",
      "prereq": {
        "quests": [
          "m09_fengyu_tribunal"
        ]
      },
      "intro": [
        {
          "who": "hector",
          "text": "分海约废了，痛快。可金沙那帮账房先生在会审上一声不吭，这些年吃的却比谁都多。"
        },
        {
          "who": "hector",
          "text": "替红帆打掉一支金沙船队，让萨利姆也尝尝正面挨炮的滋味。本船长付钱，也让南洋记你一笔。"
        }
      ],
      "objectives": [
        {
          "kind": "defeat",
          "type": "rival",
          "rival": "goldsand",
          "count": 1,
          "label": "击败 1 支金沙公司船队"
        }
      ],
      "turnIn": "aceh",
      "outro": [
        {
          "who": "hector",
          "text": "好。这是红帆的钱——不是护航费，是战利品的份子。"
        },
        {
          "who": "hector",
          "text": "老船主当年要是肯跟本船长打一场，也许我们早就是朋友了。……走吧，海上见。"
        }
      ],
      "reward": {
        "gold": 3000,
        "shareZone": "nanyang",
        "sharePts": 4
      }
    }
  ]
};
