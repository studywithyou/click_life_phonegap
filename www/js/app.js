

var globalData = {
    set user(value){
        var j =  JSON.stringify( value );
        window.localStorage.setItem("user",j);
    },
    get user(){
        var r = JSON.parse(window.localStorage.getItem("user"));
        return r?r:false;
    }
};
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
                console.log(visible, mouse_is_inside);
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
        when("/call/:userId/:dialogId",{
            templateUrl:"templates/call.html",
            controller:"CallCtrl"
        }).
        when("/incoming_call/:userId/:dialogId",{
            templateUrl:"templates/call_incoming.html",
            controller:"IncomingCallCtrl"
        }).
        otherwise({
            redirectTo: '/login'
        });
});
/***
 * initialization
 */
clicklife.run(function($rootScope,$location, callService) {
    try{
        StatusBar.hide();
    }catch(e){};
    //window.initData();
    $rootScope.$on("$routeChangeSuccess",function(event, current, prev){

        if (
            current.templateUrl == "templates/login.html" ||
            current.templateUrl == "templates/confirm_success.html"
        ) {
            jQuery("body").addClass("bg_1");
        } else {
            jQuery("body").removeClass("bg_1");

        }
    });
    io.socket.on('disconnect', function(){
        var i = setInterval(function(){
            Materialize.toast("Связь прервана, попытка повторного соединения...",1600);
            if(io.socket.isConnected()){
                clearInterval(i);
            }
        },1500);
        setTimeout(function(){
            clearInterval(i);
            if(!io.socket.isConnected()){
                try{
                    navigator.notification.alert(
                        'Соединение с сервером потеряно. Проверьте подключение к интернету',  // message
                        function(){
                            window.globalData.user = {};
                            location.href="#login";
                        },         // callback
                        'Связь потеряна',            // title
                        'Ok'                  // buttonName
                    );
                }catch(e){
                    alert("Связь потеряна");
                    window.globalData.user = {};
                    location.href="#login";
                }
            }
        },25000);

    });
    io.socket.on('connect', function(){
        if(window.globalData.user && window.globalData.user.username){
            io.socket.post("/user/login",{
                login: window.globalData.user.username,
                password: window.globalData.user.password
            },function(data){
                if(data.error){
                    window.globalData.user = {};
                    location.href="#login";
                }
                console.log("Свзяь с сервером восстановлена");
                Materialize.toast("Свзяь с сервером восстановлена",2000);
            });
        }else{

        }

    });


    callService.listenForIncoming(function(user, dialog){
        window.location.href="#incoming_call/"+user+"/"+dialog;
    });

});

/***********************************************************************************************************************
 * SERVICES
 **********************************************************************************************************************/
/***
 * Video Service
 */
