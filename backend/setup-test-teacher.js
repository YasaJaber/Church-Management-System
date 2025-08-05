const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');
const Class = require('./models/Class');

async function setupClassTeacherTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to database');
    
    // Find a class to assign
    const classes = await Class.find().limit(5);
    console.log('📚 Available classes:');
    classes.forEach(cls => {
      console.log(`  - ${cls.name} (${cls._id})`);
    });
    
    if (classes.length === 0) {
      console.log('❌ No classes found');
      process.exit(1);
    }
    
    // Check if test teacher exists
    let testTeacher = await User.findOne({username: 'test_teacher'});
    
    if (!testTeacher) {
      // Create test teacher
      console.log('👨‍🏫 Creating test teacher...');
      const hashedPassword = await bcrypt.hash('teacher123', 10);
      
      testTeacher = new User({
        username: 'test_teacher',
        password: hashedPassword,
        name: 'مدرس تجريبي',
        role: 'classTeacher',
        assignedClass: classes[0]._id // Assign first class
      });
      
      await testTeacher.save();
      console.log('✅ Test teacher created successfully');
    } else {
      console.log('👨‍🏫 Test teacher already exists');
    }
    
    // Populate assigned class
    await testTeacher.populate('assignedClass');
    
    console.log('📋 Test teacher details:');
    console.log('  Username: test_teacher');
    console.log('  Password: teacher123');
    console.log('  Name:', testTeacher.name);
    console.log('  Role:', testTeacher.role);
    console.log('  Assigned Class:', testTeacher.assignedClass?.name || 'None');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupClassTeacherTest();
