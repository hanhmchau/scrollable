export class LMWACalculator {
    private queue: number[] = [];
    private totalWeight = 0;
    constructor(private n: number) {
        this.totalWeight = (n * (n + 1)) / 2;
    }

    push(value: number) {
        this.queue.push(value);
        if (this.queue.length > this.n) {
            this.queue.shift();
        }
    }

    getSimpleMovingAvg() {
        if (this.queue.length < this.n) {
            return 0;
        }
        const sum = this.queue.reduce(
            (prev, curr, i) => prev + curr * (this.n - i),
            0
        );
        return +(sum / this.totalWeight).toFixed(2);
    }
}
