var db = require('../db');
var path = require('path');
var fs = require('fs');
var Baby = require('babyparse');
//This line effectively means we've placed the "brain" object that brain.js gives us into the usable scope for this file. We have not yet done anything with that object- that's your task!
var brain = require('brain');

//TODO: your code here to create a new neural net instance
// START SOLUTION CODE
var net = new brain.NeuralNetwork({
  hiddenLayers:[20,20], //Use the docs to explore various numbers you might want to use here
  learningRate:0.6
});
//  END SOLUTION CODE

module.exports = {
  // this is our main entry point
  startNet: function(req,res) {

    fs.readFile(path.join(__dirname, 'train.csv'), 'utf8', function(err, fileData) {
      if(err) {
        console.error('error reading in the train.csv file. Please make sure it is saved in the same directory as neuralNetLogic.js, and is named train.csv');
        console.error(err);
      } else {
        // csv files can be saved in a number of different ways. PapaParse (with it's node.js version BabyParse) will take care of all the messiness for us, and reliably return data in a consistent format for us to work with.
        rows = Baby.parse(fileData, {
          header:true
        }).data;
        console.log(rows);
        // format that data. see that modular function below
        var formattedData = module.exports.formatData(rows);
        var training = [];
        var testing = [];
        // split the data into a test set (20% of the data) and a training set (80% of the data)
        for(var i = 0; i < formattedData.length; i++) {
          if(Math.random() > .8) {
            testing.push(formattedData[i]);
          } else {
            training.push(formattedData[i]);
          }
        }
        // pass this formatted data into trainBrain
        module.exports.trainBrain(training, testing);
      }
    });

    // The code below only applies to people who wanted to get in more practice with databases. 
    // grab all the data from the db
    // db.query('SELECT * FROM neuralNet', function(err, response) {
    //   if(err) {
    //     console.error(err);
    //   } else {
    //     // format that data. see that modular function below
    //     var formattedData = module.exports.formatData(response);
    //     var training = [];
    //     var testing = [];
    //     // split the data into a test set (20% of the data) and a training set (80% of the data)
    //     for(var i = 0; i < formattedData.length; i++) {
    //       if(Math.random() > .8) {
    //         testing.push(formattedData[i]);
    //       } else {
    //         training.push(formattedData[i]);
    //       }
    //     }
    //     // pass this formatted data into trainBrain
    //     module.exports.trainBrain(training, testing);
    //   }
    // });
  },

  trainBrain: function(trainingData, testingData) {
    console.time('trainBrain');
    console.log('Training your very own Brain');

    //TODO: Your code here to train the neural net
    // START SOLUTION CODE:
    var writeInfo = net.train(trainingData,{
      errorThresh: 0.05,  // error threshold to reach
      iterations: 10,   // maximum training iterations
      log: true,           // console.log() progress periodically
      logPeriod: 1,       // number of iterations between logging
      learningRate: 0.3    // learning rate
    });

    //  END SOLUTION CODE

    console.timeEnd('trainBrain');

    // now test the results and see how our machine did!
    module.exports.testBrain(testingData);
  },

  //Test our brain with a given set of testData
  //Logs the output of default rate at that prediction level
  testBrain: function(testData) {
    //console.time gives us the time it takes to complete a task
    console.time('testBrain');
    //TODO: Your code here to get the predicted values for everything in our testData
    //The logging code provided for you below expects the predicted net values to be stored as properties on each item in testData under the property name nnPredictions. 
    //Here's what an object in the testData array should look like after you've gotten the predicted result from the net:
      /*
      { input: 
         { utilizationRate: 0.21939333333333333,
           age: 0.3486238532110092,
           thirtyDaysLate: 0.01020408163265306,
           monthlyIncome: 0.031789238577839024,
           openCreditLines: 0.1767766952966369,
           ninetyDaysLate: 0.1,
           realEstateLines: 0,
           sixtyDaysLate: 0,
           numDependents: 0 },
        output: { defaulted: 0 },
        nnPredictions: { defaulted: 0.34634397489904356 } }
      */

    // START SOLUTION CODE
    for(var i = 0; i < testData.length; i++) {
      testData[i].nnPredictions = net.run(testData[i].input);
    }
    // END SOLUTION CODE

    // everything below is formatting the output
    // first we create a results obj with keys labeled 0 to 100
    // eash position in results is an object itself
      // Each position aggregates the count of loans the neural net has predicted have this level of risk
      // and the number of observed defaults at that level of risk
    var results = {};
    for(var j = 0; j <=100; j++) {
      results[j] = {
        nnCount: 0,
        defaulted: 0
      };
    }

    for(var i = 0; i < testData.length; i++) {
      //we format the net's prediction to be an int between 0 and 100
      var prediction = Math.round( testData[i].nnPredictions.defaulted * 100);
      //We then increment the total number of cases that the net predicts exist at this level of risk 
      // (i.e., if the net's prediction for a given input is .38745, we would add one more to the 39 category, since we now have one more observation that the net has predicted has a 39% chance of defaulting)
      results[prediction].nnCount++;
      //And whether this input resulted in a default or not
      results[prediction].defaulted += testData[i].output.defaulted;
    }

    //We don't normally like to assume the keys are going to be ordered, but it's a time-saving shortcut to make at the moment, and the consequences are very low if it's not perfectly ordered
    for(var key in results) {
      console.log(key + '- nnCount: ' + results[key].nnCount + ' defaulted: ' + results[key].defaulted + ' Default Rate: ' + Math.round(results[key].defaulted/results[key].nnCount * 100) + '%' );
    }
    console.timeEnd('testBrain');

    console.log(results);
  },

  //Takes our raw data input, roughly normalizes it, and transforms it into numbers between 0 and 1 like our net expects
  //You can ignore this until extra credit
  formatData: function(data) {

    // { SeriousDlqin2yrs: '0',
    // ID: '150000',
    // RevolvingUtilizationOfUnsecuredLines: '0.850282951',
    // age: '64',
    // 'NumberOfTime30-59DaysPastDueNotWorse': '0',
    // DebtRatio: '0.249908077',
    // MonthlyIncome: '8158',
    // NumberOfOpenCreditLinesAndLoans: '8',
    // NumberOfTimes90DaysLate: '0',
    // NumberRealEstateLoansOrLines: '2',
    // 'NumberOfTime60-89DaysPastDueNotWorse': '0',
    // NumberOfDependents: '0' }

    console.log('formatting Data');
    var formattedResults = [];
    for(var i = 0; i < data.length; i++) {
      var rawRow = data[i];

      var formattedRow = {};
      formattedRow.id = rawRow.id;
      // brain.js expects each row object to have an input property (all the information we know about that row), and an output property (what we are trying to predict)
      formattedRow.input = {};
      formattedRow.output = {
        defaulted: rawRow.SeriousDlqin2yrs
      };

      //if the utilization rate is below 1, we divide it by 3 to make it smaller (taking the cube root would make it larger);
      if(rawRow.creditUtilization < 1) {
        formattedRow.input.utilizationRate = rawRow.RevolvingUtilizationOfUnsecuredLines/3;
      } else {
        //otherwise we take the cube root of it, and then divide by 37 (which is the max number we would have after cube rooting ).
        formattedRow.input.utilizationRate = Math.pow(rawRow, 1/3)/37;
      }

      formattedRow.input.age = rawRow.age/109;
      formattedRow.input.thirtyDaysLate = rawRow['30To60DaysLate'] / 98;
      formattedRow.input.monthlyIncome = Math.sqrt(rawRow.MonthlyIncome) / 1735;
      formattedRow.input.openCreditLines = Math.sqrt(rawRow.NumberOfOpenCreditLines)/8;

      formattedRow.input.ninetyDaysLate = Math.sqrt(rawRow['90DaysLate']) / 10;

      formattedRow.input.realEstateLines = rawRow.NumberOfRealEstateLoansOrLines/ 54;

      formattedRow.input.sixtyDaysLate = Math.sqrt(rawRow['60To89DaysLate']) / 10;

      formattedRow.input.numDependents = Math.sqrt(rawRow.NumberOfDependents) / 5;

      formattedResults.push(formattedRow);
    }
    console.log('formatted the data');
    return formattedResults;

  },


  kagglePredict: function(req, res) {
    db.query('SELECT * FROM submission', function(err, response) {
      if(err) {
        console.error(err);
      } else {
        var formattedData = module.exports.formatData(response);
        var netName = 'hiddenLayers9,40,50,80learningRate0.31428981244655';
        fs.readFile(netName, 'utf8', function(err, data) {
          if(err) {
            console.error(err);
          } else {
            net.fromJSON(JSON.parse(data));
            res.send('Loaded the brain! Testing it now.')
            var results = [];
            results.push('id');
            results.push('prediction');
            results.push('\n');
            for (var i = 0; i < formattedData.length; i++) {
              results. push(formattedData[i].id);
              results.push(net.run(formattedData[i].input).defaulted);
              results.push('\n');
            }
            var predictionFileName = 'kagglePredictions' + netName + '.csv';
            fs.writeFile(predictionFileName, results.join(','), function(err) {
              if(err) {
                console.log('did not write to file successfully');
              } else {
                console.log('wrote predictions to file successfully!');
              }
            })
            // console.log(results.join(','));
            // module.exports.testBrain(formattedData);
          }
        });

      }
    });
  },

  kaggleTrain: function(req,res) {
    // grab all the data from the db
    db.query('SELECT * FROM neuralNet', function(err, response) {
      if(err) {
        console.error(err);
      } else {
        // for Kaggle, we will train the brain on the entire dataset
        // just for fun, we'll also "test" it on the entire dataset
        // because the real test is the submission file. this "test" is just for the fun of having something appear in our console
        var formattedData = module.exports.formatData(response);
        var testing = formattedData;

        // pass this formatted data into trainBrain
        module.exports.trainBrain(formattedData, testing);
      }
    });
  },

};
