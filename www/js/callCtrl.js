/**
 * Created by Администратор on 16.02.2016.
 */
/*** call ***/
clicklife.controller("CallCtrl", function($scope,$rootScope,$location,$interval,$timeout, $routeParams, music, callService, msg,Auth){
    callService.nowOnCall = true;
    cordova.plugins.phonertc.setVideoView({
        containerParams:{
            size:[10,10],
            position:[10,10]
        },
        local: false,
    });
    var duplicateMessages = [];
    $scope.isCalling = ($routeParams.isCalling == '1') ? true: false;
    $scope.callInProgress = false;
    $scope.contactName = $routeParams.contactName;
    $scope.currentName = Auth.getUser().username;
    $scope.muted = false;
    $scope.mic_muted = false;
    $scope.toggleMic = function(){
        if($scope.mic_muted){
            music.muteMicrophone(false);
            $scope.mic_muted = false;
        }else{
            $scope.mic_muted = true;
            music.muteMicrophone(true);
        }
    };
    $scope.toggleMute = function () {
        $scope.muted = !$scope.muted;
        Object.keys($scope.streams).forEach(function (contact) {
            var session = $scope.streams[contact];
            session.streams.audio = !$scope.muted;
            session.renegotiate();
        });
    };
    $scope.contactData= {};
    $scope.call_timer = 0;
    $scope.answered = false;
    $scope.timer = {
        ti:"",
        start: function(){
            $scope.timer.ti = $interval(function(){
                $timeout(function(){
                    $scope.call_timer++;
                },1);
            },1000,1000);
        },
        stop: function(){
            $interval.cancel($scope.timer.ti);
        }
    };


    // all call sessions
    $scope.sessions = {};
    io.socket.get("/user/get_data_by_uname",{uname: $scope.contactName}, function(data){
        $scope.$apply(function(){
            $scope.contactData = data;
        });
    });
    if($scope.isCalling){
        //caller is me
        console.log("I`m caller sending session request by firstTime");
        msg.emit('sendMessage', $routeParams.contactName, { type: 'call' });
        music.setStreamType("ring");
        music.play("outcoming_call",true, 500);

    }else{
        if(!$scope.callInProgress){
            // incoming call
            console.log("looks like its incoming call)))");
            music.setStreamType("ring");
            music.play("incoming_call",true, 500);
        }
    }

    $scope.contactIsBusy = function(name){
        window.showToast("Пользователь "+name+" не может взять трубку");
        if($scope.callInProgress){ return false; }

        if($scope.isCalling && name == $scope.contactName){
            //если это контакт которому звонили, и других нету - звонок завершен
            music.stop("outcoming_call");
            music.setStreamType("ring");
            music.play("call_busy",0);
            callService.nowOnCall = false;
            $location.path("/contacts");
        }
    };

    $scope.callEnded = function(reason){
        music.stopAll();
        //will calls on call will be end
        window.showToast(reason,1000);
        music.setStreamType("ring");
        music.play("call_busy",0);
        $location.path("/contacts");
    }

    $scope.callAnswered = function(){
        $scope.timer.start();
    };
    // to answer INCOMING call
    $scope.answer = function () {
        music.stop("incoming_call");
        music.stop("outcoming_call");
        if ($scope.callInProgress) {
            console.log("You cannot answer, call is in progress now");
            return;
        }
        $scope.callInProgress = true;
        call(false, $routeParams.contactName);
        $scope.callAnswered();
        setTimeout(function () {
            //cordova.plugins.phonertc.hideVideoView();
            console.log('Incoming session ACCEPTED sending answer');
            msg.emit('sendMessage', $routeParams.contactName, { type: 'answer' });
        }, 1500);
    };
    $scope.ignore = function () {
        var contactNames = Object.keys($scope.sessions);
        if(contactNames.length > 0) {
            $scope.sessions[contactNames[0]].disconnect();
            console.log("I have "+contactNames.length+" sessions. rejecting "+contactNames[0]+" ... : call session.disconnect();");
        } else {
            music.stopAll();
            msg.emit('sendMessage', $routeParams.contactName, { type: 'ignore' });
            console.log($routeParams.contactName+" called, but i was rejected, leaving call state");
            $location.path("/contacts");
        }
    };
    $scope.endCall = function () {
        Object.keys($scope.sessions).forEach(function (contact) {
            $scope.sessions[contact].close();
            delete $scope.sessions[contact];
            console.log("I have some sessions. Rejecting "+contact+" ... : call session.close();");
        });
    };

    /*** go to dialog ***/
        // if call in progress ends call, else send ignore key
    $scope.goToDialog = function(){
        //location.href="#chat/"+user.contact.id;
        window.showToast("Подождите...",560);
        io.socket.get("/dialog/join",{ user: $scope.contactData.id}, function(data){
            //console.log(data);
            if($scope.callInProgress){
                Object.keys($scope.sessions).forEach(function (contact) {
                    $scope.sessions[contact].close();
                    delete $scope.sessions[contact];
                    console.log("I have some sessions. Rejecting "+contact+" ... : call session.close();");
                });
            }else{
                var contactNames = Object.keys($scope.sessions);
                if(contactNames.length > 0) {
                    $scope.sessions[contactNames[0]].disconnect();
                    console.log("I have "+contactNames.length+" sessions. rejecting "+contactNames[0]+" ... : call session.disconnect();");
                } else {
                    msg.emit('sendMessage', $routeParams.contactName, { type: 'ignore' });
                    console.log($routeParams.contactName+" called, but i was rejected, leaving call state");
                }
            }
            music.stopAll();
            location.href="#dialog/"+data.dialog;
        });
    };
    function call(isInitiator, contactName) {
        console.log(new Date().toString() + ': calling to ' + contactName + ', isInitiator: ' + isInitiator);

        if($scope.sessions[contactName]){

            return  console.warn("Cannot call to user "+ contactName + " session already connected, BREAK CALL");

        }


        var config = {
            isInitiator: isInitiator,
            turn: {
                host: 'turn:clicklife.link:3478',
                username: 'admin',
                password: '123'
            },
            streams: {
                audio: true,
                video: false
            }
        };

        var session = new cordova.plugins.phonertc.Session(config);

        session.on('sendMessage', function (data) {
            msg.emit('sendMessage', contactName, {
                type: 'phonertc_handshake',
                data: JSON.stringify(data)
            });
        });

        session.on('answer', function () {
            //cordova.plugins.phonertc.hideVideoView();
        });

        session.on('disconnect', function () {
            if ($scope.sessions[contactName]) {
                delete $scope.sessions[contactName];
            }

            if (Object.keys($scope.sessions).length === 0) {
                msg.emit('sendMessage', contactName, { type: 'ignore' });
                $location.path("/contacts");
            }
        });

        session.call();
        $scope.sessions[contactName] = session;
    }
    function onMessageReceive (data) {
        //console.log("Recieved_locally",data);
        var name = data.from;
        var message = data.message;
        if(message.type == "answer"){
            $scope.$apply(function () {
                music.stop("incoming_call");
                music.stop("outcoming_call");
                $scope.callInProgress = true;
                $scope.callAnswered();
            });
            var allSessions = Object.keys($scope.sessions);
            if (allSessions.length !== 0) {
                console.log("Having a Group call, "+allSessions.length+" sessions active");
                msg.emit('sendMessage', name, {
                    type: 'add_to_group',
                    contacts: allSessions,
                    isInitiator: false
                });
            }
            if ($scope.sessions[name]) {
                console.log("Session named: "+name+" already connected, recieved his answer, DELETING");
                $scope.sessions[name].close();
                delete $scope.sessions[name];
            }else{
                console.log("type: Answer: Call as initiator with session:" +name);
                call(true, name);
            }
        }else{
            if(message.type == "ignore"){
                var len = Object.keys($scope.sessions).length;
                if (len > 0) {
                    if ($scope.sessions[name]) {
                        $scope.sessions[name].close();
                        delete $scope.sessions[name];
                        console.log("OnIgnore: Session named: "+name+" closed and deleted");
                    }
                    if (Object.keys($scope.sessions).length === 0) {
                        console.log("Not having any more sessions, should leave call");
                        $timeout(function(){
                            $scope.callEnded("Пользователь отклонил звонок");
                        },0);
                    }
                } else {
                    console.log("Ignore recieved from "+name+" but all sessions empty");
                    $timeout(function(){
                        $scope.callEnded("Пользователь отклонил звонок");
                    },0);
                }
            }else{
                if(message.type == "phonertc_handshake"){
                    if (duplicateMessages.indexOf(message.data) === -1) {
                        if($scope.sessions[name]){
                            $scope.sessions[name].receiveMessage(JSON.parse(message.data));
                            duplicateMessages.push(message.data);
                        }else{
                            console.log("HShake recieved from "+name+" There no one session with this name");
                        }
                    }
                }else{
                    if(message.type == "add_to_group"){
                        console.log("GroupInviteRecieved from "+ name);
                        message.contacts.forEach(function (contact) {
                            if($scope.sessions[contact]){
                                console.log("Already have session with name "+ contact+ " : ONGroupCallStatement");
                            }else{
                                call(message.isInitiator, contact);
                                console.log("Call to "+contact+ "groupCall");
                                if (!message.isInitiator) {
                                    $timeout(function () {
                                        msg.emit('sendMessage', contact, {
                                            type: 'add_to_group',
                                            contacts: [$scope.currentName],
                                            isInitiator: true
                                        });
                                    }, 1500);
                                }
                            }

                        });
                    }else{
                        if(message.type == "busy"){
                            console.log("I tried to call user "+name+ "but he is busy now, close session");
                            $scope.contactIsBusy(name);
                        }else{
                            console.log("Unknown TYPE: ",message.type);
                        }
                    }
                }
            }
        }

    }
    io.socket.on('messageReceived', onMessageReceive);
    $scope.$on('$destroy', function() {
        console.log("Destroy started: leaving from socket room");
        music.stopAll();
        music.play("call_ended",false);
        io.socket.off('messageReceived', onMessageReceive);
    });
});
