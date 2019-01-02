'use strict';
/*
 * ---------------------------------
 * Directive 'timecodeConverter'
 * ---------------------------------
 */
app.directive('timecodeConverter', [function() {
	return {
		templateUrl: 'timecode-converter-directive.html',
		scope: {},
		controller: function($scope) {

			// ---------------------------
			// Variables
			// ---------------------------
			$scope.showResults = false;
			$scope.nbFrames = 0;
			$scope.timecodeArray = [];
			$scope.timecode = tcc.array2TCString($scope.calculatorTimecodeArray);
			$scope.framerates = tcc.getFramerates();
			$scope.framerate = {selected: null};
			$scope.selectedFramerate = "Number of Frames";


			// ---------------------------
			// Watchers
			// ---------------------------
			$scope.$watch('framerate.selected', function(newValue, oldValue) {
				// Any time the user selects another framerate, we hide the 'results' table
				$scope.resetPage();
			});



			// ---------------------------
			// Functions: Converter
			// ---------------------------

			$scope.formatTimecode = tcc.formatTimecode;


			$scope.add = function (value) {
				// "FRAMES"	
				if ($scope.framerate.selected == null) {
					$scope.nbFrames = parseInt($scope.nbFrames.toString() + value.toString());
				// "TIMECODE"
				} else {
					$scope.timecodeArray.push(value);
					$scope.timecode = tcc.array2TCString($scope.timecodeArray);
				}
			};


			$scope.clearConverter = function () {
				$scope.resetPage();
			};


			$scope.convert = function(){
				// "FRAMES"
				if ($scope.framerate.selected == null) {
					// Converting the "FRAMES" for each frame rate
					_.forEach($scope.framerates, function(framerate){
						if (framerate.dropFrame == false) { framerate.timecode = tcc.frames_to_timecode($scope.nbFrames,framerate); } 
						else { framerate.timecode = tcc.frames_to_DF_timecode($scope.nbFrames,framerate); };
					});

				// "TIMECODE"
				} else {
					// Converting the "TIMECODE"
					var timecode = tcc.extractTimecode($scope.timecode);
					if ($scope.framerate.selected.dropFrame == false) { $scope.nbFrames = tcc.timecode_to_frames(timecode.h, timecode.m, timecode.s, timecode.f, $scope.framerate.selected); } 
					else { $scope.nbFrames = tcc.DF_timecode_to_frames(timecode.h, timecode.m, timecode.s, timecode.f, $scope.framerate.selected); };
				
					_.forEach($scope.framerates, function(framerate){
						if (framerate.dropFrame == false) { framerate.timecode = tcc.frames_to_timecode($scope.nbFrames,framerate); } 
						else { framerate.timecode = tcc.frames_to_DF_timecode($scope.nbFrames,framerate); };
					});	

				};

				// Showing the results
				$scope.showResults = true;
			};


			$scope.selectConvert = function (framerate) {
				if (framerate) {
					$scope.selectedFramerate = framerate.label;
					$scope.framerate.selected = framerate;
				} else {
					$scope.selectedFramerate = "Number of Frames";
					$scope.framerate.selected = null;
				};
			};

			$scope.resetPage = function() {
				$scope.showResults = false;
				$scope.nbFrames = 0;
				$scope.timecodeArray = [];
				$scope.timecode = tcc.array2TCString($scope.timecodeArray);
			};

		}
	};
}]);