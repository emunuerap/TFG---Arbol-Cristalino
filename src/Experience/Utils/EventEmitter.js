export default class EventEmitter {
    constructor() {
        this.callbacks = {}
        this.callbacks.base = {}
    }

    on(_names, callback) {
        const names = this.resolveNames(_names)
        names.forEach((name) => {
            const nameCallback = this.callbacks[name] || (this.callbacks[name] = [])
            nameCallback.push(callback)
        })
        return this
    }

    off(_names) {
        const names = this.resolveNames(_names)
        names.forEach((name) => {
            if (name in this.callbacks) {
                delete this.callbacks[name]
            }
        })
    }

    trigger(_name, _args) {
        const name = this.resolveNames(_name)[0]
        const args = _args || []
        const nameCallback = this.callbacks[name]
        if (nameCallback) {
            nameCallback.forEach((callback) => callback(...args))
        }
    }

    resolveNames(_names) {
        return (typeof _names === 'string' ? _names.split(' ') : _names).filter(name => name !== '')
    }
}