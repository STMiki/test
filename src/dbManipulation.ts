import type { Database } from './types';

const createFormation = 'CREATE TABLE IF NOT EXISTS formation (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, start_date DATE, end_date DATE)';
const createClass = 'CREATE TABLE IF NOT EXISTS class (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, formation_id INTEGER NOT NULL, start_date DATE, end_date DATE)';
const createClassActivity = 'CREATE TABLE IF NOT EXISTS class_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, class_id INTEGER NOT NULL, formation_id INTEGER NOT NULL, scored BOOLEAN, max_score INTEGER NOT NULL, start_date DATE, end_date DATE)';
const createFormationStudentLink = 'CREATE TABLE IF NOT EXISTS _formation_student_link (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, formation_id INTEGER NOT NULL, rank TEXT)';
const createClassStudentLink = 'CREATE TABLE IF NOT EXISTS _class_student_link (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, class_id INTEGER NOT NULL, score TEXT)';
const createClassActivityStudentLink = 'CREATE TABLE IF NOT EXISTS _class_activity_student_link (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, class_activity_id INTEGER NOT NULL, score INTEGER)';
const createUsers = 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT)';

export const initDb = async (db: Database) => {
  await db.query(createFormation);
  await db.query(createClass);
  await db.query(createClassActivity);
  await db.query(createFormationStudentLink);
  await db.query(createClassStudentLink);
  await db.query(createClassActivityStudentLink);
  await db.query(createUsers);
};

export const deleteData = async (db: Database) => {
  await db.formation.deleteCascade();
  await db.class.deleteCascade();
  await db.classActivity.deleteCascade();
  await db.users.deleteCascade();
}
