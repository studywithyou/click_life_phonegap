/**
 * Created by Администратор on 18.02.2016.
 */
/***
 * Dialogs list
 */
clicklife.controller("DialogsCtrl", function($scope, $location, Auth, $timeout, music){
    function onMessageEvent(data){
        music.setStreamType(music.STREAM_SYSTEM);
        if(data.type == 'win'){
            music.play("money_add");
        }else{
            if(data.type == "gift"){
                music.play("gift");
            }else{
                music.play("new_message");
            }
        }
         angular.forEach($scope.dialogs, function(dialog, key){
             if(data.dialogId == dialog.dialog){
                 $scope.dialogs[key].message_text = data.text;
                 $scope.dialogs[key].user_avatar = data.from.avatar;
                 $scope.dialogs[key].user_fio = data.from.fio;
                 $scope.dialogs[key].m_created = data.createdAt;
             }
         });
    }
    $scope.$on('$destroy', function() {
        io.socket.off("reconnect",reconnectEvent);
        io.socket.off("dialog_created", dialogAppended);
        io.socket.off("new_message", onMessageEvent);
        io.socket.off("contacts", contactsUpdateEvent);
    });
    $scope.dialogs = [];
    $scope.showPreloader = true;
    $scope.contactsCount = 0;
    $scope.groupsCount = 0;
    $scope.me = Auth.getUser();
    // get user dialogs
    function getDialogs(){

        io.socket.get("/dialogusers/query_user_dialogs",{user:Auth.getUser().id}, function recievedDialogs(response){
            console.log("dialogs",response);
            $scope.$apply(function(){
                $scope.dialogs = response;
                $scope.showPreloader = false;
            });
        });
        io.socket.on("new_message", onMessageEvent);
        //subscribe user socket to dialogusers
        io.socket.on("dialog_created", function dialogAppended(data){
            console.log("Dialog append",data);
            music.setStreamType("system");
            music.play("incoming_chat");
            cordova.plugins.notification.local.schedule({
                title: "Вас добавили в диалог",
                text: "Вас присореденили в новый диалог",
                data: { event:'chat_added',action:"#dialog/"+data.dialog}
            });
            window.showToast("Вас добавили в новый диалог",'long','center');
            $scope.$apply(function(){
                $scope.dialogs.push(data);
            });
        });

    }
    function getCounts(){
        // this should be updated
        io.socket.get("/contacts/get_count_by_user",{user: Auth.getUser().id},function(data){
            $scope.$apply(function(){
                $scope.contactsCount = data.count;
            });
        });
        io.socket.on("contacts", function contactsUpdateEvent(data){
            $scope.$apply(function(){
                $scope.contacts = [];
            });
            //music.setStreamType("system");
            //music.play("login");
            io.socket.get("/contacts/"+data.id, function(added_contact){
                cordova.plugins.notification.local.schedule({
                    title: "Вас добавили!",
                    text: "К Вам добавился "+added_contact.contact.fio,
                    sound: "file://music/incoming_contact.mp3",
                    icon: added_contact.contact.avatar,
                    badge: 1,
                    data: { event:'contact_added',action:"#contacts" }
                });
                $scope.$apply(function(){
                    $scope.contactsCount++;
                });
            });
        });
        //this is no need to update
        io.socket.get("/contact_groups/get_count_by_user",{user: Auth.getUser().id}, function(data){
            $scope.$apply(function(){
                $scope.groupsCount = data.count;
            });
        });
    }

    getDialogs();
    getCounts();

    $scope.openDialog = function(dialog){
        if(!dialog.group_id){
            window.location.href="#dialog/"+dialog;
        }
        window.location.href="#groupchat/"+group_id;
    }
});
