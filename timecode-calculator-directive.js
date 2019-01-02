'use strict';
/*
 * ---------------------------------
 * Directive 'timecodeCalculator'
 * ---------------------------------
 */
app.directive('timecodeCalculator', [function() {
	return {
		templateUrl: 'timecode-calculator-directive.html',
		scope: {},
		controller: function($scope) {

			// ---------------------------
			// Variables
			// ---------------------------
			$scope.nbFrames = 0;
			$scope.timecodeArray = [];
			$scope.timecode = tcc.array2TCString($scope.timecodeArray);
			$scope.framerates = tcc.getFramerates();
			$scope.selectedFramerateLabel = "Nb Frames";
			$scope.selectedFramerate = null;

			// Operations
			$scope.ops = [];
			$scope.nextOperator = "";
			var opsLine = {operator: null, timecode: null, framerate: null, nbFrames: null, subTotal: null}
			var operators = {
				'+': function(a, b) { return a + b },
				'-': function(a, b) { return a - b },
			};


			// ---------------------------
			// Functions: Calculator
			// ---------------------------
			$scope.formatTimecode = tcc.formatTimecode;

			$scope.addOperation = function (operator) {
				// Executing the operation (if the timecode field isn't empty)
				if ($scope.timecodeArray.length != 0 || $scope.nbFrames != 0) { $scope.calculate(); };
				// Setting the operator for the next operation (if there's an operation before)
				if ($scope.ops.length != 0) { $scope.nextOperator = operator; };
			};

			$scope.calculate = function () {
				var line = _.clone(opsLine);
				if ($scope.selectedFramerate == null) {
					line.nbFrames = $scope.nbFrames;
				} else {
					line.framerate = _.clone($scope.selectedFramerate);
					line.timecode = $scope.timecode;
					// Converting the "TIMECODE"
					var tc = tcc.extractTimecode($scope.timecode);
					if ($scope.selectedFramerate.dropFrame == false) { line.nbFrames = tcc.timecode_to_frames(tc.h, tc.m, tc.s, tc.f, $scope.selectedFramerate); } 
					else { line.nbFrames = tcc.DF_timecode_to_frames(tc.h, tc.m, tc.s, tc.f, $scope.selectedFramerate); };
				};
				// Calculating the sub-total
				if ($scope.ops.length > 0) {
					//line.subTotal = $scope.ops[$scope.ops.length-1].subTotal + line.nbFrames;
					line.subTotal = operators[$scope.nextOperator]($scope.ops[$scope.ops.length-1].subTotal, line.nbFrames);
				} else {
					line.subTotal = line.nbFrames;
				};
				// Handling the operator
				line.operator = $scope.nextOperator; // Adding the operator in a temp variable
				// Adding the operation line to the list
				$scope.ops.push(line);
				$scope.clearTimecode();
				// Converting the "FRAMES" for each frame rate
				_.forEach($scope.framerates, function(framerate){
					if (framerate.dropFrame == false) { framerate.timecode = tcc.frames_to_timecode(line.subTotal,framerate); } 
					else { framerate.timecode = tcc.frames_to_DF_timecode(line.subTotal,framerate); };
				});

			};

			$scope.addNum = function (value) {
				// "FRAMES"	
				if ($scope.selectedFramerate == null) {
					$scope.nbFrames = parseInt($scope.nbFrames.toString() + value.toString());
				// "TIMECODE"
				} else {
					$scope.timecodeArray.push(value);
					$scope.timecode = tcc.array2TCString($scope.timecodeArray);
				}
			};

			$scope.selectFramerate = function (framerate) {
				if (framerate) {
					$scope.selectedFramerateLabel = framerate.label;
					$scope.selectedFramerate = framerate;
				} else {
					$scope.selectedFramerateLabel = "Nb Frames";
					$scope.selectedFramerate = null;
				};
			};

			$scope.clearTimecode = function () {
				$scope.nbFrames= 0;
				$scope.timecodeArray = [];
				$scope.timecode = tcc.array2TCString($scope.timecodeArray);
			};

			$scope.clearCalculator = function () {
				$scope.ops = [];
				$scope.nextOperator = "+";
				$scope.clearTimecode();
			};

		}
	};
}]);