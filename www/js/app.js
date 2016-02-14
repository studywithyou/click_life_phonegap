


var jqComponents = {
    toggler: function(){
        var visible = false;
        var mouse_is_inside = false;
        var show = function(){
            if(!visible){
                $(".fav_attach").addClass("active");
                visible= true;
            }
        };
        var hide = function(){

            $(".fav_attach").removeClass("active");
            visible= false;

        };
        var init = function(){

            $('.fav_attach').hover(function(){
                mouse_is_inside=true;
            }, function(){
                mouse_is_inside=false;
            });
            $("body").click(function(){

                if(visible && !mouse_is_inside){
                    hide();
                }
            });
            $(".toggler").click(function(e){
                e.preventDefault();
                if(visible){
                    hide();
                }else{
                    show();
                }

            });
        };

        return {
            show:show,
            hide:hide,
            init: init
        };
    },
    /***
     * inits fav attach toggler
     */
    initTogler: function(){
        jqComponents.toggler().init();

    },



    /***
     * open emoticons
     *
     */
    openEmoticons: function(){
        $('.emoji-button').click();
        $(".fav_attach").toggleClass("active");
    }
};
jQuery(function($){
    $.support.cors = true;

    $('ul.tabs').tabs();
    $(".button-collapse").sideNav({
        menuWidth: 320,
    });
    $('.modal-trigger').leanModal();
    $('.dropdown-button').dropdown({
            inDuration: 300,
            outDuration: 225,
            constrain_width: false, // Does not change width of dropdown to that of the activator
            hover: true, // Activate on hover
            gutter: 0, // Spacing from edge
            belowOrigin: false, // Displays dropdown below the button
            alignment: 'left' // Displays dropdown with edge aligned to the left of button
        }
    );
    jqComponents.initTogler();
    $(".photo_upload").change(function(){
        $(this).addClass("active");
        Materialize.toast("Фото выбрано",2000);
    });

    if (window.cordova) {
        document.addEventListener('deviceready', function () {
            console.log("Deviceready event has fired, bootstrapping AngularJS.");
            angular.bootstrap(document.body, ['clicklife']);
        }, false);
    } else {
        console.log("Running in browser, bootstrapping AngularJS now.");
        angular.bootstrap(document.body, ['clicklife']);
    }
});

var clicklife = angular.module("clicklife",['ngRoute', 'ngSanitize', 'emojiApp']);

clicklife.config(function($routeProvider){
    $routeProvider.
        when('/login', {
            templateUrl: 'templates/login.html',
            controller: 'LoginCtrl'
        }).
        when('/logout', {
            templateUrl: 'templates/logout.html',
            controller: 'LogoutCtrl'
        }).
        when("/register",{
            templateUrl: 'templates/register.html',
            controller:'RegisterCtrl'
        }).
        when("/confirmation",{
            templateUrl: 'templates/confirm.html',
            controller:'ConfirmCtrl'
        }).
        when("/confirmation_success",{
            templateUrl: 'templates/confirm_success.html',
            controller:'ConfirmCtrl'
        }).
        when("/contacts",{
            templateUrl:'templates/contacts.html',
            controller:'ContactsCtrl'
        }).
        when("/dialog/:dialogId",{
            templateUrl:'templates/chat.html',
            controller:'ChatCtrl'
        }).
        when("/profile",{
            templateUrl:'templates/profile.html',
            controller:'ProfileCtrl'
        }).
        when("/page/:pageName",{
            templateUrl:'templates/page.html',
            controller:'PageCtrl'
        }).
        when("/cash",{
            templateUrl:'templates/cash.html',
            controller:'CashCtrl'
        }).
        when("/dialogs",{
            templateUrl:'templates/dialogs.html',
            controller:'DialogsCtrl'
        }).
        when("/call/:contactName/:isCalling",{
            templateUrl:"templates/call.html",
            controller:"CallCtrl"
        }).
        otherwise({
            redirectTo: '/login'
        });
});
/***
 * initialization
 */
clicklife.run(function($rootScope,$location, callService) {
    $rootScope.$on("$routeChangeSuccess",function(event, current, prev){
        callService.currentRoute = current.templateUrl;
        if (
            current.templateUrl == "templates/login.html" ||
            current.templateUrl == "templates/confirm_success.html" ||
            current.templateUrl  == "templates/call.html"
        ) {
            jQuery("body").addClass("bg_1");
        } else {
            jQuery("body").removeClass("bg_1");

        }
    });
});

