;(function () {
  'use strict';

  angular
   .module('app.stream')
   .directive('crudRtmpPlayer', crudRtmpPlayer);

  /* @ngInject */
  function crudRtmpPlayer($timeout, Widgets, videojs) {
    return {
      restrict: 'E',
      template: `
        <div 
          ng-style="dm.shadowStyle"
          class="rtmp-container"
          ng-class="!dm.member.enableMoodLighting ? 'stream-shadow' : ''"
        >
          <video
            id="rtmp-player-{{ ::dm.stream.name }}"
            class="video-js"
            controls
            preload="auto"
            poster="{{ ::dm.stream.poster }}"
          >
            <p class="vjs-no-js">
              To view this video please enable JavaScript, and consider upgrading to a
              web browser that
              <a href="http://videojs.com/html5-video-support/" target="_blank">
                supports HTML5 video
              </a>
            </p>
          </video>
        </div>
        
      `,
      scope: {},
      bindToController: {
        stream: '<',
        member: '<',
        player: '='
      },
      controller: Controller,
      controllerAs: 'dm',
      link: link
    };

    function link(scope, element) {
      const ASPECT_RATIO = 9/16;

      let dm = scope.dm;

      let playerElement = element.find(`video.video-js`);
      let playerParent  = element.parent().parent();

      resizePlayer();

      requestAnimationFrame(() => {
        $(window).on('window:resize', resizePlayer);

        scope.$evalAsync(() => {
          if (scope.$on) {
            scope.$on('$destroy', function() {
              $(window).off('window:resize', resizePlayer);
            });
          }
        });
      });

      function resizePlayer() {
        let width = playerParent.innerWidth();
        let height = 2 * Math.round(width * ASPECT_RATIO/2);
        playerElement.attr('width', width);
        playerElement.attr('height', height);
        
        playerParent.css('height', height);
      }
    }
  }

  /* @ngInject */
  function Controller(
    $scope, 
    $rootScope, 
    $timeout, 
    $interval, 
    videojs, 
    Offline, 
    Elements,
    Dialog
  ) {
    let dm = this;
    
    let timeout = 0;
    
    let init = false;
    let source = {
      src: dm.stream.rtmpUrl,
      type: 'rtmp/flv',
      label: 'Flash'
    };
    let streamPlayer;
    let onlineState = Offline.state;

    let clearInterval = $interval(() => setBackgroundShadow(3000), 5000);

    if ($scope.$on) {
      $scope.$on('$destroy', function() {
        $interval.cancel(clearInterval);
        streamPlayer.dispose();
      });
    }

    $scope.$watch('dm.stream.poster', (poster) => {
      if (poster) {
        initPlayer();
      }
    });

    function initPlayer() {
      setTimeout(() => {
        streamPlayer = videojs(`rtmp-player-${dm.stream.name}`, {
          techOrder: ['flash'],
          fluid: true,
          sources: [source],
        });

        initEvents(streamPlayer); 

        if (!dm.member || dm.stream.name !== dm.member.username) {
          streamPlayer
            .persistvolume({ namespace: 'crudboiz-rtmp-volume' });
        } else {
          streamPlayer.muted(true);
        }
      });
    }

    function initEvents(player) {
      player.on('ready', function() {
        this.play();
      });

      player.on('ended', function() {
        this.dispose();
      });

      player.on('error', function(e) {
        console.log(e);

        Dialog
          .error(
            'Problem with flash',
            `To fix this, click the (i) icon near the website url and under the flash dropdown select "always allow flash", then reload the page. If this doesn't work, consider switching browsers or using the HTML5 player.`
          );
      });
     
      player.on('playing', function() {
        init = true;
      });

      Offline.on('down', () => {
        onlineState = 'down';
        player.pause();
      });

      Offline.on('up', () => {
        onlineState = 'up';
        
        player.src(source);
        player.load();

        setTimeout(() => {
          player.play();
        }, 3000);
      });
    }

    setBackgroundShadow();

    function setBackgroundShadow(timeout = 1000) {
      if (!dm.member || !dm.member.enableMoodLighting) return;
      
      Elements
        .delightfulShadow(dm.stream.poster)
        .then((shadow) => {
          setTimeout(() => {
            $scope.$evalAsync(() => {
              dm.shadowStyle = {
                'box-shadow': shadow
              };
            });
          }, timeout);

          if (onlineState === 'down') {
            Offline.trigger('up');
          }
        })
        .catch(() => {
          if (onlineState === 'up') {
            Offline.trigger('down');
          }
        });
    }

  }
})();
