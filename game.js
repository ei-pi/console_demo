"use strict";
class Game {
    static #constructing = false;
    static #instance;
    static getInstance() { return this.#instance ??= (Game.#constructing = true, new Game()); }
    #canvas;
    get canvas() { return this.#canvas; }
    #player = new Player(this, { x: 0, y: 0 }, 0);
    get player() { return this.#player; }
    #gameLoop;
    #currentUpdate = Date.now();
    get currentUpdate() { return this.#currentUpdate; }
    #camera = {
        x: Game.halfWidth,
        y: Game.halfHeight
    };
    static get halfWidth() { return window.innerWidth / 2; }
    static get halfHeight() { return window.innerHeight / 2; }
    #objects = new Set();
    get objects() { return this.#objects; }
    #console = createConsole(this);
    get console() { return this.#console; }
    #uiManager = createUIManager(this);
    get uiManager() { return this.#uiManager; }
    constructor() {
        if (!Game.#constructing)
            throw new TypeError("Cannot instantiate this class directly.");
        this.#canvas = document.querySelector("canvas#main") ?? (() => { throw new Error("Cannot find game canvas"); })();
        const resize = () => {
            this.#canvas.width = window.innerWidth;
            this.#canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", resize);
        resize();
        this.#uiManager.create();
        setupInputs(this);
        this.#update();
        Game.#constructing = false;
    }
    addObject(object) {
        if (object == this.#player)
            return;
        this.#objects.add(object);
    }
    removeObject(object) {
        if (object == this.#player)
            return;
        this.#objects.delete(object);
    }
    generateRandomObjects() {
        for (let i = 1; Math.random() > 0.05 || i < 10; Math.random() > 0.2 && i++) {
            this.addObject(new CircleObstacle(this, (() => {
                const angle = Math.random() * Math.PI * 2, distance = 70 * (i + Math.random());
                return {
                    x: distance * Math.cos(angle),
                    y: distance * Math.sin(angle)
                };
            })(), Math.random() * Math.PI * 2));
        }
    }
    #update() {
        const can = this.#canvas, ctx = can.getContext("2d"), now = Date.now(), deltaTime = now - this.#currentUpdate;
        this.#currentUpdate = now;
        ctx.clearRect(0, 0, can.width, can.height);
        ctx.save();
        this.#camera = {
            x: Game.halfWidth - (this.#player?.position.x ?? 0),
            y: Game.halfHeight - (this.#player?.position.y ?? 0)
        };
        ctx.translate(this.#camera.x, this.#camera.y);
        this.#player?.draw(ctx);
        this.#player?.update(deltaTime);
        for (const object of this.#objects) {
            object.draw(ctx);
            object.update(deltaTime);
        }
        ctx.restore();
        this.#uiManager.update();
        this.#gameLoop = window.requestAnimationFrame(this.#update.bind(this));
    }
    pause() {
        window.cancelAnimationFrame(this.#gameLoop);
    }
    resume() {
        this.#currentUpdate = Date.now();
        this.#update();
    }
}
//# sourceMappingURL=game.js.map