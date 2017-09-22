// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var methodOverride = require("method-override");

// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

// Initialize Express
var app = express();
var PORT = process.env.PORT || 3000;
// Override with POST having ?_method=DELETE
app.use(methodOverride("_method"));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Make public a static dir
app.use(express.static("public"));

var mongodb = process.env.MONGODB_URI || "mongodb://localhost/newyorktimes";

// Database configuration with mongoose
mongoose.connect(mongodb);
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});


// Routes
// ======
app.put("/saved/:id",function(req,res){
  console.log("id: " + req.params.id);
  console.log("note: " + req.body.note);
        Article.findOneAndUpdate({ "_id": req.params.id }, {"saved": true})
                // Execute the above query
                .exec(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    } else {
                        // Or send the document to the browser
                        res.redirect("/saved")
                    }
                });
});

// A GET request to scrape the newyork times website
app.get("/scrape", function(req, res) {
    // First, we grab the body of the html with request
    request("https://www.nytimes.com/", function(error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        // Now, we grab every h2 within an article tag, and do the following:
        $("article h2").each(function(i, element) {
            // Save an empty result object
            var result = {};
            //console.log(i);
            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this).children("a").text();
            result.link = $(this).children("a").attr("href");

            // Using our Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            var entry = new Article(result);

            // Now, save that entry to the db
            entry.save(function(err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                // Or log the doc
                else {
                    // console.log(doc);
                    console.log("doc");
                }
                
            });
        });
    });

    // Tell the browser that we finished scraping the text and go back to home
    //res.send("scrape complete");
    return res.redirect("/");
});
app.get("/", function(req, res) {
  console.log("home route")
    Article.find({}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
            console.log("tomato");
        }
        // Or send the doc to the browser as a json object
        else {
            var hbsObject={
              article:doc
            }
           res.render("home", hbsObject);
           console.log("potato");
        }
    }).limit(20);    
});

app.get("/saved", function(req,res){
  Article.find({'saved':true}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            var hbsObject={
              article:doc
            }
           res.render("saved", hbsObject);
        }
    });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Article.findOne({ "_id": req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        // now, execute our query
        .exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                res.json(doc);
            }
        });
});


// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note(req.body);

    // And save the new note the db
    newNote.save(function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id to find and update it's note
            Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
                // Execute the above query
                .exec(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    } else {
                        // Or send the document to the browser
                        res.send(doc);
                    }
                });
        }
    });
});
// Create a new note or replace an existing note
app.put("/notes/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note(req.body);

    // And save the new note the db
    newNote.save(function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id to find and update it's note
            Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
                // Execute the above query
                .exec(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    } else {
                        // Or send the document to the browser
                        res.send(doc);
                    }
                });
        }
    });
});


// Listen on port 3000
app.listen(PORT, function() {
    console.log("App running on port %s!", PORT);
});


// $.ajax({
//   url: '/route?_method=DELETE',
//   method: 'POST'
// })

// $.get('/route', callback)

// $("#submit-btn").on("click", function(e) {
//   e.preventDefault();
//   var studentName = $("#student-name").val().trim();
//   $.post('/route', studentName);
// })


// <form action="/route?_method=DELETE" method="POST" >
//   <input id="submit-btn" type="submit" value="Scrape Articles">
// </form>

// app.delete("/route", function(req, res) {
//   //delete data from db
// });

// CRUD (create, read, update, delete)

// create => POST
// read => GET
// update => UPDATE
// delete => DELETE