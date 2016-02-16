/**
 * Created by Администратор on 16.02.2016.
 */
/****************************************************************************
 * Chat
 * *******/
clicklife.controller("ChatCtrl", function($scope,Auth, $routeParams,callService, music, $location,$timeout, giftsService, image, Video){
    function reconnectEvent(){
        $timeout(function () {
            // 0 ms delay to reload the page.
            initDialog();
        }, 0);
    };
    io.socket.on("reconnect",reconnectEvent);


    $('.modal-trigger').leanModal();
    jqComponents.initTogler();
    $(".fancybox_iframe").fancybox();
    $timeout(function(){
        $('.dropdown-button').dropdown();
    },false,100);
    // initialization //
    var initDialog = function(){
        io.socket.get("/dialog/get_messages",{
            dialog: $scope.dialogId
        }, function(data){
            giftsService.getAll(function(gifts){
                $timeout(function() {
                    $("#messages").animate({
                        scrollTop: $("#messages .container").height()
                    },400);
                    $('.materialboxed').materialbox();
                }, 10, false);
                data.messages = data.messages.reverse();
                $scope.messages = data.messages;
                $scope.dialogIcon = data.dialogIcon;
                $scope.dialogName = data.dialogName;
                $scope.showPreloader = false;
                $scope.gifts = gifts;
                angular.forEach($scope.messages, function(m,k){
                    if(m.from.id != Auth.getUser().id && m.readed == 0){
                        io.socket.get("/dialog/update_message_status",{
                            message: m.id,
                            dialog: $scope.dialogId
                        }, function(){
                            $timeout(function(){
                                $scope.messages[k].readed = 1;
                            },0);
                        });
                    }
                });
                $scope.$apply();
                $timeout(function(){
                    $('.materialboxed').materialbox();
                    $(".fancybox_iframe").fancybox();
                },500,false);
            });
        });
        // on Type
        io.socket.on("typing", function(data){
            //console.log("typing",data);
            if(data.dialog == $scope.dialogId  && data.name != Auth.getUser().fio){
                $scope.typestatus = 1;
                $scope.typeName = data.name;
                $scope.$apply();
                setTimeout(function(){
                    $scope.typestatus = 0;
                    $scope.$apply();
                },2500);
            }
        });
        // on new message
        io.socket.on("new_message", function(data){
            if(data.dialog == $scope.dialogId){
                if(data.from.id !=  Auth.getUser().id){
                    //update readed status, msg = incoming
                    io.socket.get("/dialog/update_message_status",{
                        message: data.id,
                        dialog: $scope.dialogId
                    }, function(){});
                    data.readed = 1;
                    music.setStreamType(music.STREAM_SYSTEM);
                    music.play("new_message");
                }
                $scope.messages.push(data);
                if($scope.messages.length > 100){
                    $scope.messages.slice(99);
                }
                $scope.showPreloader = false;
                $scope.$apply();
                $timeout(function() {
                    $("#messages").animate({
                        scrollTop: $("#messages .container").height()
                    },400);
                    $('.materialboxed').materialbox();
                    $(".fancybox_iframe").fancybox();
                }, 10, false);
            }else{
                // do nothink
            }
        });
        // on update_message_status
        io.socket.on("update_message_status", function(data){
            angular.forEach($scope.messages, function(msg,key){
                if(msg.id == data.message){
                    $scope.messages[key].readed = 1;
                    $scope.$apply();
                }
            });
        });

    };
    $scope.showPreloader = true;
    $scope.dialogId = $routeParams.dialogId;
    $scope.uId = Auth.getUser().id;
    $scope.messages = [];
    $scope.dialogName = "";
    $scope.dialogIcon = "";
    $scope.typeName = "";
    $scope.typestatus = 0; // 1 = печатает, 0 = не видно
    $scope.messageText = "";
    $scope.gifts = [];
    $scope.emojiMessage={};
    initDialog();
    var keyups = 0;
    $scope.imTyping = function($event){
        keyups++;
        if((keyups % 8 == 0) || keyups == 1){
            io.socket.get("/dialog/typing",{dialog: $scope.dialogId}, function(){
                //console.log("keyup sent");
            });
        }

    };
    $scope.sendMessage = function(){
        if(!$scope.emojiMessage.messagetext){
            return false;
        }
        $(".drag-target").remove();
        $scope.showPreloader = true;
        var msg = $scope.emojiMessage.messagetext;
        $scope.emojiMessage = {};
        $scope.emojiMessage.replyToUser = $scope.sendMessage;
        io.socket.get("/dialog/add_message",{
            dialog: $scope.dialogId,
            text:msg
        }, function(){

        });

    };
    $scope.emojiMessage.replyToUser = $scope.sendMessage;
    $scope.sendGift = function(gift){

    };
    // send image message to server
    $scope.sendImage = function(){
        jqComponents.toggler().hide();
        $scope.showPreloader = true;
        $scope.$apply();
        image.getPicture(function(imgUrl){
            if(!imgUrl){
                return false;
            }
            image.uploadPhoto(imgUrl,"http://clicklife.link:1337/dialog/upload_photo",{
                from: Auth.getUser().id,
                dialog: $scope.dialogId,
            },function(){
                //success
                $scope.showPreloader = false;
                $scope.$apply();
            });
        });
    };
    // send video message
    $scope.sendVideo = function(){
        jqComponents.toggler().hide();
        $scope.showPreloader = true;
        $scope.$apply();
        Video.capture(function(mediafiles){
            $scope.showPreloader = true;
            Video.uploadVideo(mediafiles[0],"http://clicklife.link:1337/dialog/upload_video",{
                from: Auth.getUser().id,
                dialog: $scope.dialogId,
            }, function(){
                $scope.showPreloader = false;
                $scope.$apply();
            });
        });
    };
    // send audio message
    $scope.sendAudio = function(){
        jqComponents.toggler().hide();
        $scope.showPreloader = true;
        $scope.$apply();
        music.capture(function(mediafiles){
            $scope.showPreloader = true;
            music.uploadAudio(mediafiles[0],"http://clicklife.link:1337/dialog/upload_audio",{
                from: Auth.getUser().id,
                dialog: $scope.dialogId,
            }, function(){
                $scope.showPreloader = false;
                $scope.$apply();
            });
        });
    };
    // request to call
    $scope.callRequest = function(){
        $scope.showPreloader = true;
        io.socket.get("/dialog/call_request",{
            dialog: $scope.dialogId,
            initiator: Auth.getUser().id
        }, function(data){
            if(data.error || data.user.is_online == '0'){
                music.setStreamType(music.STREAM_RING);
                music.play("new_message");

                $scope.showPreloader = false;
                $scope.$apply();
                return Materialize.toast("Пользователь вышел из сети");
            }
            callService.callTo(data.user);
        });
    };

    $scope.$on('$destroy', function() {
        io.socket.off('update_message_status', update_message_status);
    });
});

/***
 * Dialog Between two users
 */
clicklife.controller("DialogsCtrl", function($scope, $location){});
