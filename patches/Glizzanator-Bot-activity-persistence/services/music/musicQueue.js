class MusicQueue {
    constructor({ maxSize = 50 } = {}) {
        this.maxSize = maxSize;
        this.items = [];
        this.current = null;
    }

    add(track) {
        if (this.items.length >= this.maxSize) {
            throw new Error(`Music queue is full. Max size is ${this.maxSize}.`);
        }

        this.items.push({
            ...track,
            queuedAt: Date.now()
        });

        return this.items.length;
    }

    next() {
        this.current = this.items.shift() || null;
        return this.current;
    }

    clear() {
        this.items = [];
        this.current = null;
    }

    remove(index) {
        if (index < 0 || index >= this.items.length) return null;
        return this.items.splice(index, 1)[0] || null;
    }

    snapshot() {
        return {
            current: this.current,
            upcoming: [...this.items],
            size: this.items.length
        };
    }
}

module.exports = MusicQueue;
