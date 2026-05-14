function sc_if(args) {
    const condition = args[0];
    const trueLine = Number(args[1]) - 1;
    const falseLine = Number(args[2]) - 1;

    const match = condition.match(/(.+?)(==|!=|>=|<=|>|<)(.+)/);
    const leftKey = match[1].trim();
    const op = match[2];
    const rightRaw = match[3].trim();

    const left = sc_var[leftKey];
    const right = isNaN(rightRaw)
        ? sc_var[rightRaw] ?? rightRaw.replace(/"/g, "")
        : Number(rightRaw);

    let result = false;
    switch (op) {
        case "==": result = (left == right); break;
        case "!=": result = (left != right); break;
        case ">":  result = (left >  right); break;
        case "<":  result = (left <  right); break;
        case ">=": result = (left >= right); break;
        case "<=": result = (left <= right); break;
    }

    return [2, result ? trueLine : falseLine];
}
function jumpto(args) {
    return [2, Number(args[0]) - 1];
}
function setvar_logical({ path, value }) {// path: ["a", 1, "key", ...] value: 代入する値
    if (typeof sc_var !== "object" || sc_var === null) {
        sc_var = {};
    }
	if (typeof value === "object" && value.varRef) {
		const path = parseSetvarPath(value.varRef);
		value = GetValueFromsc_var(path);
	}
    let current = sc_var;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        const nextKey = path[i + 1];
        if (current[key] === undefined) {
            current[key] = (typeof nextKey === "number") ? [] : {};
        }
        if (Array.isArray(current[key]) && typeof nextKey === "string") {
			console.log(`${current}が辞書に置換されました`);
            current[key] = {};  // 辞書に上書き
        }
        if (!Array.isArray(current[key]) && typeof nextKey === "number") {
            const newArr = [];
			console.log(`${current}が配列に置換されました`);
            current[key] = newArr;  // 配列に上書き
        }
        current = current[key];
    }
    const lastKey = path[path.length - 1];
    current[lastKey] = value;
    return true;
}
function parseSetvarPath(raw) { //a[1]["key"][2] → ["a", 1, "key", 2]
    const path = [];
    const first = raw.split("[")[0];
    path.push(first);
    const regex = /\[(.*?)\]/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
        const token = match[1];

        if (/^\d+$/.test(token)) {
            path.push(Number(token));
            continue;
        }
        if (/^".*"$/.test(token)) {
            path.push(token.slice(1, -1));
            continue;
        }
        path.push(token);
    }
    return path;
}
function parseSetvarValue(raw) {
    if (/^".*"$/.test(raw)) {
        return raw.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
        return Number(raw);
    }
    if (/^\[.*\]$/.test(raw)) {
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }
    if (/^\{.*\}$/.test(raw)) {
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }
    if (/^[A-Za-z_]/.test(raw)) {
        return { varRef: raw };
    }
    return raw;
}
function setvar(args) { //args = [do_next_flag, left_raw, right_raw]
    const doNextFlag = Number(args[0]);
    const leftRaw = args[1];
    const rightRaw = args[2];
    const path = parseSetvarPath(leftRaw);
    const value = parseSetvarValue(rightRaw);
    setvar_logical({ path, value });
	return doNextFlag === 1 ? [11, null] : [10, null];
}
function sc_calc(args) { // args = [do_next, left_raw, operator, right_raw]
    const doNextFlag = Number(args[0]);
    const leftRaw = args[1];
    const operator = args[2];
    const rightRaw = args[3];
    const leftPath = parseSetvarPath(leftRaw);
    let rightValue;
    if (/^-?\d+(\.\d+)?$/.test(rightRaw)) {
        rightValue = Number(rightRaw);
    } else {
        const rightPath = parseSetvarPath(rightRaw);
        rightValue = GetValueFromsc_var(rightPath);
    }
    let leftValue = GetValueFromsc_var(leftPath);
    if (leftValue === undefined) {
        leftValue = 0;
    }
    if (typeof rightValue !== "number" || isNaN(rightValue)) {
        console.warn("sc_calc: 計算に使う引数が文字列/リスト/辞書/未定義だったため、計算は行われませんでした。");
        return doNextFlag === 1 ? [11, null] : [10, null];
    }
    let result;
    switch (operator) {
        case "+":
            result = leftValue + rightValue;
            break;
        case "-":
            result = leftValue - rightValue;
            break;
        case "*":
            result = leftValue * rightValue;
            break;
        case "/":
            if (rightValue === 0) {
                console.warn("sc_calc: 0 で割ることはできません。計算は行われませんでした。");
                return doNextFlag === 1 ? [11, null] : [10, null];
            }
            result = leftValue / rightValue;
            break;
        case "%":
            if (rightValue === 0) {
                console.warn("sc_calc: 0 で割ることはできません（剰余）。計算は行われませんでした。");
                return doNextFlag === 1 ? [11, null] : [10, null];
            }
            result = leftValue % rightValue;
            break;
        case "^":
            result = leftValue ** rightValue;
            break;
        default:
            console.warn(`sc_calc: 未対応の演算子 '${operator}' が指定されました。`);
            return doNextFlag === 1 ? [11, null] : [10, null];
    }
    setvar_logical({ path: leftPath, value: result });
    return doNextFlag === 1 ? [11, null] : [10, null];
}
function dialogue(args) { //未完成
	if (args[1] === "html") {
		document.getElementById("p_textbox").innerHTML = args[0];
	} else {
		document.getElementById("p_textbox").textContent = args[0];
	}
	return [0, null];
}
function debug_dispvar(args) { //パス 今ある内容を消すかどうか do_next
    const varName = args[0];
    let content = "";
    if (sc_var[varName] === undefined) {
        content = `<pre>${varName} is undefined</pre>`;
    } else {
        content = `<pre>${varName} = ${JSON.stringify(sc_var[varName], null, 2)}</pre>`;
    }
    const debugArea = document.getElementById("p_textbox");
    if (debugArea) {
		if (args[1] === "1") {
			debugArea.innerHTML = "";
		}
        debugArea.innerHTML += content;
    }
	return args[2] === "1" ? [1, null] : [0, null];
}
function GetValueFromsc_var(path) { // path: ["a", 1, "key"]
    if (typeof sc_var !== "object" || sc_var === null) {
        return undefined;
    }
    let current = sc_var;
    for (let i = 0; i < path.length; i++) {
        const key = path[i];

        if (current[key] === undefined) {
            return undefined;
        }
        current = current[key];
    }
    return current;
}
function dispIMG(args) {
	
}
function stateIMG(args) {
	
}
function sympleBGchange(args) { //テスト用 パス つける[0/1] 消す[0/1] do_next
	const obj = document.getElementById("background");
	if (args[1] === "1") {
		obj.style.width = "calc(100vh * 9 / 16)";
		obj.style.height = "70%";
		obj.innerHTML = `<img src="${ASSETS.imgs[args[0]]}" style="width: calc(100vh * 9 / 16); height: 100%;"/>`;
	}
	if (args[2] === "1") {
		obj.innerHTML = "";
	}
	return args[3] === "1" ? [1, null] : [0, null];
}
function console_dispvar(args) { //パス do_nextフラグ
	pathString = args[0]
    try {
        // パスを配列に変換（例: "a[1][\"x\"]" → ["a", 1, "x"]）
        const path = parseSetvarPath(pathString);
        const value = GetValueFromsc_var(path);
        console.log(`${pathString} =`, value);
    } catch (e) {
        console.warn(`console_dispvar: パス解析に失敗しました → ${pathString}`, e);
    }
	return args[1] === "1" ? [1, null] : [0, null];
}
function clear_scline_counter(args) {
    scline_counter = [];
    return [1, null];
}
