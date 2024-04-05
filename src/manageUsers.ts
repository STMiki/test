import prompts from 'prompts';
import { Database } from './types';
import kleur from 'kleur';

const createUser = async (db: Database) => {
  const answers = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'User name'
    },
    {
      type: 'select',
      name: 'role',
      message: 'User role',
      choices: [
        {
          title: 'Student',
          value: 'student'
        },
        {
          title: 'Teacher',
          value: 'teacher'
        },
        {
          title: 'Admin',
          value: 'admin'
        }
      ]
    }
  ]);

  if (!answers.name || !answers.role) {
    return;
  }

  await db.users.insert(answers);
};

const listUsers = async (db: Database) => {
  const users = await db.users.getAll();
  console.log(users.map(user => `${user.id}: ${user.name} - ${user.role}`).join('\n'));
}

const updateUser = async (db: Database) => {
  const users = await db.users.getAll();
  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a user to update',
    choices: users.map(user => ({
      title: `${user.name} - ${user.role}`,
      value: user.id
    }))
  });

  const user = users.find(user => user.id === answers.id);
  if (!user) {
    return;
  }

  const updateAnswers = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'User name',
      initial: user.name
    },
    {
      type: 'select',
      name: 'role',
      message: 'User role',
      initial: user.role === 'teacher' ? 1 : user.role === 'admin' ? 2 : 0,
      choices: [
        {
          title: 'Student',
          value: 'student',
        },
        {
          title: 'Teacher',
          value: 'teacher',
        },
        {
          title: 'Admin',
          value: 'admin',
        }
      ]
    }
  ]);

  if (!updateAnswers.name || !updateAnswers.role) {
    return;
  }

  await db.users.update({ id: user.id, ...updateAnswers });
};

const deleteUser = async (db: Database) => {
  const users = await db.users.getAll();

  if (!users.length) {
    console.error(kleur.red('No users found'));
    return;
  }

  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a user to delete',
    choices: users.map(user => ({
      title: `${user.name} - ${user.role}`,
      value: user.id
    }))
  });

  await db.users.deleteCascade(db.users.id.eq(answers.id));
};

const manageUsers = async (db: Database) => {
  let running = true;

  const answers: Record<string, Function> = {
    'create': createUser,
    'list': listUsers,
    'update': updateUser,
    'delete': deleteUser,
    'back': () => {
      running = false;
    }
  };

  while (running) {
    const answer = await prompts({
      type: 'select',
      name: 'test',
      message: 'Choose an option',
      choices: [
        {
          title: 'Create a user',
          value: 'create',
        },
        {
          title: 'List users',
          value: 'list',
        },
        {
          title: 'Update a user',
          value: 'update',
        },
        {
          title: 'Delete a user',
          value: 'delete',
        },
        {
          title: 'Back',
          value: 'back',
        }
      ]
    });

    if (!answer.test)
      return;

    await answers[answer.test](db);
  };
};

export default manageUsers;
