"use strict";
// I literally just stole this from the sandbox lmfao
/**
 * Creates an element, along with any properties, children and listeners one wishes to add
 * @template K The element's tag name
 * @param key The element's tag name
 * @param properties An object specifying the element's properties. All properties are optional
 * @param children Either a single string, a single Node, or an array of both. (`HTMLElement` extends `Node`)
 * @param listeners An object whose keys correspond to the event's name (same as the first argument to `HTMLElement.addEventListener`)
 * and whose values are either a single listener or an array of them, with each listener being one for the chosen event.
 * (same as the second argument to `HTMLElement.addEventListener`)
 * @returns The created element
 */
function makeElement(key, properties, children, listeners) {
    const element = document.createElement(key);
    for (const [key, value] of Object.entries(properties ?? {})) {
        if (typeof element[key] == "object")
            for (const [objKey, objVal] of Object.entries(value))
                element[key][objKey] = objVal;
        else
            element[key] = value;
    }
    children && element.append(...[children].flat().filter(v => v !== void 0));
    for (const [event, lis] of Object.entries(listeners ?? {}))
        for (const li of [lis].flat())
            if (typeof li == "function")
                element.addEventListener /* forgive me for I have sinned */(event, li);
            else
                element.addEventListener /* anyScript */(event, li.callback, li.options);
    return element;
}
const createUIManager = (game) => {
    /**
     * An object for managing UI elements
     */
    const UIManager = new class UIManager {
        /**
         * The `HTMLDivElement` containing the UI
         */
        #container = makeElement("div", {
            id: "ui-container",
            className: "ui"
        });
        /**
         * A Map whose values correspond to this manager's elements and whose keys are their corresponding names
         */
        #elements = new Map;
        /**
         * A Map whose values correspond to this manager's elements and whose keys are their corresponding names
         */
        get elements() { return this.#elements; }
        /**
         * UI elements marked as `core` won't be cleared when calling `UIManager.clear()` unless `force` is set to `true`.
         */
        get core() { return [...this.#elements.values()].filter(e => e.core); }
        /**
         * Whether or not the HUD is currently being hidden
         */
        #hidden = false;
        /**
         * Whether or not the HUD is currently being hidden
         */
        get hidden() { return this.#hidden; }
        /**
         * Adds UI elements to the manager
         * @param items An array of `UIElement`s to append
         * @param items[].instantiateImmediately - Whether to call the element's `create` function immediately
         */
        add(...items) {
            for (let i = 0, l = items.length; i < l; i++) {
                const item = items[i];
                this.#elements.set(item.name, item);
                item.instantiateImmediately && item.create?.(this.#container);
                delete item.instantiateImmediately;
            }
        }
        /**
         * Removes the item with the specified name
         * @param item The UI element's name
         */
        remove(item) {
            this.#elements.delete(item);
        }
        /**
         * Removes all UI elements not marked as `core`.
         *
         * If `force` is set to true, `core` elements will be cleared as well
         */
        clear(force) {
            this.#elements = new Map([...this.#elements.entries()].filter(([_, e]) => {
                if (force || !e.core)
                    return e.destroy();
                return true;
            }));
        }
        /**
         * Calls every UI element's `create` method.
         *
         * This method does nothing if there is no `Player` present
         */
        create() {
            if (!game.player)
                return;
            document.body.appendChild(this.#container);
            for (const [, element] of this.#elements)
                element.create?.(this.#container);
            if (this.#hidden)
                this.#container.style.display = "none";
        }
        /**
         * Calls every UI element's `update` method
         *
         * This method does nothing if there is no `Player` present
         */
        update() {
            if (!game.player || this.#hidden)
                return;
            for (const [, element] of this.#elements)
                element.update?.(this.#container);
        }
        /**
         * Shows HUD elements that haven't otherwise been hidden
         */
        show() {
            this.#hidden = false;
            this.#container.style.display = "";
        }
        /**
         * Hides every HUD element from view
        */
        hide() {
            this.#hidden = true;
            this.#container.style.display = "none";
        }
        /**
         * Shows the HUD if it is currently hidden and hides it otherwise
         */
        toggle() {
            (this.#hidden = !this.#hidden) ? this.hide() : this.show();
        }
    };
    {
        UIManager.add((() => {
            const ui = {
                container: void 0,
                inner: void 0,
                mainBar: void 0,
                lagBar: void 0,
            };
            ui.container = makeElement("div", {
                id: "ui-hp-cont",
                className: "ui hp"
            }, [
                ui.inner = makeElement("div", {
                    id: "ui-hp-inner-cont",
                    className: "ui hp"
                }, [
                    ui.lagBar = makeElement("div", {
                        id: "ui-hp-bar-lag",
                        className: "ui hp"
                    }),
                    ui.mainBar = makeElement("div", {
                        id: "ui-hp-bar",
                        className: "ui hp"
                    })
                ])
            ]);
            let health;
            return {
                name: "HP",
                create(container) { container.appendChild(ui.container); },
                update() {
                    const player = game.player, percent = player.health == Infinity ? 100 : Math.max(0, 100 * player.health / Player.maxHealth);
                    if (player.health != health) {
                        health = player.health;
                        ui.mainBar.style.width = ui.lagBar.style.width = `${percent}%`;
                        ui.mainBar.style.animation = "";
                        if (percent == 100) {
                            ui.mainBar.style.backgroundColor = "";
                        }
                        else if (percent <= 25) {
                            ui.mainBar.style.backgroundColor = "#F00";
                            ui.mainBar.style.animation = "HP-critical 0.5s ease-out alternate infinite";
                        }
                        else if (percent <= 75) {
                            ui.mainBar.style.backgroundColor = `rgb(255, ${255 * (percent - 25) / 50}, ${255 * (percent - 25) / 50})`;
                        }
                        else {
                            ui.mainBar.style.backgroundColor = "#FFF";
                        }
                    }
                },
                destroy() { ui.container.remove(); },
                core: true
            };
        })(), (() => {
            const slots = Inventory.maxSlots, ui = { container: void 0 };
            for (let i = 0; i < slots; i++)
                ui[`slot${i}`] = void 0;
            function makeSlot(id) {
                const slot = {
                    container: void 0,
                    itemImage: void 0,
                    number: void 0,
                    itemName: void 0
                };
                slot.container = makeElement("div", {
                    id: `ui-inv-main-slot${id}`,
                    className: "ui inv-main inv-main-slot"
                }, [
                    slot.number = makeElement("div", {
                        className: "ui inv-main-slot-number",
                        textContent: `${id + 1}`
                    }),
                    slot.itemImage = makeElement("img", {
                        className: "ui inv-main-slot-img"
                    }),
                    slot.itemName = makeElement("div", {
                        className: "ui inv-main-slot-name"
                    })
                ], {
                    mousedown(ev) { ev.stopPropagation(); },
                    click(ev) {
                        if (!ev.button && game.player) {
                            ev.stopPropagation();
                            game.player.setActiveItemIndex(id);
                        }
                    }
                });
                return slot;
            }
            ui.container = makeElement("div", {
                id: "ui-inv-main-cont",
                className: "ui inv-main"
            }, new Array(slots).fill(0).map((_, i) => (ui[`slot${i}`] = makeSlot(i)).container));
            const cache = new Array(slots).fill("");
            let active, activeChanged = false;
            return {
                name: "inv-main",
                create(cont) {
                    cont.appendChild(ui.container);
                },
                update() {
                    const player = game.player, inventory = player.inventory;
                    activeChanged = false;
                    if (active != player.activeItemIndex) {
                        active = player.activeItemIndex;
                        activeChanged = true;
                    }
                    for (let i = 0; i < slots; i++) {
                        const slot = ui[`slot${i}`], item = inventory.getItem(i), schema = item?.schema;
                        if (activeChanged) {
                            if (item == player.activeItem)
                                slot.container.classList.add("active");
                            else
                                slot.container.classList.remove("active");
                        }
                        cache[i] = schema?.name ?? "";
                        if (item) {
                            slot.itemImage.src = schema.lootImage;
                            slot.itemImage.style.display = "";
                            slot.itemName.textContent = schema.name;
                        }
                        else {
                            slot.container.classList.remove("active");
                            slot.itemImage.style.display = "none";
                            slot.itemImage.style.aspectRatio = "";
                            slot.itemName.textContent = "";
                        }
                    }
                },
                destroy() { ui.container.remove(); },
                core: true
            };
        })());
    }
    return UIManager;
};
//# sourceMappingURL=ui.js.map