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

});