clicklife.run(function($rootScope, $location, Auth){
    $rootScope.$on('$routeChangeStart', function (event) {
        if (!Auth.isLoggedIn()) {
            console.log('DENY');
            event.preventDefault();
            $location.path('/login');
        }
        else {

        }
    });

});

clicklife.run(function($rootScope, $interval,$timeout, msg, music,$location,Auth){
    $rootScope.$on('$routeChangeStart', function (event) {
        var i;;
            msg.on("connect", function(){
                $interval.cancel(i);
                music.stop("custom");
                music.play("contact_added",false);
                //subscribe to personal chanel
                if(Auth.isLoggedIn()){
                    io.socket.get("/user/personal_chanel",{username: Auth.getUser().username}, function(){
                        console.log("subscribed to personal channel");
                    });
                }else{

                }

            });
            msg.on("disconnect", function(){
                console.log('Network disconnected');
                music.setStreamType("system");
                music.play("custom",true, 500);
                var i = $interval(function(){
                    var conn = io.socket.isConnected();
                    if(conn){
                        $interval.cancel(i);
                        music.stop("custom");
                        return Materialize.toast("Соединение восстановлено...",1000)
                        $location.path("/contacts");
                    }else{
                        return Materialize.toast("Соединение с сервером не установлено...",1000)
                    };
                },5000);
                event.preventDefault();
            });
    });

});

clicklife.run(function( msg, callService,$timeout){
    msg.on("messageReceived", function(data){
        if(data.message.type == 'call'){
            if(callService.currentRoute == "templates/call.html"){
                console.log("Incoming call requested, but i`m already in call... Ignoring");
            }else{
                $timeout(function(){
                    window.location.href = "#call/"+data.from+"/0";
                },0);
            }
        }

    });
});

/***********************************************************************************************************************
 * SERVICES
 **********************************************************************************************************************/
clicklife.factory("Auth", function($interval, $location){
    var storage = {
        set user(value){
            var j =  JSON.stringify( value );
            window.localStorage.setItem("user",j);
        },
        get user(){
            var r = JSON.parse(window.localStorage.getItem("user"));
            return r?r:false;
        }
    };
    var interval;
    var period_ms = 30000; //каждые 30 сек
    var auto_reconnect = function(period_ms){
        if(interval){
            console.log("автообновление уже запущено");
            return;
        }
        interval = $interval(function(){
           io.socket.post("/user/login",{
               login: storage.user.username,
               password: storage.user.password
           },function(data){
               if(data.error){
                   return Materialize.toast(data.error,2000);
               }else{
                   console.log("Updated login status");
                   storage.user = data;

               }
           });
       },period_ms);
    };
    var afterUpdate = function(){
        if(storage.user.username){
            io.socket.get("/user/personal_chanel",{username: storage.user.username }, function(){
                console.log("subscribed to personal channel");
            });
        }

    };
    return{
        watchMe: function($scope){
            $scope.$watch(Auth.isLoggedIn, function (value, oldValue) {
                if(!value && oldValue) {
                    console.log("User Disconnect");
                    io.socket.get("/user/logout",{id:storage.user.id}, function(){
                        storage.user = {};
                        $location.path("/login");
                    });
                }
                if(value) {
                    console.log("Connected success");
                    //Do something when the user is connected
                }

            }, true);
        },
        getUser: function(){
            return storage.user;
        },
        setUser : function(aUser){
            storage.user = aUser;
            afterUpdate();
            if(aUser){
                auto_reconnect(160000);
            }else{
                $interval.cancel(interval);

            }

        },
        currentName: function(){
            return storage.user.username;
        },
        isLoggedIn : function(){
            return(storage.user.username)? storage.user : false;
        },
        logout: function(){
            storage.user= "";
            $interval.cancel(interval);
            window.location.href="#login";
        }
    }
});
clicklife.factory("User", function(){
    var users = {};
    return {
        getById: function(id,cb){
            io.socket.get("/user/"+id,{},function(data){
                cb(data);
            });
        }
    }
});
clicklife.factory("msg", function(Auth){
    var _io = io;
    return{
        isConnected: function(){
            return io.socket.isConnected();
        },
        on: function(eventIdentity, callback){
            return io.socket.on(eventIdentity,callback);
        },
        send: function(url, data, callback){
            return io.socket.get(url, data, callback);
        },
        emit: function(eventName, recipient, data){
            io.socket.get("/call/signaling",{
                event: eventName,
                data:data,
                from: Auth.getUser().username,
                to: recipient
            })
        }
    }
});
/*** call service ***/
clicklife.service("callService", function(User){
   var that = this;
   this.initCall = function(username){
       window.location.href="#call/"+username+"/1";
   } ;
   this.isCalling = false;
    this.nowOnCall = false;
    this.initCallToUser = function(userId){
        User.getById(userId,function(user){
            if(!user){
                alert("Невозможно установить связь");
            }else{
                Materialize.toast("Установка соединения... ",500);
                that.initCall(user.username);
            }

        });
    };
    this.callTo = function(user){
        that.initCall(user.username);
    };

    this.currentRoute = "";
});
/***
 * Video Service
 */
