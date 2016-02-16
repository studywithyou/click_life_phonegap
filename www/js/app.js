
//TODO sio.socket unsubscibe after controller changes

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
        menuWidth: 320
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
            angular.bootstrap(document.body, ['clicklife']);
        }, false);
    } else {
        //console.log("Running in browser, bootstrapping AngularJS now.");
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
        when("/contacts/:isGroups?",{
            templateUrl:'templates/contacts.html',
            controller:'ContactsCtrl'
        }).
        when("/group/:groupId",{
            templateUrl:'templates/group.html',
            controller:'GroupCtrl'
        }).
        when("/groupChat/:groupId",{
            templateUrl:'templates/groupChat.html',
            controller:'GroupChatCtrl'
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
    $rootScope.$on("$routeChangeSuccess",function(event, current){
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
        $(".drag-target").remove();
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
    function onConnect(data){
        console.log("connected",data);
        music.stop("custom");
        music.play("contact_added",false);
        //subscribe to personal chanel
        if(Auth.isLoggedIn()){
            io.socket.get("/user/personal_chanel",{username: Auth.getUser().username}, function(){
                console.log("subscribed to personal channel");
            });
        }else{

        }
    }
    function onReconnect(transport, numAttempts){
        console.log(transport, numAttempts);
        music.setStreamType("system");
        music.play("login",false);
        //subscribe to personal chanel
        if(Auth.isLoggedIn()){
            io.socket.get("/user/personal_chanel",{username: Auth.getUser().username}, function(){
                console.log("subscribed to personal channel");
            });
            //необходимо обновить данные не дошедшие во время отключения
        }
    }
    function onDisconnect(){
        Materialize.toast("Связь с сервером потеряна, попытка повторного подключения",3000);
        music.setStreamType("system");
        music.play("custom",false,0);
        io.socket.off("connect", onConnect);//он нужен только для первого раза
    };
    io.socket.on("connect",onConnect);
    io.socket.on("reconnect", onReconnect);
    io.socket.on("reconnecting", function(numAttempts){
        if(numAttempts % 2 == 0){
            Materialize.toast("Подключение... ",3000);
            music.setStreamType("system");
            music.play("call_ended",false,0);
        }
    });
    io.socket.on("disconnect",onDisconnect);
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



