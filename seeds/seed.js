const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Post = require('../models/Post');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linkedin-clone';

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding');

  const usersData = [
    {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'password123',
      profilePicture: '',
      bio: 'Frontend engineer passionate about building accessible web apps. Loves mentoring and community events.',
      experience: [
        { title: 'Frontend Engineer', company: 'Acme Corp', location: 'New York, NY', current: true, description: 'Building React apps.' },
      ],
      education: [
        { school: 'State University', degree: 'B.S. Computer Science', field: 'Computer Science' },
      ],
      skills: ['React', 'JavaScript', 'CSS', 'Accessibility'],
    },
    {
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'password123',
      profilePicture: '',
      bio: 'Recruiter at BetaTech. I love connecting talented engineers with great teams.',
      experience: [
        { title: 'Senior Recruiter', company: 'BetaTech', location: 'Remote', current: true, description: 'Hiring across engineering teams.' },
      ],
      education: [
        { school: 'City College', degree: 'B.A. Business', field: 'Business' },
      ],
      skills: ['Recruiting', 'Interviewing', 'Networking'],
    },
    {
      name: 'Carol Lee',
      email: 'carol@example.com',
      password: 'password123',
      profilePicture: '',
      bio: 'Product manager with a background in design and analytics. Passionate about user-centered products.',
      experience: [
        { title: 'Product Manager', company: 'Gamma Inc', location: 'San Francisco, CA', current: true, description: 'Leading mobile product initiatives.' },
      ],
      education: [
        { school: 'Tech Institute', degree: 'M.S. HCI', field: 'Human-Computer Interaction' },
      ],
      skills: ['Product', 'UX', 'Data Analysis'],
    },
  ];

  const createdUsers = [];

  for (const u of usersData) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create(u);
      console.log('Created user:', user.email);
    } else {
      console.log('User exists, skipping:', user.email);
    }
    createdUsers.push(user);
  }

  // Create some posts referencing companies/jobs
  const postsData = [
    {
      userEmail: 'alice@example.com',
      text: 'Excited to announce I started a new role at Acme Corp! Looking forward to building great products with an awesome team.',
    },
    {
      userEmail: 'bob@example.com',
      text: 'BetaTech is hiring Senior Backend Engineers (Remote). Competitive salary + equity. Reach out if interested!',
    },
    {
      userEmail: 'carol@example.com',
      text: 'We just published a case study on improving onboarding flows at Gamma Inc — great lessons learned for PMs and designers.',
    },
    {
      userEmail: 'alice@example.com',
      text: 'Looking for recommendations: which UI testing tools have you found most reliable for React apps?',
    },
    {
      userEmail: 'bob@example.com',
      text: 'Candidate spotlight: we interviewed a stellar frontend dev with 5 years experience in React and accessibility — DM me for details.',
    },
  ];

  for (const p of postsData) {
    const user = await User.findOne({ email: p.userEmail });
    if (!user) continue;

    // Check if similar post exists to avoid duplicates
    const exists = await Post.findOne({ user: user._id, text: p.text });
    if (exists) {
      console.log('Post already exists, skipping for', user.email);
      continue;
    }

    const post = await Post.create({ user: user._id, text: p.text });
    console.log('Created post for', user.email, ':', post._id);
  }

  console.log('\nSeeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
