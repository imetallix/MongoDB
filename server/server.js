'use strict';
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const {SHA256} = require('crypto-js');

var {mongoose} = require('./db/mongoose');
var {Todo} = require('./models/todo');
var {User} = require('./models/user');
var {authenticate} = require('./../server/middleware/authenticate');


var app = express();
var port = process.env.PORT || 3000;



app.use(bodyParser.json());



//Todos
app.post('/todos',authenticate,(request,response) => {
    var todo = new Todo({
        text: request.body.text,
        _creator: request.user._id
    });
    todo.save().then((doc) =>{
        response.status(200).send(doc);
    },(e) => {
        response.status(400).send(e);
    })
});

app.get('/todos',authenticate,(req,res) => {
   Todo.find({_creator: req.user._id}).then((todos) =>{
       res.status(200).send({todos});
   },(e) =>{
       res.status(400).send(e);
   })
});



app.get('/todos/:id',authenticate, (req,res) =>{
    var id = req.params.id;
    if (!ObjectID.isValid(id))
        return res.send(JSON.stringify({text: 'invalid ID', status: 400},undefined,2));
    Todo.findOne({
        _id: id,
        _creator: req.user._id
    }).then((todo) => {
        if (!todo)
            return res.status(404).send();
        res.status(200).send({todo});
    }).catch((e) => {
        res.status(400).send(e);
    })
});

app.delete('/todos/:id',authenticate,(req,res) => {
   var id = req.params.id;

   if (!ObjectID.isValid(id))
       return res.status(404).send();
   Todo.findOneAndRemove({
       _id: id,
       _creator: req.user._id
   }).then((todo) =>{
       if(!todo)
           return res.status(404).send();
       res.status(200).send(todo);
   }).catch((e) => {
       res.status(400).send();
   })
});

app.get('/todos/remove/:id',authenticate, (req,res) =>{
    var id = req.params.id;

   if (!ObjectID.isValid(id))
       return res.status(404).send();
    Todo.findOneAndRemove({
        _id: id,
        _creator: req.user._id
    }).then((todo) =>{
       if(!todo)
           return res.status(404).send();
            res.status(200).send(todo);
   }).catch((e) => {
       res.status(400).send();
   })
});

app.get('/todos/complete/:id',authenticate,(req,res) => {
    var id = req.params.id;

    if (!ObjectID.isValid(id))
        return res.status(404).send();

    Todo.findOneAndUpdate({
            _id: id,
            _creator: req.user._id
        },
        {$set: {
            completed: true,
            completedAt: new Date().getTime()
            }
        },{new: true})
        .then((todo) => {
            if(!todo)
                return res.status(404).send();
            res.status(200).send({todo});
        })

});

app.patch('/todos/:id',authenticate, (req,res) => {
   var id = req.params.id;
   var body = _.pick(req.body,['text','completed']);

    if (!ObjectID.isValid(id))
        return res.status(404).send();

    if (_.isBoolean(body.completed) && body.completed){
        body.completedAt = new Date().getTime();
    }else {
        body.completed = false;
        body.completedAt = null;
        console.log();
    }

    Todo.findOneAndUpdate({
        _id: id,
        _creator: req.user._id
    },{$set:
        body
    },{new:true}).then((todo) => {
        if (!todo)
            return res.status(404).send();
        res.send({todo});
    }).catch((e) =>{
        res.status(400).send();
    })
});

//Users
app.post('/users', (req,res) => {
    var body = _.pick(req.body,['email','password']);
    var user = new User({
        email: body.email,
        password: body.password
    });

    user.save().then(() => {
        return user.generateAuthToken();
    }).then((token) => {
        return res.header('x-auth',token).send(user);
    })
        .catch((e) => {
        res.status(400).send(e);
    })
});


app.get('/users/me',authenticate,(req,res) => {
    res.send(req.user);
});

app.post('/users/login',(req,res) => {
    var body = _.pick(req.body,['email','password']);

    User.findByCredentials(body.email,body.password).then((user) => {
        return user.generateAuthToken().then((token) => {
            res.header('x-auth',token).send(user);
        })
    }).catch((e) => {
        res.status(400).send();
    })
});

app.delete('/users/me/token',authenticate,(req,res) => {
   req.user.removeToken(req.token).then(() => {
       res.status(200).send();
   },() => {
       res.status(400).send();
   })
});

app.listen(port, () => {
    console.log(`Started up on port ${port}`);
});

module.exports = {
  app
};



