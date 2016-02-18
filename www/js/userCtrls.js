/**
 * Created by Администратор on 16.02.2016.
 */
clicklife.controller("PageCtrl", function($scope,$location, $routeParams){
    $scope.pageName = $routeParams.pageName;
    $scope.page = {};
    io.socket.get("/page",{link:$scope.pageName},function(response){
        if(response && response.length >0){
            $scope.$apply(function(){
                $scope.page = response[0];
            });
        }
    });
});


clicklife.controller("CashCtrl", function($scope, $location){

});
clicklife.controller("ProfileCtrl", function($scope, $location, Auth){
    $scope.me = Auth.getUser();
    $scope.showPreloader = false;
    $scope.save = function(){
        if(!$scope.me.password || !$scope.me.fio){
            return window.showToast("Заполните поля!!");
        }
         io.socket.put("/user/"+$scope.me.id, {
             password: $scope.me.password,
             fio: $scope.me.fio
         }, function(data){
             return window.showToast("Данные сохранены");
         });

    };

    $scope.avatar = function(){
        image.getPicture(function(imgUrl){
            if(!imgUrl){
                return false;
            }
            $scope.showPreloader = true;
            image.uploadPhoto(imgUrl,"http://clicklife.link:1337/user/upload_avatar",{
                user: Auth.getUser().id,
            },function(){
                //success
               $scope.showPreloader = false;
               io.get("/user/"+Auth.getUser().id, function(user){
                   $scope.$apply(function(){
                       Auth.getUser().avatar = user.avatar;
                       $scope.me.avatar = user.avatar;
                   });
               });

            });
        });
    };
});

clicklife.controller("SettingsCtrl", function($scope, $location, Auth){


});