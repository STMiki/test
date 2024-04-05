import prompts from 'prompts';
import map from './map';

import manageFormations from './manageFormations';
import { CurrentUser } from './types';
import { initDb, deleteData } from './dbManipulation';
import generateData from './generate';
import manageUsers from './manageUsers';
import kleur from 'kleur';

const db = map.sqlite(process.argv.length > 2 ? process.argv[2] : ':memory:');

let current_user: CurrentUser = null;

const signInAs = async () => {
  const users = await db.users.getAll();
  if (!users.length) {
    console.log(kleur.red('No users found'));
    return;
  }
  const answer = await prompts({
    type: 'select',
    name: 'Sign in as',
    message: 'Choose a user',
    choices: users.map(user => ({
      title: `${user.name} - ${user.role}`,
      value: user.id
    }))
  });
  current_user = users.find(user => user.id === answer['Sign in as']);
};

const main = async () => {
  console.log('Welcome to the school management system!');
  initDb(db);
  let running = true;
  const answers: Record<string, Function> = {
    'formations': manageFormations,
    'users': manageUsers,
    'sign in': signInAs,
    'sign out': () => {
      current_user = null;
    },
    'generate': generateData,
    'delete': deleteData,
    'quit': () => {
      running = false;
    }
  }

  while (running) {
    const answer = await prompts({
      type: 'select',
      name: 'test',
      message: 'Choose an option' + (current_user ? ` [${current_user.name} - ${current_user.role}]` : ''),
      choices: [
        {
          title: 'Manage formations',
          value: 'formations',
        },
        {
          title: 'Manage users',
          value: 'users',
          disabled: current_user && current_user.role !== 'admin'
        },
        {
          title: 'Sign in as',
          value: 'sign in',
        },
        {
          title: 'Sign out',
          value: 'sign out',
        },
        {
          title: 'Generate data',
          value: 'generate',
        },
        {
          title: 'Delete data',
          value: 'delete',
        },
        {
          title: 'Quit',
          value: 'quit',
        }
      ]
    });

    if (!answer.test)
      return;

    await answers[answer.test](db, current_user);
  }
};

main();
