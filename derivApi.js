class DerivAPIConnector {
    constructor(appId) {
        this.appId = appId;
        this.ws = null;
        this.isConnected = false;
        this.subscribers = {};
        this.currentSymbol = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const endpoint = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
            this.ws = new WebSocket(endpoint);
            
            this.ws.onopen = () => {
                this.isConnected = true;
                if (this.currentSymbol) {
                    this.subscribeTicks(this.currentSymbol, this.subscribers[this.currentSymbol]);
                }
                resolve(true);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.msg_type === 'tick' && data.tick) {
                        const sym = data.tick.symbol;
                        if (this.subscribers[sym]) {
                            this.subscribers[sym](data.tick);
                        }
                    }
                } catch (e) {
                    console.error("Parse error:", e);
                }
            };

            this.ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                reject(err);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                setTimeout(() => this.connect(), 2000);
            };
        });
    }

    subscribeTicks(symbol, callback) {
        this.currentSymbol = symbol;
        this.subscribers[symbol] = callback;
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({ forget_all: 'ticks' }));
            this.ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        }
    }
}
