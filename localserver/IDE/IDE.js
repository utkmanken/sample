const processIndent = (line, indentStack) => {
    const tokens = [];

    // 空行は無視
    if (/^\s*$/.test(line)) return tokens;

    const match = line.match(/^( *)/);
    const spaces = match[1].length;

    if (spaces % 4 !== 0) {
        throw new Error("Indent must be multiples of 4 spaces");
    }

    const indent = spaces / 4;
    const current = indentStack[indentStack.length - 1];

    if (indent > current) {
        indentStack.push(indent);
        tokens.push({ type: "INDENT" });
    } else if (indent < current) {
        while (indentStack[indentStack.length - 1] > indent) {
            indentStack.pop();
            tokens.push({ type: "DEDENT" });
        }
    }

    return tokens;
}
const isTripleQuoteStart = (line) => line.trim().startsWith('"""');
/*const readTripleString = (lines, startIndex) => {
    let content = "";
    let i = startIndex;

    // 最初の """ を除去
    let line = lines[i].trim().slice(3);

    while (true) {
        const endIndex = line.indexOf('"""');
        if (endIndex !== -1) {
            content += line.slice(0, endIndex);
            break;
        }
        content += line + "\n";
        i++;
        line = lines[i];
    }

    return {
        token: { type: "STRING", value: content },
        nextIndex: i + 1
    };
}
*/ //202605130041削除
const removeBaseIndent = (line, baseIndent) => {
    // 行頭のスペースを取得
    const match = line.match(/^( *)/);
    const spaces = match ? match[1].length : 0;

    // baseIndent 以上なら削る
    if (spaces >= baseIndent) {
        return line.slice(baseIndent);
    }
    return line; // それより浅い場合はそのまま
};
const readTripleString = (lines, startIndex) => {
    let content = "";
    let i = startIndex;

    // 最初の """ を除去
    let firstLine = lines[i];
    const baseIndent = firstLine.match(/^( *)/)[1].length; // say ブロック内のインデント
    let line = firstLine.trim().slice(3); // """ の後ろ

    // 最初の行に文字があれば追加
    if (line.length > 0) content += line + "\n";

    i++;

    while (i < lines.length) {
        let raw = lines[i];

        // 終了 """ を探す
        const endIndex = raw.indexOf('"""');
        if (endIndex !== -1) {
            // 終了行の前の部分だけ取る
            let before = raw.slice(0, endIndex);

            // インデント削除
            before = removeBaseIndent(before, baseIndent);

            content += before;
            break;
        }

        // 通常行
        let trimmed = removeBaseIndent(raw, baseIndent);
        content += trimmed + "\n";

        i++;
    }

    return {
        token: { type: "STRING", value: content },
        nextIndex: i + 1
    };
};
const removeComment = (line) => line.replace(/#.*/, "");
const splitIntoParts = (line) => {
    const regex = /("""[\s\S]*?"""|"[^"\\]*(?:\\.[^"\\]*)*"|==|!=|>=|<=|\+=|\-=|\*=|\/=|%=|->|[+\-*/%=:()<>]|-?\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|\s+)/g;
	const m = line.match(regex);
	if (!m) return [];
    return line.match(regex).filter(x => !/^\s+$/.test(x));
}
const classifyToken = (part) => {
    if (/^"""[\s\S]*?"""$/.test(part)) {
        return { type: "STRING", value: part.slice(3, -3) };
    }
    if (/^"([^"\\]|\\.)*"$/.test(part)) {
        return { type: "STRING", value: part.slice(1, -1) };
    }
    if (/^-?\d+(\.\d+)?$/.test(part)) {
        return { type: "NUMBER", value: Number(part) };
    }
    if (/^(==|!=|>=|<=|>|<)$/.test(part)) {
        return { type: "OPERATOR", value: part };
    }
    if (/^(\+=|\-=|\*=|\/=|%=)$/.test(part)) {
        return { type: "OPERATOR", value: part };
    }
    if (/^[+\-*/%]$/.test(part)) {
        return { type: "OPERATOR", value: part };
    }
    if (part === "->") return { type: "ARROW" };
    if (part === "=") return { type: "EQUAL" };
    if (part === ":") return { type: "COLON" };
    if (part === "(") return { type: "LPAREN" };
    if (part === ")") return { type: "RPAREN" };
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
        return { type: "IDENT", value: part };
    }

    throw new Error("Unknown token: " + part);
}


const tokenize = (source) => {
    const lines = source.split(/\r?\n/);
    const tokens = [];
    const indentStack = [0]; // 最初は0インデント

    let i = 0;
    while (i < lines.length) {
        let line = lines[i];

        // 1. インデント解析
        const indentTokens = processIndent(line, indentStack);
        tokens.push(...indentTokens);

        // 2. 複数行文字列チェック
        if (isTripleQuoteStart(line)) {
            const { token, nextIndex } = readTripleString(lines, i);
            tokens.push(token);
            i = nextIndex;
            continue;
        }

        // 3. コメント除去
        line = removeComment(line);

        // 4. トークン分割
        const parts = splitIntoParts(line);

        // 5. トークン種別判定
        for (const part of parts) {
            const t = classifyToken(part);
            if (t) tokens.push(t);
        }
		
		// 6. 空行は continue
		if (/^\s*$/.test(line)) {
			i++;
			continue;
		}

        // 7. 行末
        tokens.push({ type: "NEWLINE" });

        i++;
    }

    // 7. ファイル末尾の DEDENT
    while (indentStack.length > 1) {
        indentStack.pop();
        tokens.push({ type: "DEDENT" });
    }

    tokens.push({ type: "EOF" });
    return tokens;
}
