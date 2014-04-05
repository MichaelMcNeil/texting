var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

var redis = require('redis').createClient();
var twilio = require('twilio')('AC3882175eeae0385d12f2b7f283a8d70e', '1328c489e44c2589ba76a9efb1f55257');

server.listen(3000);

app.set('view engine', 'jade');
app.use(express.bodyParser());

app.get('/', function(req, res){
    res.render('index', {title: 'Home'});
});

io.sockets.on('connection', function(socket){
    console.log('socket.io connected');

    socket.on('register', function(data){

        redis.sismember('upward_texting', data.phone_number, function(err, result){
            if(result){
                //You have already set-up for notifications');
            }
            else{
                //Create random code
                var code = Math.floor((Math.random()*999999)+111111);
                console.log('Code generated: ' + code);

                //Add number to staging
                redis.hset('upward_texting_staging', code, data.phone_number);

                //Send a confirmation text
                twilio.sendSms({
                    to: data.phone_number,
                    from: '12708406136',
                    body: 'You have requested to receive texts from Upward Sports @ Severns Valley.  Confirmation code: ' + code
                }, function(error, message){
                    if(!error){
                        console.log('Success! The SID for this SMS message is: ' + message.sid);
                        console.log('Message sent on: ' + message.dateCreated);
                        socket.emit('code_generated');
                    }
                    else{
                        console.log('There was an error!');
                    }
                });

            }
        });
    });

});




