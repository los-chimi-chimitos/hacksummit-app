(function () {
  'use strict';
  /**
   * @ngdoc overview
   * @name dashboardApp
   * @description
   * # dashboardApp
   *
   * Main module of the application.
   */
  var app = angular.module('hacksummit', []);

  /**
   * Main controller
   * @param      {String}                 $scope) {               $scope.greeting [description]
   * @return     {[type]}                         [description]
   */
  app.controller('MainController', ['$scope', function($scope) {
    
    //We will append here all tweets      
    $scope.output = [];

    /**
     * Init socket and listen to output
     * @type {[type]}
     */
    var socket = io();
    socket.on('output', function(tweet){
      $scope.$apply(function() {
        $scope.output.unshift(new Date()+" -> "+tweet.text);
        console.log(tweet);
      });
    });

    /**
     * Hashtags are in "input" scope variable as a string with items separated by comma
     * @example    https://www.glofoxlogin/
     * @return     {[type]}                 [description]
     */
    $scope.sendHashTags = function() {
      var data = $scope.input.split(",");
      console.log(data);
      socket.emit('hashtags',data);
    }

  }]);

})();