clicklife.service("Video", function(){
    /*** capture video ***/
    this.capture = function(cb){
        navigator.device.capture.captureVideo(cb, function(e){
            console.log(e);
        }, {limit: 1});
    };
    /**  upload to server ***/
    this.uploadVideo = function(mediaFile,url, params, cb){
        var ft = new FileTransfer(),
            path = mediaFile.fullPath,
            name = mediaFile.name;

        ft.upload(path,
            url,
            function(result) {
                console.log('Upload success: ' + result.responseCode);
                console.log(result.bytesSent + ' bytes sent');
                cb();
            },
            function(error) {
                console.log('Error uploading file ' + path + ': ' + error.code);
            },
            { fileName: name, fileKey:'file', params: params });
    };
});

/***
 * image service
 */
clicklife.service("image", function(){
    /** get picture from camera or gallery **/
    this.getPicture = function(cb){
        return  navigator.camera.getPicture(cb, function(message) {
                alert('get picture failed');
            },{
                quality: 90,
                destinationType: navigator.camera.DestinationType.FILE_URI,
                sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY
            }
        );
    };

    this.uploadPhoto = function(imageURI, uploadURI, params, cb){
        var options = new FileUploadOptions();
        options.fileKey="file";
        options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
        options.mimeType="image/jpeg";

        // var params = new Object();
        // params.value1 = "test";
        // params.value2 = "param";

        options.params = params;
        options.chunkedMode = false;

        var ft = new FileTransfer();
        ft.upload(imageURI, uploadURI, cb, function(e){
            console.log(e);
        }, options);
    };
});

/***
 * Music service
 */
