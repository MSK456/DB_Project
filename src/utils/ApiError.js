// By using this code we will be able to handle and get errors in the same way as the responses are listened.
class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something went wrong.",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack){
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructer)
        }
    }
}

export { ApiError }