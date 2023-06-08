"use strict";
const createConsole = (() => {
    return (game) => {
        setupBuiltIns(game);
        let opened = false;
        const position = {
            x: Game.halfWidth,
            y: Game.halfHeight
        }, dimensions = {
            x: Game.halfWidth,
            y: Game.halfHeight
        }, dom = {
            wrapper: void 0,
            mainWrapper: void 0,
            header: void 0,
            body: void 0,
            input: void 0,
            button: void 0,
            autocomplete: void 0
        }, entries = [], inputHistory = new (class {
            #backingSet = new Set();
            #backingArray = [];
            add(element) {
                const oldSize = this.#backingSet.size;
                this.#backingSet.add(element);
                (this.#backingSet.size != oldSize) && this.#backingArray.unshift(element);
            }
            clear() {
                this.#backingSet.clear();
                this.#backingArray = [];
            }
            filter(predicate) {
                return this.#backingArray.filter(predicate);
            }
        })();
        let computedStyle;
        const style = {
            get left() { return window.parseInt(computedStyle.left, 10); },
            get top() { return window.parseInt(computedStyle.top, 10); },
            get width() { return window.parseInt(computedStyle.width, 10); },
            get height() { return window.parseInt(computedStyle.height, 10); }
        };
        dom.mainWrapper = makeElement("div", {
            id: "console-wrapper",
            style: {
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${dimensions.x}px`,
                transform: "translate(-50%, -50%)"
            }
        }, [
            dom.wrapper = makeElement("div", {
                id: "console-inner-wrapper",
                style: {
                    height: `${dimensions.y}px`
                }
            }, [
                makeElement("div", {
                    id: "console-header"
                }, [
                    makeElement("span", {
                        textContent: "Console"
                    }),
                    dom.button = makeElement("button", {
                        id: "console-close",
                        textContent: "x"
                    })
                ], {
                    mousedown(event) {
                        computedStyle ??= window.getComputedStyle(dom.mainWrapper);
                        const offsetX = style.left - event.clientX, offsetY = style.top - event.clientY;
                        document.addEventListener("mouseup", function remove() {
                            document.removeEventListener("mousemove", move);
                            document.removeEventListener("mouseup", remove);
                        });
                        function clamp(v, a, b) {
                            return v < a ? a : v > b ? b : v;
                        }
                        function move(e) {
                            dom.mainWrapper.style.left = `${position.x = +clamp(e.clientX + offsetX, style.width / 2, window.innerWidth - style.width / 2)}px`;
                            dom.mainWrapper.style.top = `${position.y = +clamp(e.clientY + offsetY, style.height / 2, window.innerHeight - style.height / 2)}px`;
                        }
                        document.addEventListener("mousemove", move);
                    }
                }),
                dom.body = makeElement("div", {
                    id: "console-body"
                }),
                dom.input = makeElement("textarea", {
                    id: "console-input",
                    autocapitalize: "false",
                    autocomplete: "false"
                }),
            ]),
            dom.autocomplete = makeElement("div", {
                id: "console-autocomplete",
                style: {
                    display: "none"
                }
            })
        ]);
        function pushAndLog(message, raw = false) {
            entries.push(message);
            dom.body.appendChild(generateHTML(message, raw));
        }
        const allowedTags = [
            // Headings
            "h1", "h2", "h3", "h4", "h5", "h6",
            // Text stuff
            "blockquote", "p", "pre", "span",
            // List stuff
            "li", "ol", "ul",
            // Inline elements
            "a", "em", "b", "bdi", "br", "cite", "code", "del", "ins",
            "kbd", "mark", "q", "s", "samp", "small", "span", "strong",
            "sub", "sup", "time", "u", "var",
            // Table stuff
            "caption", "col", "colgroup", "table", "tbody", "td", "tfoot",
            "th", "thead", "tr"
        ];
        function sanitizeHTML(message) {
            return message.replace(/<\/?.*?>/g, match => {
                const tag = match.replace(/<\/?|>/g, "").split(" ")[0];
                if (allowedTags.includes(tag))
                    return match;
                return match
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
            });
        }
        function generateHTML(message, raw = false) {
            const date = (() => {
                const timestamp = new Date(message.timestamp);
                return {
                    hr: `${timestamp.getHours()}`.padStart(2, "0"),
                    min: `${timestamp.getMinutes()}`.padStart(2, "0"),
                    sec: `${timestamp.getSeconds()}`.padStart(2, "0"),
                    mil: `${timestamp.getMilliseconds()}`.padStart(3, "0")
                };
            })(), entry = {
                container: void 0,
                timestamp: void 0,
                content: void 0
            };
            entry.container = makeElement("div", {
                className: `console-entry console-entry-${message.type}`
            }, [
                entry.timestamp = makeElement("div", {
                    className: "console-entry-timestamp",
                    textContent: `${date.hr}:${date.min}:${date.sec}:${date.mil}`
                }),
            ]);
            entry.content = makeElement("div", {
                className: "console-entry-content"
            });
            const propertyToModify = raw ? "textContent" : "innerHTML";
            if (typeof message.content == "string") {
                entry.content[propertyToModify] = sanitizeHTML(message.content);
                entry.container.appendChild(entry.content);
            }
            else {
                const sanitizedHTML = sanitizeHTML(message.content.main);
                entry.content.appendChild(makeElement("details", void 0, [
                    makeElement("summary", {
                        [propertyToModify]: sanitizedHTML
                    }),
                    (() => {
                        if (Array.isArray(message.content.detail)) {
                            return makeElement("ul", void 0, message.content.detail.map(ele => makeElement("li", { [propertyToModify]: sanitizeHTML(ele) })));
                        }
                        else {
                            return makeElement("span", { [propertyToModify]: sanitizeHTML(message.content.detail) });
                        }
                    })()
                ]));
                entry.container.append(entry.content);
            }
            return entry.container;
        }
        function createConsoleEntry(content, type) {
            return {
                content,
                timestamp: game.currentUpdate,
                type
            };
        }
        function closeOnEscape(event) {
            if (event.key == "Escape")
                Console.close();
        }
        function createLogger(modes) {
            const loggingFn = ((message, altMode) => {
                pushAndLog(createConsoleEntry(message, altMode ? modes.alt : modes.default), false);
            });
            loggingFn.raw = (message, altMode) => {
                pushAndLog(createConsoleEntry(message, altMode ? modes.alt : modes.default), true);
            };
            return loggingFn;
        }
        const Console = {
            get isOpen() { return opened; },
            set isOpen(v) { v ? this.open() : this.close(); },
            open() {
                if (opened)
                    this.warn("Console is already open");
                opened = true;
                document.body.appendChild(dom.mainWrapper);
                document.addEventListener("keydown", closeOnEscape);
                dom.input.focus();
            },
            close() {
                if (!opened)
                    this.warn("Console is already closed");
                opened = false;
                dom.mainWrapper.remove();
                document.removeEventListener("keydown", closeOnEscape);
            },
            toggle() {
                this.isOpen = !this.isOpen;
            },
            log: createLogger({ default: MessageType.Log, alt: MessageType.Important }),
            warn: createLogger({ default: MessageType.Warn, alt: MessageType.SevereWarn }),
            error: createLogger({ default: MessageType.Error, alt: MessageType.FatalError }),
            clear() {
                entries.length = 0;
                dom.body.innerHTML = "";
            },
            parseInput(input) {
                if (input.length == 0)
                    return;
                class CommandSyntaxError extends SyntaxError {
                }
                function extractCommandsAndArgs(input) {
                    let current = {
                        name: "",
                        args: [""]
                    };
                    const commands = [current];
                    let parserPhase = "cmd", inString = false;
                    const handlers = {
                        cmd(char) {
                            switch (char) {
                                case " ": {
                                    if (current.name)
                                        parserPhase = "args";
                                    break;
                                }
                                case ";": {
                                    commands.push(current = {
                                        name: "",
                                        args: [""]
                                    });
                                    break;
                                }
                                default: {
                                    current.name += char;
                                }
                            }
                        },
                        args(char) {
                            switch (char) {
                                case " ": {
                                    if (inString) {
                                        current.args[current.args.length - 1] += char;
                                    }
                                    else {
                                        current.args.push("");
                                    }
                                    break;
                                }
                                case ";": {
                                    if (inString) {
                                        current.args[current.args.length - 1] += char;
                                    }
                                    else {
                                        commands.push(current = {
                                            name: "",
                                            args: [""]
                                        });
                                        parserPhase = "cmd";
                                    }
                                    break;
                                }
                                case "\"": {
                                    if (inString) {
                                        current.args.push("");
                                    }
                                    else if (current.args.at(-1).length) {
                                        // If we encounter a " in the middle of an argument
                                        // such as `say hel"lo`
                                        throw new CommandSyntaxError("Unexpected double-quote (\") character found.");
                                    }
                                    inString = !inString;
                                    break;
                                }
                                default: {
                                    current.args[current.args.length - 1] += char;
                                }
                            }
                        }
                    };
                    for (const char of input)
                        handlers[parserPhase](char);
                    if (inString)
                        throw new CommandSyntaxError("Unterminated string argument");
                    return commands
                        .filter(command => command.name)
                        .map(command => {
                        command.args = command.args.filter(arg => arg.trim().length);
                        return command;
                    });
                }
                try {
                    extractCommandsAndArgs(input)
                        .forEach(command => {
                        const target = commands.get(command.name);
                        if (target) {
                            target.run(command.args);
                        }
                        else {
                            const alias = aliases.get(command.name);
                            if (alias) {
                                this.parseInput(alias);
                            }
                            else {
                                Console.error(`Unknown command '${command.name}'`);
                            }
                        }
                    });
                }
                catch (e) {
                    if (e instanceof CommandSyntaxError) {
                        Console.error({ main: "Parsing error", detail: e.message });
                    }
                    else {
                        // forward the error
                        throw e;
                    }
                }
            }
        };
        Console.log("Press escape to close the console.");
        dom.button.addEventListener("click", event => {
            if (event.button)
                return;
            Console.close();
        });
        document.addEventListener("keydown", e => {
            if (!Console.isOpen)
                return;
            if (!["ArrowDown", "ArrowUp"].includes(e.code))
                return;
            navigating = true;
            const direction = e.code == "ArrowDown" ? 1 : -1, nodeLength = autocompleteNodes.length;
            autocompleteNodes[activeIndex ?? 0].blur();
            autocompleteNodes[activeIndex = activeIndex == undefined ? 0 : ((activeIndex + direction) % nodeLength + nodeLength) % nodeLength].focus();
        });
        dom.input.addEventListener("focus", refreshAutocomplete);
        dom.input.addEventListener("blur", () => navigating || hideAutocomplete());
        function generateAutocompleteNode(match, text) {
            const [before, after] = match
                ? (() => {
                    const indexOf = text.indexOf(match);
                    return [text.substring(0, indexOf), text.substring(indexOf + match.length)];
                })()
                : [text, ""];
            return makeElement("div", {
                tabIndex: 0,
                className: "console-input-autocomplete-entry"
            }, [
                new Text(before),
                makeElement("b", { textContent: match }),
                new Text(after),
            ], {
                mousedown(event) {
                    if (event.button)
                        return;
                    navigating = true;
                },
                click(event) {
                    if (event.button)
                        return;
                    dom.input.value = text;
                    dom.input.focus();
                    navigating = false;
                },
                keydown(event) {
                    if (event.code == "Enter") {
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                        this.dispatchEvent(new MouseEvent("click", { button: 0 }));
                    }
                }
            });
        }
        let autocompleteNodes = [], activeIndex, navigating = false;
        function refreshAutocomplete() {
            const inputValue = dom.input.value, historyCandidates = inputHistory.filter(s => s.includes(inputValue)), commandCandidates = [...commands.values()].filter(s => s.name.includes(inputValue)).map(v => v.name);
            if (historyCandidates.length + commandCandidates.length) {
                dom.autocomplete.style.display = "";
                dom.wrapper.style.borderBottomLeftRadius = "0";
                dom.wrapper.style.borderBottomRightRadius = "0";
                const historyAutocomplete = historyCandidates.map(generateAutocompleteNode.bind(void 0, inputValue)), commandAutocomplete = commandCandidates.map(generateAutocompleteNode.bind(void 0, inputValue)), includeDivider = historyCandidates.length * commandCandidates.length != 0, nodes = [...historyAutocomplete];
                includeDivider && nodes.push(makeElement("div", { className: "console-autocomplete-divider" }));
                nodes.push(...commandAutocomplete);
                dom.autocomplete.replaceChildren(...autocompleteNodes = nodes);
            }
            else
                hideAutocomplete();
        }
        function hideAutocomplete() {
            dom.autocomplete.style.display = "none";
            dom.wrapper.style.borderBottomLeftRadius = "";
            dom.wrapper.style.borderBottomRightRadius = "";
            dom.autocomplete.innerHTML = "";
            activeIndex = undefined;
        }
        dom.input.addEventListener("input", refreshAutocomplete);
        dom.input.addEventListener("keypress", event => {
            if (event.key == "Enter") {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const input = dom.input.value;
                if (input) {
                    inputHistory.add(input);
                    Console.log.raw(`> ${input}`);
                    try {
                        Console.parseInput(input);
                    }
                    catch (e) {
                        Console.error({ main: "An internal error occurred", detail: `${e}` }, true);
                    }
                    dom.input.value = "";
                    refreshAutocomplete();
                }
            }
        });
        return Console;
    };
})();
//# sourceMappingURL=console.js.map