clicklife.service("music", function(){
    var that = this;
    this.STREAM_MUSIC = "music";
    this.STREAM_RING = "system";
    this.STREAM_NOTIFICATION = "notification";
    this.STREAM_VOICE_CALL = "voice_call";
    this.STREAM_ALARM = "alarm";
    this.STREAM_DTMF = "dtmf";
    this.MIC_ON = "on";
    this.MIC_OFF = "off";
    var asset_url = "/android_asset/www/music/";
    if(cordova.platformId == "browser"){
        asset_url = "music/";
    };
    var now_playing = {};
    var stop_request = false;
    var streamType = this.STREAM_MUSIC;
    /***
     * stop all sounds
     */
    this.stopAll = function(){
        for(var sound in now_playing){
            try{
                that.stop(sound);
            }catch(e){}
        }
        return true;
    };
    this.setStreamType = function(type){
        if(type != that.STREAM_MUSIC &&
            type!= that.STREAM_RING &&
            type!= that.STREAM_NOTIFICATION &&
            type!= that.STREAM_VOICE_CALL &&
            type != that.STREAM_ALARM&&
            type != that.STREAM_DTMF
        ){
            streamType = that.STREAM_MUSIC;
            return false;
        }
        streamType = type;
        return true;
    };
    // toggle mute Stream
    // param type = StreamType
    this.toggleMute = function(type){
        if(type != that.STREAM_MUSIC &&
            type!= that.STREAM_RING &&
            type!= that.STREAM_NOTIFICATION &&
            type!= that.STREAM_VOICE_CALL &&
            type != that.STREAM_ALARM&&
            type != that.STREAM_DTMF
        ){
            type = that.STREAM_MUSIC;

        }
        try{
            return Media.mute_stream(type);
        }catch(e){console.log(e); }

    };

    /*** togle mute microphone
     * @param muted string "on" || "off"
     * ***/
    this.toggleMicrophone = function(muted){
        try{
            Media.mute_microphone(muted);
        } catch(e){console.log(e)};
    };

    /*** togle speakerPhone
     * @param bool state - true = speaker is on, false = speaker is off
     * ****/
    this.toggleSpeaker = function(state){
        try{
            return Media.toggle_speaker(state);
        }catch(e){ console.log(e);}

    };

    //play sound
    this.play = function(sound, loopSong, loop_interval){
        stop_request = false;
        if(typeof(Media) == "undefined"){
            return false;
        }
        try{
            Media.setStreamType(streamType);
        } catch(e){ console.log(e);}

        if(typeof(now_playing[sound])!= 'undefined'){
            now_playing[sound].stop();
            delete now_playing[sound];
        };
        var filename = asset_url+ sound + ".mp3";
        now_playing[sound] = new Media(filename, null, function MediaError(e){
            console.log("Music play Error", e);
        }, function(status){
            if(loopSong && status==Media.MEDIA_STOPPED){
                window.setTimeout(function(){
                    if(!now_playing[sound].stop_requested){
                        now_playing[sound].play();
                    }
                    if(now_playing[sound].stop_requested){
                        now_playing[sound].stop();
                    }
                }, loop_interval);
            }
        }, streamType);
        now_playing[sound].stop_requested = false;
        now_playing[sound].play();
        return true;
    };
    //stop playing
    this.stop = function(sound){
        if(typeof(now_playing[sound])!= 'undefined'){
            now_playing[sound].stop();
            now_playing[sound].stop_requested = true;
        }
    };

    /*** capture audio */
    this.capture = function(cb){
        navigator.device.capture.captureAudio(cb, function(e){
            console.log(e);
        }, {limit:1});
    };
    /*** upload audio ***/
    this.uploadAudio = function(mediaFile,url, params, cb){
        var ft = new FileTransfer(),
            path = mediaFile.fullPath,
            name = mediaFile.name;

        ft.upload(path,
            url,
            function(result) {
                console.log('Upload success: ' + result.responseCode);
                console.log(result.bytesSent + ' bytes sent');
                cb();
            },
            function(error) {
                console.log('Error uploading file ' + path + ': ' + error.code);
            },
            { fileName: name, fileKey:'file', params: params });
    };
});
/***
 * GIFTS service
 */
clicklife.service("giftsService", function(){
    this.getAll = function(cb){
        io.socket.get("/gifts/all",function(data){
            cb(data);
        });
    };
});

/**********************************************************************************************************************
 * CONTROLLERS
 **********************************************************************************************************************/

/****************************************************************************
 * Logout
 */
clicklife.controller("LogoutCtrl", function($scope, Auth,$location){

    io.socket.get("/user/logout",{id:Auth.getUser().id}, function(){
        Auth.logout();
        Auth.setUser({});
        $location.path("/login");
    });


});
/****************************************************************************
 * Login
 */
clicklife.controller("LoginCtrl", function($scope,$location,Auth){
    if(Auth.isLoggedIn()){
        console.log("already connected, refreshing");
       //should update our status and join socket rooms
        io.socket.post("/user/login",{
            login: Auth.getUser().username,
            password: Auth.getUser().password
        },function(data){
            if(data.error){
                return Materialize.toast(data.error,2000);
            }else{
                console.log("Auth success");
                Auth.setUser(data);
                window.location.href="#contacts";
            }
        });
    }
    function login(){
        if(!$scope.username || !$scope.password){
            Materialize.toast('Все поля необходимо заполнить!', 2000) // 4000 is the duration of the toast
            return false;
        }
        io.socket.post("/user/login",{
            login: $scope.username,
            password: $scope.password
        },function(data){
            if(data.error){
                return Materialize.toast(data.error,2000);
            }else{

            }
            console.log("Auth success");
            Auth.setUser(data);
            window.location.href="#contacts";
        });
    }
    $scope.username = "";
    $scope.password = "";
    $scope.login = login;

});

/****************************************************************************
 * Register
 */
