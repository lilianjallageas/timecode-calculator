/**
 * ============================
 * Library: Timecode Converter
 * ============================
 * 
 * Format of the 'timecode' object:
 * {
 *     h: Integer, // Number of hours
 *     m: Integer, // Number of minutes
 *     s: Integer, // Number of seconds
 *     f: Integer, // Number of frames 
 *     dropFrame: Boolean // Determines if the timecode is expressed in 'drop-frame' or not
 * }
 *
 */
var tcc = (function() {

	return {

		// ---------------------------
		// Utility Functions
		// ----------------------------

		// Provides the list of available framerates
		getFramerates: function() {
			return [
				{value: 23.976, dropFrame: true,  label:'23.976 fps'},
				{value: 24,     dropFrame: false, label:'24 fps'},
				{value: 29.97,  dropFrame: true,  label:'29.97 fps'},
				{value: 30,     dropFrame: false, label:'30 fps', },
				{value: 59.94,  dropFrame: true,  label:'59.94 fps'},
				{value: 60,     dropFrame: false, label:'60 fps'}
			];
		},
		
		// Formats the timecode for display
		formatTimecode: function (timecode) {
			// Formatting the timecode
			var formattedTimecode = "";
			if (timecode) { formattedTimecode = ("00"+timecode.h).slice(-2) +":"+ ("00"+timecode.m).slice(-2) +":"+ ("00"+timecode.s).slice(-2) +":"+ ("00"+timecode.f).slice(-2) } 
			else { formattedTimecode = "00:00:00:00"; };
			// Replacing the ";" by ";" for drop-frame framerates
			if (timecode && timecode.dropFrame) { formattedTimecode = formattedTimecode.substr(0, 8) + ';' + formattedTimecode.substr(9, 10); };
			// Retunring the formatted timecode
			return formattedTimecode;
		},

		// Extracts the timecode from a string
		// If there are errors in the format of the string, the errors are reported in the 'errors' field
		extractTimecode: function (timecodeString) {
			var timecode = {h:0, m:0, s:0, f:0, errors:[]};
			// Checking if the timecode string has 11 characters, like this one "01:25:44:00"
			if (timecodeString.length != 11) { timecode.errors.push("The timecode string passed in parameters doesn't have the correct length."); };
			// Checking if the ":" characters are located properly
			if (":" != timecodeString.substring(2, 3)) { timecode.errors.push("There should be a ':' separating the hours and minutes."); };
			if (":" != timecodeString.substring(5, 6)) { timecode.errors.push("There should be a ':' separating the minutes and seconds."); };
			if (":" == timecodeString.substring(8, 9) || ";" == timecodeString.substring(8, 9)) { 
				if (":" == timecodeString.substring(8, 9)) { timecode.dropFrame = false; };
				if (";" == timecodeString.substring(8, 9)) { timecode.dropFrame = true; };
			} else {
				timecode.errors.push("There should be a ':' or a ';' separating the seconds and the number of frames."); 
			};
			// Checking if the characters are numbers
			var h = timecodeString.substring(0, 2);
			var m = timecodeString.substring(3, 5);
			var s = timecodeString.substring(6, 8);
			var f = timecodeString.substring(9, 11);
			if (isNaN(h)) { timecode.errors.push("The 'hours' is not a number."); }   else { timecode.h = h; };
			if (isNaN(m)) { timecode.errors.push("The 'minutes' is not a number."); } else { timecode.m = m; };
			if (isNaN(s)) { timecode.errors.push("The 'seconds' is not a number."); } else { timecode.s = s; };
			if (isNaN(f)) { timecode.errors.push("The 'frames' is not a number."); }  else { timecode.f = f; };
			// We return the timecode object
			return timecode;
		},

		// Converts an Array into a timecode string
		// Example: [1,2,3,4,5,6] => "00:12:34:56"
		array2TCString: function (tcArray) {
			var tcString = ['0','0',':','0','0',':','0','0',':','0','0'];
			var positions = [10,9,7,6,4,3,1,0];
			if (tcArray) {
				if (tcArray.length > 8) { tcArray = tcArray.slice(tcArray.length-8,tcArray.length); }; // If the array is too long, we slice it.
				
				var i = 0;
				var array = _.clone(tcArray);
				while (array.length != 0) {
					if ([1,2,3,4,5,6,7,8,9,0].includes(array[array.length-1])) {
						tcString[positions[i]] = array[array.length-1]; 
						i++;
					};
					array.pop();
				};
			};
			return tcString.join("");
		},



		// ---------------------------
		// Conversions: Non-Drop Frames
		// ----------------------------

		frames_to_timecode: function(nbFrames, framerate){
			var timecode = {h:0, m:0, s:0, f:0, dropFrame: framerate.dropFrame};
			var nbSeconds = nbFrames/framerate.value;
			timecode.h = _.floor(nbSeconds / 3600); // Hours
			timecode.m = _.floor((nbSeconds - (timecode.h * 3600)) / 60); // Minutes
			timecode.s = _.floor(nbSeconds - (timecode.h * 3600) - (timecode.m * 60)); // Seconds
			timecode.f = _.floor(nbFrames - (framerate.value * ((timecode.h * 3600) + (timecode.m * 60) + timecode.s))); // Frames
			return timecode;
		},

		timecode_to_frames: function(nbHours, nbMinutes, nbSeconds, nbFrames, framerate){
			return ((Number(nbHours) * 3600) + (Number(nbMinutes) * 60) + Number(nbSeconds)) * framerate.value + Number(nbFrames);
		},


		// ---------------------------
		// Conversions: Drop Frames
		// ---------------------------

		frames_to_DF_timecode: function(nbFrames, framerate){

			var dropFrames = _.ceil(framerate.value * 0.06); // Number of frames to drop on the minute marks is the nearest integer to 6% of the framerate
			var framesPerHour = _.ceil(framerate.value * 60 * 60); // Number of frames in an hour
			var framesPer24Hours = framesPerHour * 24; // Number of frames in a day - timecode rolls over after 24 hours
			var framesPer10Minutes = _.ceil(framerate.value * 60 * 10); // Number of frames per ten minutes
			var framesPerMinute = (_.ceil(framerate.value) * 60) - dropFrames; // Number of frames per minute is the round of the framerate * 60 minus the number of dropped frames

			// Negative time. Add 24 hours.
			if (nbFrames < 0) { nbFrames = framesPer24Hours + nbFrames; }

			// If nbFrames is greater than 24 hrs, next operation will rollover clock
			nbFrames = nbFrames % framesPer24Hours;

			var d = _.floor(nbFrames / framesPer10Minutes);
			var m = nbFrames % framesPer10Minutes

			if (m > dropFrames) { 
				nbFrames = nbFrames + (dropFrames * 9 * d) + dropFrames * ( _.floor((m-dropFrames) / framesPerMinute) );
			} else {
				nbFrames = nbFrames + dropFrames * 9 * d;
			}

			var timecode = {h:0, m:0, s:0, f:0, dropFrame: framerate.dropFrame};
			var frRound  = _.ceil(framerate.value);
			timecode.h   = _.floor(_.floor(_.floor(nbFrames / frRound) / 60) / 60);
			timecode.m   = _.floor(_.floor(nbFrames / frRound) / 60) % 60;
			timecode.s   = _.floor(nbFrames / frRound) % 60;
			timecode.f   = nbFrames % frRound;
			return timecode;
		},

		DF_timecode_to_frames: function(nbHours, nbMinutes, nbSeconds, nbFrames, framerate){
			// Converting the parameters into Numbers
			nbHours = Number(nbHours); nbMinutes = Number(nbMinutes); nbSeconds = Number(nbSeconds); nbFrames = Number(nbFrames);
			// Converting the timecode into a number of frames
			var dropFrames = _.ceil(framerate.value * 0.06); // Number of drop frames is 6% of framerate rounded to nearest integer
			var timeBase = _.ceil(framerate.value); // We don't need the exact framerate anymore, we just need it rounded to nearest integer
			var ND_FramesPerHour = timeBase * 60 * 60; // Number of frames per hour (non-drop)
			var ND_FramesPerMinute = timeBase * 60; // Number of frames per minute (non-drop)
			var totalMinutes = (Number(nbHours) * 60) + Number(nbMinutes); // Total number of minutes
			var frameNumber = ((ND_FramesPerHour * nbHours) + (ND_FramesPerMinute * nbMinutes) + (timeBase * nbSeconds) + nbFrames) - (dropFrames * (totalMinutes - _.floor(totalMinutes / 10)));
			return frameNumber;
		},

		bruteForce_frames_to_DF_timecode: function(nbFrames, framerate) {
			var timecode = {h:0, m:0, s:0, f:0, dropFrame: framerate.dropFrame};
			var dropFrames = _.ceil(framerate.value * 0.06);
			var timeBase = _.ceil(framerate.value);
			// Looping through all the frames
			for (var i = 0; i < nbFrames; i++) {
				if (timecode.f < timeBase-1) {timecode.f += 1;} // Tick-up the 'frames'
				else {
					timecode.f = 0; // Reset the 'frames'
					if (timecode.s < 59) {timecode.s += 1;} // Tick-up the 'seconds'
					else {
						timecode.s = 0 // Reset the seconds
						if (timecode.m < 59) {
							timecode.m += 1; // Tick-up the 'minutes'
							if (timecode.m%10!=0) { timecode.f = dropFrames; } else { timecode.f = 0; } // Drop the 'frames' every minutes... except every 10 minutes.
						}
						else {
							timecode.m = 0 // Reset the minutes
							timecode.f = 0; // We set the 'frames' to 0 when the minutes is a multiple of 10.
							if (timecode.h < 24) {timecode.h += 1;}; // Tick-up the 'hours'
						};
					};
				};
			};
			return timecode;
		},



		// ---------------------------
		// Testing
		// ---------------------------

		showTestResults: function() {
			// Testing "frames_to_timecode"
			console.log('123456 frames at 24fps should return 01:25:44:00 => ' + tcc.formatTimecode(tcc.frames_to_timecode(123456,tcc.getFramerates()[1])));
			console.log('123456 frames at 30fps should return 01:08:35:06 => ' + tcc.formatTimecode(tcc.frames_to_timecode(123456,tcc.getFramerates()[3])));
			console.log('123456 frames at 60fps should return 00:34:17:36 => ' + tcc.formatTimecode(tcc.frames_to_timecode(123456,tcc.getFramerates()[5])));
			console.log('987654 frames at 24fps should return 11:25:52:06 => ' + tcc.formatTimecode(tcc.frames_to_timecode(987654,tcc.getFramerates()[1])));
			console.log('987654 frames at 30fps should return 09:08:41:24 => ' + tcc.formatTimecode(tcc.frames_to_timecode(987654,tcc.getFramerates()[3])));
			console.log('987654 frames at 60fps should return 04:34:20:54 => ' + tcc.formatTimecode(tcc.frames_to_timecode(987654,tcc.getFramerates()[5])));

			// Testing "timecode_to_frames"
			console.log('The timecode 01:25:44:00 at 24fps should correspond to 123456 frames => ' + tcc.timecode_to_frames('01','25','44','00',tcc.getFramerates()[1]));
			console.log('The timecode 01:08:35:06 at 30fps should correspond to 123456 frames => ' + tcc.timecode_to_frames('01','08','35','06',tcc.getFramerates()[3]));
			console.log('The timecode 00:34:17:36 at 60fps should correspond to 123456 frames => ' + tcc.timecode_to_frames('00','34','17','36',tcc.getFramerates()[5]));
			console.log('The timecode 11:25:52:06 at 24fps should correspond to 987654 frames => ' + tcc.timecode_to_frames('11','25','52','06',tcc.getFramerates()[1]));
			console.log('The timecode 09:08:41:24 at 30fps should correspond to 987654 frames => ' + tcc.timecode_to_frames('09','08','41','24',tcc.getFramerates()[3]));
			console.log('The timecode 04:34:20:54 at 60fps should correspond to 987654 frames => ' + tcc.timecode_to_frames('04','34','20','54',tcc.getFramerates()[5]));

			// Testing "frames_to_DF_timecode" and "bruteForce_frames_to_DF_timecode"
			console.log('123456 frames at 23.98fps should return '+ tcc.formatTimecode(tcc.bruteForce_frames_to_DF_timecode(123456,tcc.getFramerates()[0])) +' => ' + tcc.formatTimecode(tcc.frames_to_DF_timecode(123456,tcc.getFramerates()[0])));
			console.log('123456 frames at 29.97fps should return '+ tcc.formatTimecode(tcc.bruteForce_frames_to_DF_timecode(123456,tcc.getFramerates()[2])) +' => ' + tcc.formatTimecode(tcc.frames_to_DF_timecode(123456,tcc.getFramerates()[2])));
			console.log('123456 frames at 59.94fps should return '+ tcc.formatTimecode(tcc.bruteForce_frames_to_DF_timecode(123456,tcc.getFramerates()[4])) +' => ' + tcc.formatTimecode(tcc.frames_to_DF_timecode(123456,tcc.getFramerates()[4])));
			console.log('987654 frames at 23.98fps should return '+ tcc.formatTimecode(tcc.bruteForce_frames_to_DF_timecode(987654,tcc.getFramerates()[0])) +' => ' + tcc.formatTimecode(tcc.frames_to_DF_timecode(987654,tcc.getFramerates()[0])));
			console.log('987654 frames at 29.97fps should return '+ tcc.formatTimecode(tcc.bruteForce_frames_to_DF_timecode(987654,tcc.getFramerates()[2])) +' => ' + tcc.formatTimecode(tcc.frames_to_DF_timecode(987654,tcc.getFramerates()[2])));
			console.log('987654 frames at 59.94fps should return '+ tcc.formatTimecode(tcc.bruteForce_frames_to_DF_timecode(987654,tcc.getFramerates()[4])) +' => ' + tcc.formatTimecode(tcc.frames_to_DF_timecode(987654,tcc.getFramerates()[4])));

			// Testing "timecode_to_frames"
			console.log('The timecode 01:25:50;10 at 23.98fps should correspond to 123456 frames => ' + tcc.DF_timecode_to_frames('01','25','50','10',tcc.getFramerates()[0]));
			console.log('The timecode 01:08:39;10 at 29.97fps should correspond to 123456 frames => ' + tcc.DF_timecode_to_frames('01','08','39','10',tcc.getFramerates()[2]));
			console.log('The timecode 00:34:19;40 at 59.94fps should correspond to 123456 frames => ' + tcc.DF_timecode_to_frames('00','34','19','40',tcc.getFramerates()[4]));
			console.log('The timecode 11:26:43;18 at 23.98fps should correspond to 987654 frames => ' + tcc.DF_timecode_to_frames('11','26','43','18',tcc.getFramerates()[0]));
			console.log('The timecode 09:09:14;24 at 29.97fps should correspond to 987654 frames => ' + tcc.DF_timecode_to_frames('09','09','14','24',tcc.getFramerates()[2]));
			console.log('The timecode 04:34:37;22 at 59.94fps should correspond to 987654 frames => ' + tcc.DF_timecode_to_frames('04','34','37','22',tcc.getFramerates()[4]));
		}

	}; // end of 'return'
})(); // end of IIFE





