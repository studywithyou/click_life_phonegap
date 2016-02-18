/**
 * Created by Администратор on 16.02.2016.
 */
/***********************************************************************************************************************
 * SERVICES
 **********************************************************************************************************************/
clicklife.factory("Auth", function($interval){
    var storage = {
        set user(value){
            var j =  JSON.stringify( value );
            window.localStorage.setItem("user",j);
        },
        get user(){
            var r = JSON.parse(window.localStorage.getItem("user"));
            return r?r:false;
        }
    };
    var interval;
    var auto_reconnect = function(period_ms){
        if(interval){
            console.log("автообновление уже запущено");
            return;
        }
        interval=  setInterval(function(){
            io.socket.post("/user/login",{
                login: storage.user.username,
                password: storage.user.password
            },function(data){
                if(data.error){
                    return window.showToast(data.error,2000);
                }else{
                    console.log("Updated login status");
                    storage.user = data;

                }
            });
        },period_ms);
    };
    var afterUpdate = function(){
        if(storage.user.username){
            io.socket.get("/user/personal_chanel",{username: storage.user.username }, function(){
                console.log("subscribed to personal channel");
            });
        }

    };
    return{
        getUser: function(){
            return storage.user;
        },
        setUser : function(aUser){
            storage.user = aUser;
            afterUpdate();
            if(aUser){
                auto_reconnect(30000);
            }else{
                auto_reconnect(30000);

            }

        },
        currentName: function(){
            return storage.user.username;
        },
        isLoggedIn : function(){
            return(storage.user.username)? storage.user : false;
        },
        logout: function(){
            storage.user= "";
            $interval.cancel(interval);
            window.location.href="#login";
        }
    }
});
clicklife.factory("User", function(){
    return {
        getById: function(id,cb){
            io.socket.get("/user/"+id,{},function(data){
                cb(data);
            });
        }
    }
});
clicklife.factory("msg", function(Auth){

    return{
        isConnected: function(){
            return io.socket.isConnected();
        },
        on: function(eventIdentity, callback){
            return io.socket.on(eventIdentity,callback);
        },
        send: function(url, data, callback){
            return io.socket.get(url, data, callback);
        },
        emit: function(eventName, recipient, data){
            io.socket.get("/call/signaling",{
                event: eventName,
                data:data,
                from: Auth.getUser().username,
                to: recipient
            })
        }
    }
});
/*** call service ***/
clicklife.service("callService", function(){
    var that = this;
    this.initCall = function(username){
        window.location.href="#call/"+username+"/1";
    } ;
    this.isCalling = false;
    this.callTo = function(user){
        that.initCall(user.username);
    };
    this.currentRoute = "";
});
/***
 * Video Service
 */
clicklife.service("Video", function(){
    /*** capture video ***/
    this.capture = function(cb){
        navigator.device.capture.captureVideo(cb, function(e){
            console.log(e);
        }, {limit: 1});
    };
    /**  upload to server ***/
    this.uploadVideo = function(mediaFile,url, params, cb){
        var ft = new FileTransfer(),
            path = mediaFile.fullPath,
            name = mediaFile.name;

        ft.upload(path,
            url,
            function(result) {
                console.log('Upload success: ' + result.responseCode);
                console.log(result.bytesSent + ' bytes sent');
                cb();
            },
            function(error) {
                console.log('Error uploading file ' + path + ': ' + error.code);
            },
            { fileName: name, fileKey:'file', params: params });
    };
});

/***
 * image service
 */
clicklife.service("image", function(){
    /** get picture from camera or gallery **/
    this.getPicture = function(cb){
        return  navigator.camera.getPicture(cb, function(message) {
                alert('get picture failed '+message);
            },{
                quality: 90,
                destinationType: navigator.camera.DestinationType.FILE_URI,
                sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY
            }
        );
    };

    this.uploadPhoto = function(imageURI, uploadURI, params, cb){
        var options = new FileUploadOptions();
        options.fileKey="file";
        options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
        options.mimeType="image/jpeg";

        // var params = new Object();
        // params.value1 = "test";
        // params.value2 = "param";

        options.params = params;
        options.chunkedMode = false;

        var ft = new FileTransfer();
        ft.upload(imageURI, uploadURI, cb, function(e){
            console.log(e);
        }, options);
    };
});

/***
 * Music service
 */
