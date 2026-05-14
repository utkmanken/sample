dialogue <b\sstyle="color:red;">HelloWorld</b> html admin admin None
dialogue this\sis\sa\stest\sof\sengine.js nomal admin admin None
dialogue <b\sstyle="color:blue;">HelloWorld</b> html admin admin None
sympleBGchange test/1.jpg 1 0 0
sympleBGchange test/2.jpg 1 0 1
dialogue 2 nomal admin admin None
sympleBGchange test/3.jpg 1 0 1
dialogue 3 nomal admin admin None
sympleBGchange test/4.jpg 1 0 1
dialogue 4 nomal admin admin None
sympleBGchange test/5.jpg 1 0 1
dialogue 5 nomal admin admin None
sympleBGchange test/6.jpg 1 0 1
dialogue 6 nomal admin admin None
dialogue 7 nomal admin admin None
sympleBGchange test/8.jpg 1 0 1
dialogue 8 nomal admin admin None
sympleBGchange test/9.jpg 1 0 1
dialogue 9 nomal admin admin None
setvar 0 a "HelloWorld"
debug_dispvar a 0
setvar 1 b[0] "HelloWorld2"
debug_dispvar b 0
setvar 1 b[1] "HelloWorld3"
debug_dispvar b 0
setvar 1 b[2] "HelloWorld2"
debug_dispvar b 0
dialogue 4つ目の文章 nomal admin admin None
sympleBGchange test/1.jpg 0 1
dialogue 5つ目の文章 nomal admin admin None
dialogue setvarのテストを開始します nomal admin admin None
dialogue テスト1 nomal admin admin None
setvar 0 a 10
debug_dispvar a 0 0
dialogue テスト2 nomal admin admin None
setvar 0 a[1] "hello"
debug_dispvar a 0 0
dialogue テスト3 nomal admin admin None
setvar 0 b["data"] "world"
debug_dispvar b 0 0
dialogue テスト4 nomal admin admin None
setvar 1 c [10,20]
debug_dispvar c 0 0
setvar 0 c["x"] 99
debug_dispvar c 0 0
dialogue テスト5 nomal admin admin None
setvar 1 d {"x":1}
debug_dispvar d 0 0
setvar 0 d[2] "Y"
debug_dispvar d 0 0
dialogue テスト6 nomal admin admin None
setvar 1 e [{"a":1},{"b":2}]
debug_dispvar e 0 0
setvar 0 e[1]["c"] 3
debug_dispvar e 0 0
dialogue テスト7 nomal admin admin None
setvar 1 f {"x":[1,2]}
debug_dispvar f 0 0
setvar 0 f["x"][2] 3
debug_dispvar f 0 0
dialogue テスト8 nomal admin admin None
setvar 0 g[1]["data"]["sub"] "ok"
debug_dispvar g 0 0
dialogue テスト終了 nomal admin admin None
setvar 1 a "繰り返し開始"
dialogue フィボナッチ数列20個 nomal admin admin None
setvar 1 i 0
setvar 1 last 0
setvar 1 now 1
setvar 1 oncalc 0
console_dispvar a 1
sc_calc 1 i + 1
setvar 1 oncalc now
sc_calc 1 oncalc + last
console_dispvar i 1
console_dispvar oncalc 1
setvar 1 last now
setvar 1 now oncalc
debug_dispvar oncalc 0 1
sc_if i>=20 81 71
setvar 1 i "計算終了。ボタンを押して次へ"
debug_dispvar i 0 0
dialogue 終了 nomal admin admin None
dialogue テスト表示20個 nomal admin admin None
setvar 1 i 0
sc_calc 1 i + 1
console_dispvar i 1
debug_dispvar i 0 1
sc_if i>=20 91 90
jumpto 86
setvar 1 i "終了。ボタンを押して次へ"
debug_dispvar i 0 0
dialogue 終了 nomal admin admin None