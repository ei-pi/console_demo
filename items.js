"use strict";
class Inventory {
    static #maxSlots = 5;
    static get maxSlots() { return this.#maxSlots; }
    #items = [];
    #activeItemIndex = -1;
    get activeItemIndex() { return this.#activeItemIndex; }
    setActiveItemIndex(slot) {
        const isValid = Inventory.isValidSlot(slot);
        if (isValid && slot != this.#activeItemIndex && this.#items[slot] !== undefined)
            [this.#previousItemIndex, this.#activeItemIndex] = [this.#activeItemIndex, slot];
        return isValid;
    }
    #previousItemIndex = -1;
    get previousItemIndex() { return this.#previousItemIndex; }
    #owner;
    get owner() { return this.#owner; }
    static isValidSlot(slot) {
        return slot % 1 == 0 && 0 <= slot && slot < Inventory.#maxSlots;
    }
    constructor(owner) {
        this.#owner = owner;
    }
    appendItem(item) {
        item = item instanceof InventoryItem ? item : item.instantiate(this.#owner);
        if (this.#items.includes(item))
            return;
        for (let slot = 0; slot < Inventory.#maxSlots; slot++)
            if ((this.#items[slot] ??= item) == item) {
                if (this.#activeItemIndex == -1)
                    this.#activeItemIndex = slot;
                else if (this.#previousItemIndex == -1)
                    this.#previousItemIndex = slot;
                break;
            }
    }
    removeItem(slot) {
        if (!Inventory.isValidSlot(slot))
            return;
        this.#items[slot] = undefined;
    }
    setItem(slot, item) {
        if (!Inventory.isValidSlot(slot))
            return;
        this.#items[slot] = item;
    }
    getItem(slot) {
        if (!Inventory.isValidSlot(slot))
            return;
        return this.#items[slot];
    }
}
class InventoryItem {
    #schema;
    get schema() { return this.#schema; }
    #owner;
    get owner() { return this.#owner; }
    constructor(schema, owner) {
        this.#schema = schema;
        this.#owner = owner;
    }
}
class Gun extends InventoryItem {
    #lastUse = 0;
    get lastUse() { return this.#lastUse; }
    #shots = 0;
    #useItemNoDelay() {
        const owner = this.owner, schema = this.schema;
        if (!owner.attacking) {
            return;
        }
        if (schema.fireMode == "burst" && this.#shots >= (schema.burstProps?.shotsPerBurst ?? 1)) {
            this.#shots = 0;
            return;
        }
        this.#lastUse = owner.game.currentUpdate;
        ++this.#shots;
        const sin = Math.sin(owner.angle + Math.PI / 2), cos = Math.cos(owner.angle + Math.PI / 2), muzzlePosition = {
            x: Player.size * ((schema.length + schema.position.y) * cos + schema.position.x * sin) + owner.position.x,
            y: Player.size * ((schema.length + schema.position.y) * sin + schema.position.x * -cos) + owner.position.y
        };
        for (let i = 0; i < schema.bulletCount; i++) {
            const deviation = (Math.random() > 0.5 ? -1 : 1) * Math.random() * Math.PI / 180 * (schema.staticSpread + (owner.isMoving ? schema.movingSpread : 0)), jitter = (schema.tracerProperties.jitter ?? 0) * Player.size, magnitude = Math.random() * jitter, angle = Math.random() * 2 * Math.PI, spawnOffset = jitter ? {
                x: magnitude * Math.cos(angle),
                y: magnitude * Math.sin(angle)
            } : { x: 0, y: 0 };
            new Bullet(owner.game, {
                x: muzzlePosition.x + spawnOffset.x,
                y: muzzlePosition.y + spawnOffset.y
            }, owner.angle + deviation, this);
        }
        if (schema.fireMode != "semi")
            setTimeout(this.#useItemNoDelay.bind(this), schema.fireDelay);
    }
    useItem() {
        const owner = this.owner, schema = this.schema;
        if (owner.game.currentUpdate - this.#lastUse > ((schema.fireMode == "burst" ? schema.burstProps?.burstDelay : undefined) ?? schema.fireDelay)) {
            this.#useItemNoDelay();
        }
    }
}
class ItemSchema {
    #name;
    get name() { return this.#name; }
    #lootImage;
    get lootImage() { return this.#lootImage; }
    #position;
    get position() { return this.#position; }
    #hands;
    get hands() { return this.#hands; }
    #strokeColor;
    get strokeColor() { return this.#strokeColor; }
    #fillColor;
    get fillColor() { return this.#fillColor; }
    #length;
    get length() { return this.#length; }
    constructor(name, lootImage, position, hands, strokeColor, fillColor, length) {
        this.#name = name;
        this.#lootImage = lootImage;
        this.#position = position;
        this.#hands = hands;
        this.#strokeColor = strokeColor;
        this.#fillColor = fillColor;
        this.#length = length;
    }
}
class GunSchema extends ItemSchema {
    #damage;
    get damage() { return this.#damage; }
    #range;
    get range() { return this.#range; }
    #staticSpread;
    get staticSpread() { return this.#staticSpread; }
    #movingSpread;
    get movingSpread() { return this.#movingSpread; }
    #fireDelay;
    get fireDelay() { return this.#fireDelay; }
    #fireMode;
    get fireMode() { return this.#fireMode; }
    #bulletCount;
    get bulletCount() { return this.#bulletCount; }
    #tracerProperties;
    get tracerProperties() { return this.#tracerProperties; }
    #burstProps;
    get burstProps() { return this.#burstProps; }
    constructor(name, lootImage, position, hands, strokeColor, fillColor, length, damage, range, staticSpread, movingSpread, fireDelay, fireMode, bulletCount, tracerProperties, burstProps) {
        super(name, lootImage, position, hands, strokeColor, fillColor, length);
        this.#damage = damage;
        this.#range = range;
        this.#staticSpread = staticSpread;
        this.#movingSpread = movingSpread;
        this.#fireDelay = fireDelay;
        this.#fireMode = fireMode;
        this.#bulletCount = bulletCount;
        this.#tracerProperties = tracerProperties;
        this.#burstProps = burstProps;
    }
    instantiate(owner) {
        return new Gun(this, owner);
    }
}
const Guns = {
    ["AKM"]: new GunSchema("AKM", "./images/akm.png", {
        x: 0,
        y: 1
    }, {
        left: {
            x: 0.1,
            y: 2.9
        },
        right: {
            x: -0.1,
            y: 0.95
        }
    }, "hsl(34deg, 100%, 20%)", "hsl(34deg, 100%, 30%)", 3.15, 35, 2500, 2, 3, 100, "auto", 1, {
        width: 0.15,
        fillColor: "hsl(60deg, 40%, 80%)",
        strokeColor: "#0000",
        strokeWidth: 0,
        lifetime: 400,
        maxHits: 2,
        opacity(t) {
            return t > 1
                ? 0
                : t < 0
                    ? 1
                    : (1 - t) ** 2;
        }
    }),
    ["M37"]: new GunSchema("M37", "./images/m37.png", {
        x: 0,
        y: 1
    }, {
        left: {
            x: 0.1,
            y: 2.8
        },
        right: {
            x: -0.1,
            y: 0.95
        }
    }, "hsl(255deg, 5%, 20%)", "hsl(255deg, 5%, 43%)", 3.3, 20, 1000, 10, 2, 750, "semi", 9, {
        width: 0.1,
        fillColor: "hsl(30deg, 50%, 70%)",
        strokeColor: "#0000",
        strokeWidth: 0,
        lifetime: 300,
        maxHits: 1,
        jitter: 1,
        opacity(t) {
            return t > 1
                ? 0
                : t < 0
                    ? 1
                    : (1 - t) ** 2;
        }
    }),
    ["AWP"]: new GunSchema("AWP", "./images/awp.png", {
        x: 0,
        y: 1
    }, {
        left: {
            x: 0.1,
            y: 3.5
        },
        right: {
            x: -0.1,
            y: 0.95
        }
    }, "hsl(74deg, 28%, 20%)", "hsl(74deg, 28%, 42%)", 4, 120, 10000, 1, 1, 1300, "semi", 1, {
        width: 0.3,
        fillColor: "hsl(120deg, 80%, 60%)",
        strokeColor: "hsl(120deg, 80%, 20%)",
        strokeWidth: 2,
        lifetime: 800,
        maxHits: Infinity,
        opacity(t) {
            return t > 1
                ? 0
                : t < 0
                    ? 1
                    : (1 - t) ** 0.7;
        }
    }),
    ["DEagle"]: new GunSchema("DEagle", "./images/deagle.png", {
        x: 0,
        y: 1
    }, {
        left: {
            x: 0.12,
            y: 0.97
        },
        right: {
            x: -0.1,
            y: 0.95
        }
    }, "hsl(39deg, 100%, 20%)", "hsl(39deg, 100%, 50%)", 2, 55, 1500, 1.5, 3, 200, "semi", 1, {
        width: 0.2,
        fillColor: "hsl(50deg, 90%, 50%)",
        strokeColor: "#0000",
        strokeWidth: 0,
        lifetime: 350,
        maxHits: 1,
        opacity(t) {
            return t > 1
                ? 0
                : t < 0
                    ? 1
                    : (1 - t) ** 1.5;
        }
    }),
    ["M16A4"]: new GunSchema("M16A4", "./images/m16a4.png", {
        x: 0,
        y: 1
    }, {
        left: {
            x: 0.1,
            y: 2.8
        },
        right: {
            x: -0.1,
            y: 0.95
        }
    }, "hsl(0deg, 0%, 20%)", "hsl(0deg, 0%, 40%)", 3.6, 30, 3000, 1, 2, 200 / 3, "burst", 1, {
        width: 0.15,
        fillColor: "hsl(90deg, 40%, 80%)",
        strokeColor: "#0000",
        strokeWidth: 0,
        lifetime: 350,
        maxHits: 2,
        opacity(t) {
            return t > 1
                ? 0
                : t < 0
                    ? 1
                    : (1 - t) ** 2;
        }
    }, {
        shotsPerBurst: 3,
        burstDelay: 300
    })
};
//# sourceMappingURL=items.js.map