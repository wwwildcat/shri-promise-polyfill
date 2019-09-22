(function(local){
    function Promise (handler) {//Конструктор
        try {
            if (typeof(handler) !== 'function') {
                throw new TypeError ('Promise handler is not a function');
            }
            if (!(this instanceof Promise)) {
                throw new TypeError ('Promise constructor requires a \'new\' operator');
            }
            this._executionQueue = [];
            handlePromise(handler, this);
        }
        catch (error) {
            console.log(error.message);
        }
    }

    function handlePromise(handler, promise) {//Коллбэк, с которым создан промис
        function internalResolve (value) {
            resolve(value, promise);
        }
        function internalReject (reason) {
            reject(reason, promise);
        }
        try {
            handler(internalResolve, internalReject);
        } catch (err) {
            internalReject(err);
        }
    }
    
    function resolve (value, promise) {
        if (promise._state === 'pending') { //resolve срабатывает, только если промис еще не выполнен
            if (value instanceof Promise) { //Если в качестве результата получен промис, он обрабатывается
                try {
                    if (value._state === 'pending') { //Если он не выполнен, то он выполняется
                          value.then(function (val) {
                              resolve(val, value);
                          }, function (reas) {
                              reject(reas, value);
                          });
                      }
                      else { //Если он выполнен, то его состояние и результат выполнения присваиваются текущему промису
                          promise._result = value._result;
                          promise._state = value._state;
                      }
                } catch (error) {
                    reject (error, promise)
                }
            }
            else { //Если результат не является промисом, то он записывается в соответствующее свойство, и состояние промиса меняется на 'fulfilled'
                promise._state = 'fulfilled';
                promise._result = value;
            }
            if (promise._executionQueue.length) { //Если в очереди есть обработчики, они асинхронно выполняются один за другим
                promise._executionQueue.forEach(function (executor) {
                    setTimeout(execute(executor, 'fulfilled'));
                });
                promise._executionQueue = []; //Очередь обработчиков очищается
            }
        }
    }
    
    function reject (reason, promise) {
        if (promise._state === 'pending') {
            promise._result = reason;
            promise._state = 'rejected';
            if (promise._executionQueue.length) {
                promise._executionQueue.forEach(function (executor) {
                    setTimeout(execute(executor, 'rejected'));
                });
                promise._executionQueue = [];
            }
        }
    }
    
    function execute(executor, key) { //Выполнение обработчиков из then
        try {
            if (typeof(executor[key]) === 'function') {//Если onFulfilled или onRejected является функцией, то вычисляется ее значение
                executor.currentPromise._result = executor[key](executor.currentPromise._result);
            }
            resolve(executor.currentPromise._result, executor.newPromise);//Значение передается в следующий промис
        } catch(error) {
            reject(error, executor.newPromise);
        }
    }

    Promise.prototype = {
        constructor: Promise,
        _state: 'pending', //Состояние промиса
        _result: undefined, //Результат выполнения промиса
        _executionQueue: [], //Очередь обработчиков
        then : function (onFulfilled, onRejected) {
            var promise = this;
            var newPromise = new Promise(function() {});
            var newExecutor = {
                currentPromise: promise, //Текущий промис
                newPromise: newPromise, //Следующий промис
                fulfilled: onFulfilled, //Функция для обработки успешного результата
                rejected: onRejected //Функция для обработки ошибки
            };
            if (promise._state !== 'pending') { //Если текущий промис выполнен, его результат асинхронно обрабатывается
                setTimeout(execute(newExecutor, promise._state));
                if (promise._result instanceof Promise) { //Если результат промиса является промисом, то он выполняется
                    resolve(promise._result, newPromise);
                }
                else {
                    newPromise._result = promise._result; //Если не является, то он записывается в результат выполнения следующего промиса
                } 
            }
            else { //Если текущий промис не выполнен, обработчики ставятся в очередь
                promise._executionQueue.push(newExecutor);
                newPromise._result = promise;
            }
            return newPromise;
        },
        'catch': function (onRejected) {
            return this.then(null, onRejected);
        }
    }

    //Проверка нативных промисов
    if (!local['Promise']) {
        local['Promise'] = Promise;
    }
})(this);