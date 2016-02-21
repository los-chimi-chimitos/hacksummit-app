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
  var app = angular.module('hacksummit', ['ngRoute','ui.router','ngAnimate','ngMaterial','ui.ace','ngTagsInput']);
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
  app.controller('EditorCtrl', ['$scope','$http','$mdDialog','$state','$rootScope','$mdConstant', '$window', 'CONSTANTS', function($scope,$http,$mdDialog,$state,$rootScope,$mdConstant,$window,CONSTANTS) {


    //Firebase reference
    $scope.syncRef;

    $scope.editor  = editor;

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
      notifyLink();
    }

    /**
     * Run in full screen
     * @return     {[type]}                 [description]
     */
    $scope.runSketch = function() {
      $state.go('sketch', {'identifier': $scope.globalIdentifier});
    }

    /**
     * Initialise tags if none
     * @return     {[type]}                 [description]
     */
    $scope.initTags = function(tags) {
      if (!$scope.data) {
        $scope.data = { code:"", tags:[], author:'', name:''  };
      }
      if (!$scope.data.tags || $scope.data.tags.length == 0) {
        $scope.data.tags = ['hacksummit','today'];
      }
    }

    /**
     * Init everything needed here!!!
     * @return     {[type]}                 [description]
     */
    function initialise() {
        $window.tweetsDS = CONSTANTS.tweetsDS;
        //Initialise with data if coming from another place
        if ($state && $rootScope.reports) {
          $scope.data = $rootScope.reports[$state.params.identifier];
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
      $scope.syncRef.once('value', function(dataSnapshot) { 
        if(!$scope.$$phase) {
          setData(dataSnapshot.val());
        }
      });
    }

    /**
     * Apply data to scope so it gets triggered on the input fields not bound by native angular
     * @param      {[type]}                 data [description]
     */
    function setData(data,cb) {
              $scope.$apply(function () {
             
                  if (!data || data == null) {
                    return;
                  }
                  // $scope.data = data;  
                  var temp    = data.tags;
                  $scope.data = data;
                  $scope.initTags();
                  
                  //Validate
                  store(cb);
              });
    }

    /**
     * Show link
     * @return     {[type]}                 [description]
     */
    function notifyLink() {
      //Update favorites
      $scope.data.shared = $scope.data.shared ? parseInt($scope.data.shared)+1 : 1;
      store(function(success){
        console.log(success);
        if (success) {
          toastr.success('Report synchronised', 'Awesome!');
          var urlLink = window.location.href.toString().indexOf($scope.globalIdentifier) > -1 ? window.location.href.toString() : window.location.href.toString()+$scope.globalIdentifier;
          alert       = $mdDialog.alert().title('Share with your friends!').content(urlLink).ok('Ok');
          $mdDialog.show( alert ).finally(function() { alert = undefined;});
        } else {
          toastr.error('You may be missing to fill out fields','Missing fields');
        }
      });
    }

    /**
     * Store to firebase
     * @param      {Function}               cb [description]
     * @return     {[type]}                    [description]
     */
    function store(cb) {
      if (!$scope.data || !$scope.data.author || $scope.data.author == null || $scope.data.author.length == 0 || 
          !$scope.data.description || $scope.data.description == null || $scope.data.description.length == 0 ||
          !$scope.data.tags || $scope.data.tags == null || $scope.data.tags.length == 0 ||
          !$scope.data.code || $scope.data.tags == null || $scope.data.tags.length == 0) {
          if (cb) {
            cb(false);
          }
          return;
      }

      $scope.data.edited  = new Date().getTime();
      $scope.data.created = $scope.data.created ? $scope.data.created : $scope.data.edited;
      $scope.editor.setValue($scope.data.code,1);
      if ($scope.globalIdentifier && $scope.globalIdentifier.length > 0) {
        $scope.syncRef.set($scope.data);
        if (cb) {
          cb(true);
        }
      } else {
        if (cb) {
          cb(false);
        }
      }
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
    var invoque = false;
    $scope.aceChanged  = function () {
      $scope.data.code = $scope.editor.getSession().getDocument().getValue();
      if (!invoque) {
        invoque = true;
        setTimeout(function(){
          renderReport( $scope.data.code );
          invoque = false;
        },2000);
      }
    };

    /**
     * Load banner images for reports
     * @return     {[type]}                 [description]
     */
    $scope.getImage = function(report) {
      return report.image ? report.image : 'images/default.png';
    }

    /**
     * Will fetch the code and render the report
     * @param  {[type]} code [description]
     * @return {[type]}      [description]
     */
    function renderReport( code ){
      var canvas = document.querySelector('.cnv_div');
      if(canvas){
        canvas.remove();
      }
      var tagcode = document.querySelector('#code');
      tagcode.innerHTML = code;
      renderCode('displaycode');
    }

    /**
     * Change state, generate an id and redirect to editor
     * @return     {[type]}                 [description]
     */
    $scope.newSketch = function() {
      $scope.data = {};
      $scope.globalIdentifier = new Date().getTime();
      $state.go('editor', {'identifier': $scope.globalIdentifier});
    }

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
    $scope.init             = false;
    //Read and sync with what Firebase has    
    $scope.syncRef.on('value', function(dataSnapshot) { 
      
      if(!$scope.$$phase && !$scope.init) {
        $scope.init = true;
        $scope.$apply(function () { 
          $scope.reports     = dataSnapshot.val();
          $scope.keys        = Object.keys($scope.reports);
          $rootScope.reports = $scope.reports;
        })} else {
          setTimeout(function () {
              $scope.$apply(function () {
                $scope.reports     = dataSnapshot.val();
                $scope.keys        = Object.keys($scope.reports);
                $rootScope.reports = $scope.reports;
              });
          }, 1000);
        }
      }
    );


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

    function initialise() {

    }

  }]);

})();