clicklife.controller("RegisterCtrl", function($scope, $location, Auth){
    $scope.username = "";
    $scope.fio = "";
    $scope.email = "";
    $scope.password = "";
    $scope.rules = "";
    $scope.photo = "";

    $(".photo_upload").change(function(){
        $(this).addClass("active");
        Materialize.toast("Фото выбрано",2000);
    });
    $scope.register = function(){

        if(!$scope.rules){
            return Materialize.toast("Примите правила сервиса",1500);
        }
        if(!$scope.username){
            return Materialize.toast("Введите номер телефона",1500);
        }
        if(!$scope.fio){
            return Materialize.toast("Введите Ваши ФИО",1500);
        }
        if(!$scope.email){
            return Materialize.toast("Введите Ваш email",1500);
        }
        if(!$scope.password){
            return Materialize.toast("Введите Ваш пароль",1500);
        }

        io.socket.post("/user/register",{
            login: $scope.username,
            password: $scope.password,
            fio:$scope.fio,
            email:$scope.email,

        },function(data){
            if(data.error){
                return Materialize.toast(data.error,2000);
            }
            Auth.setUser(data);
            console.log(data.id);
            $location.path("/confirmation");
        });

    };

});

/****************************************************************************
 Confirm
 *********/
clicklife.controller("ConfirmCtrl", function($scope, $location, Auth){
    if(!Auth.isLoggedIn()){
        $location.path("/register");
    }
    $scope.username = Auth.getUser().username;
    /** confirmation **/
    $scope.confirm_tries = 0;
    $scope.confirm_code = "";
    var code_sent = Auth.getUser().id;

    $scope.confirmuser = function(){
        $scope.confirm_tries++;
        var tries = 10 - $scope.confirm_tries;
        if(tries == 0){
            Materialize.toast("Вы исчерпали число попыток, для ввода кода",2000);
            $location.path("/register");
        }
        var add_txt = "Осталось попыток: "+tries;
        if(!$scope.confirm_code){
            return Materialize.toast("Пожалуйста, введите проверочный код. "+ add_txt,2000);
        }
        if($scope.confirm_code != code_sent){
            $scope.confirm_code = "";
            console.log($scope.confirm_code);
            console.log(code_sent);
            return Materialize.toast("Код введен неверно. "+add_txt,2000);
        }
        io.socket.post("/user/activate",{
            user:code_sent
        },function(data){
            $location.path("/confirmation_success");
        });
    };
});

/****************************************************************************
 Contacts
 *********/
clicklife.controller("ContactsCtrl", function($scope,music, Auth, $location){
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
    $('.dropdown-button').dropdown({
            inDuration: 300,
            outDuration: 225,
            constrain_width: false, // Does not change width of dropdown to that of the activator
            hover: true, // Activate on hover
            gutter: 0, // Spacing from edge
            belowOrigin: false, // Displays dropdown below the button
            alignment: 'left' // Displays dropdown with edge aligned to the left of button
        }
    );
    $scope.contacts  = [];
    $scope.groups = [];
    $scope.online_users = [];
    $scope.requestNumber = "";
    $scope.search = [];
    $scope.search_string = "";
    //controller init
    $scope.initController = function(){
        $scope.initContacts();
    };
    // инициализация контактов
    $scope.initContacts = function(){
        io.socket.get("/contacts/get_by_user",{user: Auth.getUser().id}, function(data){
            io.socket.get("/contacts/get_groups_by_user",{user: Auth.getUser().id}, function(gData){
                $scope.$apply(function(){
                    console.log(data, "Contacts initialized");
                    $scope.contacts = data;
                    $scope.groups = gData;
                });
            });
        });
        // on contact update
        io.socket.on("user", function contactUpdateEvent(msg){
            console.log("userEvent", msg, $scope.contacts);
            angular.forEach($scope.contacts, function(row, k){
                if(row.contact.id == msg.data.id){
                    var upd = false;
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
                    Materialize.toast("Контакт добавлен",1000);
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
                r.push(results[i]);
            }
            if(!results){
                return Materialize.toast("Ничего не найдено!",1000);
            }
            $scope.search = r;
            $scope.$apply();
        });
    };
    //add from search
    $scope.addFromSearch = function(user){
        $scope.search = [];
        for(var i in $scope.contacts){
            if($scope.contacts[i].contact.id == user.id){
                return alert("Контакт уже у Вас в списке");
            }
        }
        io.socket.get("/contacts/add_contact",{
            email: user.email,
            phone: user.username,
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
            Materialize.toast("Контакт добавлен",1000);
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
            });
        });
    };

    /*** Add froup **/
    $scope.groupname = "";
    $scope.groupdescription = "";
    $scope.groupicon = "";
    $scope.editableGroup = "";
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

                angular.forEach($scope.groups, function(value,ind){
                    if(value.id == data.created[0].id){
                        $scope.groupname = "";
                        $scope.groupdescription = "";
                        $scope.editableGroup = "";
                        $scope.groups[ind]= data.created[0];
                        $scope.$apply();
                    }
                });

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
    $('select').material_select();
    $scope.editableUser = "";
    $scope.userGroup = "";
    $scope.editUserGroup = function(user){
        $scope.editableUser = user.id;
        $('#modal3').openModal();
        $('select').material_select();
    };
    $scope.saveUserGroup = function(){
        console.log($scope.userGroup);
        angular.forEach($scope.contacts, function(contact,key){
            if(contact.id == $scope.editableUser){
                $scope.contacts[key].group.name = $scope.userGroup.name;
            }

        });
        io.socket.get("/contacts/change_group",{
            contact: $scope.editableUser,
            group: $scope.userGroup.id
        },function(data){
            return Materialize.toast("Сохранено",1000);
        });
    };
    /***
     * Chat with user
     */
    $scope.chatWith = function(user){
        //location.href="#chat/"+user.contact.id;
        Materialize.toast("Подождите...",560);
        io.socket.get("/dialog/join",{ user: user.contact.id}, function(data){
            console.log(data);
            location.href="#dialog/"+data.dialog;
        });
    }
});

