import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const patch = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const contractors = [
    { name: 'Jai Balaji RCC Works', contact: '+91 98111 44556' },
    { name: 'Sharma Civil Contractors', contact: '+91 98222 55667' },
    { name: 'Vrindavan Heights Plumbers', contact: '+91 98333 66778' },
    { name: 'Krishna Electrical & MEP', contact: '+91 98444 77889' },
    { name: 'Ramesh Kumar (Bar Bender Foreman)', contact: '+91 98555 88990' },
    { name: 'Suresh Yadav (Site Supervisor)', contact: '+91 98666 99001' },
    { name: 'Apex Foundation Engineers', contact: '+91 98777 00112' },
    { name: 'Shree Ram Construction Co.', contact: '+91 98888 11223' },
    { name: 'National Shuttering Works', contact: '+91 98999 22334' }
  ];

  const issues = await mongoose.connection.db.collection('materialissues').find({}).toArray();
  for (let i = 0; i < issues.length; i++) {
    const c = contractors[i % contractors.length];
    await mongoose.connection.db.collection('materialissues').updateOne(
      { _id: issues[i]._id },
      {
        $set: {
          contractorName: issues[i].contractorName || c.name,
          issuedTo: issues[i].issuedTo || c.name,
          contractorContact: issues[i].contractorContact || c.contact,
          issuedBy: issues[i].issuedBy || 'Amit Verma (Site Engineer)'
        }
      }
    );
  }

  console.log(`✅ Successfully updated ${issues.length} existing material issues in database!`);
  const updated = await mongoose.connection.db.collection('materialissues').find({}).toArray();
  updated.forEach((iss, idx) => {
    console.log(`[${idx + 1}] ${iss.issueNumber} | Contractor: ${iss.contractorName} | Issued By: ${iss.issuedBy} | Contact: ${iss.contractorContact}`);
  });

  await mongoose.disconnect();
  process.exit(0);
};

patch().catch((err) => {
  console.error('Error during patch:', err);
  process.exit(1);
});
