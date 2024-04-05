import prompts from 'prompts';
import { CurrentUser, Database } from './types';
import kleur from 'kleur';

const createClassActivity = async (db: Database, current_user: CurrentUser) => {
  if (current_user && current_user.role === 'student') {
    const registeredClassActivities = await db._classActivityStudentLink.getMany(db._classActivityStudentLink.studentId.eq(current_user.id));
    const registeredClass = await db._classStudentLink.getMany(db._classStudentLink.studentId.eq(current_user.id));
    const classActivities = (await db.classActivity.getAll())
      .filter(activity => registeredClass.some(l => l.classId === activity.classId))
      .filter(activity => !registeredClassActivities.some(l => l.classActivityId === activity.id));

    if (!classActivities.length) {
      console.error(kleur.red('You are already registered to all class activities'));
      return;
    }

    const answers = await prompts({
      type: 'select',
      name: 'id',
      message: 'Choose a class activity to register to',
      choices: classActivities.map(activity => ({
        title: `${activity.title} - '${activity.description}'`,
        value: activity.id
      }))
    });

    if (!answers.id) {
      return;
    }

    await db._classActivityStudentLink.insert({ studentId: current_user.id, classActivityId: answers.id });
    return;
  }

  const formations = await db.formation.getAll();
  const formationAnswers = await prompts({
    type: 'select',
    name: 'formationId',
    message: 'Choose a formation',
    choices: formations.map(formation => ({
      title: formation.title,
      value: formation.id
    }))
  });

  if (!formationAnswers) {
    return;
  }

  const classes = await db.class.getMany(db.class.formationId.equal(formationAnswers.formationId));

  const classAnswers = await prompts({
    type: 'select',
    name: 'classId',
    message: 'Choose a class',
    choices: classes.map(classe => ({
      title: classe.title,
      value: classe.id
    }))
  });

  if (!classAnswers) {
    return;
  }

  const answers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'Activity title'
    },
    {
      type: 'text',
      name: 'description',
      message: 'Activity description'
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

  await db.classActivity.insert({ classId: classAnswers.classId, formationId: formationAnswers.formationId, ...answers });
}

const listClassActivity = async (db: Database, current_user: CurrentUser) => {
  const classActivities = await db.classActivity.getAll();
  console.table(classActivities);
}

const updateClassActivity = async (db: Database, current_user: CurrentUser) => {
  const classActivities = await db.classActivity.getAll();
  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a activity to update',
    choices: classActivities.map(activity => ({
      title: `${activity.title} (${activity.startDate} - ${activity.endDate})`,
      value: activity.id
    }))
  });

  const activity = classActivities.find(activity => activity.id === answers.id);
  if (!activity) {
    console.error(kleur.red('Activity not found'));
    return;
  }

  const updateAnswers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'Activity title',
      initial: activity.title
    },
    {
      type: 'text',
      name: 'description',
      message: 'Activity description',
      initial: activity.description
    },
    {
      type: 'date',
      name: 'startDate',
      message: 'Start date',
      initial: activity.startDate
    },
    {
      type: 'date',
      name: 'endDate',
      message: 'End date',
      initial: activity.endDate
    }
  ]);

  await db.classActivity.update(answers.id, updateAnswers);
}

const deleteClassActivity = async (db: Database, current_user: CurrentUser) => {
  const classActivities = await db.classActivity.getAll();
  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a activity to delete',
    choices: classActivities.map(activity => ({
      title: `${activity.title}: (${activity.startDate} - ${activity.endDate})`,
      value: activity.id
    }))
  });

  await db.classActivity.deleteCascade(db.classActivity.id.eq(answers.id));
}

const manageClassesActivity = async (db: Database, current_user: CurrentUser) => {
  let running = true;

  const answers: Record<string, Function> = {
    'create': createClassActivity,
    'list': listClassActivity,
    'update': updateClassActivity,
    'delete': deleteClassActivity,
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
          title: current_user && current_user.role === 'student' ? 'Register to an activity' : 'Create a activity',
          value: 'create',
        },
        {
          title: 'List activities',
          value: 'list',
        },
        {
          title: 'Update a activity',
          value: 'update',
          disabled: current_user && current_user.role === 'student'
        },
        {
          title: current_user && current_user.role === 'student' ? 'Unregister to an activity' : 'Delete a activity',
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

    await answers[answer.test](db, current_user);
  }
}

export default manageClassesActivity;