/****************************************************************************
 * Chat
 * *******/
clicklife.controller("ChatCtrl", function($scope,Auth, $routeParams,callService, music, $location,$timeout, giftsService, image, Video){

    $('.modal-trigger').leanModal();
    jqComponents.initTogler();
    $(".fancybox_iframe").fancybox();
    $timeout(function(){
        $('.dropdown-button').dropdown();
    },false,100);
    // initialization //
    var initDialog = function(){
        io.socket.get("/dialog/get_messages",{dialog: $scope.dialogId}, function(data){
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
                if($scope.messages.length > 60){
                    $scope.messages.slice(40);
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
});

/*** call ***/
clicklife.controller("CallCtrl", function($scope,$rootScope,$location,$interval,$timeout, $routeParams, music, callService, msg,Auth){
    callService.nowOnCall = true;

    var duplicateMessages = [];
    $scope.isCalling = ($routeParams.isCalling == '1') ? true: false;
    $scope.callInProgress = false;
    $scope.contactName = $routeParams.contactName;
    $scope.currentName = Auth.getUser().username;
    $scope.muted = false;
    $scope.mic_muted = false;
    $scope.toggleMic = function(){
        if($scope.mic_muted){
            music.toggleMicrophone("off");
            $scope.mic_muted = false;
        }else{
            $scope.mic_muted = true;
            music.toggleMicrophone("on");
        }
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
            },1000);
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
        Materialize.toast("Пользователь "+name+" не может взять трубку");
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
        Materialize.toast(reason,1000);
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
            cordova.plugins.phonertc.hideVideoView();
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
            cordova.plugins.phonertc.hideVideoView();
            msg.emit('sendMessage', contactName, {
                type: 'phonertc_handshake',
                data: JSON.stringify(data)
            });
        });

        session.on('answer', function () {
            cordova.plugins.phonertc.hideVideoView();
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
    };
    function onMessageReceive (data) {
        //console.log("Recieved_locally",data);
        var name = data.from;
        var message = data.message;
        cordova.plugins.phonertc.hideVideoView();
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
clicklife.controller("DialogsCtrl", function($scope, $location){});
clicklife.controller("PageCtrl", function($scope, $location){

});
clicklife.controller("CashCtrl", function($scope, $location){

});
clicklife.controller("ProfileCtrl", function($scope, $location){});
clicklife.directive('videoView', function ($rootScope, $timeout) {
    return {
        restrict: 'E',
        template: '<div class="video-container"></div>',
        replace: true,
        link: function (scope, element, attrs) {
            function updatePosition() {
                cordova.plugins.phonertc.hideVideoView();
            }
            $timeout(updatePosition, 500);
            $rootScope.$on('videoView.updatePosition', updatePosition);
        }
    }
});