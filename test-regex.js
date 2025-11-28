const dateParser = require('./services/dateParser');

const tests = [
  'hoy a las 22 horas',
  'hoy a las 10:30',
  'mañana a las 15 horas',
  'lunes a las 3 horas',
  'próximo viernes a las 5 horas',
  'nov 22 a las 3pm',
  '22 a las 15 horas',
  'hoy 22:00',
  'mañana 5pm',
  'lunes 3pm'
];

tests.forEach(test => {
  const result = dateParser.parseMessageForDateTime('@bot ' + test);
  console.log(`Input: '${test}'`);
  console.log(`Valid: ${result ? 'YES' : 'NO'}`);
  if (result) {
    console.log(`  Hora: ${result.timeString}, Fecha: ${result.dateString}`);
  }
  console.log('---');
});

