/**
 * Created by Администратор on 16.02.2016.
 */
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
