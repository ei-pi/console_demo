abstract class Obstacle extends GameObject {
    abstract readonly type: string;

    color: string;
    health = 100;

    constructor(game: Game, position: Point2D, angle: number, color?: string, health?: number) {
        super(game, position, angle);

        this.color = color ?? `hsl(${Math.random() * 360}deg, ${Math.random() * 20 + 20}%, ${Math.random() * 70 + 30}%)`;
        this.health = health ?? Math.random() * 150 + 50;
    }
}

// removed because i didn't feel like writing intersection code for rectangles
// i could've stolen it from the sandbox, but i didn't feel like it
/*
class RectangleObstacle extends Obstacle {
    get type() { return "rectangle"; };

    width: number;
    height: number;

    constructor(position: Point2D, angle: number, color?: string, health?: number, width?: number | [number, number], height?: number | [number, number]) {
        super(position, angle, color);

        if (typeof width == "number") {
            this.width = width;
        } else {
            const rangeSpecified = Array.isArray(width),
                range = rangeSpecified ? width[1] - width[0] : 70,
                min = rangeSpecified ? width[0] : 30;

            this.width = Math.random() * range + min;
        }

        if (typeof height == "number") {
            this.height = height;
        } else {
            const rangeSpecified = Array.isArray(height),
                range = rangeSpecified ? height[1] - height[0] : 70,
                min = rangeSpecified ? height[0] : 30;

            this.height = Math.random() * range + min;
        }
    }

    override draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        ctx.strokeStyle = "";
        ctx.fillStyle = this.color;
        ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
} */

class CircleObstacle extends Obstacle {
    get type() { return "circle"; };

    radius: number;

    constructor(game: Game, position: Point2D, angle: number, color?: string, health?: number, radius?: number | [number, number]) {
        super(game, position, angle, color);

        if (typeof radius == "number") {
            this.radius = radius;
        } else {
            const rangeSpecified = Array.isArray(radius),
                range = rangeSpecified ? radius[1] - radius[0] : 70,
                min = rangeSpecified ? radius[0] : 30;

            this.radius = Math.random() * range + min;
        }
    }

    override draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        ctx.strokeStyle = "";
        ctx.fillStyle = this.color;
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}