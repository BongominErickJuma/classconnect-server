const fs = require('fs');
const mongoose = require('mongoose');
const env = require('dotenv');

const Answer = require('./models/answerModel');

env.config({ path: './config.env' });

const answers = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/answers.json`, 'utf-8')
);

const DB = process.env.DATABASE_LOCAL;

mongoose
  .connect(DB)
  .then(() => {
    console.log('DB CONNECTION SUCCESSFULL');
  })
  .catch((err) => console.log('ERROR CONNECTING TO THE DATABASE'));

const importData = async () => {
  try {
    await Answer.create(answers, { validateBeforeSave: false });
    console.log('Data Loaded to the database');
  } catch (error) {
    console.log('Error loading data', error);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
}
