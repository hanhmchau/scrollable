export default class Error {
    message?: string;
    info?: any;

    constructor(message: string, info?: any) {
        this.message = message;
        this.info = info;
    }
}
