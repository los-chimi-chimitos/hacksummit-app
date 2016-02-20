(function () {
  'use strict';


  angular.module('hacksummit').controller('SketchCtrl', ['$scope','$http','$mdDialog','$state','$rootScope','$location',function($scope,$http,$mdDialog,$state,$rootScope,$location) {
 //Firebase reference
    $scope.syncRef;

    //Object to use across the application
    $scope.data = {};
   
    /**
     * Init everything needed here!!!
     * @return     {[type]}                 [description]
     */
    function initialise() {
       $scope.syncRef = new Firebase("https://hash2016.firebaseio.com/"+$state.params.identifier);      
      //Read and sync with what Firebase has
      $scope.syncRef.on('value', function(dataSnapshot) { 
		       $scope.data = dataSnapshot.val();
		       var canvas = document.querySelector('.cnv_div');
		       if(canvas){
		       		canvas.remove();
		       }
		       var tagcode = document.querySelector('#code');
		       tagcode.innerHTML = $scope.data.code;
		       renderCode('displaycode');
      });
    }

    if($state.params.identifier){
    	initialise();   	
    }else{
    	$location.path('/dashboard');
    }

  }]);


})();