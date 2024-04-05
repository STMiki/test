import rdb from 'rdb';

const map = rdb.map(x => ({
  formation: x.table('formation').map(({ column }) => ({
    id: column('id').numeric().primary().notNullExceptInsert(),
    title: column('title').string().notNull(),
    description: column('description').string().notNull(),
    startDate: column('start_date').date().notNull(),
    endDate: column('end_date').date().notNull(),
  })),

  class: x.table('class').map(({ column }) => ({
    id: column('id').numeric().primary().notNullExceptInsert(),
    title: column('title').string().notNull(),
    description: column('description').string().notNull(),
    formationId: column('formation_id').numeric().notNullExceptInsert(),
    startDate: column('start_date').date().notNull(),
    endDate: column('end_date').date().notNull(),
  })),

  classActivity: x.table('class_activity').map(({ column }) => ({
    id: column('id').numeric().primary().notNullExceptInsert(),
    title: column('title').string().notNull(),
    description: column('description').string().notNull(),
    classId: column('class_id').numeric().notNullExceptInsert(),
    formationId: column('formation_id').numeric().notNullExceptInsert(),
    isScored: column('scored').boolean(),
    maxScore: column('max_score').numeric().notNullExceptInsert().default(0),
    startDate: column('start_date').date().notNull(),
    endDate: column('end_date').date().notNull(),
  })),

  _formationStudentLink: x.table('_formation_student_link').map(({ column }) => ({
    id: column('id').numeric().primary().notNullExceptInsert(),
    studentId: column('student_id').numeric().notNull(),
    formationId: column('formation_id').numeric().notNull(),
    rank: column('rank').string().validate(rank => !rank || rank in ['A', 'B', 'C', 'D', 'E']),
  })),

  _classStudentLink: x.table('_class_student_link').map(({ column }) => ({
    id: column('id').numeric().primary().notNullExceptInsert(),
    studentId: column('student_id').numeric().notNull(),
    classId: column('class_id').numeric().notNull(),
    rank: column('score').string().validate(rank => !rank || rank in ['A', 'B', 'C', 'D', 'E']),
  })),

  _classActivityStudentLink: x.table('_class_activity_student_link').map(({ column }) => ({
    id: column('id').numeric().primary().notNullExceptInsert(),
    studentId: column('student_id').numeric().notNull(),
    classActivityId: column('class_activity_id').numeric().notNull(),
    score: column('score').numeric().default(0).notNullExceptInsert(),
  })),

  users: x.table('users').map(({ column }) => ({
    id: column('id').numeric().primary().notNullExceptInsert(),
    name: column('name').string().notNull(),
    role: column('role').string().notNull().validate(role => role in ['admin', 'inspector', 'teacher', 'student']),
  })),
})).map(x => ({
  formation: x.formation.map(v => ({
    classes: v.hasMany(x.class).by('formationId'),
    studentsLink: v.hasMany(x._formationStudentLink).by('formationId'),
  })),
  class: x.class.map(v => ({
    formation: v.references(x.formation).by('formationId'),
    classActivity: v.hasMany(x.classActivity).by('classId'),
    studentsLink: v.hasMany(x._classStudentLink).by('classId'),
  })),
  classActivity: x.classActivity.map(v => ({
    class: v.references(x.class).by('classId'),
    formation: v.references(x.formation).by('formationId'),
  })),
  _formationStudentLink: x._formationStudentLink.map(v => ({
    student: v.references(x.users).by('studentId'),
    formation: v.references(x.formation).by('formationId'),
  })),
  _classStudentLink: x._classStudentLink.map(v => ({
    student: v.references(x.users).by('studentId'),
    class: v.references(x.class).by('classId'),
  })),
  _classActivityStudentLink: x._classActivityStudentLink.map(v => ({
    student: v.references(x.users).by('studentId'),
    classActivity: v.references(x.classActivity).by('classActivityId'),
  })),
  users: x.users.map(v => ({
    formationLink: v.hasMany(x._formationStudentLink).by('studentId'),
    classesLink: v.hasMany(x._classStudentLink).by('studentId'),
    classesActivitiesLink: v.hasMany(x._classActivityStudentLink).by('studentId'),
  })),
}));

export default map;
