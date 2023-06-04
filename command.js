"use strict";
const commands = new Map(), aliases = new Map();
class Command {
    #name;
    get name() { return this.#name; }
    #executor;
    run(args = []) { this.#executor.call(this.#game, ...args); }
    #game;
    #inverse;
    get inverse() { return this.#inverse; }
    #info;
    get info() { return this.#info; }
    static createInvertiblePair(name, on, off, game, infoOn, infoOff) {
        const plus = new Command(`+${name}`, on, game, infoOn), minus = new Command(`-${name}`, off, game, infoOff ?? infoOn);
        plus.#inverse = minus;
        minus.#inverse = plus;
    }
    constructor(name, executor, game, info) {
        this.#name = name;
        this.#executor = executor.bind(game);
        this.#game = game;
        this.#info = info;
        if (this.#info.signatures.length == 0)
            console.warn(`No signatures given for command '${this.#name}'`);
        else {
            this.#info.signatures.forEach((signature, index) => {
                const args = signature.args;
                if (args.length != 0) {
                    for (let i = 0, l = args.length - 2, arg = args[0]; i < l; i++, arg = args[i]) {
                        if (arg.rest) {
                            arg.rest = false;
                            console.warn(`Found illegal rest argument in info string of command '${this.#name}' (signature ${index}, argument '${arg.name}', position ${i})`);
                        }
                    }
                    if (new Set(args.map(arg => arg.name)).size != args.length) {
                        console.error(`Found duplicate argument names in info string of command '${this.#name}' (signature ${index})`);
                    }
                }
            });
        }
        if (commands.has(this.#name)) {
            console.warn(`Overwriting command '${this.#name}'`);
        }
        commands.set(this.#name, this);
    }
}
var MessageType;
(function (MessageType) {
    MessageType["Log"] = "log";
    MessageType["Important"] = "important";
    MessageType["Warn"] = "warn";
    MessageType["SevereWarn"] = "severe_warn";
    MessageType["Error"] = "error";
    MessageType["FatalError"] = "fatal_error";
})(MessageType || (MessageType = {}));
function setupBuiltIns(game) {
    const createMovementCommand = (name) => {
        Command.createInvertiblePair(name, function () {
            const player = this.player;
            if (!player)
                return;
            player.movement[name] = true;
        }, function () {
            const player = this.player;
            if (!player)
                return;
            player.movement[name] = false;
        }, game, {
            short: `Moves the player in the '${name}' direction.`,
            long: `Starts moving the player in the '${name}' direction when invoked.`,
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }, {
            short: `Halts the player's movement in the '${name}' direction.`,
            long: `Stops moving the player in the '${name}' direction when invoked.`,
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        });
    }, createSlotCommand = (slot) => {
        new Command(`slot${slot}`, function () {
            const player = this.player;
            if (!player)
                return;
            player.setActiveItemIndex(slot);
        }, game, {
            short: `Attempts to switch to the item in slot ${slot}.`,
            long: `When invoked, an attempt to swap to slot ${slot} will be made.`,
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        });
    };
    createMovementCommand("up");
    createMovementCommand("left");
    createMovementCommand("down");
    createMovementCommand("right");
    for (let i = 0; i < Inventory.maxSlots; i++)
        createSlotCommand(i);
    new Command("last_item", function () {
        const player = this.player;
        if (!player)
            return;
        player.setActiveItemIndex(player.previousItemIndex);
    }, game, {
        short: "Attempts to switch to the last item the player deployed.",
        long: "When invoked, the player's last active slot will be switched to, if possible.",
        signatures: [
            {
                args: [],
                noexcept: true
            }
        ]
    });
    Command.createInvertiblePair("attack", function () {
        const player = this.player;
        if (!player || player.attacking)
            return;
        player.attacking = true;
        player.activeItem?.useItem();
    }, function () {
        const player = this.player;
        if (!player || !player.attacking)
            return;
        player.attacking = false;
    }, game, {
        short: "Starts attacking",
        long: "When invoked, the player will start trying to attack as if the attack button was held down. Does nothing if the player isn't attacking.",
        signatures: [
            {
                args: [],
                noexcept: true
            }
        ]
    }, {
        short: "Stops attacking",
        long: "When invoked, the player will stop trying to attack, as if the attack button was released. Does nothing if the player isn't attacking.",
        signatures: [
            {
                args: [],
                noexcept: true
            }
        ]
    });
    new Command("toggle_console", function () {
        game.console.toggle();
    }, game, {
        short: "Toggles the game's console.",
        long: "When invoked, this command will close the console if it is open, and will open the console if it is closed.",
        signatures: [
            {
                args: [],
                noexcept: true
            }
        ]
    });
    new Command("clear", function () {
        game.console.clear();
    }, game, {
        short: "Clears the console",
        long: "When invoked, the game console's contents will be erased.",
        signatures: [
            {
                args: [],
                noexcept: true
            }
        ]
    });
    new Command("echo", function (...messages) {
        game.console.log((messages ?? []).join(" "));
    }, game, {
        short: "Echoes whatever is passed to it.",
        long: "When invoked with any number of arguments, the arguments will be re-printed to the console in same order they were given.",
        signatures: [
            {
                args: [
                    {
                        name: "args",
                        optional: true,
                        type: ["string[]"],
                        rest: true
                    }
                ],
                noexcept: true
            }
        ]
    });
    /*
        Attempt to convert "simple" key names, like "e",
        into the correct KeyboardEvent.code name ("KeyE")
    */
    function attemptConversionToCode(key) {
        if (key.length != 1)
            return key;
        if (key.match(/[a-z]/i))
            key = `Key${key.toUpperCase()}`;
        if (key.match(/[0-9]/i))
            key = `Digit${key}`;
        // never happens
        return key;
    }
    new Command("bind", function (key, query) {
        if (key === undefined || query === undefined) {
            Console.error(`Error: expected 2 arguments, received ${arguments.length}`);
            return;
        }
        key = attemptConversionToCode(key);
        (keybinds.get(key) ?? (() => {
            const array = [];
            keybinds.set(key, array);
            return array;
        })()).push(query);
    }, game, {
        short: "Binds an input to an action.",
        long: "Given the name of an input (such as a key or mouse button) and a console query, this command establishes a new link between the two.<br>"
            + `For alphanumeric keys, simply giving the ley as-is (e.g. "a", or "1") will do. However, keys with no textual representation, or that represent`
            + `punctuation will have to given by name, such as "Enter" or "Period".<br>`
            + `Remember that if your query contains spaces, you must enclose the whole query in double quotes ("") so that it is properly parsed.`,
        signatures: [
            {
                args: [
                    {
                        name: "input",
                        type: ["string"]
                    },
                    {
                        name: "query",
                        type: ["string"]
                    }
                ],
                noexcept: true
            }
        ]
    });
    new Command("unbind", function (key) {
        if (key === undefined) {
            Console.error(`Error: expected an argument, received none`);
            return;
        }
        key = attemptConversionToCode(key);
        keybinds.delete(key);
    }, game, {
        short: "Removes all actions from a given input.",
        long: "Given the name of an input (refer to the <code>bind</code> command for more information on naming), this command removes all actions bound to it.",
        signatures: [
            {
                args: [
                    {
                        name: "input",
                        type: ["string"]
                    }
                ],
                noexcept: true
            }
        ]
    });
    new Command("unbind_all", function () {
        keybinds.clear();
    }, game, {
        short: "Removes all keybinds.",
        long: "When invoked, all inputs will have their actions removed, <em>except the key bound to the console, which cannot be unbound.</em>",
        signatures: [
            {
                args: [],
                noexcept: true
            }
        ]
    });
    new Command("alias", function (name, query) {
        if (name === undefined || query === undefined) {
            Console.error(`Error: expected 2 arguments, received ${arguments.length}`);
            return;
        }
        if (commands.has(name)) {
            Console.error(`Error: cannot override built-in command '${name}'`);
            return;
        }
        aliases.set(name, query);
    }, game, {
        short: "Creates a shorthand for a console query.",
        long: "This command's first argument is the alias' name, and its second is the query; an <em>alias</em> is created, which can be called like any "
            + "other command. When the alias is called, the query said alias is bound to will be executed, as if it had been entered into the console manually.<br>"
            + `If the query contains spaces, remember to wrap the whole thing in double quotes ("") so it can be parsed correctly. An alias' name cannot match that `
            + "of a built-in command. However, if it matches an existing alias, said existing alias will be replaced by the new one.",
        signatures: [
            {
                args: [
                    {
                        name: "alias_name",
                        type: ["string"]
                    },
                    {
                        name: "query",
                        type: ["string"]
                    }
                ],
                noexcept: false
            }
        ]
    });
    new Command("list_binds", function (key) {
        key = key && attemptConversionToCode(key);
        const logBinds = (actions, key) => {
            Console.log({
                main: `Actions bound to input '${key}'`,
                detail: actions.map(bind => bind instanceof Command ? bind.name : bind).join("\n")
            });
        };
        if (key) {
            const actions = keybinds.get(key);
            if (actions) {
                logBinds(actions, key);
            }
            else {
                Console.error(`The input '${key}' hasn't been bound to any action.`);
            }
        }
        else {
            keybinds.forEach(logBinds);
        }
    }, game, {
        short: "Lists all the actions bound to a key, or all the keys and their respective actions.",
        long: "If this command is invoked without an argument, all keys which have an action to them will be printed, along with "
            + "the actions bound to each respective key. If it is invoked with an input's name, then only the actions bound to that input "
            + "will be shown, if any.",
        signatures: [
            {
                args: [],
                noexcept: true
            },
            {
                args: [
                    {
                        name: "input_name",
                        type: ["string"]
                    }
                ],
                noexcept: false
            }
        ]
    });
    new Command("list_alias", function (name) {
        if (name === undefined) {
            Console.error(`Error: expected an argument, received none`);
            return;
        }
        const alias = aliases.get(name);
        if (alias) {
            Console.log(`Alias '${name}' is defined as '${alias}'`);
        }
        else {
            Console.error(`No alias named '${name}' exists`);
        }
    }, game, {
        short: "Gives the definition of an alias.",
        long: "When given the name of an alias, if that alias exists, this command will print the query associated with it.",
        signatures: [
            {
                args: [
                    {
                        name: "alias_name",
                        type: ["string"]
                    }
                ],
                noexcept: false
            }
        ]
    });
    new Command("help", function (name) {
        if (name === undefined) {
            Console.log({ main: "List of commands", detail: [...commands.keys()] });
            Console.log({ main: "List of aliases", detail: [...aliases.keys()] });
        }
        else {
            const command = commands.get(name);
            if (!command) {
                Console.error(`Cannot find command named '${name}'`);
                return;
            }
            const info = command.info;
            Console.log({
                main: info.short,
                detail: [
                    info.long,
                    ...info.signatures.map(signature => {
                        const noexcept = signature.noexcept ? `<span class="command-desc-noexcept">noexcept</span> ` : "", commandName = `<span class="command-desc-cmd-name">${command.name}</span>`, args = signature.args.length
                            ? " " + signature.args.map(arg => `<em>${arg.optional ? "..." : ""}${arg.name}${arg.optional ? "?" : ""}: ${arg.type.map(type => `<span class="command-desc-arg-type">${type}</span>`).join(" | ")}</em>`).join(", ")
                            : "";
                        return `<code>${noexcept + commandName + args}</code>`;
                    })
                ]
            });
        }
    }, game, {
        short: "Displays help about a certain command, or a list of commands and aliases.",
        long: "If given the name of a command, this command logs that command's help info. If not given an argument, this command "
            + "logs a list of all defined commands and aliases. Passing the name of an alias to this command results in an error.",
        signatures: [
            {
                args: [],
                noexcept: true
            },
            {
                args: [
                    {
                        name: "command_name",
                        type: ["string"]
                    }
                ],
                noexcept: false
            }
        ]
    });
}
//# sourceMappingURL=command.js.map