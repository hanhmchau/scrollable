export default class Error {
    message?: string;
    errors?: any;

    constructor(message: string, errors: any) {
        this.message = message;
        this.errors = errors;
    }
}
