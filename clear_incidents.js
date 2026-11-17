import { run } from './server/db.js';
run("UPDATE incidents SET status = 'resolved' WHERE id = 4");
run("UPDATE incident_assignments SET status = 'completed' WHERE incident_id = 4");
run("UPDATE responders SET status = 'available' WHERE public_id IN ('POLICE-04', 'POLICE-08')");
console.log('Cleared active incidents for POLICE-04 and POLICE-08');

