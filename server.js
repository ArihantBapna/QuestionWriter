//enable for local dev

// load the things we need
var express = require("express");
var app = express();

//connect to azure db
const Pool = require("pg").Pool;
const pool = new Pool({
  user: "arihant0611@questionsbank",
  host: "questionsbank.postgres.database.azure.com",
  database: "qbdb",
  password: "Seagull1234#",
  port: 5432,
});
pool.connect();

// set the view engine to ejs
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// use res.render to load up an ejs view file

var db = [];

//Index page
app.get("/", function (req, res) {
  pool.query("SELECT * FROM questions", (error, results) => {
    if (error) {
      throw error;
    }
    var drim = [];
    var drim2 = [];
    var tLen = 0;
    var bLen = 0;
    var x = results.rows;
    for (var i = 1; i <= 28; i++) {
      var obj = { cat: "", val: 0 };
      obj.cat = getString(i);
      obj.tot = getNumbers(i);
      obj.type = "T";
      for (var j = 0; j < x.length; j++) {
        if (x[j].category == i && x[j].type === "T") {
          obj.val++;
          tLen++;
        }
      }
      drim.push(obj);
    }

    for (var i = 1; i <= 28; i++) {
      var obj = { cat: "", val: 0 };
      obj.cat = getString(i);
      obj.tot = getNumbers(i);
      obj.type = "B";
      for (var j = 0; j < x.length; j++) {
        if (x[j].category == i && x[j].type === "B") {
          obj.val++;
          bLen++;
        }
      }
      drim2.push(obj);
    }
    res.render("pages/index", {
      root: __dirname,
      data: drim,
      bonus: drim2,
      totalT: tLen,
      totalB: bLen,
      page_name: "index",
    });
  });
});
//End index page

//Start of data page
app.get("/data", function (req, res) {
  pool.query("SELECT * FROM questions", (error, results) => {
    if (error) {
      throw error;
    }
    var x = results.rows;
    x.forEach(function (i) {
      i.catName = getString(parseInt(i.category));
    });
    res.render("pages/data", { root: __dirname, data: x, page_name: "data" });
  });
});
//End of data page

//CRUD Operations on questions table
app.post("/handle", function (req, res) {
  const dat = req.body;
  pool.query(
    "INSERT INTO questions (key, question, category) VALUES ($1, $2, $3)",
    [dat.key, dat.Question, dat.category],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );
  res.redirect("/");
});

app.post("/handler", function (req, res) {
  const dat = req.body;
  pool.query(
    "INSERT INTO questions (key, question, category, type, approval) VALUES ($1, $2, $3, $4, $5)",
    [dat.key, dat.Question, dat.category, dat.type, 0],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );
  res.redirect("/");
});

app.post("/update", function (req, res) {
  const dat = req.body;
  console.log(dat.idHold);
  console.log(dat.Question);
  pool.query(
    "UPDATE questions SET question = $1, approval = $2, category = $3 WHERE id = $4",
    [dat.Question, dat.App, dat.category, dat.idHold],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );
  res.redirect("/data");
});

app.post("/delete", function (req, res) {
  const dat = req.body;
  pool.query(
    "DELETE FROM questions WHERE id = $1",
    [dat.deleteId],
    (error, results) => {
      if (error) {
        throw error;
      }
    }
  );
  res.redirect("/data");
});
//end CRUD on questions

// writing page page
app.get("/writer", function (req, res) {
  pool.query("SELECT * FROM answers", (error, results) => {
    if (error) {
      throw error;
    }
    var x = results.rows;
    db = x;
    res.render("pages/writer", {
      root: __dirname,
      data: db,
      matchAns: [{}],
      Clues: [{}],
      page_name: "writer",
    });
  });
});

app.post("/searchAnswer", function (req, res) {
  const dat = req.body;
  pool.query(
    "SELECT * FROM answers WHERE UPPER(answer) LIKE UPPER('%'||$1||'%')",
    [dat.answerText],
    (error, results) => {
      if (error) {
        throw error;
      }
      var x = results.rows;
      res.render("pages/writer", {
        root: __dirname,
        data: db,
        matchAns: x,
        Clues: [{}],
        page_name: "writer",
      });
    }
  );
});

