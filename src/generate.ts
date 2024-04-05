import { Database } from './types';
import { faker } from '@faker-js/faker';
import { deleteData } from './dbManipulation';
import kleur from 'kleur';

const generateUsers = async (db: Database) => {
  process.stdout.write(kleur.bold().yellow('Generating users...'));
  const students = faker.helpers.multiple(() => ({
    name: faker.person.fullName(),
    role: 'student'
  }), { count: { min: 20, max: 100 } });

  const others = faker.helpers.multiple(() => ({
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(['admin', 'inspector', 'teacher'])
  }), { count: { min: 5, max: 10 } });

  await db.users.insert([...students, ...others]);
  console.log('\r' + kleur.bold().green(`Generated ${students.length + others.length} users `));
}

const generateFormations = async (db: Database) => {
  process.stdout.write(kleur.bold().yellow('Generating formations...'));
  const formations = faker.helpers.multiple(() => ({
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    startDate: faker.date.recent(),
    endDate: faker.date.future(),
  }), { count: { min: 5, max: 10 } });

  await db.formation.insert(formations);
  console.log('\r' + kleur.bold().green(`Generated ${formations.length} formations `));
}

const generateClasses = async (db: Database) => {
  process.stdout.write(kleur.bold().yellow('Generating classes...'));
  const formations = await db.formation.getAll();
  let count = 0;

  for (const formation of formations) {
    const classes = faker.helpers.multiple(() => ({
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      formationId: formation.id,
      startDate: faker.date.recent(),
      endDate: faker.date.future(),
    }), { count: { min: 5, max: 10 } });

    await db.class.insert(classes);
    count += classes.length;
  }
  console.log('\r' + kleur.bold().green(`Generated ${count} classes `));
}

const generateClassesActivities = async (db: Database) => {
  process.stdout.write(kleur.bold().yellow('Generating classes activities...'));
  const classes = await db.class.getAll();
  let count = 0;

  for (const _class of classes) {
    const classActivities = faker.helpers.multiple(() => {
      const isScored = faker.datatype.boolean();
      return {
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        classId: _class.id,
        formationId: _class.formationId,
        isScored: isScored,
        maxScore: faker.number.int({ min: 0, max: isScored ? 100 : 0 }),
        startDate: faker.date.recent(),
        endDate: faker.date.future(),
      }
    }, { count: { min: 5, max: 10 } });

    await db.classActivity.insert(classActivities);
    count += classActivities.length;
  }
  console.log('\r' + kleur.bold().green(`Generated ${count} classes activities`));
}

const generateLinks = async (db: Database) => {
  process.stdout.write(kleur.bold().yellow('Generating links...'));
  const students = await db.users.getMany(db.users.role.eq('student'));
  const formations = await db.formation.getAll({ classes: { orderBy: 'id asc' } });
  const classesActivities = await db.classActivity.getAll();
  let count = {
    formationStudentLink: 0,
    classStudentLink: 0,
    classActivityStudentLink: 0,
  };

  for (const student of students) {
    const studentFormations = faker.helpers.multiple(() => faker.helpers.arrayElement(formations), { count: { min: 1, max: 3 } });
    for (const formation of studentFormations) {
      await db._formationStudentLink.insert({
        studentId: student.id,
        formationId: formation.id,
        rank: faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E', null]),
      });
      count.formationStudentLink++;

      const studentClassesId = faker.helpers.multiple(() => faker.helpers.arrayElement(formation.classes).id, { count: { min: 1, max: 3 } });

      for (const classId of studentClassesId) {
        const classesActivitiesInner = classesActivities.filter(x => x.classId === classId);
        await db._classStudentLink.insert({
          studentId: student.id,
          classId: classId,
          rank: faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E', null]),
        });
        count.classStudentLink++;

        const studentClassActivities = faker.helpers.multiple(() => faker.helpers.arrayElement(classesActivitiesInner), { count: { min: 1, max: 3 } });

        for (const classActivity of studentClassActivities) {
          await db._classActivityStudentLink.insert({
            studentId: student.id,
            classActivityId: classActivity.id,
            score: faker.number.int({ min: 0, max: classActivity.isScored ? classActivity.maxScore : 0 }),
          });
          count.classActivityStudentLink++;
        }
      }
    }
  }
  console.log('\r' + kleur.bold().green(`Generated ${count.formationStudentLink} formation student links, ${count.classStudentLink} class student links and ${count.classActivityStudentLink} class activity student links`));
}

const generateData = async (db: Database) => {
  await deleteData(db);
  await generateUsers(db);
  await generateFormations(db);
  await generateClasses(db);
  await generateClassesActivities(db);
  await generateLinks(db);

};

export default generateData;
