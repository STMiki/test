import prompts from 'prompts';
import { CurrentUser, Database } from './types';
import manageClassesActivity from './manageClassesActivities';

const createClass = async (db: Database, current_user: CurrentUser) => {
  if (current_user && current_user.role === 'student') {
    const registeredClass = await db._classStudentLink.getMany(db._classStudentLink.studentId.eq(current_user.id));
    const classes = (await db.class.getAll()).filter(classe => !registeredClass.some(l => l.classId === classe.id));
    if (!classes.length) {
      console.error('You are already registered to all classes');
      return;
    }
    const answers = await prompts({
      type: 'select',
      name: 'id',
      message: 'Choose a class to register to',
      choices: classes.map(classe => ({
        title: `${classe.title} - '${classe.description}'`,
        value: classe.id
      }))
    });

    if (!answers.id) {
      return;
    }

    await db._classStudentLink.insert({ studentId: current_user.id, classId: answers.id });
    return;
  }

  const answers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'Class title'
    },
    {
      type: 'text',
      name: 'description',
      message: 'Class description'
    },
    {
      type: 'date',
      name: 'startDate',
      message: 'Start date'
    },
    {
      type: 'date',
      name: 'endDate',
      message: 'End date'
    }
  ]);

  if (!answers.title || !answers.description || !answers.startDate || !answers.endDate) {
    return;
  }

  await db.class.insert(answers);
}

const listClasses = async (db: Database, current_user: CurrentUser) => {
  const classes = await db.class.getAll();
  console.log(classes.map(classe => `${classe.id}: '${classe.title}' (${classe.startDate} - ${classe.endDate})`).join('\n'));
}

const updateClass = async (db: Database, current_user: CurrentUser) => {
  const classes = await db.class.getAll();
  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a class to update',
    choices: classes.map(classe => ({
      title: `${classe.title} (${classe.startDate} - ${classe.endDate})`,
      value: classe.id
    }))
  });

  const classe = classes.find(classe => classe.id === answers.id);
  if (!classe) {
    console.error('Class not found');
    return;
  }

  const updateAnswers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'Class title',
      initial: classe.title
    },
    {
      type: 'text',
      name: 'description',
      message: 'Class description',
      initial: classe.description
    },
    {
      type: 'date',
      name: 'startDate',
      message: 'Start date',
      initial: classe.startDate
    },
    {
      type: 'date',
      name: 'endDate',
      message: 'End date',
      initial: classe.endDate
    }
  ]);

  await db.class.update(answers.id, updateAnswers);
}

const deleteClass = async (db: Database, current_user: CurrentUser) => {
  if (current_user && current_user.role === 'student') {
    const registeredClass = await db._classStudentLink.getMany(db._classStudentLink.studentId.eq(current_user.id), { class: true });
    if (!registeredClass.length) {
      console.error('You are not registered to any class');
      return;
    }

    const answers = await prompts({
      type: 'select',
      name: 'id',
      message: 'Choose a class to unregister from',
      choices: registeredClass.map(link => ({
        title: `${link.class!.title} - '${link.class!.description}'`,
        value: link.id
      }))
    });

    if (!answers.id) {
      return;
    }

    await db._classStudentLink.delete(db._classStudentLink.id.eq(answers.id));
    return;
  }

  const classes = await db.class.getAll();
  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a class to delete',
    choices: classes.map(classe => ({
      title: `${classe.title} (${classe.startDate} - ${classe.endDate})`,
      value: classe.id
    }))
  });

  const deletingClassActivity = await db.classActivity.getMany(db.classActivity.classId.equal(answers.id));
  for (const classActivity of deletingClassActivity) {
    await (await db._classActivityStudentLink.getMany(db._classActivityStudentLink.classActivityId.equal(classActivity.id))).delete();
  }
  await deletingClassActivity.delete();
  await (await db._classStudentLink.getMany(db._classStudentLink.classId.equal(answers.id))).delete();
  await db.class.deleteCascade(db.class.id.eq(answers.id));
}

const manageClasses = async (db: Database, current_user: CurrentUser) => {
  let running = true;

  const answers: Record<string, Function> = {
    'create': createClass,
    'list': listClasses,
    'update': updateClass,
    'delete': deleteClass,
    'manageClassesActivity': manageClassesActivity,
    'back': () => {
      running = false;
    }
  };

  while (running) {
    const answer = await prompts({
      type: 'select',
      name: 'test',
      message: 'Choose an option' + (current_user ? ` [${current_user.name} - ${current_user.role}]` : ''),
      choices: [
        {
          title: current_user && current_user.role === 'student' ? 'Register to a class' : 'Create a class',
          value: 'create',
        },
        {
          title: 'List classes',
          value: 'list',
        },
        {
          title: 'Update a class',
          value: 'update',
          disabled: current_user && current_user.role === 'student'
        },
        {
          title: current_user && current_user.role === 'student' ? 'Unregister to a class' : 'Delete a class',
          value: 'delete',
        },
        {
          title: 'Manage classes activity',
          value: 'manageClassesActivity',
        },
        {
          title: 'Back',
          value: 'back',
        }
      ]
    });

    if (!answer.test)
      return;

    await answers[answer.test](db, current_user);
  };
}

export default manageClasses;
