export class SMACalculator {
    private queue: number[] = [];
    private total = 0;
    constructor(private n: number) {}

    push(value: number) {
        this.queue.push(value);
        this.total += value;
        if (this.queue.length > this.n) {
            const removedEl = this.queue.shift();
            this.total -= removedEl;
        }
    }

    getSimpleMovingAvg() {
        if (this.queue.length < this.n) {
            return 0;
        }
        return +(this.total / this.queue.length).toFixed(2);
    }
}