clicklife.service("music", function(){
    var that = this;
    this.STREAM_MUSIC = "music";
    this.STREAM_RING = "system";
    this.STREAM_NOTIFICATION = "notification";
    this.STREAM_VOICE_CALL = "voice_call";
    this.STREAM_ALARM = "alarm";
    this.STREAM_DTMF = "dtmf";
    var asset_url = "/android_asset/www/music/";
    if(cordova.platformId == "browser"){
        asset_url = "music/";
    }
    var now_playing = {};
    var stop_request = false;
    var streamType = this.STREAM_MUSIC;
    var streamVolume = '1.0';


    this.setVolume = function(value){
        streamVolume = value;
    };
    /***
     * stop all sounds
     */
    this.stopAll = function(){
        for(var sound in now_playing){
            try{
                if(typeof(now_playing[sound])!= 'undefined'){
                    now_playing[sound].stop();
                    now_playing[sound].stop_requested = true;
                }
            }catch(e){}
        }
        return true;
    };
    this.setStreamType = function(type){
        if(type != that.STREAM_MUSIC &&
            type!= that.STREAM_RING &&
            type!= that.STREAM_NOTIFICATION &&
            type!= that.STREAM_VOICE_CALL &&
            type != that.STREAM_ALARM&&
            type != that.STREAM_DTMF
        ){
            streamType = that.STREAM_MUSIC;
            return false;
        }
        streamType = type;
        return true;
    };
    // toggle mute Stream
    // param type = StreamType
    this.toggleMute = function(type){
        if(type != that.STREAM_MUSIC &&
            type!= that.STREAM_RING &&
            type!= that.STREAM_NOTIFICATION &&
            type!= that.STREAM_VOICE_CALL &&
            type != that.STREAM_ALARM&&
            type != that.STREAM_DTMF
        ){
            type = that.STREAM_MUSIC;

        }
        try{
            return Media.mute_stream(type);
        }catch(e){console.log(e); }

    };

    /*** togle mute microphone
     * @param muted bool
     * ***/
    this.muteMicrophone = function(muted){
        try{
            Media.mute_microphone(muted);
        } catch (e) {
            console.log(e)
        }
    };


    //play sound
    this.play = function(sound, loopSong, loop_interval){
        stop_request = false;
        if(typeof(Media) == "undefined"){
            return false;
        }
        try{
            Media.setStreamType(streamType);
        } catch(e){ console.log(e);}

        if(typeof(now_playing[sound])!= 'undefined'){
            now_playing[sound].stop();
            //now_playing[sound].release();
            delete now_playing[sound];
        }
        var filename = asset_url+ sound + ".mp3";
        now_playing[sound] = new Media(filename, null, function MediaError(e){
            console.log("Music play Error", e);
        }, function(status){
            if(loopSong && status==Media.MEDIA_STOPPED){
                window.setTimeout(function(){
                    if(!now_playing[sound].stop_requested){
                        now_playing[sound].play();
                    }
                    if(now_playing[sound].stop_requested){
                        now_playing[sound].stop();
                        //now_playing[sound].release();
                    }
                }, loop_interval);
            }
        }, streamType);
        now_playing[sound].stop_requested = false;
        now_playing[sound].setVolume(streamVolume);
        now_playing[sound].play();
        return true;
    };
    //stop playing
    this.stop = function(sound){
        if(typeof(now_playing[sound])!= 'undefined'){
            now_playing[sound].stop();
            now_playing[sound].stop_requested = true;
        }
    };

    /*** capture audio */
    this.capture = function(cb){
        navigator.device.capture.captureAudio(cb, function(e){
            console.log(e);
        }, {limit:1});
    };
    /*** upload audio ***/
    this.uploadAudio = function(mediaFile,url, params, cb){
        var ft = new FileTransfer(),
            path = mediaFile.fullPath,
            name = mediaFile.name;

        ft.upload(path,
            url,
            function(result) {
                console.log('Upload success: ' + result.responseCode);
                console.log(result.bytesSent + ' bytes sent');
                cb();
            },
            function(error) {
                console.log('Error uploading file ' + path + ': ' + error.code);
            },
            { fileName: name, fileKey:'file', params: params });
    };
});
/***
 * GIFTS service
 */
clicklife.service("giftsService", function(){
    this.getAll = function(cb){
        io.socket.get("/gifts/all",function(data){
            cb(data);
        });
    };
});

