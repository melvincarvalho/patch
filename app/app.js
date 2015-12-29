


// for debug only
var __kb;
var __scope;


/**
* The main app
*/
var App = angular.module('Patch', [
  'ngAudio',
  'lumx'
]);

App.config(function($locationProvider) {
  $locationProvider
  .html5Mode({ enabled: true, requireBase: false });
});

App.controller('Main', function($scope, $http, $location, $timeout, ngAudio, LxNotificationService, LxProgressService, LxDialogService) {
  // Namespaces
  var CHAT  = $rdf.Namespace("https://ns.rww.io/chat#");
  var CURR  = $rdf.Namespace("https://w3id.org/cc#");
  var DCT   = $rdf.Namespace("http://purl.org/dc/terms/");
  var FACE  = $rdf.Namespace("https://graph.facebook.com/schema/~/");
  var FOAF  = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
  var LIKE  = $rdf.Namespace("http://ontologi.es/like#");
  var LDP   = $rdf.Namespace("http://www.w3.org/ns/ldp#");
  var MBLOG = $rdf.Namespace("http://www.w3.org/ns/mblog#");
  var OWL   = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
  var PIM   = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
  var RDF   = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  var RDFS  = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
  var SIOC  = $rdf.Namespace("http://rdfs.org/sioc/ns#");
  var SOLID = $rdf.Namespace("http://www.w3.org/ns/solid/app#");
  var TMP   = $rdf.Namespace("urn:tmp:");

  var f,g;


  // INIT
  /**
  * Init app
  */
  $scope.initApp = function() {
    $scope.init();
  };

  /**
  * Set Initial variables
  */
  $scope.init = function() {

    $scope.initRDF();
    $scope.initUI();
    $scope.initQueryString();

    /*
    $scope.initRDF();
    $scope.initLocalStorage();
    */

    __kb = g;
    __scope = $scope;
  };


  /**
  * Init UI
  */
  $scope.initUI = function() {
    $scope.initialized = true;
    $scope.loggedIn = true;
    $scope.loginTLSButtonText = "Login";
    $scope.audio = ngAudio.load('audio/button-3.mp3');
  };


  /**
  * Get values from localStorage
  */
  $scope.initLocalStorage = function() {
    if (localStorage.getItem('user')) {
      var user = JSON.parse(localStorage.getItem('user'));
      $scope.loginSuccess(user);
    }
  };

  /**
  * init RDF knowledge base
  */
  $scope.initRDF = function() {
    var PROXY = "https://rww.io/proxy.php?uri={uri}";
    var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
    var TIMEOUT = 90000;
    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

    g = $rdf.graph();
    f = $rdf.fetcher(g, TIMEOUT);
  };

  /**
  * init from query string
  */
  $scope.initQueryString = function() {
    if ($location.search().subject) {
      $scope.subject = $location.search().subject;
    }
    if ($location.search().object) {
      $scope.object = $location.search().object;
    }
    if ($location.search().predicate) {
      $scope.predicate = $location.search().predicate;
    }
    if ($location.search().graph) {
      $scope.graph = $location.search().graph;
    }
  };

  /**
  * setStorageURI set the storage URI for words
  * @param  {String} the storage URI for words
  */
  $scope.setStorageURI = function(storageURI) {
    $scope.storageURI = storageURI;
    $location.search('storageURI', $scope.storageURI);
  };


  // AUTH
  /**
  * TLS Login with WebID
  */
  $scope.TLSlogin = function() {
    var AUTHENDPOINT = "https://databox.me/";
    $scope.loginTLSButtonText = 'Logging in...';
    $http({
      method: 'HEAD',
      url: AUTHENDPOINT,
      withCredentials: true
    }).success(function(data, status, headers) {
      var header = 'User';
      var scheme = 'http';
      var user = headers(header);
      if (user && user.length > 0 && user.slice(0,scheme.length) === scheme) {
        $scope.loginSuccess(user);
      } else {
        $scope.notify('WebID-TLS authentication failed.', 'error');
      }
      $scope.loginTLSButtonText = 'Login';
    }).error(function(data, status, headers) {
      $scope.notify('Could not connect to auth server: HTTP '+status);
      $scope.loginTLSButtonText = 'Login';
    });
  };

  /**
  * loginSuccess called after successful login
  * @param  {String} user the logged in user
  */
  $scope.loginSuccess = function(user) {
    $scope.notify('Login Successful!');
    $scope.loggedIn = true;
    $scope.user = user;
    $scope.fetchAll();
    localStorage.setItem('user', JSON.stringify(user));
  };

  /**
  * Logout
  */
  $scope.logout = function() {
    $scope.init();
    $scope.notify('Logout Successful!');
    localStorage.removeItem('user');
  };

  // FETCH functions
  //
  //
  $scope.fetchAll = function() {
    $scope.fetchBoard();
  };


  /**
  * Invalidate a cached URI
  * @param  {String} uri The URI to invalidate
  */
  $scope.invalidate = function(uri) {
    console.log('invalidate : ' + uri);
    f.unload(uri);
    f.refresh($rdf.sym(uri));
  };

  /**
  * Save the position
  */
  $scope.save = function() {
    var uri = $scope.graph;
    if (!uri) {
      LxNotificationService.error('graph is empty');
      return;
    }
    if (!$scope.subject) {
      LxNotificationService.error('subject is empty');
      return;
    }
    if (!$scope.predicate) {
      LxNotificationService.error('predicate is empty');
      return;
    }
    if (!$scope.object) {
      LxNotificationService.error('object is empty');
      return;
    }

    $http({
      method: 'PATCH',
      url: uri.split('#')[0],
      withCredentials: true,
      headers: {
        "Content-Type": "application/sparql-update"
      },
      data: 'INSERT DATA { <'+$scope.subject+'> ' + '<'+$scope.predicate+'> ' + '<'+$scope.object+'> ' + '. }',
    }).
    success(function(data, status, headers) {
      LxNotificationService.success('PATCH saved');
    }).
    error(function(data, status, headers) {
      LxNotificationService.error('could not save PATCH');
    });

  };


  // HELPER
  /**
  * Notify
  * @param  {String} message the message to display
  * @param  {String} type the type of notification, error or success
  */
  $scope.notify = function(message, type) {
    console.log(message);
    if (type === 'error') {
      LxNotificationService.error(message);
    } else {
      LxNotificationService.success(message);
    }
  };



  // RENDER
  /**
  * render screen
  */
  $scope.render = function() {
  };

  /**
  * Refresh the board
  */
  $scope.refresh = function() {
    $scope.render();
  };

  /**
  * openDialog opens a dialog box
  * @param  {String} elem  The element to display
  */
  $scope.openDialog = function(elem) {
    LxDialogService.open(elem);
    $(document).keyup(function(e) {
      if (e.keyCode===27) {
        LxDialogService.close(elem);
      }
    });
  };


  // SOCKETS
  //
  //
  /**
  * Get wss from URI
  * @param  {String} uri The URI to use
  */
  function getWss(uri) {
    return 'wss://' + uri.split('/')[2];
  }

  /**
  * Connect to a web socket
  * @param  {String}  sub Where to subscribe to
  * @param  {boolean} quiet dont ping server
  */
  function connectToSocket(sub, quiet) {
    // Some servers time out after 5 minutes inactive
    var INTERVAL  = 240 * 1000;
    var RECONNECT = 60 * 1000;

    if ($scope.socket) return;

    var socket;

    var wss = getWss(sub);
    console.log('connecting to : ' + wss);

    socket = new WebSocket(wss);

    socket.onopen = function(){
      console.log(sub);
      $scope.socket = socket;
      socket.send('sub ' + sub, socket);

      if (!quiet) {
        setInterval(function() { socket.send('ping'); }, INTERVAL);
      }

    };

    socket.onerror = function(){
      console.log('socket error');
      setTimeout(connectToSocket, RECONNECT);
    };

    socket.onclose = function(){
      console.log('socket closed');
      setTimeout(connectToSocket, RECONNECT);
    };

    socket.onmessage = function(msg) {
      var a = msg.data.split(' ');
      if (a[0] !== 'pub') return;
      processSocket(a[1]);
    };

  }

  /**
  * Process message from socket
  * @param  {String} uri uri that has changed
  */
  function processSocket(uri) {
    console.log(uri);

    $scope.invalidate(uri);
    $scope.fetchBoard();
    $scope.audio.play();
  }

  $scope.initApp();

});

/**
* Escape URIs filter
*/
App.filter('escape', function() {
  return window.encodeURIComponent;
});
