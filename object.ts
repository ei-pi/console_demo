interface Point2D {
    x: number;
    y: number;
}

abstract class GameObject {
    readonly #position: Point2D;
    get position() { return this.#position; }

    readonly #velocity: Point2D;
    get velocity() { return this.#velocity; }

    angle: number;

    readonly #game: Game;
    get game() { return this.#game; }

    constructor(game: Game, position: Point2D, angle: number) {
        this.#game = game;
        this.#position = position;
        this.#velocity = { x: 0, y: 0 };
        this.angle = angle;
    }

    abstract draw(ctx: CanvasRenderingContext2D): void;

    update(deltaTime: number) {
        this.#position.x += this.#velocity.x * deltaTime;
        this.#position.y += this.#velocity.y * deltaTime;
    }
}

class Player extends GameObject {
    static readonly #baseSpeed = 0.5;
    static get baseSpeed() { return Player.#baseSpeed; }

    static readonly #size = 25;
    static get size() { return Player.#size; }

    static readonly #maxHealth = 100;
    static get maxHealth() { return Player.#maxHealth; }

    readonly #inventory = new Inventory(this);
    get inventory() { return this.#inventory; }

    get activeItemIndex() { return this.#inventory.activeItemIndex; }
    setActiveItemIndex(v: number) {
        const result = this.#inventory.setActiveItemIndex(v);

        if (result)
            this.attacking = false;

        return result;
    }

    get previousItemIndex() { return this.#inventory.previousItemIndex; }

    health = 100;

    get activeItem() { return this.#inventory.getItem(this.#inventory.activeItemIndex); }

    readonly #movement = {
        up: false,
        left: false,
        down: false,
        right: false,
    };
    get movement() { return this.#movement; }

    attacking = false;

    get isMoving() {
        return (
            (this.#movement.up || this.#movement.down)
            && (this.#movement.up !== this.#movement.down)
        ) || (
                (this.#movement.left || this.#movement.right)
                && (this.#movement.left !== this.#movement.right)
            );
    }

    readonly #hands = {
        left: {
            x: 0.85,
            y: 0.75
        },
        right: {
            x: -0.85,
            y: 0.75
        }
    };

    constructor(game: Game, position: Point2D, angle: number) {
        super(game, position, angle);
    }

    override draw(ctx: CanvasRenderingContext2D) {
        ctx.save();

        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);

        const item = this.activeItem,
            drawBody = () => {
                ctx.beginPath();
                ctx.strokeStyle = "";
                ctx.fillStyle = "hsl(25deg, 50%, 50%)";
                ctx.arc(0, 0, Player.#size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            },
            drawHands = () => {
                const reference = item ? item.schema.hands : this.#hands;

                for (const hand of [reference.left, reference.right]) {
                    ctx.beginPath();
                    ctx.strokeStyle = "hsl(25deg, 50%, 30%)";
                    ctx.lineWidth = 2;
                    ctx.fillStyle = "hsl(25deg, 50%, 50%)";
                    ctx.arc(hand.x * Player.#size, hand.y * Player.#size, 0.35 * Player.#size, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            },
            drawItem = () => {
                if (item) {
                    const schema = item.schema,
                        width = 0.3 * Player.#size;

                    ctx.beginPath();
                    ctx.strokeStyle = schema.strokeColor;
                    ctx.lineWidth = 2;
                    ctx.fillStyle = schema.fillColor;
                    ctx.roundRect(
                        schema.position.x * Player.#size - width / 2,
                        schema.position.y * Player.#size,
                        width,
                        schema.length * Player.#size,
                        width / 2
                    );
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            };

        drawBody();
        drawHands();
        drawItem();

        ctx.restore();
    }

    override update(deltaTime: number): void {
        const velocity = { x: 0, y: 0 };

        if (this.#movement.up) velocity.y += -1;
        if (this.#movement.left) velocity.x += -1;
        if (this.#movement.down) velocity.y += 1;
        if (this.#movement.right) velocity.x += 1;

        if (velocity.x * velocity.y != 0) {
            velocity.x *= Math.SQRT1_2;
            velocity.y *= Math.SQRT1_2;
        }

        velocity.x *= Player.#baseSpeed;
        velocity.y *= Player.#baseSpeed;

        this.velocity.x = velocity.x;
        this.velocity.y = velocity.y;

        super.update(deltaTime);
    }
}

class Bullet extends GameObject {
    #source: GunSchema;
    get source() { return this.#source; }

    #spawnTime = this.game.currentUpdate;

    #length: number;

    constructor(game: Game, position: Point2D, angle: number, shooter: Gun) {
        super(game, position, angle);

        this.#source = shooter.schema;
        this.game.addObject(this);

        let collisionCount = 0,
            newLength = this.#source.range * Player.size;

        this.#length = newLength;

        // not efficient
        for (
            const object of
            [...game.objects.values()]
                .sort(
                    (a, b) =>
                        (
                            (a.position.x - this.position.x) ** 2 +
                            (a.position.y - this.position.x) ** 2
                        ) - (
                            (b.position.x - this.position.x) ** 2 +
                            (b.position.y - this.position.x) ** 2
                        )
                )
        ) {
            if (object !== shooter.owner && object instanceof CircleObstacle) {
                const collision = segmentCircle(
                    {
                        start: this.position,
                        end: {
                            x: this.position.x + this.#length * Math.cos(this.angle + Math.PI / 2),
                            y: this.position.y + this.#length * Math.sin(this.angle + Math.PI / 2)
                        }
                    },
                    {
                        origin: object.position,
                        radius: object.radius
                    }
                );

                if (collision !== null) {
                    newLength = Math.sqrt(collision.map(pt => (pt.x - this.position.x) ** 2 + (pt.y - this.position.y) ** 2).sort((a, b) => a - b)[0]);
                    object.health -= this.#source.damage;

                    if (object.health <= 0)
                        game.removeObject(object);

                    if (++collisionCount >= this.#source.tracerProperties.maxHits) {
                        this.#length = newLength;
                        break;
                    }
                }
            }
        }

    }

    draw(ctx: CanvasRenderingContext2D) {
        const tracerProperties = this.#source.tracerProperties;

        ctx.save();

        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = tracerProperties.fillColor;
        ctx.strokeStyle = tracerProperties.strokeColor;
        ctx.lineWidth = tracerProperties.strokeWidth;
        ctx.globalAlpha = tracerProperties.opacity((this.game.currentUpdate - this.#spawnTime) / tracerProperties.lifetime);

        ctx.beginPath();

        ctx.rect(
            -tracerProperties.width / 2 * Player.size,
            0,
            tracerProperties.width * Player.size,
            this.#length
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    override update(deltaTime: number): void {
        if (this.game.currentUpdate - this.#spawnTime > this.#source.tracerProperties.lifetime) {
            this.game.removeObject(this);
        }
    }
}

// also stolen from the sandbox
type LineSegment = { start: Point2D, end: Point2D; };

function segmentCircle(segment: LineSegment, circle: { origin: Point2D, radius: number; }): [Point2D] | [Point2D, Point2D] | null {
    // Based on https://www.desmos.com/calculator/r9w38kskse
    const [
        minX,
        maxX,
        minY,
        maxY
    ] = [
            Math.min(segment.start.x, segment.end.x),
            Math.max(segment.start.x, segment.end.x),
            Math.min(segment.start.y, segment.end.y),
            Math.max(segment.start.y, segment.end.y)
        ];

    // Bounds check
    if (
        maxX < circle.origin.x - circle.radius ||
        minX > circle.origin.x + circle.radius ||
        maxY < circle.origin.y - circle.radius ||
        minY > circle.origin.y + circle.radius
    ) return null;

    function validate<T extends Point2D[]>(points: T) {
        const hits = points.filter(point =>
            (minX <= point.x && point.x <= maxX)
            && (minY <= point.y && point.y <= maxY)
        ) as T;

        return hits.length != 0 ? hits : null;
    }

    switch (true) {
        case (segment.start.x == segment.end.x): { // Vertical line
            const dx = segment.start.x - circle.origin.x,
                discriminant = circle.radius * circle.radius - dx * dx;

            switch (Math.sign(discriminant)) {
                case -1: return null;
                case 0: return validate<[Point2D]>([{ x: segment.start.x, y: circle.origin.y }]);
                case 1: {
                    const root = Math.sqrt(discriminant);

                    return validate<[Point2D, Point2D]>([
                        { x: segment.start.x, y: circle.origin.y + root },
                        { x: segment.start.x, y: circle.origin.y - root }
                    ]);
                }
            }
        }
        case (segment.start.y == segment.end.y): { // Horizontal line
            const dy = segment.start.y - circle.origin.y,
                discriminant = circle.radius * circle.radius - dy * dy;

            switch (Math.sign(discriminant)) {
                case -1: return null;
                case 0: return validate<[Point2D]>([{ x: circle.origin.x, y: segment.start.y }]);
                case 1: {
                    const root = Math.sqrt(discriminant);

                    return validate<[Point2D, Point2D]>([
                        { x: circle.origin.x + root, y: segment.start.y },
                        { x: circle.origin.x - root, y: segment.start.y },
                    ]);
                }
            }
        }
        default: { // Any other line
            const slope = (segment.end.y - segment.start.y) / (segment.end.x - segment.start.x),
                dx = segment.start.x - circle.origin.x,
                dy = segment.start.y - circle.origin.y,
                squareSlopeP1 = slope * slope + 1,
                subDis = slope * dx - dy,
                discriminant = squareSlopeP1 * circle.radius * circle.radius - subDis * subDis,
                sign = Math.sign(discriminant);

            switch (sign) {
                case -1: return null;
                case 0:
                case 1: {
                    const b = segment.start.y - slope * segment.start.x,
                        numerator = (circle.origin.x - slope * (b - circle.origin.y)),
                        x = numerator / squareSlopeP1,
                        f = (x: number) => slope * x + b;

                    if (sign == 0) return validate<[Point2D]>([{ x: x, y: f(x) }]);

                    const root = Math.sqrt(discriminant),
                        x1 = (numerator + root) / squareSlopeP1,
                        x2 = (numerator - root) / squareSlopeP1;

                    return validate<[Point2D, Point2D]>([
                        { x: x1, y: f(x1) },
                        { x: x2, y: f(x2) }
                    ]);
                }
            }
        }
    }

    return null;
}