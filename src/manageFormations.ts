import prompts from 'prompts';

import type { Database, CurrentUser } from './types';
import manageClasses from './manageClasses';
import kleur from 'kleur';

const createFormation = async (db: Database, current_user: CurrentUser) => {
  if (current_user && current_user.role === 'student') {
    const registeredFormation = await db._formationStudentLink.getMany(db._formationStudentLink.studentId.eq(current_user.id));
    const formations = (await db.formation.getAll()).filter(formation => !registeredFormation.some(link => link.formationId === formation.id));
    if (!formations.length) {
      console.error('You are already registered to all formations');
      return;
    }
    const answers = await prompts({
      type: 'select',
      name: 'id',
      message: 'Choose a formation to register to',
      choices: formations.map(formation => ({
        title: `${formation.title} - '${formation.description}'`,
        value: formation.id
      }))
    });

    if (!answers.id) {
      return;
    }

    await db._formationStudentLink.insert({ studentId: current_user.id, formationId: answers.id });
    return;
  }
  const answers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'formation title'
    },
    {
      type: 'text',
      name: 'description',
      message: 'formation description'
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

  await db.formation.insert(answers);
};

const listFormations = async (db: Database, current_user: CurrentUser) => {
  const formations = await db.formation.getAll();
  if (current_user && current_user.role === 'student') {
    const links = await db._formationStudentLink.getMany(db._formationStudentLink.studentId.eq(current_user.id));
    console.log(formations.map(
      formation =>
        (links.some(l => l.formationId === formation.id) ? kleur.cyan(`${formation.id}: ${formation.title} [REGISTERED]`) : `${formation.id}: ${formation.title}`)
        + ` -> '${formation.description}'`).join('\n'));
    return;
  }
  console.log(formations.map(formation => `${formation.id}: ${formation.title} -> '${formation.description}'`).join('\n'));
}

const updateFormation = async (db: Database) => {
  const formations = await db.formation.getAll();
  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a formation to update',
    choices: formations.map(formation => ({
      title: `${formation.title} (${formation.startDate} - ${formation.endDate})`,
      value: formation.id
    }))
  });

  const formation = formations.find(formation => formation.id === answers.id);
  if (!formation) {
    console.error('Formation not found');
    return;
  }

  const updateAnswers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'formation title',
      initial: formation.title
    },
    {
      type: 'text',
      name: 'description',
      message: 'formation description',
      initial: formation.description
    },
    {
      type: 'date',
      name: 'startDate',
      message: 'Start date',
      initial: formation.startDate
    },
    {
      type: 'date',
      name: 'endDate',
      message: 'End date',
      initial: formation.endDate
    }
  ]);

  await db.formation.update(answers.id, updateAnswers);
}

const unregisterStudent = async (db: Database, current_user: CurrentUser) => {
  if (current_user && current_user.role === 'student') {
    const formationStudentLink = await db._formationStudentLink.getMany(db._formationStudentLink.studentId.equal(current_user.id), { formation: true });
    if (!formationStudentLink.length) {
      console.error('You are not registered to any formation');
      return;
    }
    const answers = await prompts({
      type: 'select',
      name: 'id',
      message: 'Choose a formation to unregister from',
      choices: formationStudentLink.map(link => ({
        title: `${link.formation!.title} (${link.formation!.startDate} - ${link.formation!.endDate})`,
        value: link.id
      }))
    });

    await db._formationStudentLink.delete(db._formationStudentLink.id.eq(answers.id));
    return;
  }

  const formationStudentLink = await db._formationStudentLink.getAll({ student: { orderBy: 'name asc' } });
  if (!formationStudentLink.length) {
    console.error('No student are registered to a formation');
    return;
  }
  const formations = await db.formation.getMany(db.formation.id.in(formationStudentLink.map(link => link.formationId)));
  const answersFormation = await prompts({
    type: 'select',
    name: 'form',
    message: 'From which formation do you want to unregister a student?',
    choices: formations.map(formation => ({
      title: `${formation.id}. ${formation.title}`,
      value: formation
    }))
  });

  if (!answersFormation.form) {
    return;
  }

  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: `Choose a student to unregister from '${answersFormation.form.title}'`,
    choices: formationStudentLink.filter(link => link.formationId === answersFormation.form.id).map(link => ({
      title: link.student!.name,
      value: link.id
    }))
  });

  if (!answers.id) {
    return;
  }

  await db._formationStudentLink.delete(db._formationStudentLink.id.eq(answers.id));
};

const deleteFormation = async (db: Database) => {
  const formations = await db.formation.getAll();
  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a formation to delete',
    choices: formations.map(formation => ({
      title: `${formation.title} (${formation.startDate} - ${formation.endDate})`,
      value: formation.id
    }))
  });

  // Delete all classes, class activities and links to students
  // Could be optimized by using a single query
  // But I don't have time because i'm late. AUGH
  await (await db._formationStudentLink.getMany(db._formationStudentLink.formationId.equal(answers.id))).delete();
  const deletingClassActivity = await db.classActivity.getMany(db.classActivity.formationId.equal(answers.id));
  for (const classActivity of deletingClassActivity) {
    await (await db._classActivityStudentLink.getMany(db._classActivityStudentLink.classActivityId.equal(classActivity.id))).delete();
  }
  await deletingClassActivity.delete();
  const deletingClass = await db.class.getMany(db.class.formationId.equal(answers.id));
  for (const classe of deletingClass) {
    await (await db._classStudentLink.getMany(db._classStudentLink.classId.equal(classe.id))).delete();
  }
  await deletingClass.delete();
  await db.formation.deleteCascade(db.formation.id.eq(answers.id));
}

