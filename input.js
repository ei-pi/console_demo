"use strict";
const keybinds = new Map();
function setupInputs(game) {
    function getKeyFromInputEvent(event) {
        if (event instanceof KeyboardEvent) {
            return event.code;
        }
        if (event instanceof WheelEvent) {
            switch (true) {
                case event.deltaX > 0: return "MWheelRight";
                case event.deltaX < 0: return "MWheelLeft";
                case event.deltaY > 0: return "MWheelDown";
                case event.deltaY < 0: return "MWheelUp";
                case event.deltaZ > 0: return "MWheelForwards";
                case event.deltaZ < 0: return "MWheelBackwards";
            }
            console.error("An unrecognized scroll wheel event was received: ", event);
            return "";
        }
        /* if (event instanceof MouseEvent) { */
        return `Mouse${event.button}`;
        /* } */
    }
    function fireCommands(channel, down) {
        keybinds.get(channel)?.forEach?.(cmd => {
            if (cmd instanceof Command) {
                (down ? cmd : cmd.inverse)?.run();
            }
            else {
                if (cmd.startsWith("+") && !down) {
                    cmd = cmd.replace("+", "-");
                }
                Console.parseInput(cmd);
            }
        });
    }
    let mWheelTimer;
    function handleInput(event) {
        if (event instanceof KeyboardEvent && event.repeat)
            return;
        if (game.console.isOpen)
            return;
        if (!event.metaKey) // don't prevent keyboard shortcuts
            event.preventDefault();
        if (event instanceof KeyboardEvent && event.code == "Backquote") {
            // This is hard-coded so that it can never be unbound
            Console.toggle();
        }
        const key = getKeyFromInputEvent(event);
        if (event instanceof WheelEvent) {
            fireCommands(key, true);
            clearTimeout(mWheelTimer);
            mWheelTimer = window.setTimeout(() => {
                fireCommands(key, false);
                mWheelTimer = undefined;
            }, 50);
        }
        else {
            fireCommands(key, event.type == "keydown" || event.type == "mousedown");
        }
    }
    window.addEventListener("keydown", handleInput);
    window.addEventListener("keyup", handleInput);
    window.addEventListener("mousedown", handleInput);
    window.addEventListener("mouseup", handleInput);
    window.addEventListener("wheel", handleInput);
    keybinds.set("KeyW", [commands.get("+up")]);
    keybinds.set("KeyA", [commands.get("+left")]);
    keybinds.set("KeyS", [commands.get("+down")]);
    keybinds.set("KeyD", [commands.get("+right")]);
    keybinds.set("Digit1", [commands.get("slot0")]);
    keybinds.set("Digit2", [commands.get("slot1")]);
    keybinds.set("Digit3", [commands.get("slot2")]);
    keybinds.set("Digit4", [commands.get("slot3")]);
    keybinds.set("Digit5", [commands.get("slot4")]);
    keybinds.set("KeyQ", [commands.get("last_item")]);
    keybinds.set("Mouse0", [commands.get("+attack")]);
    // keybinds.set("IntlBackslash", [commands.get("toggle_console")!]);
    window.addEventListener("mousemove", event => {
        if (game.console.isOpen)
            return;
        const player = game.player;
        if (!player)
            return;
        player.angle = Math.atan2(Game.halfHeight - event.clientY, Game.halfWidth - event.clientX) + Math.PI / 2;
    });
}
//# sourceMappingURL=input.js.map