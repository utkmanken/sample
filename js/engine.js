import { COMMANDS } from './functions.js';

let is_localStorage_allowed = false;
let last_sc_line = -1; //0-based
//臨時に関数間を超えて実行する。
let do_inaninstant = false;
let SCENARIO = [];
let current_display = "index";
let jump_target = null;
export let sc_var = {};
let scline_counter = [];

console.log("engine.js起動")

export const ASSETS = {
	"html": {},
	"imgs": {},
	"audio": {}
};
//indexedDBの定義
const openAssetsDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ASSETS_DB", 2);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // HTML
            if (!db.objectStoreNames.contains("html")) {
                db.createObjectStore("html", { keyPath: "path" });
            }
            // 画像
            if (!db.objectStoreNames.contains("image")) {
                db.createObjectStore("image", { keyPath: "path" });
            }
            // 音声
            if (!db.objectStoreNames.contains("audio")) {
                db.createObjectStore("audio", { keyPath: "path" });
            }
			// シナリオファイル
            if (!db.objectStoreNames.contains("scenario")) {
                db.createObjectStore("scenario", { keyPath: "path" });
            }
			//scファイルに与える自由領域
			if (!db.objectStoreNames.contains("scenario_vars")) {
				db.createObjectStore("scenario_vars", { keyPath: "key" });
			}
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
//indexedDBからファイルを読み取り
const dbGet = (db, storeName, path) => {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(path);

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
//indexedDBにファイル保存
const dbPut = (db, storeName, record) => {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
//ASSETSにロード
const loadToASSETS = async (storeName, path, data) => {
    if (storeName === "html") {
        ASSETS.html[path] = data;
    }
    if (storeName === "image") {
        ASSETS.imgs[path] = URL.createObjectURL(data);
    }
    if (storeName === "audio") {
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);
        ASSETS.audio[path] = new Audio(url);
    }
}
//プログレスバー更新
function makeProgressUpdater(total) {
    let count = 0;
    return function (path) {
        count++;
        document.getElementById("progress-bar")
            .setAttribute("width", 300 * (count / total));
        document.getElementById("loadprogress_discription").textContent = path;
    };
}
//1ファイルロード
const loadOneFile = async (db, storeName, path, version, updateProgress) => {
    const dbData = await dbGet(db, storeName, path);

    if (dbData && dbData.version === version) {
        await loadToASSETS(storeName, path, dbData.data);
        updateProgress(path);
        return;
    }

    const res = await fetch(path);

    let data;
    if (storeName === "html") {
        data = await res.text();
    } else if (storeName === "image") {
        data = await res.blob();
    } else if (storeName === "audio") {
        data = await res.arrayBuffer();
    }

    await dbPut(db, storeName, { path, version, data });
    await loadToASSETS(storeName, path, data);
    updateProgress(path);
}
//プリロード
async function setASSETS() {
    const db = await openAssetsDB();
    // HTML
    const htmlList = await fetch("ASSETScontents_html.txt").then(r => r.text());
    const htmlItems = htmlList.trim().split("\n").map(line => {
        const [path, version] = line.split("|");
        return { path, version };
    });
    const updateHTML = makeProgressUpdater(htmlItems.length);
    for (const item of htmlItems) {
        await loadOneFile(db, "html", item.path, item.version, updateHTML);
    }
    // IMAGE
    const imgList = await fetch("ASSETScontents_image.txt").then(r => r.text());
    const imgItems = imgList.trim().split("\n").map(line => {
        const [path, version] = line.split("|");
        return { path, version };
    });
    const updateIMG = makeProgressUpdater(imgItems.length);
    for (const item of imgItems) {
        await loadOneFile(db, "image", item.path, item.version, updateIMG);
    }
    // AUDIO
    const audioList = await fetch("ASSETScontents_audio.txt").then(r => r.text());
    const audioItems = audioList.trim().split("\n").map(line => {
        const [path, version] = line.split("|");
        return { path, version };
    });
    const updateAudio = makeProgressUpdater(audioItems.length);
    for (const item of audioItems) {
        await loadOneFile(db, "audio", item.path, item.version, updateAudio);
    }
	// sc_var
	const saved = await dbGet(db, "scenario_vars", "sc_var");
	sc_var = saved?.data ?? {};
}
//シナリオファイル1ファイルロード
const loadOneScenario = async (db, path, version) => {
    const dbData = await dbGet(db, "scenario", path);
    if (dbData && dbData.version === version) {
        return dbData.data;
    }
    const text = await fetch(path).then(r => r.text());
    await dbPut(db, "scenario", {
        path,
        version,
        data: text
    });
    return text;
}
//シナリオの―パース
const parseScenario = (text) => {
    return text
        .trim()
        .split("\n")
        .map(line => {
            const parts = line.trim().split(/\s+/);
            const cmd = parts[0];
            const args = parts.slice(1).map(arg =>
                arg.replace(/\\s/g, " ")
            );
            return [cmd, args];
        });
}
//シナリオファイルの読み込み
const loadAndParse = async () => {
    const db = await openAssetsDB();
    const list = await fetch("ASSETScontents_scenario.txt?202605102355").then(r => r.text());
    const [path, version] = list.trim().split("|");
    const text = await loadOneScenario(db, path, version);
    return parseScenario(text);
}
//sc_varのindexedDBへの保存
const saveScVarToDB = async () => {
    const db = await openAssetsDB();
    await dbPut(db, "scenario_vars", {
        key: "sc_var",
        data: sc_var ?? {}
    });
}
const resetScenarioData = async () => {
    sc_var = {};
    const db = await openAssetsDB();
    await dbPut(db, "scenario_vars", {
        key: "sc_var",
        data: sc_var
    });
}
/*
//localStorageの許可を取得 実行順序1
document.getElementById("localStorage_accept").addEventListener('click', async () => {
	is_localStorage_allowed = true;
	localStorage.setItem("is_localStorage_allowed", "true");
	await first_display_change();
	});
document.getElementById('localStorage_not_accept').addEventListener('click', async () => {
	is_localStorage_allowed = false;
	await first_display_change();
});

//ローカルストレージが有効だったら変数を更新する:実行順序2
if (localStorage.getItem("is_localStorage_allowed") == "true") {
	is_localStorage_allowed = true;
	await first_display_change();
}
*/
// engine.js
//実行順序1
const initEngine = async () => {
    const isAllowed = localStorage.getItem("is_localStorage_allowed") === "true";

    if (isAllowed) {
        // パターンA: すでに許可があるなら即実行
        is_localStorage_allowed = true;
        await first_display_change();
    } else {
        // パターンB: 許可がないならボタンにイベントを登録
        const acceptBtn = document.getElementById("localStorage_accept");
        const rejectBtn = document.getElementById("localStorage_not_accept");

        // ボタンがHTMLに存在するかチェック（念のため）
        if (acceptBtn && rejectBtn) {
            acceptBtn.addEventListener('click', async () => {
                is_localStorage_allowed = true;
                localStorage.setItem("is_localStorage_allowed", "true");
                await first_display_change();
            });

            rejectBtn.addEventListener('click', async () => {
                is_localStorage_allowed = false;
                await first_display_change();
            });
        }
    }
};

//最初の画面遷移, body_contents移植
async function loadBody(url) {
	if (ASSETS.html[url] == undefined) {
		const res = await fetch(url);
		ASSETS.html[url] = await res.text();
	}
	const parser = new DOMParser();
	const doc = parser.parseFromString(ASSETS.html[url], "text/html");
	return doc.body.innerHTML;
}

//最初の画面遷移, body_contents移植
async function first_display_change() {
	//scファイル読み取り
	if (current_display === "index") {
		document.getElementById("forusertonoticeloading").textContent = "データの読み込み中です";
		document.getElementById("localStorage_accept").setAttribute("disabled", true);
		document.getElementById("localStorage_not_accept").setAttribute("disabled", true);
		SCENARIO = await loadAndParse();
		document.getElementById("loadprogress").style.display = "block";
		await setASSETS();
	}
	
	loadBody("HTML/title.html").then(bodyContent => {
		document.getElementById("body_contents").innerHTML = bodyContent;
		  
		//ローカルストレージに途中までのデータがあったら「途中からストーリーを再開する」ボタンを設置
		const last_saved_scenario = Number(localStorage.getItem("last_sc_line") || -1);
		if (last_saved_scenario > -1 || last_sc_line > -1) {
			const newbutton_in_buttonblock = document.createElement("Button");
			newbutton_in_buttonblock.textContent = "途中からストーリーを再開する";
			newbutton_in_buttonblock.classList.add("titlebutton");
			newbutton_in_buttonblock.id = "restartbutton";
			document.getElementById("buttonblock").prepend(newbutton_in_buttonblock);
			document.getElementById("restartbutton").addEventListener('click', async () => {
				if (last_saved_scenario > last_sc_line) {
					last_sc_line = last_saved_scenario;
				}
				await display_change_toStoryContinue(last_saved_scenario);
			});
		}
		//各タイトル画面のボタンに対してイベントリスナーを設定する
		document.getElementById("storybutton").addEventListener('click', async () => {
			const last = localStorage.getItem("last_sc_line");
			if (last && last !== "-1") {
				const ok = confirm("ゲームが最初からスタートします。\nデータは復元できません。\n最初からスタートしますか？");
				if (!ok) return;
			}
			await resetScenarioData();
			last_sc_line = -1;
			localStorage.setItem("last_sc_line", "-1");
			await display_change_toStory();
		});
		current_display = "title";
	});
	
}
const end_of_scenario = () => alert("シナリオの終わりです");
//ストーリーモードへの画面遷移
async function display_change_toStory() {
	current_display = "story";
	const bodyContent = await loadBody("HTML/mode_story.html");
	document.getElementById("body_contents").innerHTML = bodyContent;
	
		document.getElementById("body_contents").innerHTML = bodyContent;
		//各タイトル画面のボタンに対してイベントリスナーを設定する
		//メインメニューは暫定的にシナリオ番号を保存したのちにタイトル画面へ
		document.getElementById("mainmenu").addEventListener('click', async () => {
			if (is_localStorage_allowed) {
				localStorage.setItem("last_sc_line", String(last_sc_line));
			} else {
				if (window.confirm('localStorageが有効ではないためページを閉じるとデータが失われます。\nlocalStorageを有効にしますか？\n※メニューに戻ってもページを離れなければデータは失われません')) {
					is_localStorage_allowed = true;
					localStorage.setItem("is_localStorage_allowed", "true");
					localStorage.setItem("last_sc_line", String(last_sc_line));
				}
			}
			await first_display_change();
		});
		//進むボタンで次のsc実施
		document.getElementById("proceed_sc").addEventListener("click", () => {
			if (last_sc_line+1 < SCENARIO.length) {
				last_sc_line++;
				let returned_index = do_scenario(last_sc_line); //do_scenarioは最後にやった0-basedの行番号を返す
				/*
				if (Number(localStorage.getItem("last_sc_line") || 0) > last_sc_line) {
					last_sc_line = Number(localStorage.getItem("last_sc_line") || 0);
				}
				*/
				last_sc_line = returned_index;
				localStorage.setItem("last_sc_line", String(last_sc_line));
			} else {
				end_of_scenario();
			}
		});
		//最初のシナリオを表示する
		if (!(Number(localStorage.getItem("last_sc_line") || -1) >= 0)) {
			let returned_index = do_scenario(0);
			last_sc_line = returned_index;
		}
}

async function display_change_toStoryContinue(lss) {
	current_display = "continue";
	await display_change_toStory();
	//シーン切り替え
	do_inaninstant = true;
	for (let i = 0; i < lss; i++) {
		let returned_index = do_scenario(i);
		i = returned_index;
	}
	do_inaninstant = false;
}

//指定の行番号を探して実行する
function do_scenario(num) {
    // numは0-based
    let index = num;
	const LIMIT = SCENARIO.length * 1000;

    while (true) {
		const [funcName, args] = SCENARIO[index];
        //const [code, value] = window[funcName](args);
		const commandFunc = COMMANDS[funcName];
		
		if (typeof commandFunc === "function") {
            const [code, value] = commandFunc(args);
		
			if (!scline_counter[index]) scline_counter[index] = 0;
			scline_counter[index]++;
			if (scline_counter[index] > LIMIT) {
				console.error("無限ループの可能性があります。停止します。");
				return SCENARIO.length; // 存在しない行番号
			}
			
			// setvar 系の保存
			if (code === 10 || code === 11) {
				saveScVarToDB();
			}
			// ジャンプ
			if (code === 2) {
				index = value; // 0-based
				continue;
			}
			// 次へ
			if (code === 1 || code === 11) {
				index++;
				continue;
			}
			// 停止
			return index;
		} else {
            console.error(`命令 '${funcName}' は COMMANDS に定義されていません。`);
            break; 
        }
    }
}

// 実行
initEngine();