var restify = require('restify');
var builder = require('botbuilder');
var http = require('http');

var local = true;

//For HTTPS
var https_options = {};
if (!local) {
    var fs = require('fs');
    https_options = {
        key: fs.readFileSync('/etc/letsencrypt/live/your.domain/privkey.pem'),
        certificate: fs.readFileSync('/etc/letsencrypt/live/your.domain/fullchain.pem'),
    };
}

// Setup Restify Server
var server = restify.createServer(https_options);
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', '138.197.0.221', server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: 'YOUR APP ID',
    appPassword: 'YOUR APP PASSWORD'
});
var bot = new builder.UniversalBot(connector, {persistConversationData: true});

server.post('/api/messages', connector.listen());

bot.dialog('/', function (session, args) {
    if (!session.userData.greeting) {
        session.send("Hello. What is your name?");
        session.userData.greeting = true;
    } else if (!session.userData.name) {
        console.log("Begin");
        getName(session);
    } else if (!session.userData.email) {
        console.log("Name is: " + session.userData.name);
        getEmail(session);
    } else if (!session.userData.password) {
        console.log("Name is: " + session.userData.name);
        console.log("Email is: " + session.userData.email);
        getPassword(session);
    } else {
        session.userData = null;
    }
    session.endDialog();
});


function getName(session) {
    name = session.message.text;
    session.userData.name = name;
    session.send("Hello, " + name + ". What is your Email ID?");
}

function getEmail(session) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    email = session.message.text;
    if (re.test(email)) {
        session.userData.email = email;
        session.send("Thank you, " + session.userData.name + ". Please set a new password.");
    } else {
        session.send("Please type a valid email address. For example: test@hotmail.com");
    }
}

function getPassword(session) {
    var re = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
    password = session.message.text;
    if (re.test(password)) {
        session.userData.password = password;
        var data = session.userData;
        sendData(data, function (msg) {
            session.send(msg);
            session.userData = null;
        });
    } else {
        session.send("Password must contain at least 8 characters, including at least 1 number, 1 uppercase letter, 1 lower case letter and 1 special character. For example: Mybot@123");
    }
}

function sendData(data, cb) {
    http.get("http://local.dev/github/aplostestbot/saveData.php?name=" + data.name + "&email=" + data.email + "&password=" + data.password, function (res) {
        var msg = '';
        res.on("data", function (chunk) {
            msg += chunk;
        });

        res.on('end', function () {
            cb(msg);
        });

    }).on('error', function (e) {
        console.log("Got error: " + e.message);
    });
}