clicklife.service("videoService", function(){
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
/*** call service ***/
clicklife.service("callService", function(musicService){
    window.phonertc = cordova.plugins.phonertc;
    phonertc.setVideoView({
        container: document.getElementById('hiddenVideo'),
        containerParams: {
            size: [0,0],
            position:[0,0]
        },
        local: {
            position: [0, 0],
            size: [0, 0]
        }
    });
    var that = this;
    var sessions = {};// all sessions
    /*** callbacks ***/
    this.onIncomingCallStarted = function(){};
    this.onRemoteCallAccepted = function(){};
    this.onIncomingCallAccepted = function(){};
    this.onCallEnded = function(data){};
    this.onTimeChange = function(time){};




    /***
     * Listening for incoming calls
     * @param cb
     */
    this.listenForIncoming = function(cb){
        io.socket.on("incoming_call_request", function(data){
            console.log(data,"incoming_call_request");
            if(data.initiator !== window.globalData.user.id){
               return  cb(data.initiator, data.dialog);
            }
        });
    };

    /*** call request ***/
    this.requestOutcomingCall = function(dialogId, initiator, cb){
        io.socket.get("/dialog/call_request",{
            dialog: dialogId,
            initiator:initiator
        }, function(data){
            if(data.error || data.user.is_online == '0'){
                Materialize.toast("Пользователь вышел из сети");
                cb(data);
            }
        });
    };

    this.startTimer = function(dialogId){
        sessions[dialogId].online_time = 0;
        var timer = window.setInterval(function(){
            sessions[dialogId].online_time++;
            that.onTimeChange(sessions[dialogId].online_time);
        },1000);
        sessions[dialogId].timer = timer;
    };

    this.stopTimer = function(dialogId){
        if(sessions[dialogId].timer){
            window.clearInterval(sessions[dialogId].timer);
        }
    };

    /*** init  outcoming session ***/
    this.initSession = function(dialogId){
        console.log("creating new outcoming call session");
        var config = {
            isInitiator: true,
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
        var session = new phonertc.Session(config);
        session.streams.video = false;
        phonertc.hideVideoView();
        session.on('sendMessage', function (data) {
            io.socket.get("/dialog/session_message",{dialogId: dialogId, from:window.globalData.user.id,  data:JSON.stringify(data)});
        });
        session.on("answer", function(){
            console.log("session initialized");
        });
        session.on("disconnect", function(){
            musicService.setStreamType("system");
            musicService.play("call_busy",false,0);
           that.onCallEnded();
        });
        // init call
        io.socket.get("/dialog/init_remote_call",{
            dialogId: dialogId,
            from: window.globalData.user.id
        }, function(){});
        io.socket.on("session_message", function(data){
            if(data.from != window.globalData.user.id && data.dialogId == dialogId){
                session.receiveMessage(JSON.parse(data.data));
            }
        });
        io.socket.on('call_accepted', function(data){
            console.log("OnCallAccepted OUTCom: ", data);
            if(data.from != window.globalData.user.id && data.dialogId == dialogId){
                session.call();
                that.onRemoteCallAccepted();
                that.startTimer(dialogId);
            }
        });
        sessions[dialogId] = session;
    };

    //init an incoming call
    this.initialize = function(dialogId){

        phonertc.hideVideoView();
        // all ready for instantiate session
        io.socket.get("/dialog/ready_to_build_session", {
            dialog:dialogId,
            user:window.globalData.user.id
        },function(){
            console.log("Ready To build Session send to caller");
        });
        io.socket.on("init_remote_call", function(data){
            if(data.from != window.globalData.user.id && dialogId == data.dialogId){
                var config = {
                    isInitiator: false,
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
                var session = new phonertc.Session(config);
                session.streams.video = false;
                console.log(session," incoming session");
                session.on('sendMessage', function (data) {
                    io.socket.get("/dialog/session_message",{dialogId: dialogId, from:window.globalData.user.id,  data:JSON.stringify(data)});
                });
                io.socket.on("session_message", function(data){
                    if(data.from != window.globalData.user.id && data.dialogId == dialogId){
                        session.receiveMessage(JSON.parse(data.data));
                    }
                });
                session.on("answer", function(){
                    console.log("session initialized");
                });
                session.on("disconnect", function(){
                    musicService.setStreamType("system");
                    musicService.play("call_busy",false,0);
                    that.onCallEnded();
                });
                sessions[dialogId] = session;
                that.onIncomingCallStarted(data);
            }
        });
    };

    this.acceptIncomingCall = function(dialogId){
        sessions[dialogId].call();
        that.startTimer(dialogId);
        io.socket.get("/dialog/accept_call",{
            dialogId: dialogId,
            from: window.globalData.user.id
        });
        phonertc.hideVideoView();
        that.onIncomingCallAccepted();
    };
    this.rejectIncomingCall = function(dialogId){
        try{
            sessions[dialogId].close();
        }catch(e){
            sessions[dialogId] = {};
        }
        that.stopTimer(dialogId);
        that.onCallEnded(dialogId);
    };
});
/***
 * image service
 */
clicklife.service("imageService", function(){
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
clicklife.service("musicService", function(){
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
        return;
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
       try{ Media.mute_microphone(muted)} catch(e){console.log(e)};
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
       } catch(e){}

       if(typeof(now_playing[sound])!= 'undefined'){
           now_playing[sound].play();
           return true;
       };
       var filename = asset_url+ sound + ".mp3";

       now_playing[sound] = new Media(filename, null, function MediaError(){
           console.log("Music play Error");
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
clicklife.controller("LogoutCtrl", function($scope){
    window.globalData.user = {};
    io.socket.get("/user/logout",{id:window.globalData.user.id}, function(){
        location.href="#login";
    });

});
/****************************************************************************
 * Login
 */
clicklife.controller("LoginCtrl", function($scope,$location,$http){
  console.log("login ctrl");
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
              }
              window.globalData.user = data;

              window.location.href = "#contacts";
          });
      }
    $scope.username = "";
    $scope.password = "";
    $scope.login = login;
  if(window.globalData.user !== false && window.globalData.user.username){
      window.location.href = "#contacts";
  }
});

/****************************************************************************
 * Register
 */
clicklife.controller("RegisterCtrl", function($scope, $location){
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

            window.globalData.user = data;
            console.log(data.id);
            window.location.href="#confirmation";
        });

    };

});

/****************************************************************************
 Confirm
 *********/
clicklife.controller("ConfirmCtrl", function($scope, $location){
    if(!window.globalData.user){
        $location.path("register");
    }
    $scope.username = window.globalData.user.username;
    /** confirmation **/
    $scope.confirm_tries = 0;
    $scope.confirm_code = "";
    var code_sent =window.globalData.user.id;

    $scope.confirmuser = function(){
        $scope.confirm_tries++;
        var tries = 10 - $scope.confirm_tries;
        if(tries == 0){
            Materialize.toast("Вы исчерпали число попыток, для ввода кода",2000);
            window.location.href="#register";
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
            window.location.href="#confirmation_success";
        });
    };
});

/****************************************************************************
 Contacts
 *********/
clicklife.controller("ContactsCtrl", function($scope){
    if(!window.globalData.user && !window.globalData.user.username){
        window.location.href="#login";
    }
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
        io.socket.get("/contacts/get_by_user",{user: window.globalData.user.id}, function(data){
            io.socket.get("/contacts/get_groups_by_user",{user: window.globalData.user.id}, function(gData){
                $scope.$apply(function(){
                    console.log(data);
                    $scope.contacts = data;
                    $scope.groups = gData;
                });
            });
        });
        // on contact update
        io.socket.on("user", function contactUpdateEvent(msg){
            angular.forEach($scope.contacts, function(row, k){
                if(row.contact.id == msg.data.id){
                    $scope.contacts[k].contact = msg.data;
                    if(msg.data.is_online == '1'){
                       // window.plugin.notification.local.add({ text: 'Пользователь появился в сети', title:msg.data.fio + "))"  });
                    }else{
                       // window.plugin.notification.local.add({ text: 'Пользователь вышел из сети',title:msg.data.fio+ "(("  });
                    }
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
                    user: window.globalData.user.id
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
                           // window.plugin.notification.local.add({ text: 'Пользователь появился в сети', title:data.created.contact.fio + "))"  });
                        }else{
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
            from: window.globalData.user.fio,
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
                if(results[i].id == window.globalData.user.id){
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
            user: window.globalData.user.id
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
                   // window.plugin.notification.local.add({ text: 'Пользователь появился в сети', title:data.created.contact.fio + "))"  });
                }else{
                   // window.plugin.notification.local.add({ text: 'Пользователь вышел из сети',title:data.created.contact.fio+ "(("  });
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
    }
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
            location.href="#dialog/"+data.dialog;
        });
    }
});

/****************************************************************************
 * Chat
 * *******/
clicklife.controller("ChatCtrl", function($scope, $routeParams, musicService, $timeout, giftsService, imageService, videoService, callService){

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
                angular.forEach($scope.messages, function(m,k){
                    if(m.from.id != window.globalData.user.id && m.readed == 0){
                        io.socket.get("/dialog/update_message_status",{
                            message: m.id,
                            dialog: $scope.dialogId
                        }, function(){});
                    }
                });
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
                $scope.$apply();
                $timeout(function(){
                    $('.materialboxed').materialbox();
                    $(".fancybox_iframe").fancybox();
                },500,false);
            });
        });
        // on Type
        io.socket.on("typing", function(data){
           if(data.dialog == $scope.dialogId && data.name != window.globalData.user.fio){
               $scope.typestatus = 1;
               $scope.typeName = data.name;
               $scope.$apply();
               setTimeout(function(){
                   $scope.typestatus = 0;
                   $scope.$apply();
               },2000);
           }
        });
        // on new message
        io.socket.on("new_message", function(data){
            if(data.dialog == $scope.dialogId){
                if(data.from.id !=  window.globalData.user.id){
                    //update readed status, msg = incoming
                    io.socket.get("/dialog/update_message_status",{
                        message: data.id,
                        dialog: $scope.dialogId
                    }, function(){});
                    data.readed = 1;
                    musicService.setStreamType(musicService.STREAM_SYSTEM);
                    musicService.play("new_message");
                }
                $scope.messages.push(data);
                if($scope.messages.length > 50){
                    $scope.messages.slice(20);
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
                if(msg.id == data.message && msg.from.id == window.globalData.user.id){
                    $scope.messages[key].readed = 1;
                    $scope.$apply();
                }
            });
        });
    };
    $scope.showPreloader = true;
    $scope.dialogId = $routeParams.dialogId;
    $scope.uId = window.globalData.user.id;
    $scope.messages = [];
    $scope.dialogName = "";
    $scope.dialogIcon = "";
    $scope.typeName = "";
    $scope.typestatus = 0; // 1 = печатает, 0 = не видно
    $scope.messageText = "";
    $scope.gifts = [];
    $scope.emojiMessage={};

    initDialog();
    callService.listenForIncoming(function(user, dialog){
        window.location.href="#incoming_call/"+user+"/"+dialog;
    });
    var keyups = 0;
    $scope.imTyping = function($event){
        keyups++;
        console.log("keyup");
        if((keyups % 10 == 0) || keyups == 1){
            io.socket.get("/dialog/typing",{dialog: $scope.dialogId}, function(){

            });
        }
        if($event.keyCode == 13 && !$event.shiftKey){
            $scope.sendMessage();
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
        imageService.getPicture(function(imgUrl){
            if(!imgUrl){
                return false;
            }
            imageService.uploadPhoto(imgUrl,"http://clicklife.link:1337/dialog/upload_photo",{
                from: window.globalData.user.id,
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
        videoService.capture(function(mediafiles){
            $scope.showPreloader = true;
            videoService.uploadVideo(mediafiles[0],"http://clicklife.link:1337/dialog/upload_video",{
                from: window.globalData.user.id,
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
        musicService.capture(function(mediafiles){
            $scope.showPreloader = true;
            musicService.uploadAudio(mediafiles[0],"http://clicklife.link:1337/dialog/upload_audio",{
                from: window.globalData.user.id,
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
            initiator: window.globalData.user.id
        }, function(data){
            if(data.error || data.user.is_online == '0'){
                return Materialize.toast("Пользователь вышел из сети");
                $scope.showPreloader = false;
                $scope.$apply();
            }
            window.location.href="#call/"+data.user.id + "/"+$scope.dialogId;
        });
    };
});

/*** call ***/

clicklife.controller("CallCtrl", function($scope,$timeout, $routeParams, musicService, callService){
    $scope.userId = $routeParams.userId;
    $scope.dialogId = $routeParams.dialogId;
    $scope.call_state = 0; // 0 = start calling
    $scope.userData  = {};
    $scope.online_time = 0;
    var interval;
    var initController = function(){
        io.socket.get("/dialog/get_call_data",
            {user: $scope.userId, initiator: window.globalData.user.id},
            function(data){
                $scope.$apply(function(){
                    $scope.userData = data;
                    console.log(data);
                });
            });
        musicService.setStreamType(musicService.STREAM_RING);
        musicService.play("outcoming_call",true, 450);
        callService.onCallEnded = function(){
            console.log("call ended");
            musicService.stop("outcoming_call");
            $scope.call_state = 3;
        };
        callService.onRemoteCallAccepted = function(){
            $timeout(function(){
                $scope.call_state = 1;
                musicService.stop("outcoming_call");
                callService.startTimer($scope.dialogId);
            },0);
        };
        callService.onTimeChange = function(seconds){
            //console.log("time changed + "+seconds);
            $scope.online_time = seconds;
        };
        var connection_tries = 0;
        var ready_to_build = false;
        interval = window.setInterval(function(){
            if(ready_to_build){
               return window.clearInterval(interval);
            }else{
                callService.requestOutcomingCall($scope.dialogId, window.globalData.user.id, function(){});
            }
             connection_tries++;
            if(connection_tries >= 60 && !ready_to_build){
                window.clearInterval(interval);
                musicService.setStreamType(musicService.STREAM_RING);
                musicService.play("call_busy",false,0);
                window.setTimeout(function(){
                    window.location.href="#contacts";
                },500);
            }
        },1000);

        io.socket.on("ready_to_build_session",function(data){
            console.log("ready to build session event recieved from callee",data);
            window.clearInterval(interval);
            ready_to_build = true;
            if(data.user !== window.globalData.user.id && data.dialog ==  $scope.dialogId){
                callService.initSession($scope.dialogId);
            }
        });

    };
    $("body").addClass("bg_1");
    initController();
    $scope.stopCall = function(){
        callService.rejectIncomingCall($scope.dialogId);
        callService.stopTimer($scope.dialogId);
        window.clearInterval(interval);

    };

    $scope.returnHome = function(){
        window.clearInterval(interval);
        callService.rejectIncomingCall($scope.dialogId);
        location.href="#contacts";
    };



});

clicklife.controller("IncomingCallCtrl", function($scope, $timeout, $routeParams, musicService, callService){
    $scope.userId = $routeParams.userId;
    $scope.dialogId = $routeParams.dialogId;
    $scope.call_state = 0; // 0 = start calling
    $scope.userData  = {};
    $scope.online_time = 0; // connection, 1 - connected, 2 speaking, 3 ended
    $scope.volume_off = false;
    $scope.mic_off = false;

    $("body").addClass("bg_1");
    var initController = function(){
        io.socket.get("/dialog/get_call_data",
            {user: $scope.userId},
            function(data){
                $scope.userData = data;
                console.log(data);
                $scope.$apply();
            });

        callService.onIncomingCallAccepted = function(){
            $timeout(function(){
                $scope.call_state = 2; // speaking
                musicService.stop("incoming_call");
            },0);
        };
        callService.onCallEnded = function(){
            musicService.stop("incoming_call");
            musicService.play("call_ended",false,0);
            $scope.call_state = 3;
        };
        callService.onIncomingCallStarted = function(){
            console.log("Incoming call started");
            $scope.call_state =1; // show buttons;

            musicService.setStreamType(musicService.STREAM_RING);
            musicService.play("incoming_call",1,400);

        };
        callService.onTimeChange = function(seconds){
            $scope.online_time = seconds;
        };
        callService.initialize($scope.dialogId);


    };

    initController();
    $scope.acceptCall = function(){
        $scope.call_state = 2;
        callService.acceptIncomingCall($scope.dialogId);
        musicService.stop("incoming_call");

    };

    $scope.rejectCall = function(){
        callService.rejectIncomingCall($scope.dialogId);
        musicService.stopAll();
        musicService.toggleMicrophone(musicService.MIC_ON);
        musicService.toggleSpeaker(false);
        window.location.href = "#contacts";
    };

    $scope.showChat = function(){
        callService.rejectIncomingCall($scope.dialogId);
        musicService.stopAll();
        musicService.toggleMicrophone(musicService.MIC_ON);
        musicService.toggleSpeaker(false);
        window.location.href = "#dialog/"+$scope.dialogId;
    };

    $scope.muteSpeakers = function(){
        if($scope.volume_off == true){
            // volume on
            musicService.toggleSpeaker(true);
            $scope.volume_off = false;
        }else {
            //mute
            musicService.toggleSpeaker(false);
            $scope.volume_off = true;
        }
    };

    $scope.muteMicrophone = function(){
        if($scope.mic_off == true){
            $scope.mic_off = false;
            // on microphone
            musicService.toggleMicrophone(musicService.MIC_ON);
        }else{
            $scope.mic_off = true;
            //off microphone
            musicService.toggleMicrophone(musicService.MIC_OFF);
        }
    };

});
clicklife.controller("DialogsCtrl", function($scope, $location){

});
clicklife.controller("PageCtrl", function($scope, $location){

});
clicklife.controller("CashCtrl", function($scope, $location){

});
clicklife.controller("ProfileCtrl", function($scope, $location){

});