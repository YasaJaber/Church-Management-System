require('dotenv').config();
const Child = require('./models/Child');
const Class = require('./models/Class');

const assignChildrenToTestClass = async () => {
  try {
    // الاتصال بالداتابيس
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    const testClassId = "688c92b10af2474e149784a0"; // الفصل التجريبي
    
    // تخصيص أول 3 أطفال للفصل التجريبي
    const childIds = [
      "688c92b10af2474e149784a3", // مارك جرجس
      "688c92b20af2474e149784af"  // نانسي عادل
    ];
    
    for (const childId of childIds) {
      await Child.findByIdAndUpdate(childId, { class: testClassId });
      const child = await Child.findById(childId).populate('class');
      console.log(`✅ ${child.name} assigned to ${child.class.name}`);
    }
    
    console.log('🎯 Test children assigned to التجريبي class');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
};

assignChildrenToTestClass();