const showScores = async (db: Database, current_user: CurrentUser) => {
  if (current_user && current_user.role === 'student') {
    const formationsLink = await db._formationStudentLink.getMany(db._formationStudentLink.studentId.eq(current_user.id), { formation: true });
    const classesLink = await db._classStudentLink.getMany(db._classStudentLink.studentId.eq(current_user.id), { class: true });
    const classesActivityLink = await db._classActivityStudentLink.getMany(db._classActivityStudentLink.studentId.eq(current_user.id), { classActivity: true });
    console.log('Your scores:');
    for (const formationLink of formationsLink) {
      console.log(`Formation: ${formationLink.formation!.title}`);
      for (const classLink of classesLink.filter(link => link.class!.formationId === formationLink.formationId)) {
        console.log(`  Class: ${classLink.class!.title}` + (classLink.rank ? ` [Rank: ${classLink.rank}]` : ''));
        for (const classActivityLink of classesActivityLink.filter(link => link.classActivity!.classId === classLink.classId)) {
          if (classActivityLink.classActivity!.isScored)
            console.log(`    ${classActivityLink.classActivity!.title}: ${classActivityLink.score}`);
        }
      }
    }
    return;
  }

  const formations = await db.formation.getAll();
  const answers = await prompts({
    type: 'select',
    name: 'id',
    message: 'Choose a formation to show scores',
    choices: formations.map(formation => ({
      title: `${formation.title} (${formation.startDate} - ${formation.endDate})`,
      value: formation.id
    }))
  });

  if (!answers.id) {
    return;
  }

  const formation = formations.find(formation => formation.id === answers.id)!;
  const formationLink = await db._formationStudentLink.getMany(
    db._formationStudentLink.formationId.equal(answers.id));
  const classesLink = await db._classStudentLink.getMany(db._classStudentLink.class.formationId.eq(formation.id), { class: true });
  const classActivitiesLink = await db._classActivityStudentLink.getMany(db._classActivityStudentLink.classActivity.formationId.eq(formation.id), { classActivity: true });

  // Calculate average score
  console.log('Average scores:');
  const formationNotedStudents = formationLink.filter(link => !!link.rank);
  const formationRank = formationNotedStudents.reduce((acc, item) => item.rank ? acc + ['A', 'B', 'C', 'D', 'E'].indexOf(item.rank!) : acc, 0) / formationNotedStudents.length;

  console.log(`Formation: ${formation.title} ${kleur.blue('[Average rank: ' + ['A', 'B', 'C', 'D', 'E'][Math.round(formationRank)] + ']')}`);

  for (const classes of await db.class.getMany(db.class.formationId.equal(formation.id))) {
    const classNotedStudents = classesLink.filter(link => link.classId === classes.id && !!link.rank);
    const classRank = classNotedStudents.reduce((acc, item) => item.rank ? acc + ['A', 'B', 'C', 'D', 'E'].indexOf(item.rank!) : acc, 0) / classNotedStudents.length;
    if (classNotedStudents.length === 0) {
      continue;
    }
    console.log(`  Class: ${classes.title} ${kleur.blue('[Average rank: ' + ['A', 'B', 'C', 'D', 'E'][Math.round(classRank)] + ']')}`);
    for (const classActivities of await db.classActivity.getMany(db.classActivity.classId.equal(classes.id))) {
      const classActivityNotedStudents = classActivitiesLink.filter(link => link.classActivityId === classActivities.id && !!link.score);
      const classActivityScore = classActivityNotedStudents.reduce((acc, item) => acc + item.score!, 0) / classActivityNotedStudents.length;
      if (classActivityNotedStudents.length === 0) {
        continue;
      }
      console.log(`    ${classActivities.title}: ${kleur.blue(classActivityScore + ' / ' + classActivities.maxScore)}`);
    }
  }
};

const manageFormations = async (db: Database, current_user: CurrentUser) => {
  let running = true;

  const answers: Record<string, Function> = {
    'create': createFormation,
    'list': listFormations,
    'update': updateFormation,
    'delete': deleteFormation,
    'unregisterStudent': unregisterStudent,
    'manageClasses': manageClasses,
    'scores': showScores,
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
          title: current_user && current_user.role === 'student' ? 'Register to a formation' : 'Create a formation',
          value: 'create',
        },
        {
          title: 'List formations',
          value: 'list',
        },
        {
          title: 'Update a formation',
          value: 'update',
          disabled: current_user && current_user.role !== 'admin'
        },
        {
          title: 'Delete a formation',
          value: 'delete',
          disabled: current_user && current_user.role !== 'admin'
        },
        {
          title: current_user && current_user.role === 'student' ? 'Unregister to a formation' : 'Unregister a student',
          value: 'unregisterStudent',
        },
        {
          title: 'Manage classes',
          value: 'manageClasses',
        },
        {
          title: 'Scores',
          value: 'scores',
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
};

export default manageFormations;