app.post("/searchClues", async function (req, res) {
  var a = req.body.ansId;
  a = JSON.parse(a);
  var clues = [];
  for (var i = 0; i < a.length; i++) {
    var m = a[i];
    var result = await selectClues(m);
    for (var r in result) {
      clues.push(result[r]);
    }
  }
  var firstLines = clues.filter((p) => p.line == 0);
  var midLines = clues.filter((p) => p.line != -1);
  midLines = midLines.filter((p) => p.line != 0);

  var lastLines = clues.filter((p) => p.line == -1);
  var allClues = [];
  allClues.push(firstLines);
  allClues.push(midLines);
  allClues.push(lastLines);
  res.render("pages/writer", {
    root: __dirname,
    data: db,
    matchAns: [{}],
    Clues: allClues,
    page_name: "writer",
  });
});

app.post("/generateQuestion", function (req, res) {
  var question =
    JSON.parse(req.body.first) +
    " " +
    JSON.parse(req.body.mid) +
    " " +
    JSON.parse(req.body.last);
  res.render("pages/writer", {
    root: __dirname,
    data: db,
    matchAns: [{}],
    Clues: [{}],
    question: question,
    page_name: "writer",
  });
});

//obscure functions
function getNumbers(num) {
  switch (num) {
    //Science
    case 1:
      return 14;
      break;
    case 2:
      return 14;
      break;
    case 3:
      return 14;
      break;
    case 4:
      return 7;
      break;
    case 5:
      return 2;
      break;
    case 6:
      return 3;
      break;
    case 7:
      return 2;
      break;
    //Literature
    case 8:
      return 18;
      break;
    case 9:
      return 10;
      break;
    case 10:
      return 14;
      break;
    case 11:
      return 7;
      break;
    case 12:
      return 7;
      break;
    case 13:
      //Fine arts
      return 14;
      break;
    case 14:
      return 14;
      break;
    case 15:
      return 14;
      break;
    //RMPSS
    case 16:
      return 14;
      break;
    case 17:
      return 14;
      break;
    case 18:
      return 7;
      break;
    case 19:
      return 4;
      break;
    case 20:
      return 3;
      break;
    case 21:
      return 3;
      break;
    case 22:
      return 14;
      break;
    case 23:
      return 14;
      break;
    case 24:
      return 7;
      break;
    case 25:
      return 21;
      break;
    //Other
    case 26:
      return 9;
      break;
    case 27:
      return 10;
      break;
    case 28:
      return 9;
      break;
  }
}

function getString(num) {
  switch (num) {
    //Science
    case 1:
      return "Biology";
      break;
    case 2:
      return "Chemistry";
      break;
    case 3:
      return "Physics";
      break;
    case 4:
      return "Math";
      break;
    case 5:
      return "Astronomy";
      break;
    case 6:
      return "Computer Science";
      break;
    case 7:
      return "Earth, Ocean and Atmospheric Science";
      break;
    //Literature
    case 8:
      return "Long Fiction";
      break;
    case 9:
      return "Drama";
      break;
    case 10:
      return "Poetry";
      break;
    case 11:
      return "Short Fiction";
      break;
    case 12:
      return "Other";
      break;
    case 13:
      //Fine arts
      return "Painting and Sculpture";
      break;
    case 14:
      return "Classical Music";
      break;
    case 15:
      return "Other";
      break;
    //RMPSS
    case 16:
      return "Religion";
      break;
    case 17:
      return "Mythology";
      break;
    case 18:
      return "Philosophy";
      break;
    case 19:
      return "Econ";
      break;
    case 20:
      return "Psych";
      break;
    case 21:
      return "Other";
      break;
    //History
    case 22:
      return "US History";
      break;
    case 23:
      return "European History";
    case 24:
      return "European Ancient";
    case 25:
      return "World History";
    //Other
    case 26:
      return "Geography";
      break;
    case 27:
      return "Popular Culture";
      break;
    case 28:
      return "Current Events";
      break;
    default:
      return "Something";
  }
}
//end obscure functions

async function selectClues(m) {
  try {
    const res = await pool.query("SELECT * FROM clues WHERE answer_id = $1", [
      m,
    ]);
    return res.rows;
  } catch (err) {
    return err.stack;
  }
}
//done with all things writing

app.listen(80);
console.log("80 is the magic port");
