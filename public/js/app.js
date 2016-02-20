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
  var app = angular.module('hacksummit', ['ngRoute','ui.router','ngAnimate','ngMaterial','ui.ace']);
  app.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
    //
    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise("/dashboard");
    //
    // Now set up the states
    $stateProvider
      .state('sketch', {
        url: "/sketch/:identifier",
        templateUrl: "partials/sketch.html",
        controller: "SketchCtrl"
      })
      .state('editor', {
        url: "/editor/:identifier",
        templateUrl: "partials/editor.html",
        controller: "EditorCtrl"
      })
      .state('dashboard', {
        url: "/dashboard",
        templateUrl: "partials/dashboard.html",
        controller: "DashboardCtrl"
      });
  });

  /**
   * Main controller
   * @param      {String}                 $scope) {               $scope.greeting [description]
   * @return     {[type]}                         [description]
   */
  app.controller('EditorCtrl', ['$scope','$http','$mdDialog','$state','$rootScope', '$window', function($scope,$http,$mdDialog,$state,$rootScope,$window) {

    //Firebase reference
    $scope.syncRef;

    //Object to use across the application
    $scope.data = {
      code:"",
      tags:[],
      author:'',
      name:''
    };

    /**
     * Save and share link
     * @return     {[type]}                 [description]
     */
    $scope.sendSketch = function() {
      $scope.syncRef.set($scope.data);
      notifyLink();
    }

    /**
     * Init everything needed here!!!
     * @return     {[type]}                 [description]
     */
    function initialise() {
        //Initialise with data if coming from another place
        if ($state && $rootScope.reports) {
          $scope.data = $rootScope.reports[$state.params.identifier];
          console.log($scope.data);
          setData($scope.data);
        }

        //Are we referencing a specific ID? if so, attempt to load it
        initAndBindSync();
    }

    /**
     * Everytime data about code, hashes or any other metadata of this report changes, sync with firebase
     * @internal
     * @deprecated
     * @link
     * @example    https://www.glofoxlogin/
     * @return     {[type]}                 [description]
     */
    function initAndBindSync() {

      var urlComponents       = window.location.href.split('/');
      $scope.globalIdentifier = urlComponents[urlComponents.length-1];
      $scope.globalIdentifier = $scope.globalIdentifier ? $scope.globalIdentifier : new Date().getTime();
      $scope.syncRef          = new Firebase("https://hash2016.firebaseio.com/"+$scope.globalIdentifier);   
      
      //Read and sync with what Firebase has
      $scope.syncRef.on('value', function(dataSnapshot) { 
        if(!$scope.$$phase) {
          setData(dataSnapshot.val());
        }
      });
    }

    /**
     * Apply data to scope so it gets triggered on the input fields not bound by native angular
     * @param      {[type]}                 data [description]
     */
    function setData(data) {
      $scope.$apply(function () {
          setTimeout(function () {
              $scope.$apply(function () {
                  $scope.data = data;  
                  //Validate

                  if ($scope.data && $scope.data.code) {
                    $scope.data.edited  = new Date().getTime();
                    $scope.data.created = $scope.data.created ? $scope.data.created : $scope.data.edited;
                    $scope.editor.setValue($scope.data.code,1);
                    toastr.success('Report successfully saved', 'Awesome!');
                  }
              });
          }, 500);
      });
    }

    /**
     * Show link
     * @return     {[type]}                 [description]
     */
    function notifyLink() {
      var urlLink = window.location.href.toString()+$scope.globalIdentifier;
      alert       = $mdDialog.alert().title('Share with your friends!').content(urlLink).ok('Ok');
      $mdDialog.show( alert ).finally(function() { alert = undefined;});
      //Update favorites
      $scope.data.shared = $scope.data.shared ? parseInt($scope.data.shared)+1 : 1;
      setData($scope.data);
    }

    /**
     * Configure and initialise and track div input
     * @param      {[type]}                 _editor [description]
     * @return     {[type]}                         [description]
     */
    $scope.aceLoaded = function(_editor) {
      $scope.editor  = _editor;
    };

    /**
     * Detected change on div input
     * @return     {[type]}                 [description]
     */
    $scope.aceChanged  = function () {
      $scope.data.code = $scope.editor.getSession().getDocument().getValue();
    };

    //INITIALISE
    initialise();
  }]);


  /**
   * Main controller
   * @param      {String}                 $scope) {               $scope.greeting [description]
   * @return     {[type]}                         [description]
   */
  app.controller('DashboardCtrl', ['$scope','$http','$mdDialog','$state','$rootScope', function($scope,$http,$mdDialog,$state,$rootScope) {

    //Firebase reference
    $scope.syncRef;
    $scope.globalIdentifier = new Date().getTime();
    $scope.syncRef          = new Firebase("https://hash2016.firebaseio.com");   
    
    //Read and sync with what Firebase has
    $scope.syncRef.on('value', function(dataSnapshot) { $scope.$apply(function () { 
      $scope.reports     = dataSnapshot.val();
      $scope.keys        = Object.keys($scope.reports);
      $rootScope.reports = $scope.reports;
    })});

    /**
     * Change state, generate an id and redirect to editor
     * @return     {[type]}                 [description]
     */
    $scope.newSketch = function() {
      $scope.globalIdentifier = new Date().getTime();
      $state.go('editor', {'identifier': $scope.globalIdentifier});
    }

    /**
     * Format the report created date as something readable as "4 days ago"
     * @param      {[type]}                 report [description]
     * @return     {[type]}                        [description]
     */
    $scope.formatDate = function(date){
      if (date) {
        return moment(date).fromNow();
      }
    }

    /**
     * Load banner images for reports
     * @return     {[type]}                 [description]
     */
    $scope.getImage = function(report) {
      return report.image ? report.image : 'images/default.png';
    }

  }]);

})();
