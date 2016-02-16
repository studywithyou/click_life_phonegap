
/****************************************************************************
 Contacts
 *********/
clicklife.controller("ContactsCtrl", function($scope,$route,$routeParams,music,$timeout, Auth, $location, callService){
    io.socket.on("reconnect",function(){

        $timeout(function () {
            // 0 ms delay to reload the page.
            $route.reload();
        }, 0);
    });
    $('ul.tabs').tabs();

    var w = $( window ).width() * 0.80;
    if(w > 500){
        w=500;
    }
    $(".button-collapse").sideNav({
        menuWidth: w,
        closeOnClick: true
    });
    $('.modal-trigger').leanModal();
    $scope.contacts  = [];
    $scope.showPreloader = true;
    $scope.groups = [];
    $scope.online_users = [];
    $scope.requestNumber = "";
    $scope.search = [];
    $scope.search_string = "";
    $scope.me = Auth.getUser();
    $scope.dialogsCount = ($scope.me.dialogs)?$scope.me.dialogs:0;
    $scope.groupname = "";
    $scope.groupdescription = "";
    $scope.groupicon = "";
    $scope.editableGroup = "";
    $scope.editableUser = "";
    $scope.userGroup = "";
    $('select').material_select();
    if($routeParams.isGroups && $routeParams.isGroups == '1'){
        $('ul.tabs').tabs('select_tab', 'groups');
    }
    $scope.initController = function(){
        $scope.showPreloader = true;
        io.socket.get("/contacts/get_by_user",{user: Auth.getUser().id}, function(data){
            $scope.$apply(function(){
                console.log(data, "Contacts initialized");
                $scope.showPreloader = false;
                $scope.contacts = data;
            });
        });
        io.socket.get("/contacts/get_groups_by_user",{user: Auth.getUser().id}, function(gData){
            $scope.$apply(function(){
                $scope.groups = gData;
            });
        });
        io.socket.on("user", function contactUpdateEvent(msg){
            console.log("userEvent", msg, $scope.contacts);
            angular.forEach($scope.contacts, function(row, k){
                if(row.contact.id == msg.data.id){
                    if(msg.data.is_online != $scope.contacts[k].contact.is_online){
                        if(msg.data.is_online == '1'){
                            music.setStreamType("ring");
                            music.play("contact_added");
                            // window.plugin.notification.local.add({ text: 'Пользователь появился в сети', title:msg.data.fio + "))"  });
                        }else{
                            music.setStreamType("ring");
                            music.play("logoff");
                            // window.plugin.notification.local.add({ text: 'Пользователь вышел из сети',title:msg.data.fio+ "(("  });
                        }
                    }
                    $scope.contacts[k].contact = msg.data;
                    $scope.$apply();
                }
            });
        });
        io.socket.get("/dialog/get_count_by_user",{user: Auth.getUser().id},function(data){
            console.log(data);
            $scope.$apply(function(){
                $scope.dialogsCount = data.count;
            });

        });
        $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
            $timeout(function(){
                $('.dropdown-button').dropdown();
            },false,100);
        });
    };
    //создание контакта
    $scope.addContact = function(){
        window.plugins.PickContact.chooseContact(function (contactInfo) {
            setTimeout(function () { // use time-out to fix iOS alert problem
                // alert(contactInfo.displayName + " " + contactInfo.emailAddress + " " + contactInfo.phoneNr );
                io.socket.get("/contacts/add_contact",{
                    email: contactInfo.emailAddress,
                    phone: contactInfo.phoneNr,
                    user: Auth.getUser().id
                }, function(data){
                    if(data.error && data.found == '3'){
                        return alert(data.error);
                    }

                    if(data.error && data.found =='0'){
                        //запрос контактов
                        $scope.requestNumber = data.phone;
                        $scope.$apply();
                        return jQuery('#modal1').openModal();
                    }

                    $scope.$apply(function(){
                        if(data.created.contact.is_online == '1'){
                            music.setStreamType("ring");
                            music.play("contact_added");
                            // window.plugin.notification.local.add({ text: 'Пользователь появился в сети', title:data.created.contact.fio + "))"  });
                        }else{
                            music.setStreamType("ring");
                            music.play("logoff");
                            // window.plugin.notification.local.add({ text: 'Пользователь вышел из сети',title:data.created.contact.fio+ "(("  });
                        }
                        Materialize.toast("Контакт добавлен",1000);
                        $scope.contacts.push(data.created);
                    });
                });
            }, 0);
        });
    };
    //запрос контакта
    $scope.requestContact = function(){
        if($scope.requestNumber == ""){
            return "";
        }
        io.socket.get("/contacts/request_contact",{
            from: Auth.getUser().fio,
            to: $scope.requestNumber
        },function(data){
            $scope.requestNumber = "";
            return Materialize.toast("Ваш запрос отправлен",2000);
        });
    };

    $scope.search_users = function(){
        io.socket.get("/user/search",{q: $scope.search_string}, function(results){
            $scope.search_string = "";
            var r = [];

            for(var i in results){
                if(results[i].id == Auth.getUser().id){
                    continue;
                }
                for(var k in $scope.contacts){
                    if($scope.contacts[k].contact.id == results[i].id){
                        results[i] = false;
                    }
                }
                if(results[i]){
                    r.push(results[i]);
                }
            }
            if(!results){
                return Materialize.toast("Ничего не найдено!",1000);
            }
            $scope.search = r;
            $scope.$apply();
        });
    };
    //add from search
    $scope.addFromSearch = function(user, index){
        $scope.search = [];
        var checked = true;
        for(var i in $scope.contacts){
            if($scope.contacts[i].contact.id == user.id){
                checked = false;
            }
        }
        if(!checked){
            Materialize.toast("Контакт уже есть в Вашем списке",1000);
            return false;
        }
        io.socket.get("/contacts/add_contact_by_id", {contact: user.id, user: Auth.getUser().id}, function(data){
            if(data.error){
                return alert(data.error);
            }else{
                $scope.$apply(function(){
                    if(data.created.contact.is_online == '1'){
                        music.setStreamType("ring");
                        music.play("contact_added");
                        // window.plugin.notification.local.add({ text: 'Пользователь появился в сети', title:data.created.contact.fio + "))"  });
                    }else{
                        // window.plugin.notification.local.add({ text: 'Пользователь вышел из сети',title:data.created.contact.fio+ "(("  });
                        music.setStreamType("ring");
                        music.play("logoff");
                    }
                    $scope.contacts.push(data.created);
                    Materialize.toast("Контакт добавлен",1000);
                });
            }
        });
    };

    /*** Add froup **/
    $scope.addGroup = function(){
        if(!$scope.groupname || !$scope.groupdescription){
            return Materialize.toast("Заполните название и описание группы",1000);
        }
        if($scope.editableGroup){
            io.socket.get("/contacts/edit_group",{
                name: $scope.groupname,
                description: $scope.groupdescription,
                icon: $scope.groupicon,
                id: $scope.editableGroup
            }, function(data){
                if(data.error){
                    return Materialize.toast(data.error,2000);
                }
                $scope.group = data.created;
            });
        }else{
            io.socket.get("/contacts/add_group",{
                name: $scope.groupname,
                description: $scope.groupdescription,
                icon: $scope.groupicon
            }, function(data){
                if(data.error){
                    return Materialize.toast(data.error,2000);
                }
                $scope.groupname = "";
                $scope.groupdescription = "";
                data.created.users = [];
                $scope.groups.push(data.created);
                $scope.$apply();
            });
        }
    };
    /***
     * edit group
     */
    $scope.editGroup = function(group){
        $scope.groupname = group.name;
        $scope.groupicon = group.icon;
        $scope.groupdescription = group.description;
        $scope.editableGroup = group.id;
        $('#modal2').openModal();
    };
    /***
     * edit usergroup
     */
    $scope.editUserGroup = function(user){
        $scope.editableUser = user.contact.id;
        $('#modal3').openModal();
        $('select').material_select();
    };
    $scope.saveUserGroup = function(){
        console.log($scope.userGroup);
        io.socket.get("/contacts/add_user_to_group",{
            contact: $scope.editableUser,
            group: $scope.userGroup.id
        },function(data){
            return Materialize.toast(data.message,1000);
        });
    };
    /***
     * Chat with user
     */
    $scope.chatWith = function(user){
        //location.href="#chat/"+user.contact.id;
        Materialize.toast("Подождите...",560);
        io.socket.get("/dialog/join",{ user: user.id}, function(data){
            console.log(data);
            location.href="#dialog/"+data.dialog;
        });
    };
    $scope.callToUser = function(user){
        return callService.callTo(user.contact);
    };
    $scope.removeContact = function(user, index){
        navigator.notification.confirm(
            'Удалить '+user.contact.fio+"  из Ваших контактов ?", // message
            function(answer){
                if(answer == '1'){
                    //delete
                    io.socket.get("/contacts/delete_contact",{contact: user.id}, function(){
                        $scope.$apply(function(){
                            $scope.contacts.splice(index, 1);
                        });
                    });
                }
            },
            'Подтвердите удаление',           // title
            ['Да','Нет']     // buttonLabels
        );
    };
    $scope.removeGroup = function(group, index){
        navigator.notification.confirm(
            'Удалить  группу '+group.name+"  из списка групп ?", // message
            function(answer){
                if(answer == '1'){
                    //delete
                    io.socket.get("/contacts/delete_group",{group: group.id}, function(){
                        $scope.$apply(function(){
                            $scope.groups.splice(index, 1);
                        });
                    });
                }
            },
            'Подтвердите удаление',           // title
            ['Да','Нет']     // buttonLabels
        );
    };
    $scope.showGroup = function(group){
        $location.path("/group/"+group.id);
    };
});
/*** Groupusers ***/
clicklife.controller("GroupCtrl", function($scope,$routeParams,music,$timeout, Auth, $location, callService){
    io.socket.on("reconnect",function(){
        $timeout(function () {
            $scope.initController();
        }, 0);
    });
    $('ul.tabs').tabs();
    var w = $( window ).width() * 0.80;
    if(w > 500){
        w=500;
    }
    $(".button-collapse").sideNav({
        menuWidth: w,
        closeOnClick: true
    });
    $('.modal-trigger').leanModal();
    $scope.contacts  = [];
    $scope.groupId = $routeParams.groupId;
    $scope.showPreloader = true;
    $scope.me = Auth.getUser();
    $scope.dialogsCount = ($scope.me.dialogs)?$scope.me.dialogs:0;
    $scope.group = {};
    $scope.contactsCount = 0;
    $('select').material_select();
    $scope.initController = function(){
        $scope.showPreloader = true;
        io.socket.get("/contacts/get_group",{group: $scope.groupId}, function(data){
            $scope.$apply(function(){
                console.log(data, "Contacts initialized");
                $scope.showPreloader = false;
                $scope.contacts = data.users;
                $scope.group = data.group;
            });
        });
        io.socket.on("user", function contactUpdateEvent(msg){
            angular.forEach($scope.contacts, function(row, k){
                if(row.id == msg.data.id){
                    $scope.$apply(function(){
                        $scope.contacts[k] = msg.data;
                    });
                }
            });
        });
        io.socket.get("/contacts/get_count_by_user",{user: Auth.getUser().id},function(data){
            $scope.$apply(function(){
                $scope.contactsCount = data.count;
            });
        });
        io.socket.get("/dialog/get_count_by_user",{user: Auth.getUser().id},function(data){
            console.log(data);
            $scope.$apply(function(){
                $scope.dialogsCount = data.count;
            });

        });
        $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
            $timeout(function(){
                $('.dropdown-button').dropdown();
            },false,100);
        });
    };
    $scope.groupname = $scope.group.name;
    $scope.groupicon = $scope.group.icon;
    $scope.groupdescription = $scope.group.description;
    $scope.editableGroup = $scope.group.id;
    $scope.editGroup = function(){
        $scope.groupname = $scope.group.name;
        $scope.groupicon = $scope.group.icon;
        $scope.groupdescription = $scope.group.description;
        $scope.editableGroup = $scope.group.id;
        $('#modal2').openModal();
    };
    /*** Add froup **/
    $scope.addGroup = function(){
        if(!$scope.groupname || !$scope.groupdescription){
            return Materialize.toast("Заполните название и описание группы",1000);
        }
        if($scope.editableGroup){
            io.socket.get("/contacts/edit_group",{
                name: $scope.groupname,
                description: $scope.groupdescription,
                icon: $scope.groupicon,
                id: $scope.editableGroup
            }, function(data){
                if(data.error){
                    return Materialize.toast(data.error,2000);
                }
                $scope.$apply(function(){
                    $scope.group= data.created[0];
                });
            });
        }
    };


    /***
     * Chat with user
     */
    $scope.chatWith = function(user){
        //location.href="#chat/"+user.contact.id;
        Materialize.toast("Подождите...",560);
        io.socket.get("/dialog/join",{ user: user.id}, function(data){
            console.log(data);
            location.href="#dialog/"+data.dialog;
        });
    };
    $scope.callToUser = function(user){
        return callService.callTo(user);
    };
    $scope.removeUserFromGroup = function(user, index){
        navigator.notification.confirm(
            'Удалить  пользователя '+user.fio+"  из группы ?", // message
            function(answer){
                if(answer == '1'){
                    //delete
                    io.socket.get("/contacts/delete_user_from_group",{group: $scope.groupId, user: user.id}, function(){
                        $scope.$apply(function(){
                            $scope.contacts.splice(index, 1);
                        });
                    });
                }
            },
            'Подтвердите удаление',           // title
            ['Да','Нет']     // buttonLabels
        );
    }
    $scope.chatWithGroup = function(){
        $location.path("/groupchat/"+$scope.groupId);
    };
});

