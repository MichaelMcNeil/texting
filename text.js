var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

//var redis = require('redis').createClient();
var twilio = require('twilio')('AC3882175eeae0385d12f2b7f283a8d70e', '1328c489e44c2589ba76a9efb1f55257');
var mongojs = require('mongojs');
var connection_string = '127.0.0.1:27017/upward_texting';
var db = mongojs(connection_string, ['numbers']);

console.log(db.numbers);

server.listen(3000);

app.set('view engine', 'jade');
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
    res.render('index', {title: 'Home'});
});

app.get('/admin', function(req, res){
    res.render('test', {title: 'Admin'});
});


io.sockets.on('connection', function(socket) {
  console.log('socket.io connected');

  socket.on('register', function(data) {

    var code = Math.floor((Math.random()*999999)+111111);

    db.numbers.findOne({ _id: data.phone_number}, function (err, doc) {
        console.log(err);
        console.log(doc);
      if (doc===null) {
        console.log('Number has not been found.  Add number to database');
        createUser(data.phone_number, code, socket);
      }
      else if (checkVerified(socket, doc.verified, data.phone_number) == false) {
        console.log('Number was found.  There has already been a code sent.');
        socket.emit('update', {message: "You have already requested a verification code for that number!"});
        socket.emit('code_generated');
      }
    });
 
  });
 
  socket.on('verify', function(data) {
    var code = Math.floor((Math.random()*999999)+111111);
    db.numbers.findOne({ _id: data.phone_number}, function (err, doc) {
      if (err) {
        socket.emit('reset');
        socket.emit('update', {message: "You have not requested a verification code for " + data.phone_number + " yet!"});
      }
      else if (checkVerified(socket, doc.verified, data.phone_number) == false && doc.code == parseInt(data.code)) {
        console.log('Your number has been verified');
        socket.emit('verified');
        socket.emit('update', {message: "You have successfully verified " + data.phone_number + "!"});
        db.numbers.update({ _id: data.phone_number}, {code: parseInt(data.code), verified: true}, function (err) { if (err) { throw err; }});
      }
      else {
        socket.emit('update', {message: "Invalid verification code!"});
      }
    });
 
  });
  
  socket.on('unsubscribe', function(data){
    console.log('unsubscribe');
    unsubscribe(data.phone_number, socket);
  });

  socket.on('send', function(data){
    
    console.log('on send');
    db.numbers.find({verified: true}, function(err, docs){
        console.log(docs);
        console.log(data.message);
        for(var i=0; i<docs.length; i++){
            console.log('sending msg');
            console.log(docs[i]._id);
            twilio.sendSms({
                to: docs[i]._id,
                from: '12708406136',
                body: data.message,
            }, function(err, response){
                if(err){
                    //something
                }
                else{
                    //something else
                }
            });
        }
    });  
  });
});


function createUser(phone_number, code, socket) {
  db.numbers.save({_id: phone_number, code: code, verified: false}, function (saverr) {
    if (saverr) { throw saverr; }
    twilio.sendSms({
        to: phone_number,
        from: '12708406136',
        body: 'You have requested to receive texts from Upward Sports @ Severns Valley.  Confirmation code: ' + code
    }, function(twilioerr, responseData) {
      if (twilioerr) {
        console.log('Number is invalid!');
        users.remove(phone_number, function(remerr) {if (remerr) { throw remerr; }});
        socket.emit('update', {message: "Invalid phone number!"});
      } else {
        socket.emit('code_generated');
      }
    });
  });
}

function unsubscribe(number, socket){
  db.numbers.remove({_id: number}, function(err){
    if(err) {throw err;}
    socket.emit('update', {message: number + " has been unsubscribed."});
  });
}

function checkVerified(socket, verified, number) {
  if (verified == true) {
    socket.emit('reset');
    socket.emit('update', {verified: "true", message: "You have already verified " + number + "!  Would you like to unsubscribe?"});
    return true;
  }
  return false;
}

